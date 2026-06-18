import { describe, it, expect } from 'vitest'
import { parseTags, aggregate, groupByPrefix } from '../src/main/db/tag-util'

describe('parseTags', () => {
  it('splits on commas (both ASCII and full-width), trims, de-dupes', () => {
    expect(parseTags('AI, 副业，AI ,  增长 ')).toEqual(['AI', '副业', '增长'])
  })
  it('returns [] for empty/null', () => {
    expect(parseTags('')).toEqual([])
    expect(parseTags(null)).toEqual([])
  })
})

describe('aggregate', () => {
  it('counts across strings, sorts by count then name', () => {
    const r = aggregate(['AI,副业', 'AI', '副业,增长', null])
    expect(r).toEqual([
      { tag: 'AI', count: 2 },
      { tag: '副业', count: 2 },
      { tag: '增长', count: 1 }
    ])
  })
})

describe('groupByPrefix', () => {
  it('groups by first / segment, 其他 last', () => {
    const groups = groupByPrefix([
      { tag: '平台/小红书', count: 3 },
      { tag: '平台/公众号', count: 1 },
      { tag: '随手记', count: 5 },
      { tag: '主题/AI', count: 2 }
    ])
    const prefixes = groups.map((g) => g.prefix)
    expect(prefixes[prefixes.length - 1]).toBe('其他') // un-prefixed last
    expect(prefixes).toContain('平台')
    expect(prefixes).toContain('主题')
    const plat = groups.find((g) => g.prefix === '平台')!
    expect(plat.tags.map((t) => t.tag)).toEqual(['平台/小红书', '平台/公众号'])
  })
})
