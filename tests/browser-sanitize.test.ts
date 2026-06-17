import { describe, it, expect } from 'vitest'
import { sanitizeBrowserAction } from '../src/main/agent/browser-sanitize'

describe('sanitizeBrowserAction — untrusted model output', () => {
  it('keeps a valid click action with index', () => {
    const a = sanitizeBrowserAction({ thought: 'go', action: 'click', index: 3 })
    expect(a).toEqual({ thought: 'go', action: 'click', index: 3 })
  })

  it('coerces an unknown action to done', () => {
    expect(sanitizeBrowserAction({ action: 'exec' }).action).toBe('done')
    expect(sanitizeBrowserAction({}).action).toBe('done')
  })

  it('drops a non-integer / out-of-range / injected index', () => {
    expect(sanitizeBrowserAction({ action: 'click', index: '1"]});alert(1)//' }).index).toBeUndefined()
    expect(sanitizeBrowserAction({ action: 'click', index: 1.5 }).index).toBeUndefined()
    expect(sanitizeBrowserAction({ action: 'click', index: -1 }).index).toBeUndefined()
    expect(sanitizeBrowserAction({ action: 'click', index: 99999 }).index).toBeUndefined()
  })

  it('only accepts http(s) urls', () => {
    expect(sanitizeBrowserAction({ action: 'navigate', url: 'https://a.com' }).url).toBe('https://a.com')
    expect(sanitizeBrowserAction({ action: 'navigate', url: 'javascript:alert(1)' }).url).toBeUndefined()
    expect(sanitizeBrowserAction({ action: 'navigate', url: 'file:///etc/passwd' }).url).toBeUndefined()
  })

  it('caps long strings and defaults thought', () => {
    const a = sanitizeBrowserAction({ action: 'type', text: 'x'.repeat(5000) })
    expect(a.text!.length).toBe(2000)
    expect(a.thought).toBe('')
  })
})
