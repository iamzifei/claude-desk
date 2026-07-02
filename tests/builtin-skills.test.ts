import { describe, it, expect } from 'vitest'
import { mkdtempSync, mkdirSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { parseSkillMd, dedupeSkillsBySlug } from '../src/main/db/skill-parse'
import {
  scanBuiltinSkills,
  planBuiltinSeed,
  DEFAULT_ENABLED_SLUGS,
  BUILTIN_ID_PREFIX,
  type BuiltinSkillFile
} from '../src/main/db/builtin-skills'

// ---------------------------------------------------------------------------
// Frontmatter parsing additions (slug field + YAML block scalars)
// ---------------------------------------------------------------------------

describe('parseSkillMd — slug + block scalars', () => {
  it('extracts the frontmatter slug', () => {
    const p = parseSkillMd('---\nname: 短视频脚本\nslug: script-writer\n---\nbody')
    expect(p.slug).toBe('script-writer')
    expect(p.name).toBe('短视频脚本')
  })

  it('leaves slug undefined when absent', () => {
    expect(parseSkillMd('---\nname: x\n---\nbody').slug).toBeUndefined()
  })

  it('parses a `description: |` block scalar (humanizer-zh style)', () => {
    const p = parseSkillMd(
      '---\nslug: humanizer-zh\nname: humanizer-zh\ndescription: |\n  审计并修复 AI 痕迹，\n  默认只诊断不改。\n---\nbody'
    )
    expect(p.description).toBe('审计并修复 AI 痕迹， 默认只诊断不改。')
    expect(p.slug).toBe('humanizer-zh')
  })

  it('still parses plain inline values (regression)', () => {
    const p = parseSkillMd('---\nname: "Cover Title"\ndescription: 高转化封面\n---\nbody')
    expect(p.name).toBe('Cover Title')
    expect(p.description).toBe('高转化封面')
  })

  it('does not confuse a `description` in the body with frontmatter', () => {
    const p = parseSkillMd('---\nname: x\n---\ndescription: not-frontmatter')
    expect(p.description).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// Bundle scanning (slug resolution rules)
// ---------------------------------------------------------------------------

function makeBundle(skills: { folder: string; md: string }[]): string {
  const root = mkdtempSync(join(tmpdir(), 'builtin-skills-'))
  for (const s of skills) {
    mkdirSync(join(root, s.folder))
    writeFileSync(join(root, s.folder, 'SKILL.md'), s.md)
  }
  return root
}

describe('scanBuiltinSkills', () => {
  it('prefers the frontmatter slug over the (often CJK) display name', () => {
    const root = makeBundle([
      { folder: 'script-writer', md: '---\nname: 短视频脚本\nslug: script-writer\n---\n正文' }
    ])
    const [s] = scanBuiltinSkills(root)
    expect(s.slug).toBe('script-writer') // NOT a slugified 「短视频脚本」
    expect(s.name).toBe('短视频脚本')
    expect(s.content).toBe('正文')
  })

  it('falls back to the folder name when frontmatter has no slug', () => {
    const root = makeBundle([
      { folder: 'cover-title', md: '---\nname: cover-title\ndescription: d\n---\nbody' }
    ])
    expect(scanBuiltinSkills(root)[0].slug).toBe('cover-title')
  })

  it('skips folders without a SKILL.md and returns [] for a missing root', () => {
    const root = makeBundle([{ folder: 'ok', md: '---\nname: ok\n---\nx' }])
    mkdirSync(join(root, 'empty-folder'))
    expect(scanBuiltinSkills(root).map((s) => s.slug)).toEqual(['ok'])
    expect(scanBuiltinSkills(join(root, 'nope'))).toEqual([])
  })

  it('scans the real bundled resources: 11 skills with the expected slugs', () => {
    const real = scanBuiltinSkills(join(__dirname, '..', 'resources', 'builtin-skills'))
    const slugs = real.map((s) => s.slug).sort()
    expect(slugs).toEqual(
      [
        'baoyu-article-illustrator',
        'baoyu-cover-image',
        'chinese-viral-writer',
        'content-evaluation',
        'content-feedback',
        'cover-title',
        'fact-check',
        'find-topic',
        'humanizer-zh',
        'persona-builder',
        'script-writer'
      ].sort()
    )
    // Every default-enabled slug must actually exist in the bundle.
    for (const slug of DEFAULT_ENABLED_SLUGS) expect(slugs).toContain(slug)
    // All skills parsed real content, not the raw file (frontmatter stripped).
    for (const s of real) {
      expect(s.content.length).toBeGreaterThan(50)
      expect(s.content.startsWith('---')).toBe(false)
    }
  })
})

// ---------------------------------------------------------------------------
// Seed planning (idempotency / defaults / upgrade / prune)
// ---------------------------------------------------------------------------

const bundle: BuiltinSkillFile[] = [
  { slug: 'find-topic', name: '爆款选题', description: 'd1', content: 'c1' },
  { slug: 'fact-check', name: 'fact-check', description: 'd2', content: 'c2' }
]

describe('planBuiltinSeed', () => {
  it('first launch: inserts all skills with the documented default enables', () => {
    const plan = planBuiltinSeed(bundle, [])
    expect(plan.updates).toEqual([])
    expect(plan.pruneIds).toEqual([])
    expect(plan.inserts.map((i) => [i.id, i.enabled])).toEqual([
      ['builtin:find-topic', 1], // in DEFAULT_ENABLED_SLUGS
      ['builtin:fact-check', 0] // image/on-demand tools default off
    ])
  })

  it('default set is exactly the 7 core creator skills', () => {
    expect([...DEFAULT_ENABLED_SLUGS].sort()).toEqual(
      [
        'find-topic',
        'chinese-viral-writer',
        'script-writer',
        'content-evaluation',
        'humanizer-zh',
        'persona-builder',
        'content-feedback'
      ].sort()
    )
  })

  it('is idempotent: re-seeding an already-seeded DB plans zero work', () => {
    const seeded = planBuiltinSeed(bundle, []).inserts.map(
      ({ id, name, description, content }) => ({ id, name, description, content })
    )
    const plan = planBuiltinSeed(bundle, seeded)
    expect(plan).toEqual({ inserts: [], updates: [], pruneIds: [] })
  })

  it('content upgrade: plans an update (never an insert) and never touches enabled', () => {
    const existing = [
      { id: 'builtin:find-topic', name: '爆款选题', description: 'd1', content: 'OLD' },
      { id: 'builtin:fact-check', name: 'fact-check', description: 'd2', content: 'c2' }
    ]
    const plan = planBuiltinSeed(bundle, existing)
    expect(plan.inserts).toEqual([])
    expect(plan.updates).toEqual([
      { id: 'builtin:find-topic', name: '爆款选题', description: 'd1', content: 'c1' }
    ])
    // The update shape carries no `enabled` — the user's toggle is preserved.
    expect(Object.keys(plan.updates[0])).not.toContain('enabled')
  })

  it('prunes builtin rows whose bundled file disappeared', () => {
    const existing = [
      { id: 'builtin:find-topic', name: '爆款选题', description: 'd1', content: 'c1' },
      { id: 'builtin:removed-skill', name: 'gone', description: null, content: 'x' }
    ]
    const plan = planBuiltinSeed([bundle[0]], existing)
    expect(plan.pruneIds).toEqual(['builtin:removed-skill'])
  })

  it('id prefix yields the slug back (skillSlug contract)', () => {
    const id = BUILTIN_ID_PREFIX + 'find-topic'
    expect(id.slice(BUILTIN_ID_PREFIX.length)).toBe('find-topic')
  })
})

// ---------------------------------------------------------------------------
// Slug-collision priority (builtin vs the user's own version)
// ---------------------------------------------------------------------------

describe('dedupeSkillsBySlug', () => {
  const builtin = { slug: 'find-topic', source: 'builtin', name: 'bundled' }
  const installed = { slug: 'find-topic', source: 'installed', name: 'user copy' }
  const other = { slug: 'cover-title', source: 'builtin', name: 'other' }

  it('user-installed skill overrides the builtin one with the same slug', () => {
    expect(dedupeSkillsBySlug([builtin, installed, other])).toEqual([installed, other])
    // Order of appearance must not matter for the override.
    expect(dedupeSkillsBySlug([installed, builtin, other])).toEqual([installed, other])
  })

  it('matches slugs case-insensitively and keeps first occurrence order', () => {
    const upper = { ...installed, slug: 'Find-Topic' }
    expect(dedupeSkillsBySlug([builtin, upper])).toEqual([upper])
  })

  it('keeps distinct slugs untouched', () => {
    expect(dedupeSkillsBySlug([builtin, other])).toEqual([builtin, other])
  })
})
