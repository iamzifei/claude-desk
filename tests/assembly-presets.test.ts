import { describe, it, expect } from 'vitest'
import { formatAssemblyContext, buildAssemblyPrompt } from '../src/main/agent/assembly-presets'

describe('formatAssemblyContext', () => {
  it('numbers items with kind + title + content', () => {
    const s = formatAssemblyContext([
      { kind: '原子', title: '', content: '先完成再完美' },
      { kind: '素材', title: '读者画像', content: '25-35 都市女性' }
    ])
    expect(s).toContain('1. 【原子】先完成再完美')
    expect(s).toContain('2. 【素材】读者画像：25-35 都市女性')
  })
  it('handles empty asset list gracefully', () => {
    expect(formatAssemblyContext([])).toContain('没有检索到相关素材')
  })
})

describe('buildAssemblyPrompt', () => {
  it('embeds topic, angle, platform and the context', () => {
    const { system, prompt } = buildAssemblyPrompt(
      { title: '副业避坑', angle: '反常识', platform: '小红书' },
      '1. 【原子】X'
    )
    expect(prompt).toContain('副业避坑')
    expect(prompt).toContain('反常识')
    expect(prompt).toContain('小红书')
    expect(prompt).toContain('1. 【原子】X')
    expect(system).toContain('装配')
  })
  it('omits optional lines when absent', () => {
    const { prompt } = buildAssemblyPrompt({ title: '只有标题' }, 'ctx')
    expect(prompt).toContain('只有标题')
    expect(prompt).not.toContain('切入角度')
    expect(prompt).not.toContain('目标平台')
  })
})
