import { join } from 'path'
import { readdirSync, readFileSync, existsSync, type Dirent } from 'fs'
import { parseSkillMd } from './skill-parse'

/**
 * Builtin creator skills — the 11 SKILL.md files bundled with the app under
 * `resources/builtin-skills/<slug>/SKILL.md` (synced from the shared
 * ~/Dev/creator-skills repo; see its scripts/sync-inknest.sh).
 *
 * On every startup they are seeded into the `skills` table as
 * `source='builtin'` rows with stable ids (`builtin:<slug>`), so:
 *   - first launch: rows are inserted, core skills enabled by default;
 *   - upgrades: name/description/content refresh, the user's enable/disable
 *     choice is preserved;
 *   - removals: builtin rows whose bundled file disappeared are pruned.
 *
 * This module is deliberately Electron-free (pure fs + planning logic) so the
 * seed behaviour is unit-testable; the DB write lives in db/skills.ts and the
 * resources-root resolution in the IPC bootstrap.
 */

/** Stable-id prefix; the part after it IS the `/command` slug. */
export const BUILTIN_ID_PREFIX = 'builtin:'

/**
 * Skills enabled (= always injected into the system prompt) out of the box:
 * the 7-step creator core (topic → write → script → evaluate → de-AI →
 * persona → feedback). The other 4 (fact-check, cover-title and the two
 * image-generation skills) stay off by default — image skills need the user
 * to configure an image-model API key first, and fact-check/cover-title are
 * on-demand `/slug` tools rather than always-on guidance.
 */
export const DEFAULT_ENABLED_SLUGS = new Set([
  'find-topic',
  'chinese-viral-writer',
  'script-writer',
  'content-evaluation',
  'humanizer-zh',
  'persona-builder',
  'content-feedback'
])

export interface BuiltinSkillFile {
  /** `/command` id. Frontmatter `slug:` wins; falls back to the folder name. */
  slug: string
  name: string
  description: string | null
  content: string
}

/**
 * Read `<root>/<slug>/SKILL.md` for every bundled skill. Best-effort: a
 * missing root or an unreadable file yields fewer entries, never a throw.
 *
 * Slug resolution (lesson learned on the lingxi side): the frontmatter `slug:`
 * field is authoritative — never derive the slug from the display name, which
 * is often Chinese (e.g. name「短视频脚本」must still be invoked as
 * `/script-writer`). The folder name is the fallback because the sync script
 * names folders by slug.
 */
export function scanBuiltinSkills(root: string): BuiltinSkillFile[] {
  if (!existsSync(root)) return []
  let entries: Dirent[]
  try {
    entries = readdirSync(root, { withFileTypes: true })
  } catch {
    return []
  }
  const out: BuiltinSkillFile[] = []
  for (const e of entries) {
    if (!e.isDirectory()) continue
    let text: string
    try {
      text = readFileSync(join(root, e.name, 'SKILL.md'), 'utf8')
    } catch {
      continue // folder without a SKILL.md — skip
    }
    const parsed = parseSkillMd(text)
    out.push({
      slug: parsed.slug || e.name,
      name: parsed.name !== '导入的技能' ? parsed.name : e.name,
      description: parsed.description ?? null,
      content: parsed.content
    })
  }
  return out
}

export interface SeedPlan {
  /** New skills → INSERT, `enabled` from DEFAULT_ENABLED_SLUGS. */
  inserts: { id: string; name: string; description: string | null; content: string; enabled: 0 | 1 }[]
  /** Changed skills → UPDATE content/meta only; user's `enabled` is untouched. */
  updates: { id: string; name: string; description: string | null; content: string }[]
  /** Builtin rows whose bundled file is gone → DELETE. */
  pruneIds: string[]
}

/**
 * Diff the scanned bundle against the builtin rows already in the DB and
 * produce an idempotent seed plan (seeding twice in a row plans zero work).
 * Pure — the caller applies it in one transaction.
 */
export function planBuiltinSeed(
  scanned: BuiltinSkillFile[],
  existing: { id: string; name: string; description: string | null; content: string }[]
): SeedPlan {
  const byId = new Map(existing.map((r) => [r.id, r]))
  const plan: SeedPlan = { inserts: [], updates: [], pruneIds: [] }
  const seenIds = new Set<string>()
  for (const s of scanned) {
    const id = BUILTIN_ID_PREFIX + s.slug
    if (seenIds.has(id)) continue // duplicate slug in the bundle — first wins
    seenIds.add(id)
    const row = byId.get(id)
    if (!row) {
      plan.inserts.push({
        id,
        name: s.name,
        description: s.description,
        content: s.content,
        enabled: DEFAULT_ENABLED_SLUGS.has(s.slug) ? 1 : 0
      })
    } else if (row.content !== s.content || row.name !== s.name || row.description !== s.description) {
      plan.updates.push({ id, name: s.name, description: s.description, content: s.content })
    }
  }
  for (const r of existing) if (!seenIds.has(r.id)) plan.pruneIds.push(r.id)
  return plan
}
