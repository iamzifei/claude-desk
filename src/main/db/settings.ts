import { safeStorage } from 'electron'
import { readFileSync } from 'fs'
import { homedir } from 'os'
import { join } from 'path'
import { getDb } from './index'

/**
 * Settings repo. Plain values go in the `settings` table as-is. Secrets
 * (the API key) are encrypted with Electron's safeStorage, which is backed
 * by the OS keychain (Keychain on macOS, libsecret/DPAPI elsewhere), so the
 * raw key is never written to disk in cleartext.
 */
const SECRET_PREFIX = 'enc:'

export function getSetting(key: string): string | null {
  const row = getDb().prepare('SELECT value FROM settings WHERE key = ?').get(key) as
    | { value: string }
    | undefined
  if (!row) return null
  if (row.value.startsWith(SECRET_PREFIX)) {
    if (!safeStorage.isEncryptionAvailable()) return null
    try {
      return safeStorage.decryptString(Buffer.from(row.value.slice(SECRET_PREFIX.length), 'base64'))
    } catch {
      return null
    }
  }
  return row.value
}

export function setSetting(key: string, value: string, secret = false): void {
  let stored = value
  if (secret && value && safeStorage.isEncryptionAvailable()) {
    stored = SECRET_PREFIX + safeStorage.encryptString(value).toString('base64')
  }
  getDb()
    .prepare(
      `INSERT INTO settings (key, value) VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`
    )
    .run(key, stored)
}

/**
 * Resolve the API key in priority order:
 *   1. the key the user saved in Settings (encrypted via safeStorage)
 *   2. process.env.CLAUDE_API_KEY / ANTHROPIC_API_KEY
 *   3. CLAUDE_API_KEY in ~/.env
 * The env fallbacks make `npm run dev` reply out-of-the-box without first
 * pasting a key into Settings.
 */
export function resolveApiKey(): string | null {
  const stored = getSetting('apiKey')
  if (stored) return stored
  const fromEnv = process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY
  if (fromEnv) return fromEnv
  try {
    const dotenv = readFileSync(join(homedir(), '.env'), 'utf8')
    const m = dotenv.match(/^\s*(?:CLAUDE_API_KEY|ANTHROPIC_API_KEY)\s*=\s*(.+?)\s*$/m)
    if (m) return m[1].replace(/^["']|["']$/g, '')
  } catch {
    // no ~/.env — fine
  }
  return null
}

/**
 * Transcription key (OpenAI-compatible /audio/transcriptions): stored setting,
 * else process.env.OPENAI_API_KEY, else OPENAI_API_KEY in ~/.env.
 */
export function resolveTranscriptionKey(): string | null {
  const stored = getSetting('transcriptionKey')
  if (stored) return stored
  if (process.env.OPENAI_API_KEY) return process.env.OPENAI_API_KEY
  try {
    const dotenv = readFileSync(join(homedir(), '.env'), 'utf8')
    const m = dotenv.match(/^\s*OPENAI_API_KEY\s*=\s*(.+?)\s*$/m)
    if (m) return m[1].replace(/^["']|["']$/g, '')
  } catch {
    /* no ~/.env */
  }
  return null
}

export const DEFAULT_TRANSCRIBE_URL = 'https://api.openai.com/v1'
export const DEFAULT_TRANSCRIBE_MODEL = 'whisper-1'

export interface AppSettings {
  provider: string
  model: string
  hasApiKey: boolean
  activeWorkspace: string | null
  theme: string // 'light' | 'dark'
  transcriptionEngine: string // 'cloud' | 'local'
  transcriptionBaseUrl: string
  transcriptionModel: string
  hasTranscriptionKey: boolean
  shortcuts: string | null // JSON map of action → accelerator (null = defaults)
  onboarded: boolean // first-run guided tour already completed/skipped
  favorites: string | null // JSON array of pinned sidebar shortcuts (SplitTarget[])
}

/** Settings safe to send to the renderer (never includes the raw key). */
export function getPublicSettings(): AppSettings {
  return {
    provider: getSetting('provider') ?? 'anthropic',
    model: getSetting('model') ?? 'claude-opus-4-8',
    // True if a key is available from any source (stored or env fallback),
    // so the UI doesn't nag when CLAUDE_API_KEY lives in the environment.
    hasApiKey: !!resolveApiKey(),
    activeWorkspace: getSetting('activeWorkspace'),
    theme: getSetting('theme') ?? 'light',
    shortcuts: getSetting('shortcuts'),
    transcriptionEngine: getSetting('transcriptionEngine') ?? 'cloud',
    transcriptionBaseUrl: getSetting('transcriptionBaseUrl') ?? DEFAULT_TRANSCRIBE_URL,
    transcriptionModel: getSetting('transcriptionModel') ?? DEFAULT_TRANSCRIBE_MODEL,
    hasTranscriptionKey: !!resolveTranscriptionKey(),
    onboarded: getSetting('onboarded') === '1',
    favorites: getSetting('favorites')
  }
}
