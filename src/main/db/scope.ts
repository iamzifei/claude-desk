/**
 * Active project scope for asset views (素材 / 原子 / 标签 / 图谱 / 选题 / 发布).
 *
 * The renderer's top-of-sidebar project switcher sets one scope; every list /
 * search / graph query then filters by it, and newly-created assets are stamped
 * with the scoped project. Held in-memory in the main process so call sites
 * don't have to thread a project id through every IPC signature. Resets to
 * 'all' on boot (a UI concern, not worth persisting).
 *
 * Scope values:
 *   'all'      → no project filter (everything, incl. unfiled)
 *   'unfiled'  → only assets with no project (project_id IS NULL)
 *   <uuid>     → only that project's assets
 */
let current = 'all'

export function setScope(scope: string): void {
  current = scope || 'all'
}

export function getScope(): string {
  return current
}

/**
 * SQL fragment + params filtering a `project_id` column by the current scope.
 * Returns an empty fragment for 'all' so callers can `[...conds, sql].filter(Boolean)`.
 */
export function scopeClause(col = 'project_id'): { sql: string; params: string[] } {
  if (current === 'all') return { sql: '', params: [] }
  if (current === 'unfiled') return { sql: `${col} IS NULL`, params: [] }
  return { sql: `${col} = ?`, params: [current] }
}

/** Project id to stamp on new assets — null when the scope is 'all'/'unfiled'. */
export function scopeProjectId(): string | null {
  return current === 'all' || current === 'unfiled' ? null : current
}
