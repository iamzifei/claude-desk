export interface BrowserAction {
  thought: string
  action: 'click' | 'type' | 'navigate' | 'scroll' | 'done'
  index?: number
  text?: string
  url?: string
  answer?: string
}

const ACTIONS = new Set(['click', 'type', 'navigate', 'scroll', 'done'])

/**
 * Validate/coerce the model's tool output to a known shape. The renderer
 * executes these in a webview, so never trust the raw fields: index must be a
 * bounded integer, action must be in the enum, url restricted to http(s).
 */
export function sanitizeBrowserAction(input: unknown): BrowserAction {
  const o = (input ?? {}) as Record<string, unknown>
  const action = ACTIONS.has(o.action as string) ? (o.action as BrowserAction['action']) : 'done'
  const out: BrowserAction = {
    thought: typeof o.thought === 'string' ? o.thought.slice(0, 500) : '',
    action
  }
  const idx = Number(o.index)
  if (Number.isInteger(idx) && idx >= 0 && idx < 5000) out.index = idx
  if (typeof o.text === 'string') out.text = o.text.slice(0, 2000)
  if (typeof o.url === 'string' && /^https?:\/\//i.test(o.url)) out.url = o.url
  if (typeof o.answer === 'string') out.answer = o.answer
  return out
}
