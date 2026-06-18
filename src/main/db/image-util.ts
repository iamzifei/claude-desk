/**
 * Tiny pure helpers for image materials. Kept dependency-free so the
 * media-type mapping (which gates what we send to the vision model) is unit
 * testable without touching the filesystem or Electron.
 */
export type ImageMediaType = 'image/png' | 'image/jpeg' | 'image/gif' | 'image/webp'

/** Map a file path's extension to a Claude-supported image media type, or null. */
export function mediaTypeForPath(path: string): ImageMediaType | null {
  const ext = path.toLowerCase().split('.').pop() ?? ''
  switch (ext) {
    case 'png':
      return 'image/png'
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg'
    case 'gif':
      return 'image/gif'
    case 'webp':
      return 'image/webp'
    default:
      return null
  }
}
