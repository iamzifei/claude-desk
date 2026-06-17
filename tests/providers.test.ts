import { describe, it, expect } from 'vitest'
import { PROVIDERS, getProvider, DEFAULT_PROVIDER, DEFAULT_MODEL } from '../src/main/agent/providers'

describe('providers', () => {
  it('returns the requested provider', () => {
    expect(getProvider('deepseek').id).toBe('deepseek')
    expect(getProvider('anthropic').baseURL).toBe('https://api.anthropic.com')
  })

  it('falls back to the default provider for unknown ids', () => {
    expect(getProvider('does-not-exist').id).toBe(DEFAULT_PROVIDER)
  })

  it('default model belongs to the default provider', () => {
    expect(PROVIDERS[DEFAULT_PROVIDER].models).toContain(DEFAULT_MODEL)
  })

  it('every provider has a baseURL and at least one model', () => {
    for (const p of Object.values(PROVIDERS)) {
      expect(p.baseURL).toMatch(/^https?:\/\//)
      expect(p.models.length).toBeGreaterThan(0)
      expect(p.label.length).toBeGreaterThan(0)
    }
  })
})
