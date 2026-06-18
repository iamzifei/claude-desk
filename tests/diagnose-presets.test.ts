import { describe, it, expect } from 'vitest'
import {
  buildDiagnosePrompt,
  buildDeAIPrompt,
  DIAGNOSIS_DIMENSIONS
} from '../src/main/agent/diagnose-presets'

describe('buildDiagnosePrompt', () => {
  it('embeds the draft and all five dimensions', () => {
    const { system, prompt } = buildDiagnosePrompt('我的初稿正文')
    expect(prompt).toContain('我的初稿正文')
    for (const d of DIAGNOSIS_DIMENSIONS) expect(system).toContain(d)
    expect(system).toContain('第一步行动')
    expect(system).toContain('一句话结论')
  })
})

describe('buildDeAIPrompt', () => {
  it('asks to strip AI flavor and embeds the draft', () => {
    const { system, prompt } = buildDeAIPrompt('一段很 AI 的文字')
    expect(prompt).toContain('一段很 AI 的文字')
    expect(system).toContain('去 AI 味')
    expect(system).not.toContain('参考素材') // no voice context given
  })

  it('appends voice context when provided', () => {
    const { system } = buildDeAIPrompt('draft', '我的语气:毒舌、接地气')
    expect(system).toContain('参考素材')
    expect(system).toContain('毒舌、接地气')
  })
})
