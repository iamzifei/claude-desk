import { getDb } from './index'
import { parseTags, aggregate, groupByPrefix, type TagGroup } from './tag-util'

export interface TaggedItem {
  kind: 'material' | 'atom'
  id: string
  title: string
  tags: string | null
}

/** Distinct tags across materials + atoms, grouped by `/` prefix with counts. */
export function tagGroups(): TagGroup[] {
  const db = getDb()
  const mt = (db.prepare('SELECT tags FROM materials').all() as { tags: string | null }[]).map(
    (r) => r.tags
  )
  const at = (db.prepare('SELECT tags FROM atoms').all() as { tags: string | null }[]).map(
    (r) => r.tags
  )
  return groupByPrefix(aggregate([...mt, ...at]))
}

/** Materials + atoms carrying an exact tag (LIKE pre-filter, exact post-filter). */
export function itemsByTag(tag: string): TaggedItem[] {
  const db = getDb()
  const like = `%${tag}%`
  const out: TaggedItem[] = []
  const mats = db
    .prepare('SELECT id, title, tags FROM materials WHERE tags LIKE ? ORDER BY created_at DESC')
    .all(like) as { id: string; title: string; tags: string | null }[]
  for (const m of mats) if (parseTags(m.tags).includes(tag)) out.push({ kind: 'material', ...m })
  const atoms = db
    .prepare('SELECT id, content, tags FROM atoms WHERE tags LIKE ? ORDER BY created_at DESC')
    .all(like) as { id: string; content: string; tags: string | null }[]
  for (const a of atoms)
    if (parseTags(a.tags).includes(tag))
      out.push({ kind: 'atom', id: a.id, title: a.content.slice(0, 40), tags: a.tags })
  return out
}
