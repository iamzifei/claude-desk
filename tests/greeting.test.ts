import { describe, it, expect, vi, afterEach } from 'vitest'
import { greeting } from '../src/renderer/src/utils'

afterEach(() => vi.useRealTimers())

function at(hour: number): string {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(2026, 0, 1, hour, 0, 0))
  return greeting()
}

describe('greeting — time-aware, creator-oriented', () => {
  it('returns a non-empty string for every hour', () => {
    for (let h = 0; h < 24; h++) {
      expect(at(h).length).toBeGreaterThan(0)
    }
  })

  it('uses distinct buckets across the day', () => {
    expect(at(3)).toContain('夜深')
    expect(at(7)).toContain('早上好')
    expect(at(10)).toContain('上午好')
    expect(at(13)).toContain('中午好')
    expect(at(16)).toContain('下午好')
    expect(at(20)).toContain('晚上好')
    expect(at(23)).toContain('夜深')
  })
})
