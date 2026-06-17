import { describe, it, expect } from 'vitest'
import { resampleTo16k } from '../src/renderer/src/audio'

describe('resampleTo16k', () => {
  it('returns the input unchanged at 16kHz', () => {
    const input = new Float32Array([0.1, 0.2, 0.3])
    expect(resampleTo16k(input, 16000)).toBe(input)
  })

  it('downsamples 48kHz to ~1/3 the length', () => {
    const input = new Float32Array(48000).fill(0.5)
    const out = resampleTo16k(input, 48000)
    expect(out.length).toBe(16000)
    // a constant signal stays constant after linear interpolation
    expect(out[100]).toBeCloseTo(0.5, 5)
  })

  it('preserves endpoints reasonably', () => {
    const input = new Float32Array([1, 0, 1, 0, 1, 0])
    const out = resampleTo16k(input, 48000)
    expect(out.length).toBe(2)
    expect(out[0]).toBeCloseTo(1, 5)
  })
})
