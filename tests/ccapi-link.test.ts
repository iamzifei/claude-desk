import { describe, it, expect } from 'vitest'
import { ccapiModelUrl } from '../src/renderer/src/brand'

/**
 * CCAPI relay deep-links: must hit the model-specific landing page
 * (valid slugs on ccapi.ai: claude-opus / claude-sonnet / claude-haiku)
 * and always carry UTM attribution for the desktop app.
 */
describe('ccapiModelUrl', () => {
  it('maps the selected model to its landing slug', () => {
    expect(ccapiModelUrl('claude-opus-4-8')).toContain('/models/claude-opus?')
    expect(ccapiModelUrl('claude-haiku-4-5')).toContain('/models/claude-haiku?')
    expect(ccapiModelUrl('claude-sonnet-4-6')).toContain('/models/claude-sonnet?')
  })

  it('falls back to sonnet for unknown/non-Claude/missing models', () => {
    expect(ccapiModelUrl('deepseek-chat')).toContain('/models/claude-sonnet?')
    expect(ccapiModelUrl(undefined)).toContain('/models/claude-sonnet?')
    expect(ccapiModelUrl(null)).toContain('/models/claude-sonnet?')
  })

  it('always carries UTM attribution', () => {
    const url = new URL(ccapiModelUrl('claude-opus-4-8', 'settings'))
    expect(url.origin).toBe('https://ccapi.ai')
    expect(url.searchParams.get('utm_source')).toBe('lingxi-desktop')
    expect(url.searchParams.get('utm_medium')).toBe('app')
    expect(url.searchParams.get('utm_campaign')).toBe('api-relay')
    expect(url.searchParams.get('utm_content')).toBe('settings')
  })

  it('omits utm_content when no touchpoint is given', () => {
    const url = new URL(ccapiModelUrl('claude-sonnet-4-6'))
    expect(url.searchParams.has('utm_content')).toBe(false)
  })
})
