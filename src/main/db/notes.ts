import { randomUUID } from 'crypto'
import { getDb } from './index'
import { rebuildLinks, resolvePending, purgeLinks } from './links'

export interface Note {
  id: string
  workspace_id: string | null
  type: 'review' | 'minutes' | 'daily'
  title: string
  content: string
  created_at: number
}

export function listNotes(workspaceId: string, type: Note['type']): Note[] {
  return getDb()
    .prepare('SELECT * FROM notes WHERE workspace_id = ? AND type = ? ORDER BY created_at DESC')
    .all(workspaceId, type) as Note[]
}

export function createNote(
  workspaceId: string,
  type: Note['type'],
  title: string,
  content: string
): Note {
  const note: Note = {
    id: randomUUID(),
    workspace_id: workspaceId,
    type,
    title,
    content,
    created_at: Date.now()
  }
  getDb()
    .prepare(
      'INSERT INTO notes (id, workspace_id, type, title, content, created_at) VALUES (@id, @workspace_id, @type, @title, @content, @created_at)'
    )
    .run(note)
  rebuildLinks('note', note.id, note.content)
  resolvePending(note.title, 'note', note.id)
  return note
}

/** Update a note's body (used by the editable 每日笔记). Re-resolves wikilinks. */
export function updateNote(id: string, content: string): void {
  getDb().prepare('UPDATE notes SET content = ? WHERE id = ?').run(content, id)
  rebuildLinks('note', id, content)
}

/**
 * Today's 每日笔记 (daily note), creating an empty one on first open. Titled by
 * the given date string so there's exactly one capture surface per day.
 */
export function getOrCreateDailyNote(workspaceId: string, dateTitle: string): Note {
  const existing = getDb()
    .prepare("SELECT * FROM notes WHERE workspace_id = ? AND type = 'daily' AND title = ?")
    .get(workspaceId, dateTitle) as Note | undefined
  return existing ?? createNote(workspaceId, 'daily', dateTitle, '')
}

export function deleteNote(id: string): void {
  getDb().prepare('DELETE FROM notes WHERE id = ?').run(id)
  purgeLinks('note', id)
}
