import Anthropic from '@anthropic-ai/sdk'
import { getProvider, DEFAULT_MODEL } from './providers'
import { getSetting, resolveApiKey } from '../db/settings'
import { buildSkillsSystemPrompt } from '../db/skills'
import { buildMaterialsSystemPrompt, listContextImages } from '../db/materials'
import { buildAtomsSystemPrompt } from '../db/atoms'
import { buildRequestTools } from './tools'
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
  modelOverride?: string | null,
  systemOverride?: string,
  webSearch?: boolean,
  /** Additive system prefix (e.g. referenced-conversation context). Ignored
   *  when `systemOverride` is given. */
  systemPrefix?: string
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
    // A caller-supplied system (e.g. platform rewrite) wins; otherwise the
    // enabled skills + in-context materials shape the assistant.
    const system =
      systemOverride ??
      [
        systemPrefix,
        buildSkillsSystemPrompt(),
        buildMaterialsSystemPrompt(),
        buildAtomsSystemPrompt()
      ]
        .filter(Boolean)
        .join('\n\n')

    // Build the message list, folding any in-context image materials into the
    // first user turn as real vision blocks (system prompts can't carry images).
    const messages: Anthropic.MessageParam[] = history.map((m) => ({
      role: m.role,
      content: m.content
    }))
    const images = listContextImages()
    if (images.length) {
      const firstUser = messages.findIndex((m) => m.role === 'user')
      if (firstUser >= 0) {
        const text = messages[firstUser].content as string
        messages[firstUser] = {
          role: 'user',
          content: [
            ...images.map(
              (im) =>
                ({
                  type: 'image',
                  source: { type: 'base64', media_type: im.media_type, data: im.data }
                }) as const
            ),
            { type: 'text', text }
          ]
        }
      }
    }

    // Optional hosted tools (e.g. web search) — gated by provider.
    const tools = buildRequestTools({ webSearch, providerId: provider.id })

    try {
      const stream = client.messages.stream(
        {
          model,
          max_tokens: 64000, // streaming → generous ceiling (see claude-api guidance)
          // Adaptive thinking, with a readable summary streamed to the UI.
          thinking: { type: 'adaptive', display: 'summarized' },
          ...(system ? { system } : {}),
          ...(tools ? { tools } : {}),
          messages
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

// Errors worth a retry: timeouts, connection drops, rate-limits, 5xx, overload.
const TRANSIENT_ERROR =
  /timed out|timeout|ETIMEDOUT|ECONNRESET|ENOTFOUND|network|fetch failed|connection error|overloaded|rate.?limit|\b(429|500|502|503|529)\b/i

/**
 * Run a prompt to completion and resolve with the full assistant text. Used by
 * the one-shot engines (装配 / 诊断 / 去AI味 / 拆原子 / 出选题 / 模板). Retries
 * transient failures (timeouts/5xx) a couple of times before giving up — these
 * have no interactive "resend", so silent retry is the right call.
 */
export function runOnce(
  history: Message[],
  modelOverride?: string | null,
  systemOverride?: string
): Promise<string> {
  return attempt(history, modelOverride, systemOverride, 2)
}

function attempt(
  history: Message[],
  modelOverride: string | null | undefined,
  systemOverride: string | undefined,
  retries: number
): Promise<string> {
  return new Promise((resolve) => {
    let out = ''
    runChat(
      history,
      (c) => {
        if (c.type === 'text') out += c.text
        else if (c.type === 'done') resolve(out)
        else if (c.type === 'error') {
          // Only retry when nothing was streamed yet and the error looks transient.
          if (retries > 0 && !out.trim() && TRANSIENT_ERROR.test(c.message)) {
            setTimeout(
              () => resolve(attempt(history, modelOverride, systemOverride, retries - 1)),
              800
            )
          } else {
            resolve(out.trim() ? out : `[错误] ${c.message}`)
          }
        }
      },
      modelOverride,
      systemOverride
    )
  })
}
