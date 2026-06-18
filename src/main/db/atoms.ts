import { randomUUID } from 'crypto'
import { getDb } from './index'
import type { AtomType, ExtractedAtom } from './atom-extract'

export interface Atom {
  id: string
  content: string
  type: AtomType
  source_kind: string | null // 'material' | 'conversation' | 'manual'
  source_id: string | null
  tags: string | null
  in_context: number
  created_at: number
}

export interface NewAtom {
  content: string
  type?: AtomType
  source_kind?: string | null
  source_id?: string | null
  tags?: string | null
}

export function getAtom(id: string): Atom | undefined {
  return getDb().prepare('SELECT * FROM atoms WHERE id = ?').get(id) as Atom | undefined
}

export function listAtoms(type?: string): Atom[] {
  if (type && type !== 'all') {
    return getDb()
      .prepare('SELECT * FROM atoms WHERE type = ? ORDER BY created_at DESC')
      .all(type) as Atom[]
  }
  return getDb().prepare('SELECT * FROM atoms ORDER BY created_at DESC').all() as Atom[]
}

export function searchAtoms(query: string): Atom[] {
  const q = `%${query.trim()}%`
  return getDb()
    .prepare('SELECT * FROM atoms WHERE content LIKE ? OR tags LIKE ? ORDER BY created_at DESC')
    .all(q, q) as Atom[]
}

/** Distinct atom types currently in use (for the filter chips). */
export function listAtomTypes(): string[] {
  return (
    getDb()
      .prepare("SELECT DISTINCT type FROM atoms WHERE type IS NOT NULL AND type <> '' ORDER BY type")
      .all() as { type: string }[]
  ).map((r) => r.type)
}

export function createAtom(a: NewAtom): Atom {
  const atom: Atom = {
    id: randomUUID(),
    content: a.content.trim(),
    type: a.type ?? '观点',
    source_kind: a.source_kind ?? 'manual',
    source_id: a.source_id ?? null,
    tags: a.tags?.trim() || null,
    in_context: 0,
    created_at: Date.now()
  }
  getDb()
    .prepare(
      `INSERT INTO atoms (id, content, type, source_kind, source_id, tags, in_context, created_at)
       VALUES (@id, @content, @type, @source_kind, @source_id, @tags, @in_context, @created_at)`
    )
    .run(atom)
  return atom
}

/** Bulk-insert extracted atoms in one transaction; returns the created rows. */
export function createAtoms(
  items: ExtractedAtom[],
  source: { kind: string; id: string | null }
): Atom[] {
  const insert = getDb().prepare(
    `INSERT INTO atoms (id, content, type, source_kind, source_id, tags, in_context, created_at)
     VALUES (@id, @content, @type, @source_kind, @source_id, @tags, @in_context, @created_at)`
  )
  const now = Date.now()
  const rows: Atom[] = items.map((it, i) => ({
    id: randomUUID(),
    content: it.content,
    type: it.type,
    source_kind: source.kind,
    source_id: source.id,
    tags: it.tags ?? null,
    in_context: 0,
    created_at: now + i // preserve order
  }))
  getDb().transaction(() => rows.forEach((r) => insert.run(r)))()
  return rows
}

export function updateAtom(id: string, a: NewAtom): void {
  getDb()
    .prepare('UPDATE atoms SET content = ?, type = ?, tags = ? WHERE id = ?')
    .run(a.content.trim(), a.type ?? '观点', a.tags?.trim() || null, id)
}

export function toggleAtomContext(id: string, on: boolean): void {
  getDb().prepare('UPDATE atoms SET in_context = ? WHERE id = ?').run(on ? 1 : 0, id)
}

export function deleteAtom(id: string): void {
  getDb().prepare('DELETE FROM atoms WHERE id = ?').run(id)
}

/** Concatenate in-context atoms into a system-prompt fragment (empty if none). */
export function buildAtomsSystemPrompt(): string {
  const rows = getDb()
    .prepare('SELECT content, type, tags FROM atoms WHERE in_context = 1 ORDER BY created_at')
    .all() as { content: string; type: string; tags: string | null }[]
  if (rows.length === 0) return ''
  return (
    '以下是用户「知识原子」库中当前启用的复用单元,创作时可直接引用:\n\n' +
    rows.map((a) => `【${a.type}】${a.content}${a.tags ? `(标签:${a.tags})` : ''}`).join('\n')
  )
}
