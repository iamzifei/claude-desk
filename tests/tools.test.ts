import { describe, it, expect } from 'vitest'
import { buildRequestTools } from '../src/main/agent/tools'

describe('buildRequestTools — web search gating', () => {
  it('returns undefined when web search is off', () => {
    expect(buildRequestTools({ webSearch: false, providerId: 'anthropic' })).toBeUndefined()
    expect(buildRequestTools({})).toBeUndefined()
  })

  it('attaches the web_search tool on Anthropic when enabled', () => {
    const tools = buildRequestTools({ webSearch: true, providerId: 'anthropic' })
    expect(tools).toHaveLength(1)
    expect(tools![0]).toMatchObject({ type: 'web_search_20250305', name: 'web_search' })
  })

  it('defaults provider to anthropic when unspecified', () => {
    expect(buildRequestTools({ webSearch: true })).toHaveLength(1)
  })

  it('does NOT attach web search on non-Anthropic providers (unsupported)', () => {
    for (const providerId of ['deepseek', 'zhipu', 'moonshot']) {
      expect(buildRequestTools({ webSearch: true, providerId })).toBeUndefined()
    }
  })
})
