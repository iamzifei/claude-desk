import { describe, it, expect } from 'vitest'
import { snippet, likePattern } from '../src/main/db/search-util'

describe('snippet', () => {
  it('returns short content as-is (collapsed whitespace)', () => {
    expect(snippet('hi  there', 'x')).toBe('hi there')
  })

  it('centers on the first match with ellipses', () => {
    const s = snippet('a'.repeat(50) + '关键词' + 'b'.repeat(50), '关键词', 20)
    expect(s).toContain('关键词')
    expect(s.startsWith('…')).toBe(true)
    expect(s.endsWith('…')).toBe(true)
  })

  it('falls back to the head when no match', () => {
    const s = snippet('x'.repeat(100), 'zzz', 10)
    expect(s.length).toBeLessThanOrEqual(11)
    expect(s.endsWith('…')).toBe(true)
  })

  it('is case-insensitive', () => {
    expect(snippet('Hello World here', 'world', 30)).toContain('World')
  })
})

describe('likePattern', () => {
  it('wraps in % and escapes LIKE wildcards', () => {
    expect(likePattern('a')).toBe('%a%')
    expect(likePattern('50%_off')).toBe('%50\\%\\_off%')
  })
})
