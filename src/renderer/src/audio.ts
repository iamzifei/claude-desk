/** Linear-resample mono float samples to 16kHz for the offline recognizer. Pure. */
export function resampleTo16k(input: Float32Array, srcRate: number): Float32Array {
  if (srcRate === 16000) return input
  const ratio = srcRate / 16000
  const out = new Float32Array(Math.floor(input.length / ratio))
  for (let i = 0; i < out.length; i++) {
    const idx = i * ratio
    const i0 = Math.floor(idx)
    const frac = idx - i0
    out[i] = (input[i0] ?? 0) * (1 - frac) + (input[i0 + 1] ?? 0) * frac
  }
  return out
}
