import { describe, it, expect } from 'vitest'
import { PLATFORMS, platformById, buildRewritePrompt } from '../src/main/agent/platform-presets'

describe('platform presets', () => {
  it('exposes well-formed platforms with unique ids', () => {
    expect(PLATFORMS.length).toBeGreaterThanOrEqual(3)
    const ids = PLATFORMS.map((p) => p.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const p of PLATFORMS) {
      expect(p.id && p.label && p.hint && p.guide).toBeTruthy()
    }
  })

  it('looks up a platform by id', () => {
    expect(platformById('xiaohongshu')?.label).toBe('小红书')
    expect(platformById('nope')).toBeUndefined()
  })

  it('builds a rewrite prompt embedding source + platform guide', () => {
    const p = platformById('douyin')!
    const { system, prompt } = buildRewritePrompt(p, '我的产品很好用')
    expect(prompt).toContain('我的产品很好用')
    expect(prompt).toContain('抖音')
    expect(system).toContain(p.guide)
    expect(system).not.toContain('可参考的素材') // no extra context given
  })

  it('appends extra context when provided', () => {
    const p = platformById('xiaohongshu')!
    const { system } = buildRewritePrompt(p, 'src', '品牌口吻：温暖')
    expect(system).toContain('可参考的素材')
    expect(system).toContain('品牌口吻：温暖')
  })
})
