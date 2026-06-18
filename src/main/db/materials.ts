import { randomUUID } from 'crypto'
import { copyFileSync, mkdirSync, existsSync, readFileSync, unlinkSync } from 'fs'
import { extname, join } from 'path'
import { app } from 'electron'
import { getDb } from './index'
import { formatMaterialsPrompt } from './skill-parse'

export type MaterialKind = 'text' | 'image' | 'link'

export interface Material {
  id: string
  title: string
  content: string
  url: string | null
  tags: string | null
  kind: MaterialKind
  image_path: string | null
  platform: string | null
  in_context: number // 0 | 1 — included in the creation context
  created_at: number
}

export interface NewMaterial {
  title: string
  content: string
  url?: string
  tags?: string
  kind?: MaterialKind
  image_path?: string | null
  platform?: string | null
}

/** Directory holding imported image materials (created lazily). */
function imageDir(): string {
  const dir = join(app.getPath('userData'), 'materials')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  return dir
}

/** Copy a picked image into the app's material store; returns the stored path. */
export function saveImageFile(srcPath: string): string {
  const ext = (extname(srcPath) || '.png').toLowerCase()
  const dest = join(imageDir(), `${randomUUID()}${ext}`)
  copyFileSync(srcPath, dest)
  return dest
}

/** Read a stored image back as a data URL for display in the renderer. */
export function imageDataUrl(path: string): string | null {
  try {
    if (!path.startsWith(imageDir())) return null // confine reads to our store
    const ext = extname(path).slice(1).toLowerCase() || 'png'
    const mime = ext === 'jpg' ? 'jpeg' : ext
    return `data:image/${mime};base64,${readFileSync(path).toString('base64')}`
  } catch {
    return null
  }
}

export function listMaterials(platform?: string): Material[] {
  if (platform && platform !== 'all') {
    return getDb()
      .prepare('SELECT * FROM materials WHERE platform = ? ORDER BY created_at DESC')
      .all(platform) as Material[]
  }
  return getDb().prepare('SELECT * FROM materials ORDER BY created_at DESC').all() as Material[]
}

export function searchMaterials(query: string): Material[] {
  const q = `%${query.trim()}%`
  return getDb()
    .prepare(
      'SELECT * FROM materials WHERE title LIKE ? OR content LIKE ? OR tags LIKE ? ORDER BY created_at DESC'
    )
    .all(q, q, q) as Material[]
}

/** Distinct non-empty platform tags currently in use (for the group filter). */
export function listMaterialPlatforms(): string[] {
  return (
    getDb()
      .prepare(
        "SELECT DISTINCT platform FROM materials WHERE platform IS NOT NULL AND platform <> '' ORDER BY platform"
      )
      .all() as { platform: string }[]
  ).map((r) => r.platform)
}

export function createMaterial(m: NewMaterial): Material {
  const mat: Material = {
    id: randomUUID(),
    title: m.title.trim() || '未命名素材',
    content: m.content,
    url: m.url?.trim() || null,
    tags: m.tags?.trim() || null,
    kind: m.kind ?? 'text',
    image_path: m.image_path ?? null,
    platform: m.platform?.trim() || null,
    in_context: 0,
    created_at: Date.now()
  }
  getDb()
    .prepare(
      `INSERT INTO materials (id, title, content, url, tags, kind, image_path, platform, in_context, created_at)
       VALUES (@id, @title, @content, @url, @tags, @kind, @image_path, @platform, @in_context, @created_at)`
    )
    .run(mat)
  return mat
}

export function updateMaterial(id: string, m: NewMaterial): void {
  getDb()
    .prepare(
      'UPDATE materials SET title = ?, content = ?, url = ?, tags = ?, platform = ? WHERE id = ?'
    )
    .run(
      m.title.trim() || '未命名素材',
      m.content,
      m.url?.trim() || null,
      m.tags?.trim() || null,
      m.platform?.trim() || null,
      id
    )
}

export function toggleMaterialContext(id: string, on: boolean): void {
  getDb().prepare('UPDATE materials SET in_context = ? WHERE id = ?').run(on ? 1 : 0, id)
}

export function deleteMaterial(id: string): void {
  // Clean up the backing image file, if any, before removing the row.
  const row = getDb().prepare('SELECT image_path FROM materials WHERE id = ?').get(id) as
    | { image_path: string | null }
    | undefined
  if (row?.image_path) {
    try {
      if (row.image_path.startsWith(imageDir())) unlinkSync(row.image_path)
    } catch {
      // best-effort; ignore if already gone
    }
  }
  getDb().prepare('DELETE FROM materials WHERE id = ?').run(id)
}

/** Concatenate in-context materials into a system-prompt fragment (empty if none). */
export function buildMaterialsSystemPrompt(): string {
  const rows = getDb()
    .prepare(
      'SELECT title, content, url, tags, kind FROM materials WHERE in_context = 1 ORDER BY created_at'
    )
    .all() as {
    title: string
    content: string
    url: string | null
    tags: string | null
    kind: string
  }[]
  // Image materials can't ride the text system prompt as pixels yet, so we
  // surface their title + caption and flag them so the model knows the context.
  const mats = rows.map((r) => ({
    title: r.kind === 'image' ? `${r.title}（图片素材）` : r.title,
    content: r.content,
    url: r.url,
    tags: r.tags
  }))
  return formatMaterialsPrompt(mats)
}
