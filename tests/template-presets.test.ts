import { describe, it, expect } from 'vitest'
import { buildTemplatePrompt } from '../src/main/agent/template-presets'

describe('buildTemplatePrompt', () => {
  it('embeds the winning title + platform and asks for a reusable template', () => {
    const { system, prompt } = buildTemplatePrompt('我靠AI月入过万的方法', '小红书')
    expect(prompt).toContain('我靠AI月入过万的方法')
    expect(prompt).toContain('小红书')
    expect(system).toContain('模板')
    expect(system).toContain('标题公式')
  })
  it('omits platform line when absent', () => {
    const { prompt } = buildTemplatePrompt('只有标题')
    expect(prompt).toContain('只有标题')
    expect(prompt).not.toContain('平台:')
  })
})
