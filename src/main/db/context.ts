import { getDb } from './index'
import { getMessages } from './conversations'

/**
 * Context migration ("贴 Session ID 同步上下文"). A conversation can reference
 * other conversations by their id; on each send we inject the referenced
 * conversations' full history as a system preamble. Everything is local — the
 * "Session ID" is just the conversation's primary key, so this is faster and
 * more reliable than a remote session fetch.
 */

export interface ContextRef {
  id: string
  title: string
  messageCount: number
}

/** Per-reference and total caps so a huge referenced thread can't blow the request. */
const PER_REF_CHARS = 24000
const TOTAL_CHARS = 80000

function resolveRef(refId: string): ContextRef | null {
  const row = getDb().prepare('SELECT title FROM conversations WHERE id = ?').get(refId) as
    | { title: string }
    | undefined
  if (!row) return null
  const c = getDb()
    .prepare('SELECT COUNT(*) AS n FROM messages WHERE conversation_id = ?')
    .get(refId) as { n: number }
  return { id: refId, title: row.title, messageCount: c.n }
}

/**
 * Add a reference. Returns the resolved ref (for the UI) or null if the id is
 * invalid (no such conversation) or a self-reference.
 */
export function addContextRef(conversationId: string, refId: string): ContextRef | null {
  const id = refId.trim()
  if (!id || id === conversationId) return null
  const resolved = resolveRef(id)
  if (!resolved) return null
  getDb()
    .prepare(
      'INSERT OR IGNORE INTO context_refs (conversation_id, ref_id, created_at) VALUES (?, ?, ?)'
    )
    .run(conversationId, id, Date.now())
  return resolved
}

export function removeContextRef(conversationId: string, refId: string): void {
  getDb()
    .prepare('DELETE FROM context_refs WHERE conversation_id = ? AND ref_id = ?')
    .run(conversationId, refId)
}

/** The referenced conversations (resolved details) for the composer chips. */
export function listContextRefs(conversationId: string): ContextRef[] {
  const rows = getDb()
    .prepare('SELECT ref_id FROM context_refs WHERE conversation_id = ? ORDER BY created_at')
    .all(conversationId) as { ref_id: string }[]
  return rows.map((r) => resolveRef(r.ref_id)).filter((r): r is ContextRef => r !== null)
}

/**
 * Build the system preamble carrying every referenced conversation's history.
 * Returns '' when there are no (valid) references. Caps total size so a giant
 * thread can't dominate the request.
 */
export function buildContextPreamble(conversationId: string): string {
  const refs = listContextRefs(conversationId)
  if (refs.length === 0) return ''

  const blocks: string[] = []
  let budget = TOTAL_CHARS
  for (const ref of refs) {
    if (budget <= 0) break
    const msgs = getMessages(ref.id)
    if (msgs.length === 0) continue
    let body = msgs.map((m) => `${m.role === 'user' ? '用户' : '助手'}：${m.content}`).join('\n\n')
    const cap = Math.min(PER_REF_CHARS, budget)
    if (body.length > cap) body = `…（较早内容已省略）\n\n${body.slice(body.length - cap)}`
    budget -= body.length
    blocks.push(`【引用对话：${ref.title}】\n${body}`)
  }
  if (blocks.length === 0) return ''
  return (
    '用户引用了以下历史对话作为上下文，请在回答时参考其中已经确立的信息、结论与偏好：\n\n' +
    blocks.join('\n\n———\n\n')
  )
}

/** Drop a deleted conversation's refs (both directions). */
export function purgeContextRefs(conversationId: string): void {
  getDb()
    .prepare('DELETE FROM context_refs WHERE conversation_id = ? OR ref_id = ?')
    .run(conversationId, conversationId)
}
