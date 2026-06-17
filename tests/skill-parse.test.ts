import { describe, it, expect } from 'vitest'
import { parseSkillMd, formatSkillsPrompt, formatMaterialsPrompt } from '../src/main/db/skill-parse'

describe('parseSkillMd', () => {
  it('parses frontmatter name/description + body', () => {
    const r = parseSkillMd(`---\nname: 小红书写手\ndescription: 爆款文案\n---\n你是小红书爆款写手。`)
    expect(r.name).toBe('小红书写手')
    expect(r.description).toBe('爆款文案')
    expect(r.content).toBe('你是小红书爆款写手。')
    expect(r.source).toBe('imported')
  })

  it('strips surrounding quotes on frontmatter values', () => {
    const r = parseSkillMd(`---\nname: "Quoted"\n---\nbody`)
    expect(r.name).toBe('Quoted')
  })

  it('falls back to defaults when there is no frontmatter', () => {
    const r = parseSkillMd('just some instructions')
    expect(r.name).toBe('导入的技能')
    expect(r.content).toBe('just some instructions')
  })
})

describe('formatSkillsPrompt', () => {
  it('returns empty string for no skills', () => {
    expect(formatSkillsPrompt([])).toBe('')
  })
  it('includes each enabled skill', () => {
    const out = formatSkillsPrompt([
      { name: 'A', content: 'do A' },
      { name: 'B', content: 'do B' }
    ])
    expect(out).toContain('技能：A')
    expect(out).toContain('do A')
    expect(out).toContain('技能：B')
  })
})

describe('formatMaterialsPrompt', () => {
  it('returns empty string for no materials', () => {
    expect(formatMaterialsPrompt([])).toBe('')
  })
  it('renders title, content, tags and url', () => {
    const out = formatMaterialsPrompt([
      { title: '口号', content: '让创作更轻松', url: 'https://x.com', tags: 'brand' }
    ])
    expect(out).toContain('【口号】')
    expect(out).toContain('让创作更轻松')
    expect(out).toContain('标签：brand')
    expect(out).toContain('来源：https://x.com')
  })
  it('omits tags/url when absent', () => {
    const out = formatMaterialsPrompt([{ title: 'T', content: 'C', url: null, tags: null }])
    expect(out).toContain('【T】')
    expect(out).not.toContain('标签')
    expect(out).not.toContain('来源')
  })
})
