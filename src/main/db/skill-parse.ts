export interface ParsedSkill {
  name: string
  description?: string
  content: string
  source: string
}

/** Parse a SKILL.md-style document (YAML-ish frontmatter + body). Pure. */
export function parseSkillMd(text: string): ParsedSkill {
  const m = text.match(/^---\s*\n([\s\S]*?)\n---\s*\n?([\s\S]*)$/)
  if (!m) return { name: '导入的技能', content: text.trim(), source: 'imported' }
  const fm = m[1]
  const body = m[2].trim()
  const get = (k: string): string | undefined =>
    fm
      .match(new RegExp(`^${k}\\s*:\\s*(.+)$`, 'm'))?.[1]
      ?.trim()
      .replace(/^["']|["']$/g, '')
  return {
    name: get('name') || '导入的技能',
    description: get('description'),
    content: body || text.trim(),
    source: 'imported'
  }
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
