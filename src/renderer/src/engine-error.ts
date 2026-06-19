/**
 * The one-shot engines (装配/诊断/去AI味/改写…) resolve with a `[错误] …`
 * sentinel string when a request fails after retries — they can't throw across
 * the IPC boundary as a streamed result. These helpers let the UI tell a real
 * result apart from a failure so it renders an error state (with 重试) instead
 * of treating the error text as the creator's draft. Pure & unit-tested.
 */

const PREFIX = '[错误]'

/** True if an engine result is actually a failure sentinel, not real content. */
export function isEngineError(text: string | null | undefined): boolean {
  return !!text && text.trimStart().startsWith(PREFIX)
}

/** Strip the sentinel prefix for display; falls back to a friendly message. */
export function engineErrorText(text: string): string {
  const msg = text.trimStart().slice(PREFIX.length).trim()
  return msg || '生成失败，请稍后重试。'
}
