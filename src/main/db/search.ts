import { getDb } from './index'
import { snippet, likePattern } from './search-util'

export type SearchKind = 'conversation' | 'material' | 'atom' | 'note'

export interface SearchHit {
  kind: SearchKind
  id: string
  title: string
  snippet: string
  meta: string | null // e.g. atom type / material platform / note type
  // For notes/conversations we also surface where to jump.
  noteType?: 'review' | 'minutes' | 'daily'
}

/**
 * Unified quick-switch search across conversations, materials, atoms and notes.
 * Conversations & notes are scoped to the active workspace; the material/atom
 * library is global. Uses LIKE (fast enough for a single user's local data);
 * an FTS5 index can replace this if scale demands.
 */
export function searchAll(workspaceId: string | null, query: string, limit = 8): SearchHit[] {
  const q = query.trim()
  if (!q) return []
  const like = likePattern(q)
  const db = getDb()
  const hits: SearchHit[] = []

  // Conversations (by title or any message content) in the workspace.
  if (workspaceId) {
    const rows = db
      .prepare(
        `SELECT DISTINCT c.id, c.title, c.updated_at
         FROM conversations c LEFT JOIN messages m ON m.conversation_id = c.id
         WHERE c.workspace_id = ? AND c.archived = 0
           AND (c.title LIKE ? ESCAPE '\\' OR m.content LIKE ? ESCAPE '\\')
         ORDER BY c.updated_at DESC LIMIT ?`
      )
      .all(workspaceId, like, like, limit) as { id: string; title: string }[]
    for (const r of rows) hits.push({ kind: 'conversation', id: r.id, title: r.title, snippet: '', meta: '对话' })
  }

  const mats = db
    .prepare(
      `SELECT id, title, content, platform FROM materials
       WHERE title LIKE ? ESCAPE '\\' OR content LIKE ? ESCAPE '\\' OR tags LIKE ? ESCAPE '\\'
       ORDER BY created_at DESC LIMIT ?`
    )
    .all(like, like, like, limit) as { id: string; title: string; content: string; platform: string | null }[]
  for (const m of mats)
    hits.push({ kind: 'material', id: m.id, title: m.title, snippet: snippet(m.content, q), meta: m.platform || '素材' })

  const atoms = db
    .prepare(
      `SELECT id, content, type FROM atoms
       WHERE content LIKE ? ESCAPE '\\' OR tags LIKE ? ESCAPE '\\'
       ORDER BY created_at DESC LIMIT ?`
    )
    .all(like, like, limit) as { id: string; content: string; type: string }[]
  for (const a of atoms)
    hits.push({ kind: 'atom', id: a.id, title: snippet(a.content, q, 36), snippet: snippet(a.content, q), meta: a.type })

  if (workspaceId) {
    const notes = db
      .prepare(
        `SELECT id, type, title, content FROM notes
         WHERE workspace_id = ? AND (title LIKE ? ESCAPE '\\' OR content LIKE ? ESCAPE '\\')
         ORDER BY created_at DESC LIMIT ?`
      )
      .all(workspaceId, like, like, limit) as { id: string; type: string; title: string; content: string }[]
    for (const n of notes)
      hits.push({
        kind: 'note',
        id: n.id,
        title: n.title,
        snippet: snippet(n.content, q),
        meta: '笔记',
        noteType: n.type as SearchHit['noteType']
      })
  }

  return hits
}
