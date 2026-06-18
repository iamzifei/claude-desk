import { randomUUID } from 'crypto'
import { getDb } from './index'
import { extractWikiLinks } from './link-parse'

export type LinkKind = 'material' | 'atom' | 'note' | 'topic' | 'conversation'

export interface Backlink {
  from_kind: LinkKind
  from_id: string
  title: string
}

export interface ResolvedTarget {
  kind: LinkKind
  id: string
}

/** Resolve a [[title]] to an entity. Preference: material → topic → note → conversation. */
export function resolveTitle(title: string): ResolvedTarget | null {
  const db = getDb()
  const t = title.trim()
  if (!t) return null
  const tries: [LinkKind, string][] = [
    ['material', 'SELECT id FROM materials WHERE title = ? LIMIT 1'],
    ['topic', 'SELECT id FROM topics WHERE title = ? LIMIT 1'],
    ['note', 'SELECT id FROM notes WHERE title = ? LIMIT 1'],
    ['conversation', 'SELECT id FROM conversations WHERE title = ? AND archived = 0 LIMIT 1']
  ]
  for (const [kind, sql] of tries) {
    const row = db.prepare(sql).get(t) as { id: string } | undefined
    if (row) return { kind, id: row.id }
  }
  return null
}

/** Re-derive a source's outgoing links from its content. */
export function rebuildLinks(fromKind: LinkKind, fromId: string, content: string): void {
  const db = getDb()
  db.prepare('DELETE FROM links WHERE from_kind = ? AND from_id = ?').run(fromKind, fromId)
  const titles = extractWikiLinks(content)
  if (titles.length === 0) return
  const insert = db.prepare(
    'INSERT INTO links (id, from_kind, from_id, to_title, to_kind, to_id, created_at) VALUES (?,?,?,?,?,?,?)'
  )
  const now = Date.now()
  db.transaction(() => {
    for (const title of titles) {
      const target = resolveTitle(title)
      insert.run(randomUUID(), fromKind, fromId, title, target?.kind ?? null, target?.id ?? null, now)
    }
  })()
}

/**
 * Resolve links that pointed at a title before the target existed (Obsidian
 * resolves links retroactively). Call when a titled entity is created/renamed.
 */
export function resolvePending(title: string, kind: LinkKind, id: string): void {
  const t = title.trim()
  if (!t) return
  getDb()
    .prepare('UPDATE links SET to_kind = ?, to_id = ? WHERE to_id IS NULL AND to_title = ?')
    .run(kind, id, t)
}

/** Remove all links from/to an entity when it's deleted. */
export function purgeLinks(kind: LinkKind, id: string): void {
  getDb()
    .prepare('DELETE FROM links WHERE (from_kind=? AND from_id=?) OR (to_kind=? AND to_id=?)')
    .run(kind, id, kind, id)
}

/** Entities that link TO the given target. */
export function getBacklinks(kind: LinkKind, id: string): Backlink[] {
  const rows = getDb()
    .prepare('SELECT from_kind, from_id FROM links WHERE to_kind = ? AND to_id = ?')
    .all(kind, id) as { from_kind: LinkKind; from_id: string }[]
  // de-dupe (a source may reference the same target twice)
  const seen = new Set<string>()
  const out: Backlink[] = []
  for (const r of rows) {
    const k = r.from_kind + r.from_id
    if (seen.has(k)) continue
    seen.add(k)
    out.push({ from_kind: r.from_kind, from_id: r.from_id, title: titleOf(r.from_kind, r.from_id) })
  }
  return out
}

function titleOf(kind: LinkKind, id: string): string {
  const db = getDb()
  const get = (sql: string): string | undefined =>
    (db.prepare(sql).get(id) as { title?: string; content?: string } | undefined)?.title
  switch (kind) {
    case 'material':
      return get('SELECT title FROM materials WHERE id=?') ?? '素材'
    case 'topic':
      return get('SELECT title FROM topics WHERE id=?') ?? '选题'
    case 'note':
      return get('SELECT title FROM notes WHERE id=?') ?? '笔记'
    case 'conversation':
      return get('SELECT title FROM conversations WHERE id=?') ?? '对话'
    case 'atom': {
      const a = db.prepare('SELECT content FROM atoms WHERE id=?').get(id) as { content: string } | undefined
      return a ? a.content.slice(0, 20) : '原子'
    }
    default:
      return ''
  }
}
