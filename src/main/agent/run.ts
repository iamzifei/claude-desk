import Anthropic from '@anthropic-ai/sdk'
import { getProvider, DEFAULT_MODEL } from './providers'
import { getSetting, resolveApiKey } from '../db/settings'
import { buildSkillsSystemPrompt } from '../db/skills'
import { buildMaterialsSystemPrompt } from '../db/materials'
import type { Message } from '../db/conversations'

/**
 * The streaming chat engine — the heart of the app. v0 uses the official
 * `@anthropic-ai/sdk` directly: pure HTTPS streaming, no subprocess, dead
 * reliable to package in Electron. The request goes straight from this
 * machine to the configured provider with the user's own key (BYO-key).
 *
 * UPGRADE PATH to a full coding agent (file edits, bash, tools): swap the body
 * of `runChat` to call `@anthropic-ai/claude-agent-sdk`'s `query()` instead and
 * forward its richer event stream. The IPC/preload/renderer contract below
 * (text deltas + done/error) is intentionally generic so that swap is local to
 * this file.
 */

export type Chunk =
  | { type: 'text'; text: string }
  | { type: 'thinking'; text: string }
  | { type: 'done' }
  | { type: 'error'; message: string }

export interface RunHandle {
  cancel: () => void
}

/**
 * Stream a completion for the given conversation history.
 * @param history  full prior messages (user/assistant), oldest first
 * @param onChunk  called for every streamed delta and the terminal event
 * @returns a handle whose `cancel()` aborts the in-flight request
 */
export function runChat(
  history: Message[],
  onChunk: (c: Chunk) => void,
  modelOverride?: string | null
): RunHandle {
  const controller = new AbortController()

  ;(async () => {
    const apiKey = resolveApiKey()
    if (!apiKey) {
      onChunk({
        type: 'error',
        message:
          'No API key found. Open Settings and paste your provider API key (or set CLAUDE_API_KEY in your environment / ~/.env).'
      })
      return
    }

    const provider = getProvider(getSetting('provider') ?? 'anthropic')
    // Per-conversation model wins over the global default.
    const model = modelOverride || getSetting('model') || DEFAULT_MODEL

    const client = new Anthropic({ apiKey, baseURL: provider.baseURL })
    // Enabled skills + in-context materials shape the assistant.
    const system = [buildSkillsSystemPrompt(), buildMaterialsSystemPrompt()]
      .filter(Boolean)
      .join('\n\n')

    try {
      const stream = client.messages.stream(
        {
          model,
          max_tokens: 64000, // streaming → generous ceiling (see claude-api guidance)
          // Adaptive thinking, with a readable summary streamed to the UI.
          thinking: { type: 'adaptive', display: 'summarized' },
          ...(system ? { system } : {}),
          messages: history.map((m) => ({ role: m.role, content: m.content }))
        },
        { signal: controller.signal }
      )

      for await (const event of stream) {
        if (event.type === 'content_block_delta') {
          if (event.delta.type === 'text_delta') {
            onChunk({ type: 'text', text: event.delta.text })
          } else if (event.delta.type === 'thinking_delta') {
            onChunk({ type: 'thinking', text: event.delta.thinking })
          }
        }
      }
      onChunk({ type: 'done' })
    } catch (err) {
      // Aborts surface as an error; treat them as a clean stop.
      if (controller.signal.aborted) {
        onChunk({ type: 'done' })
        return
      }
      const message =
        err instanceof Anthropic.APIError
          ? `${err.status ?? ''} ${err.message}`.trim()
          : err instanceof Error
            ? err.message
            : String(err)
      onChunk({ type: 'error', message })
    }
  })()

  return { cancel: () => controller.abort() }
}

/**
 * Run a prompt to completion and resolve with the full assistant text.
 * Used by background features (scheduled tasks, daily review, meeting minutes)
 * that need a one-shot result rather than a streamed UI.
 */
export function runOnce(history: Message[], modelOverride?: string | null): Promise<string> {
  return new Promise((resolve) => {
    let out = ''
    runChat(
      history,
      (c) => {
        if (c.type === 'text') out += c.text
        else if (c.type === 'done') resolve(out)
        else if (c.type === 'error') resolve(`[错误] ${c.message}`)
      },
      modelOverride
    )
  })
}
