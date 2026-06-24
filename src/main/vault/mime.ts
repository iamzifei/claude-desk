/**
 * Minimal extension → MIME map for in-app file preview (images, PDF, plain
 * text/code, common docs). Pure & unit-tested. Unknown extensions fall back to
 * `application/octet-stream`, which the renderer treats as "open externally".
 */
const MIME: Record<string, string> = {
  // images
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.bmp': 'image/bmp',
  '.avif': 'image/avif',
  '.ico': 'image/x-icon',
  // documents
  '.pdf': 'application/pdf',
  // text / code (previewed as text)
  '.txt': 'text/plain',
  '.md': 'text/markdown',
  '.markdown': 'text/markdown',
  '.csv': 'text/csv',
  '.tsv': 'text/tab-separated-values',
  '.json': 'application/json',
  '.yaml': 'text/yaml',
  '.yml': 'text/yaml',
  '.xml': 'text/xml',
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.ts': 'text/plain',
  '.py': 'text/x-python',
  '.sh': 'text/x-shellscript',
  '.log': 'text/plain'
}

export function mimeForExt(ext: string): string {
  return MIME[ext.toLowerCase()] ?? 'application/octet-stream'
}

/** Coarse category the renderer uses to pick a preview surface. */
export type PreviewKind = 'markdown' | 'image' | 'pdf' | 'text' | 'binary'

const TEXT_EXTS = new Set([
  '.txt',
  '.csv',
  '.tsv',
  '.json',
  '.yaml',
  '.yml',
  '.xml',
  '.html',
  '.css',
  '.js',
  '.ts',
  '.py',
  '.sh',
  '.log'
])
const IMAGE_EXTS = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.webp',
  '.svg',
  '.bmp',
  '.avif',
  '.ico'
])

/** Classify a file by extension into a preview surface. */
export function previewKindForRel(rel: string): PreviewKind {
  const dot = rel.lastIndexOf('.')
  const ext = dot >= 0 ? rel.slice(dot).toLowerCase() : ''
  if (ext === '.md' || ext === '.markdown' || ext === '.mdx') return 'markdown'
  if (IMAGE_EXTS.has(ext)) return 'image'
  if (ext === '.pdf') return 'pdf'
  if (TEXT_EXTS.has(ext)) return 'text'
  return 'binary'
}
