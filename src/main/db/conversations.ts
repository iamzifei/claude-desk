import { randomUUID } from 'crypto'
import { getDb } from './index'
import { resolvePending, purgeLinks } from './links'

export interface Conversation {
  id: string
  title: string
  workspace: string | null // legacy free-text field (unused); kept for schema compat
  workspace_id: string | null
  project_id: string | null
  model: string | null // per-conversation model override; null → use global default
  archived: number // 0 | 1
  pinned: number // 0 | 1 — pinned to the top of the sidebar (Arc-style)
  created_at: number
  updated_at: number
}

export interface Message {
  id: string
  conversation_id: string
  role: 'user' | 'assistant'
  content: string
  created_at: number
}

/** Active (non-archived) conversations in a workspace, newest first. */
export function listConversations(workspaceId: string): Conversation[] {
  return getDb()
    .prepare(
      'SELECT * FROM conversations WHERE workspace_id = ? AND archived = 0 ORDER BY updated_at DESC'
    )
    .all(workspaceId) as Conversation[]
}

/** Archived conversations in a workspace. */
export function listArchived(workspaceId: string): Conversation[] {
  return getDb()
    .prepare(
      'SELECT * FROM conversations WHERE workspace_id = ? AND archived = 1 ORDER BY updated_at DESC'
    )
    .all(workspaceId) as Conversation[]
}

/** Search titles + message bodies within a workspace (active conversations). */
export function searchConversations(workspaceId: string, query: string): Conversation[] {
  const q = `%${query.trim()}%`
  return getDb()
    .prepare(
      `SELECT DISTINCT c.* FROM conversations c
       LEFT JOIN messages m ON m.conversation_id = c.id
       WHERE c.workspace_id = ? AND c.archived = 0 AND (c.title LIKE ? OR m.content LIKE ?)
       ORDER BY c.updated_at DESC`
    )
    .all(workspaceId, q, q) as Conversation[]
}

export function createConversation(
  workspaceId: string,
  projectId: string | null = null,
  title = '新对话'
): Conversation {
  const now = Date.now()
  const conv: Conversation = {
    id: randomUUID(),
    title,
    workspace: null,
    workspace_id: workspaceId,
    project_id: projectId,
    model: null,
    archived: 0,
    pinned: 0,
    created_at: now,
    updated_at: now
  }
  getDb()
    .prepare(
      `INSERT INTO conversations
        (id, title, workspace, workspace_id, project_id, model, archived, pinned, created_at, updated_at)
       VALUES (@id, @title, @workspace, @workspace_id, @project_id, @model, @archived, @pinned, @created_at, @updated_at)`
    )
    .run(conv)
  return conv
}

export function deleteConversation(id: string): void {
  getDb().prepare('DELETE FROM conversations WHERE id = ?').run(id)
  purgeLinks('conversation', id)
}

export function renameConversation(id: string, title: string): void {
  getDb()
    .prepare('UPDATE conversations SET title = ?, updated_at = ? WHERE id = ?')
    .run(title, Date.now(), id)
  // A meaningful title may resolve [[links]] written before the chat was named.
  resolvePending(title, 'conversation', id)
}

export function setArchived(id: string, archived: boolean): void {
  getDb()
    .prepare('UPDATE conversations SET archived = ? WHERE id = ?')
    .run(archived ? 1 : 0, id)
}

export function setPinned(id: string, pinned: boolean): void {
  getDb()
    .prepare('UPDATE conversations SET pinned = ? WHERE id = ?')
    .run(pinned ? 1 : 0, id)
}

export function moveToProject(id: string, projectId: string | null): void {
  getDb().prepare('UPDATE conversations SET project_id = ? WHERE id = ?').run(projectId, id)
}

export function setConversationModel(id: string, model: string | null): void {
  getDb().prepare('UPDATE conversations SET model = ? WHERE id = ?').run(model, id)
}

export function getConversationModel(id: string): string | null {
  const row = getDb().prepare('SELECT model FROM conversations WHERE id = ?').get(id) as
    | { model: string | null }
    | undefined
  return row?.model ?? null
}

export function getConversationTitle(id: string): string | null {
  const row = getDb().prepare('SELECT title FROM conversations WHERE id = ?').get(id) as
    | { title: string }
    | undefined
  return row?.title ?? null
}

export function getMessages(conversationId: string): Message[] {
  return getDb()
    .prepare('SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC')
    .all(conversationId) as Message[]
}

export function addMessage(
  conversationId: string,
  role: Message['role'],
  content: string
): Message {
  const msg: Message = {
    id: randomUUID(),
    conversation_id: conversationId,
    role,
    content,
    created_at: Date.now()
  }
  const db = getDb()
  const tx = db.transaction(() => {
    db.prepare(
      'INSERT INTO messages (id, conversation_id, role, content, created_at) VALUES (@id, @conversation_id, @role, @content, @created_at)'
    ).run(msg)
    db.prepare('UPDATE conversations SET updated_at = ? WHERE id = ?').run(
      msg.created_at,
      conversationId
    )
  })
  tx()
  return msg
}
