import { describe, it, expect } from 'vitest'
import { recommendFormat } from '../src/renderer/src/format-match'

describe('recommendFormat', () => {
  it('opinion/cognitive-conflict → short video', () => {
    expect(recommendFormat('为什么大多数人副业都失败').format).toBe('短视频口播')
    expect(recommendFormat('副业最大的误区').format).toBe('短视频口播')
  })
  it('personal case → image-text + short video', () => {
    expect(recommendFormat('我靠AI接单月入过万').format).toBe('图文 + 短视频')
  })
  it('deep analysis → long form', () => {
    expect(recommendFormat('AI内容创作方法论全解').platform).toBe('公众号')
  })
  it('tool/tutorial → image-text', () => {
    const r = recommendFormat('10个AI工具清单')
    expect(r.format).toBe('图文')
    expect(r.platform).toBe('小红书')
  })
  it('controversy → live', () => {
    expect(recommendFormat('AI该不该取代人工客服,开杠').format).toBe('直播')
  })
  it('falls back to image-text', () => {
    expect(recommendFormat('随便一个标题').format).toBe('图文')
  })
})
