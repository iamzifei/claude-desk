import { describe, it, expect } from 'vitest'
import {
  eventToAccelerator,
  matchShortcut,
  mergeShortcuts,
  DEFAULT_SHORTCUTS
} from '../src/renderer/src/shortcuts'

const ev = (o: Partial<Parameters<typeof eventToAccelerator>[0]>): any => ({
  metaKey: false,
  ctrlKey: false,
  altKey: false,
  shiftKey: false,
  key: '',
  code: '',
  ...o
})

describe('eventToAccelerator', () => {
  it('builds Mod+N from ⌘N', () => {
    expect(eventToAccelerator(ev({ metaKey: true, code: 'KeyN', key: 'n' }))).toBe('Mod+N')
  })
  it('treats Ctrl as Mod (cross-platform)', () => {
    expect(eventToAccelerator(ev({ ctrlKey: true, code: 'KeyT', key: 't' }))).toBe('Mod+T')
  })
  it('orders modifiers Mod+Alt+Shift+key and is shift-independent on the key', () => {
    expect(
      eventToAccelerator(ev({ metaKey: true, altKey: true, shiftKey: true, code: 'KeyN', key: 'N' }))
    ).toBe('Mod+Alt+Shift+N')
  })
  it('maps digits and space by physical code', () => {
    expect(eventToAccelerator(ev({ metaKey: true, code: 'Digit1', key: '1' }))).toBe('Mod+1')
    expect(eventToAccelerator(ev({ ctrlKey: true, code: 'Space', key: ' ' }))).toBe('Mod+Space')
  })
})

describe('matchShortcut', () => {
  it('matches the exact accelerator', () => {
    expect(matchShortcut(ev({ metaKey: true, code: 'KeyN', key: 'n' }), 'Mod+N')).toBe(true)
    expect(
      matchShortcut(ev({ metaKey: true, shiftKey: true, code: 'KeyN', key: 'N' }), 'Mod+Shift+N')
    ).toBe(true)
  })
  it('does not match when modifiers differ', () => {
    expect(matchShortcut(ev({ metaKey: true, code: 'KeyN' }), 'Mod+Shift+N')).toBe(false)
    expect(matchShortcut(ev({ code: 'KeyN', key: 'n' }), 'Mod+N')).toBe(false)
  })
  it('a bare modifier press never matches', () => {
    expect(matchShortcut(ev({ metaKey: true, code: 'MetaLeft', key: 'Meta' }), 'Mod+N')).toBe(false)
  })
  it('empty accelerator never matches', () => {
    expect(matchShortcut(ev({ metaKey: true, code: 'KeyN' }), '')).toBe(false)
  })
})

describe('mergeShortcuts', () => {
  it('returns defaults for null/empty', () => {
    expect(mergeShortcuts(null)).toEqual(DEFAULT_SHORTCUTS)
  })
  it('overrides only known actions, ignores junk', () => {
    const merged = mergeShortcuts({ 'new-chat': 'Mod+J', bogus: 'Mod+Z', 'new-tab': '' })
    expect(merged['new-chat']).toBe('Mod+J')
    expect(merged['new-tab']).toBe(DEFAULT_SHORTCUTS['new-tab']) // empty ignored
    expect((merged as Record<string, string>).bogus).toBeUndefined()
  })
})
