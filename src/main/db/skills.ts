import { randomUUID } from 'crypto'
import { getDb } from './index'
import { parseSkillMd, formatSkillsPrompt } from './skill-parse'

export { parseSkillMd }

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
  return formatSkillsPrompt(enabled)
}
