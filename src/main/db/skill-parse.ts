export interface ParsedSkill {
  name: string
  description?: string
  /** `/command` id declared in frontmatter (`slug:`), if any. */
  slug?: string
  content: string
  source: string
}

/**
 * Slugify a skill name into a `/command`-friendly token: lowercase, spaces and
 * punctuation → '-', collapse repeats. CJK characters are kept (so 「小红书写手」
 * → 「小红书写手」). Pure & unit-tested.
 */
export function slugifySkillName(name: string): string {
  return (
    name
      .trim()
      .toLowerCase()
      .replace(/[\s/\\:*?"<>|,.，。、]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') || 'skill'
  )
}

/**
 * Extract `/command` tokens from message text (used to detect skill invocations).
 * A token starts at a line/whitespace boundary, then `/`, then non-space chars.
 * Pure & unit-tested.
 */
export function extractSlashTokens(text: string): string[] {
  const out: string[] = []
  const re = /(?:^|\s)\/([^\s/]+)/g
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) out.push(m[1])
  return out
}

/**
 * Read a top-level frontmatter value. Handles inline scalars
 * (`key: value`, quoted or not) and YAML block scalars (`key: |` / `key: >`,
 * with the text on the following indented lines — folded into one line).
 * Pure; only top-level keys match (nested keys are indented).
 */
function fmValue(fm: string, key: string): string | undefined {
  const lines = fm.split('\n')
  const re = new RegExp(`^${key}\\s*:(.*)$`)
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(re)
    if (!m) continue
    const inline = m[1].trim().replace(/^["']|["']$/g, '')
    // Inline value present and not a block-scalar indicator (`|`, `|-`, `>`, `>-`).
    if (inline && !/^[|>][+-]?$/.test(inline)) return inline
    // Block scalar or empty value: collect the indented lines that follow.
    const block: string[] = []
    for (let j = i + 1; j < lines.length; j++) {
      if (lines[j].trim() === '') continue
      if (!/^[ \t]/.test(lines[j])) break // back to a top-level key → stop
      block.push(lines[j].trim())
    }
    const text = block.join(' ').trim()
    return text || undefined
  }
  return undefined
}

/** Parse a SKILL.md-style document (YAML-ish frontmatter + body). Pure. */
export function parseSkillMd(text: string): ParsedSkill {
  const m = text.match(/^---\s*\n([\s\S]*?)\n---\s*\n?([\s\S]*)$/)
  if (!m) return { name: '导入的技能', content: text.trim(), source: 'imported' }
  const fm = m[1]
  const body = m[2].trim()
  return {
    name: fmValue(fm, 'name') || '导入的技能',
    description: fmValue(fm, 'description'),
    slug: fmValue(fm, 'slug'),
    content: body || text.trim(),
    source: 'imported'
  }
}

/**
 * Collapse skills that share a `/slug`, letting user-managed versions
 * (installed / custom / imported) override the app-bundled `builtin` one.
 * Keeps the input order of the surviving entries. Pure.
 */
export function dedupeSkillsBySlug<T extends { slug: string; source: string }>(skills: T[]): T[] {
  const bySlug = new Map<string, T>()
  const order: string[] = []
  for (const s of skills) {
    const key = s.slug.toLowerCase()
    const prev = bySlug.get(key)
    if (!prev) {
      bySlug.set(key, s)
      order.push(key)
    } else if (prev.source === 'builtin' && s.source !== 'builtin') {
      // A user-managed skill with the same slug wins over the builtin copy.
      bySlug.set(key, s)
    }
  }
  return order.map((k) => bySlug.get(k) as T)
}

/** Concatenate enabled skills into a system-prompt fragment. Pure. */
export function formatSkillsPrompt(rows: { name: string; content: string }[]): string {
  if (rows.length === 0) return ''
  return (
    '你已加载以下技能（Skills），在相关任务中遵循它们的指引：\n\n' +
    rows.map((s) => `## 技能：${s.name}\n${s.content}`).join('\n\n')
  )
}

/** Concatenate in-context materials into a system-prompt fragment. Pure. */
export function formatMaterialsPrompt(
  rows: { title: string; content: string; url: string | null; tags: string | null }[]
): string {
  if (rows.length === 0) return ''
  return (
    '以下是用户「素材库」中当前启用的参考素材，创作时可引用其中的事实、观点、风格或数据：\n\n' +
    rows
      .map(
        (m) =>
          `【${m.title}】${m.tags ? `（标签：${m.tags}）` : ''}\n${m.content}${m.url ? `\n来源：${m.url}` : ''}`
      )
      .join('\n\n')
  )
}
