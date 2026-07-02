import { randomUUID } from 'crypto'
import { basename, dirname } from 'path'
import { getDb } from './index'
import {
  parseSkillMd,
  formatSkillsPrompt,
  slugifySkillName,
  extractSlashTokens,
  dedupeSkillsBySlug
} from './skill-parse'
import { BUILTIN_ID_PREFIX, planBuiltinSeed, type BuiltinSkillFile } from './builtin-skills'

export { parseSkillMd }

interface SkillRow {
  id: string
  name: string
  description: string | null
  content: string
  enabled: number
  source: string // 'custom' | 'imported' | 'installed' | 'builtin'
  created_at: number
}

export interface Skill extends SkillRow {
  slug: string // `/command`-friendly id, stable across re-scans
}

/**
 * A skill's `/command` slug. Builtin skills carry it in their id
 * (`builtin:<slug>` — frontmatter-declared, never derived from the often-CJK
 * display name); installed skills use their on-disk folder name (e.g.
 * `ads-review`); others slugify the name. Same logic on both the picker
 * (insert `/slug`) and the send-time parser (match `/slug`).
 */
export function skillSlug(id: string, name: string): string {
  if (id.startsWith(BUILTIN_ID_PREFIX)) return id.slice(BUILTIN_ID_PREFIX.length)
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

/**
 * Lightweight skill index for the composer's `/` picker (no heavy content).
 * Slug-deduped so a builtin skill and the user's own copy of it (same slug in
 * ~/.claude/skills) show as one entry — the user's version wins, matching the
 * send-time resolution in buildInvokedSkillsPrompt.
 */
export function listSkillNames(): { name: string; slug: string; description: string | null }[] {
  return dedupeSkillsBySlug(listSkills()).map((s) => ({
    name: s.name,
    slug: s.slug,
    description: s.description
  }))
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
  // Dedupe by slug first: the user's own version of a skill (installed /
  // custom / imported) overrides the app-bundled builtin one.
  const all = dedupeSkillsBySlug(listSkills())
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

/**
 * Seed / refresh the app-bundled builtin skills (`source='builtin'`,
 * id `builtin:<slug>`). Runs on every startup and is idempotent:
 *   - new bundled skills are inserted (core ones enabled by default,
 *     see builtin-skills.DEFAULT_ENABLED_SLUGS);
 *   - content upgrades update name/description/content but preserve the
 *     user's enable/disable choice;
 *   - builtin rows whose bundled file disappeared are pruned.
 * Never touches installed / custom / imported skills.
 */
export function syncBuiltinSkills(scanned: BuiltinSkillFile[]): void {
  const db = getDb()
  const existing = db
    .prepare("SELECT id, name, description, content FROM skills WHERE source = 'builtin'")
    .all() as { id: string; name: string; description: string | null; content: string }[]
  const plan = planBuiltinSeed(scanned, existing)
  if (plan.inserts.length === 0 && plan.updates.length === 0 && plan.pruneIds.length === 0) return
  const insert = db.prepare(
    `INSERT INTO skills (id, name, description, content, enabled, source, created_at)
     VALUES (@id, @name, @description, @content, @enabled, 'builtin', @created_at)`
  )
  const update = db.prepare(
    'UPDATE skills SET name = @name, description = @description, content = @content WHERE id = @id'
  )
  const remove = db.prepare('DELETE FROM skills WHERE id = ?')
  const now = Date.now()
  db.transaction(() => {
    for (const s of plan.inserts) insert.run({ ...s, created_at: now })
    for (const s of plan.updates) update.run(s)
    for (const id of plan.pruneIds) remove.run(id)
  })()
}

/**
 * Concatenate enabled skills into a system-prompt fragment (empty if none).
 * Slug-deduped so enabling both a builtin skill and the user's own same-slug
 * copy injects only the user's version (no duplicated guidance).
 */
export function buildSkillsSystemPrompt(): string {
  const enabled = listSkills()
    .filter((s) => s.enabled)
    .sort((a, b) => a.created_at - b.created_at)
  return formatSkillsPrompt(dedupeSkillsBySlug(enabled))
}
