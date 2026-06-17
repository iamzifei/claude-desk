import { randomUUID } from 'crypto'
import { getDb } from './index'

export interface Material {
  id: string
  title: string
  content: string
  url: string | null
  tags: string | null
  in_context: number // 0 | 1 — included in the creation context
  created_at: number
}

export interface NewMaterial {
  title: string
  content: string
  url?: string
  tags?: string
}

export function listMaterials(): Material[] {
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

export function createMaterial(m: NewMaterial): Material {
  const mat: Material = {
    id: randomUUID(),
    title: m.title.trim() || '未命名素材',
    content: m.content,
    url: m.url?.trim() || null,
    tags: m.tags?.trim() || null,
    in_context: 0,
    created_at: Date.now()
  }
  getDb()
    .prepare(
      'INSERT INTO materials (id, title, content, url, tags, in_context, created_at) VALUES (@id, @title, @content, @url, @tags, @in_context, @created_at)'
    )
    .run(mat)
  return mat
}

export function updateMaterial(id: string, m: NewMaterial): void {
  getDb()
    .prepare('UPDATE materials SET title = ?, content = ?, url = ?, tags = ? WHERE id = ?')
    .run(m.title.trim() || '未命名素材', m.content, m.url?.trim() || null, m.tags?.trim() || null, id)
}

export function toggleMaterialContext(id: string, on: boolean): void {
  getDb().prepare('UPDATE materials SET in_context = ? WHERE id = ?').run(on ? 1 : 0, id)
}

export function deleteMaterial(id: string): void {
  getDb().prepare('DELETE FROM materials WHERE id = ?').run(id)
}

/** Concatenate in-context materials into a system-prompt fragment (empty if none). */
export function buildMaterialsSystemPrompt(): string {
  const mats = getDb()
    .prepare('SELECT title, content, url, tags FROM materials WHERE in_context = 1 ORDER BY created_at')
    .all() as { title: string; content: string; url: string | null; tags: string | null }[]
  if (mats.length === 0) return ''
  return (
    '以下是用户「素材库」中当前启用的参考素材，创作时可引用其中的事实、观点、风格或数据：\n\n' +
    mats
      .map(
        (m) =>
          `【${m.title}】${m.tags ? `（标签：${m.tags}）` : ''}\n${m.content}${m.url ? `\n来源：${m.url}` : ''}`
      )
      .join('\n\n')
  )
}
