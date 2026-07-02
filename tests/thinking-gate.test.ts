import { describe, it, expect } from 'vitest'
import { supportsAdaptiveThinking } from '../src/main/agent/run'

/**
 * Adaptive thinking is only accepted by the Claude 4.6+ families.
 * Sending `thinking: { type: 'adaptive' }` to anything else is a hard 400
 * (notably claude-haiku-4-5, the bug that motivated this gate), so the
 * capability check must be precise in both directions.
 */
describe('supportsAdaptiveThinking', () => {
  it('accepts the Claude 4.6+ families', () => {
    expect(supportsAdaptiveThinking('claude-fable-5')).toBe(true)
    expect(supportsAdaptiveThinking('claude-mythos-5')).toBe(true)
    expect(supportsAdaptiveThinking('claude-opus-4-6')).toBe(true)
    expect(supportsAdaptiveThinking('claude-opus-4-7')).toBe(true)
    expect(supportsAdaptiveThinking('claude-opus-4-8')).toBe(true)
    expect(supportsAdaptiveThinking('claude-sonnet-4-6')).toBe(true)
  })

  it('rejects Haiku 4.5 (the 400-causing case) and dated variants', () => {
    expect(supportsAdaptiveThinking('claude-haiku-4-5')).toBe(false)
    expect(supportsAdaptiveThinking('claude-haiku-4-5-20251001')).toBe(false)
  })

  it('rejects older Claude models', () => {
    expect(supportsAdaptiveThinking('claude-opus-4-5')).toBe(false)
    expect(supportsAdaptiveThinking('claude-opus-4-1')).toBe(false)
    expect(supportsAdaptiveThinking('claude-sonnet-4-5')).toBe(false)
    expect(supportsAdaptiveThinking('claude-3-5-haiku-20241022')).toBe(false)
  })

  it('rejects non-Anthropic models served via compatible endpoints', () => {
    expect(supportsAdaptiveThinking('deepseek-chat')).toBe(false)
    expect(supportsAdaptiveThinking('deepseek-reasoner')).toBe(false)
    expect(supportsAdaptiveThinking('glm-4-plus')).toBe(false)
    expect(supportsAdaptiveThinking('moonshot-v1-128k')).toBe(false)
  })
})
