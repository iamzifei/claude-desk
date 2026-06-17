import { randomUUID } from 'crypto'
import { getDb } from './index'

export interface Note {
  id: string
  workspace_id: string | null
  type: 'review' | 'minutes'
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
  return note
}

export function deleteNote(id: string): void {
  getDb().prepare('DELETE FROM notes WHERE id = ?').run(id)
}
