import { describe, it, expect } from 'vitest'
import { formatConversationMarkdown, safeFileName } from '../src/main/agent/export-conversation'
import type { Message } from '../src/main/db/conversations'

const msg = (role: 'user' | 'assistant', content: string): Message => ({
  id: role + content,
  conversation_id: 'c',
  role,
  content,
  created_at: 0
})

describe('formatConversationMarkdown', () => {
  it('writes frontmatter + a section per turn', () => {
    const md = formatConversationMarkdown(
      '番茄工作法',
      [msg('user', '是什么？'), msg('assistant', '一种时间管理法。')],
      '2026-06-24'
    )
    expect(md).toContain('title: 番茄工作法')
    expect(md).toContain('date: 2026-06-24')
    expect(md).toContain('# 番茄工作法')
    expect(md).toContain('## 🧑 用户\n\n是什么？')
    expect(md).toContain('## 🤖 助手\n\n一种时间管理法。')
  })

  it('handles an empty conversation', () => {
    const md = formatConversationMarkdown('空的', [], '2026-06-24')
    expect(md).toContain('（空对话）')
  })
})

describe('safeFileName', () => {
  it('strips path separators and illegal characters', () => {
    expect(safeFileName('a/b:c*d?e"f<g>h|i')).toBe('a b c d e f g h i')
  })
  it('collapses whitespace and trims', () => {
    expect(safeFileName('  hello   world  ')).toBe('hello world')
  })
  it('falls back when empty after cleaning', () => {
    expect(safeFileName('///')).toBe('对话')
    expect(safeFileName('   ')).toBe('对话')
  })
  it('caps length', () => {
    expect(safeFileName('x'.repeat(200)).length).toBe(80)
  })
})
