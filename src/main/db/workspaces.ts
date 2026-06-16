import { randomUUID } from 'crypto'
import { getDb } from './index'

export interface Workspace {
  id: string
  name: string
  root_path: string | null
  sort: number
  created_at: number
}

export function listWorkspaces(): Workspace[] {
  return getDb()
    .prepare('SELECT * FROM workspaces ORDER BY sort, created_at')
    .all() as Workspace[]
}

export function createWorkspace(name: string, rootPath: string | null = null): Workspace {
  const max = getDb().prepare('SELECT COALESCE(MAX(sort), -1) AS m FROM workspaces').get() as {
    m: number
  }
  const ws: Workspace = {
    id: randomUUID(),
    name: name.trim() || '新工作区',
    root_path: rootPath,
    sort: max.m + 1,
    created_at: Date.now()
  }
  getDb()
    .prepare(
      'INSERT INTO workspaces (id, name, root_path, sort, created_at) VALUES (@id, @name, @root_path, @sort, @created_at)'
    )
    .run(ws)
  return ws
}

export function renameWorkspace(id: string, name: string): void {
  getDb().prepare('UPDATE workspaces SET name = ? WHERE id = ?').run(name, id)
}

export function setWorkspaceRoot(id: string, rootPath: string | null): void {
  getDb().prepare('UPDATE workspaces SET root_path = ? WHERE id = ?').run(rootPath, id)
}

/** Deletes a workspace and everything under it (projects + conversations cascade). */
export function deleteWorkspace(id: string): void {
  getDb().prepare('DELETE FROM workspaces WHERE id = ?').run(id)
}
