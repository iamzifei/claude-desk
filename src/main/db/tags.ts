import { getDb } from './index'
import { parseTags, aggregate, groupByPrefix, type TagGroup } from './tag-util'
import { scopeClause } from './scope'

/** ` AND <scope>` fragment for tag queries (empty under the 全部 scope). */
function scopeAnd(): { sql: string; params: string[] } {
  const sc = scopeClause()
  return { sql: sc.sql ? `AND ${sc.sql}` : '', params: sc.params }
}

export interface TaggedItem {
  kind: 'material' | 'atom'
  id: string
  title: string
  tags: string | null
}

/** Distinct tags across materials + atoms, grouped by `/` prefix with counts. */
export function tagGroups(): TagGroup[] {
  const db = getDb()
  const sc = scopeAnd()
  const mt = (
    db.prepare(`SELECT tags FROM materials WHERE 1=1 ${sc.sql}`).all(...sc.params) as {
      tags: string | null
    }[]
  ).map((r) => r.tags)
  const at = (
    db.prepare(`SELECT tags FROM atoms WHERE 1=1 ${sc.sql}`).all(...sc.params) as {
      tags: string | null
    }[]
  ).map((r) => r.tags)
  return groupByPrefix(aggregate([...mt, ...at]))
}

/** Materials + atoms carrying an exact tag (LIKE pre-filter, exact post-filter). */
export function itemsByTag(tag: string): TaggedItem[] {
  const db = getDb()
  const like = `%${tag}%`
  const sc = scopeAnd()
  const out: TaggedItem[] = []
  const mats = db
    .prepare(
      `SELECT id, title, tags FROM materials WHERE tags LIKE ? ${sc.sql} ORDER BY created_at DESC`
    )
    .all(like, ...sc.params) as { id: string; title: string; tags: string | null }[]
  for (const m of mats) if (parseTags(m.tags).includes(tag)) out.push({ kind: 'material', ...m })
  const atoms = db
    .prepare(
      `SELECT id, content, tags FROM atoms WHERE tags LIKE ? ${sc.sql} ORDER BY created_at DESC`
    )
    .all(like, ...sc.params) as { id: string; content: string; tags: string | null }[]
  for (const a of atoms)
    if (parseTags(a.tags).includes(tag))
      out.push({ kind: 'atom', id: a.id, title: a.content.slice(0, 40), tags: a.tags })
  return out
}
