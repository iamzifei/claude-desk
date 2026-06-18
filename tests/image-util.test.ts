import { describe, it, expect } from 'vitest'
import { mediaTypeForPath } from '../src/main/db/image-util'

describe('mediaTypeForPath', () => {
  it('maps supported extensions (case-insensitive)', () => {
    expect(mediaTypeForPath('/a/b.png')).toBe('image/png')
    expect(mediaTypeForPath('photo.JPG')).toBe('image/jpeg')
    expect(mediaTypeForPath('x.jpeg')).toBe('image/jpeg')
    expect(mediaTypeForPath('anim.GIF')).toBe('image/gif')
    expect(mediaTypeForPath('pic.webp')).toBe('image/webp')
  })

  it('returns null for unsupported or extension-less paths', () => {
    expect(mediaTypeForPath('/a/file.bmp')).toBeNull()
    expect(mediaTypeForPath('/a/file.svg')).toBeNull()
    expect(mediaTypeForPath('noext')).toBeNull()
    expect(mediaTypeForPath('')).toBeNull()
  })
})
