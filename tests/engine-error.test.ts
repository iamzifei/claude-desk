import { describe, it, expect } from 'vitest'
import { isEngineError, engineErrorText } from '../src/renderer/src/engine-error'

describe('isEngineError', () => {
  it('detects the [错误] sentinel, with or without leading space', () => {
    expect(isEngineError('[错误] Request timed out.')).toBe(true)
    expect(isEngineError('  [错误] 网络异常')).toBe(true)
  })

  it('treats real content (and empty/null) as not an error', () => {
    expect(isEngineError('我用 AI 做副业的复盘…')).toBe(false)
    expect(isEngineError('')).toBe(false)
    expect(isEngineError(null)).toBe(false)
    expect(isEngineError(undefined)).toBe(false)
  })
})

describe('engineErrorText', () => {
  it('strips the prefix', () => {
    expect(engineErrorText('[错误] Request timed out.')).toBe('Request timed out.')
  })

  it('falls back to a friendly message when nothing follows the prefix', () => {
    expect(engineErrorText('[错误]')).toBe('生成失败，请稍后重试。')
  })
})
