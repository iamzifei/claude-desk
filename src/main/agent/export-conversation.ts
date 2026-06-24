import type { Message } from '../db/conversations'

/**
 * Format a conversation as a Markdown note for the knowledge base ("对话也在
 * 知识库里"). Pure & unit-tested; the IPC layer writes the result to the vault.
 */
export function formatConversationMarkdown(
  title: string,
  messages: Message[],
  dateStr: string
): string {
  const head = `---\ntitle: ${title.replace(/\n/g, ' ')}\nsource: 墨栖对话\ndate: ${dateStr}\n---\n\n# ${title}\n`
  if (messages.length === 0) return `${head}\n_（空对话）_\n`
  const body = messages
    .map((m) => `## ${m.role === 'user' ? '🧑 用户' : '🤖 助手'}\n\n${m.content.trim()}`)
    .join('\n\n')
  return `${head}\n${body}\n`
}

/**
 * Turn a conversation title into a safe single-segment filename (no path
 * separators or characters illegal on common filesystems). Pure.
 */
export function safeFileName(title: string, fallback = '对话'): string {
  const cleaned = title
    .replace(/[/\\:*?"<>|]/g, ' ') // illegal on Windows/macOS
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80)
  return cleaned || fallback
}
