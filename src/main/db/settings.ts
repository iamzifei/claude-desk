import { safeStorage } from 'electron'
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

export interface AppSettings {
  provider: string
  model: string
  hasApiKey: boolean
}

/** Settings safe to send to the renderer (never includes the raw key). */
export function getPublicSettings(): AppSettings {
  return {
    provider: getSetting('provider') ?? 'anthropic',
    model: getSetting('model') ?? 'claude-opus-4-8',
    hasApiKey: !!getSetting('apiKey')
  }
}
