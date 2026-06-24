import { randomUUID } from 'crypto'
import { getDb } from './index'

export interface Project {
  id: string
  workspace_id: string
  name: string
  dir_path: string | null
  sort: number
  archived: number // 0 | 1
  created_at: number
}

/** Active (non-archived) projects, in user sort order. */
export function listProjects(workspaceId: string): Project[] {
  return getDb()
    .prepare(
      'SELECT * FROM projects WHERE workspace_id = ? AND archived = 0 ORDER BY sort, created_at'
    )
    .all(workspaceId) as Project[]
}

/** Archived projects (newest first) — shown in the project manager for restore. */
export function listArchivedProjects(workspaceId: string): Project[] {
  return getDb()
    .prepare(
      'SELECT * FROM projects WHERE workspace_id = ? AND archived = 1 ORDER BY sort, created_at'
    )
    .all(workspaceId) as Project[]
}

export function createProject(
  workspaceId: string,
  name: string,
  dirPath: string | null = null
): Project {
  const max = getDb()
    .prepare('SELECT COALESCE(MAX(sort), -1) AS m FROM projects WHERE workspace_id = ?')
    .get(workspaceId) as { m: number }
  const proj: Project = {
    id: randomUUID(),
    workspace_id: workspaceId,
    name: name.trim() || '新项目',
    dir_path: dirPath,
    sort: max.m + 1,
    archived: 0,
    created_at: Date.now()
  }
  getDb()
    .prepare(
      `INSERT INTO projects (id, workspace_id, name, dir_path, sort, archived, created_at)
       VALUES (@id, @workspace_id, @name, @dir_path, @sort, @archived, @created_at)`
    )
    .run(proj)
  return proj
}

export function renameProject(id: string, name: string): void {
  getDb().prepare('UPDATE projects SET name = ? WHERE id = ?').run(name, id)
}

export function setProjectDir(id: string, dirPath: string | null): void {
  getDb().prepare('UPDATE projects SET dir_path = ? WHERE id = ?').run(dirPath, id)
}

export function setProjectArchived(id: string, archived: boolean): void {
  getDb()
    .prepare('UPDATE projects SET archived = ? WHERE id = ?')
    .run(archived ? 1 : 0, id)
}

/**
 * Persist a new ordering. `orderedIds` is the full list of (active) project ids
 * in the desired order; each row's `sort` is rewritten to its index in one
 * transaction.
 */
export function reorderProjects(orderedIds: string[]): void {
  const db = getDb()
  const upd = db.prepare('UPDATE projects SET sort = ? WHERE id = ?')
  db.transaction(() => orderedIds.forEach((id, i) => upd.run(i, id)))()
}

/** Delete the project; its conversations fall back to ungrouped (project_id → NULL). */
export function deleteProject(id: string): void {
  const db = getDb()
  const tx = db.transaction(() => {
    db.prepare('UPDATE conversations SET project_id = NULL WHERE project_id = ?').run(id)
    db.prepare('DELETE FROM projects WHERE id = ?').run(id)
  })
  tx()
}
