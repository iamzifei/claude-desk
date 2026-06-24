import { randomUUID } from 'crypto'
import { copyFileSync, mkdirSync, existsSync, readFileSync, unlinkSync, realpathSync } from 'fs'
import { extname, join, resolve, sep } from 'path'
import { app } from 'electron'
import { getDb } from './index'
import { formatMaterialsPrompt } from './skill-parse'
import { mediaTypeForPath, type ImageMediaType } from './image-util'
import { rebuildLinks, resolvePending, purgeLinks } from './links'
import { scopeClause, scopeProjectId } from './scope'

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
  status: MaterialStatus // 'inbox' (待整理) | '已整理'
  created_at: number
}

export type MaterialStatus = 'inbox' | '已整理'

export interface NewMaterial {
  title: string
  content: string
  url?: string
  tags?: string
  kind?: MaterialKind
  image_path?: string | null
  platform?: string | null
  status?: MaterialStatus // quick-capture → 'inbox'; full form → '已整理' (default)
}

/** Directory holding imported image materials (created lazily). */
function imageDir(): string {
  const dir = join(app.getPath('userData'), 'materials')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  return dir
}

/**
 * Resolve a renderer-supplied path and require it to live *inside* the image
 * store after symlink/`..` canonicalization. `startsWith` alone is bypassable
 * (e.g. `.../materials/../../etc/passwd`), so we realpath both sides. Returns
 * the real path if contained, else null. The file must exist.
 */
function pathInStore(path: unknown): string | null {
  if (typeof path !== 'string' || !path) return null
  try {
    const base = realpathSync(imageDir())
    const real = realpathSync(resolve(path))
    return real === base || real.startsWith(base + sep) ? real : null
  } catch {
    return null
  }
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
  const real = pathInStore(path)
  if (!real) return null
  try {
    const ext = extname(real).slice(1).toLowerCase() || 'png'
    const mime = ext === 'jpg' ? 'jpeg' : ext
    return `data:image/${mime};base64,${readFileSync(real).toString('base64')}`
  } catch {
    return null
  }
}

export function getMaterial(id: string): Material | undefined {
  return getDb().prepare('SELECT * FROM materials WHERE id = ?').get(id) as Material | undefined
}

export function listMaterials(platform?: string): Material[] {
  const conds: string[] = []
  const params: unknown[] = []
  if (platform && platform !== 'all') {
    conds.push('platform = ?')
    params.push(platform)
  }
  const sc = scopeClause()
  if (sc.sql) {
    conds.push(sc.sql)
    params.push(...sc.params)
  }
  const where = conds.length ? `WHERE ${conds.join(' AND ')}` : ''
  return getDb()
    .prepare(`SELECT * FROM materials ${where} ORDER BY created_at DESC`)
    .all(...params) as Material[]
}

export function searchMaterials(query: string): Material[] {
  const q = `%${query.trim()}%`
  const params: unknown[] = [q, q, q]
  const sc = scopeClause()
  const scopeSql = sc.sql ? `AND ${sc.sql}` : ''
  params.push(...sc.params)
  return getDb()
    .prepare(
      `SELECT * FROM materials WHERE (title LIKE ? OR content LIKE ? OR tags LIKE ?) ${scopeSql} ORDER BY created_at DESC`
    )
    .all(...params) as Material[]
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
  // Only accept an image path that actually lives in our store — never trust a
  // renderer-supplied absolute path (it later feeds fs reads/unlink).
  const safeImagePath = m.image_path ? pathInStore(m.image_path) : null
  const mat: Material = {
    id: randomUUID(),
    title: m.title.trim() || '未命名素材',
    content: m.content,
    url: m.url?.trim() || null,
    tags: m.tags?.trim() || null,
    kind: m.kind ?? 'text',
    image_path: safeImagePath,
    platform: m.platform?.trim() || null,
    in_context: 0,
    status: m.status === 'inbox' ? 'inbox' : '已整理',
    created_at: Date.now()
  }
  getDb()
    .prepare(
      `INSERT INTO materials (id, title, content, url, tags, kind, image_path, platform, in_context, status, created_at)
       VALUES (@id, @title, @content, @url, @tags, @kind, @image_path, @platform, @in_context, @status, @created_at)`
    )
    .run(mat)
  // Stamp the active project scope (null under 全部/未归类 → stays unfiled).
  const pid = scopeProjectId()
  if (pid) getDb().prepare('UPDATE materials SET project_id = ? WHERE id = ?').run(pid, mat.id)
  rebuildLinks('material', mat.id, mat.content)
  resolvePending(mat.title, 'material', mat.id)
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
  rebuildLinks('material', id, m.content)
  resolvePending(m.title.trim() || '未命名素材', 'material', id)
}

export function toggleMaterialContext(id: string, on: boolean): void {
  getDb()
    .prepare('UPDATE materials SET in_context = ? WHERE id = ?')
    .run(on ? 1 : 0, id)
}

/** Move a material between the Inbox (待整理) and 已整理 states. */
export function setMaterialStatus(id: string, status: MaterialStatus): void {
  getDb()
    .prepare('UPDATE materials SET status = ? WHERE id = ?')
    .run(status === 'inbox' ? 'inbox' : '已整理', id)
}

export function deleteMaterial(id: string): void {
  // Clean up the backing image file, if any, before removing the row.
  const row = getDb().prepare('SELECT image_path FROM materials WHERE id = ?').get(id) as
    | { image_path: string | null }
    | undefined
  if (row?.image_path) {
    const real = pathInStore(row.image_path)
    if (real) {
      try {
        unlinkSync(real)
      } catch {
        // best-effort; ignore if already gone
      }
    }
  }
  getDb().prepare('DELETE FROM materials WHERE id = ?').run(id)
  purgeLinks('material', id)
}

export interface ContextImage {
  media_type: ImageMediaType
  data: string // base64
}

/**
 * In-context image materials as base64 blocks for the vision model. Capped so a
 * runaway library can't bloat every request; reads are confined to our store.
 */
export function listContextImages(limit = 4): ContextImage[] {
  const rows = getDb()
    .prepare(
      "SELECT image_path FROM materials WHERE in_context = 1 AND kind = 'image' AND image_path IS NOT NULL ORDER BY created_at"
    )
    .all() as { image_path: string }[]
  const out: ContextImage[] = []
  for (const r of rows) {
    if (out.length >= limit) break
    const media_type = mediaTypeForPath(r.image_path)
    if (!media_type) continue
    const real = pathInStore(r.image_path)
    if (!real) continue
    try {
      out.push({ media_type, data: readFileSync(real).toString('base64') })
    } catch {
      // skip unreadable files
    }
  }
  return out
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

/**
 * Concatenate the creator's persona/voice materials — those tagged 人设 / 风格 /
 * 口吻 / 语气 (or whose title says so) — into a system-prompt fragment. Used by
 * 去 AI 味 to rewrite in the creator's own voice rather than a generic casual
 * tone. Returns '' if the creator hasn't marked any persona material yet.
 */
export function buildPersonaPrompt(): string {
  const rows = getDb()
    .prepare(
      `SELECT title, content, url, tags FROM materials
       WHERE kind != 'image' AND (
         tags LIKE '%人设%' OR tags LIKE '%风格%' OR tags LIKE '%口吻%' OR tags LIKE '%语气%'
         OR title LIKE '%人设%' OR title LIKE '%口吻%' OR title LIKE '%风格%'
       )
       ORDER BY created_at`
    )
    .all() as { title: string; content: string; url: string | null; tags: string | null }[]
  return formatMaterialsPrompt(rows)
}
