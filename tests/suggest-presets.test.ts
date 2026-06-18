import { describe, it, expect } from 'vitest'
import {
  engagementScore,
  formatPublicationsSummary,
  buildSuggestPrompt,
  parseTopicSuggestions
} from '../src/main/agent/suggest-presets'

const pub = (o: Partial<Parameters<typeof engagementScore>[0]>): any => ({
  title: 't',
  platform: null,
  views: 0,
  likes: 0,
  comments: 0,
  saves: 0,
  ...o
})

describe('engagementScore', () => {
  it('weights saves > comments > likes', () => {
    expect(engagementScore(pub({ likes: 10 }))).toBe(10)
    expect(engagementScore(pub({ comments: 10 }))).toBe(20)
    expect(engagementScore(pub({ saves: 10 }))).toBe(30)
  })
})

describe('formatPublicationsSummary', () => {
  it('orders by engagement, best first', () => {
    const s = formatPublicationsSummary([
      pub({ title: 'low', likes: 1 }),
      pub({ title: 'high', saves: 20 })
    ])
    expect(s.indexOf('high')).toBeLessThan(s.indexOf('low'))
  })
})

describe('buildSuggestPrompt', () => {
  it('embeds the summary and asks for JSON', () => {
    const { system, prompt } = buildSuggestPrompt('「X」播放100', 5)
    expect(prompt).toContain('「X」播放100')
    expect(system).toContain('JSON')
    expect(system).toContain('5')
  })
})

describe('parseTopicSuggestions', () => {
  it('parses an array, tolerates fences/prose, drops empties', () => {
    const raw = '建议如下:\n```json\n[{"title":"A","angle":"反常识"},{"angle":"无标题"},{"title":"B"}]\n```'
    expect(parseTopicSuggestions(raw)).toEqual([
      { title: 'A', angle: '反常识' },
      { title: 'B', angle: undefined }
    ])
  })
  it('returns [] on junk', () => {
    expect(parseTopicSuggestions('nope')).toEqual([])
  })
})
