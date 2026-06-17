import { randomUUID } from 'crypto'
import { getDb } from './index'

export interface Skill {
  id: string
  name: string
  description: string | null
  content: string
  enabled: number
  source: string // 'custom' | 'imported'
  created_at: number
}

export interface NewSkill {
  name: string
  description?: string
  content: string
  source?: string
}

export function listSkills(): Skill[] {
  return getDb().prepare('SELECT * FROM skills ORDER BY created_at DESC').all() as Skill[]
}

export function createSkill(s: NewSkill): Skill {
  const skill: Skill = {
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
    .run(skill)
  return skill
}

export function toggleSkill(id: string, enabled: boolean): void {
  getDb().prepare('UPDATE skills SET enabled = ? WHERE id = ?').run(enabled ? 1 : 0, id)
}

export function deleteSkill(id: string): void {
  getDb().prepare('DELETE FROM skills WHERE id = ?').run(id)
}

/** Concatenate enabled skills into a system-prompt fragment (empty if none). */
export function buildSkillsSystemPrompt(): string {
  const enabled = getDb()
    .prepare('SELECT name, content FROM skills WHERE enabled = 1 ORDER BY created_at')
    .all() as { name: string; content: string }[]
  if (enabled.length === 0) return ''
  return (
    '你已加载以下技能（Skills），在相关任务中遵循它们的指引：\n\n' +
    enabled.map((s) => `## 技能：${s.name}\n${s.content}`).join('\n\n')
  )
}

/** Parse a SKILL.md-style document (YAML-ish frontmatter + body) into a skill. */
export function parseSkillMd(text: string): NewSkill {
  const m = text.match(/^---\s*\n([\s\S]*?)\n---\s*\n?([\s\S]*)$/)
  if (!m) return { name: '导入的技能', content: text.trim(), source: 'imported' }
  const fm = m[1]
  const body = m[2].trim()
  const get = (k: string): string | undefined =>
    fm.match(new RegExp(`^${k}\\s*:\\s*(.+)$`, 'm'))?.[1]?.trim().replace(/^["']|["']$/g, '')
  return {
    name: get('name') || '导入的技能',
    description: get('description'),
    content: body || text.trim(),
    source: 'imported'
  }
}
