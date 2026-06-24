import { randomUUID } from 'crypto'
import { basename, dirname } from 'path'
import { getDb } from './index'
import {
  parseSkillMd,
  formatSkillsPrompt,
  slugifySkillName,
  extractSlashTokens
} from './skill-parse'

export { parseSkillMd }

interface SkillRow {
  id: string
  name: string
  description: string | null
  content: string
  enabled: number
  source: string // 'custom' | 'imported' | 'installed'
  created_at: number
}

export interface Skill extends SkillRow {
  slug: string // `/command`-friendly id, stable across re-scans
}

/**
 * A skill's `/command` slug. Installed skills use their on-disk folder name
 * (e.g. `ads-review`); others slugify the name. Same logic on both the picker
 * (insert `/slug`) and the send-time parser (match `/slug`).
 */
export function skillSlug(id: string, name: string): string {
  if (id.startsWith('inst:')) return basename(dirname(id.slice(5)))
  return slugifySkillName(name)
}

const withSlug = (r: SkillRow): Skill => ({ ...r, slug: skillSlug(r.id, r.name) })

export interface NewSkill {
  name: string
  description?: string
  content: string
  source?: string
}

export function listSkills(): Skill[] {
  const rows = getDb().prepare('SELECT * FROM skills ORDER BY created_at DESC').all() as SkillRow[]
  return rows.map(withSlug)
}

/** Lightweight skill index for the composer's `/` picker (no heavy content). */
export function listSkillNames(): { name: string; slug: string; description: string | null }[] {
  return listSkills().map((s) => ({ name: s.name, slug: s.slug, description: s.description }))
}

export function createSkill(s: NewSkill): Skill {
  const row: SkillRow = {
    id: randomUUID(),
    name: s.name.trim() || '未命名技能',
    description: s.description?.trim() || null,
    content: s.content,
    enabled: 1,
    source: s.source ?? 'custom',
    created_at: Date.now()
  }
  getDb()
    .prepare(
      'INSERT INTO skills (id, name, description, content, enabled, source, created_at) VALUES (@id, @name, @description, @content, @enabled, @source, @created_at)'
    )
    .run(row)
  return withSlug(row)
}

/**
 * Build a system fragment for skills explicitly invoked with `/slug` in a
 * message — applied for that turn regardless of the always-on enable flag
 * (Claude-Code-style on-demand skills). Empty if none matched.
 */
export function buildInvokedSkillsPrompt(text: string): string {
  const slugs = extractSlashTokens(text)
  if (slugs.length === 0) return ''
  const all = listSkills()
  const picked: { name: string; content: string }[] = []
  const seen = new Set<string>()
  for (const slug of slugs) {
    const sk = all.find((s) => s.slug.toLowerCase() === slug.toLowerCase())
    if (sk && !seen.has(sk.id)) {
      seen.add(sk.id)
      picked.push({ name: sk.name, content: sk.content })
    }
  }
  if (picked.length === 0) return ''
  return (
    '用户在本条消息中用「/」调用了以下技能，请优先运用它们的指引完成本次任务：\n\n' +
    picked.map((s) => `## 技能：${s.name}\n${s.content}`).join('\n\n')
  )
}

export function toggleSkill(id: string, enabled: boolean): void {
  getDb()
    .prepare('UPDATE skills SET enabled = ? WHERE id = ?')
    .run(enabled ? 1 : 0, id)
}

export function deleteSkill(id: string): void {
  getDb().prepare('DELETE FROM skills WHERE id = ?').run(id)
}

/**
 * Reconcile the `source='installed'` rows with what was just scanned from disk.
 * Upserts each (preserving the user's enable/disable choice on existing rows;
 * new ones default to *disabled* so a large skill library doesn't flood every
 * prompt) and prunes installed rows whose file is gone. Never touches custom or
 * imported skills.
 */
export function syncInstalledSkills(
  scanned: { id: string; name: string; description: string | null; content: string }[]
): void {
  const db = getDb()
  const now = Date.now()
  const upsert = db.prepare(
    `INSERT INTO skills (id, name, description, content, enabled, source, created_at)
     VALUES (@id, @name, @description, @content, 0, 'installed', @created_at)
     ON CONFLICT(id) DO UPDATE SET
       name = excluded.name, description = excluded.description, content = excluded.content`
  )
  const ids = scanned.map((s) => s.id)
  db.transaction(() => {
    for (const s of scanned) upsert.run({ ...s, created_at: now })
    if (ids.length === 0) {
      db.prepare("DELETE FROM skills WHERE source = 'installed'").run()
    } else {
      const ph = ids.map(() => '?').join(',')
      db.prepare(`DELETE FROM skills WHERE source = 'installed' AND id NOT IN (${ph})`).run(...ids)
    }
  })()
}

/** Concatenate enabled skills into a system-prompt fragment (empty if none). */
export function buildSkillsSystemPrompt(): string {
  const enabled = getDb()
    .prepare('SELECT name, content FROM skills WHERE enabled = 1 ORDER BY created_at')
    .all() as { name: string; content: string }[]
  return formatSkillsPrompt(enabled)
}
