/**
 * Active project scope for asset views (素材 / 原子 / 标签 / 图谱 / 选题 / 发布).
 *
 * The renderer's top-of-sidebar project switcher sets one scope; every list /
 * search / graph query then filters by it, and newly-created assets are stamped
 * with the scoped project. Held in-memory in the main process so call sites
 * don't have to thread a project id through every IPC signature. The last scope
 * is persisted (setting `projectScope`) so the app reopens on the project the
 * user was last working in.
 *
 * Scope values:
 *   'all'      → no project filter (everything, incl. unfiled)
 *   'unfiled'  → only assets with no project (project_id IS NULL)
 *   <uuid>     → only that project's assets
 */
import { getSetting, setSetting } from './settings'

let current = 'all'
let loaded = false

/** Lazily restore the persisted scope the first time it's read or written. */
function value(): string {
  if (!loaded) {
    loaded = true
    try {
      current = getSetting('projectScope') || 'all'
    } catch {
      current = 'all' // DB not ready yet — fall back, persistence is best-effort
    }
  }
  return current
}

export function setScope(scope: string): void {
  loaded = true
  current = scope || 'all'
  try {
    setSetting('projectScope', current)
  } catch {
    /* DB not ready — keep the in-memory scope, skip persistence */
  }
}

export function getScope(): string {
  return value()
}

/**
 * SQL fragment + params filtering a `project_id` column by the current scope.
 * Returns an empty fragment for 'all' so callers can `[...conds, sql].filter(Boolean)`.
 */
export function scopeClause(col = 'project_id'): { sql: string; params: string[] } {
  const c = value()
  if (c === 'all') return { sql: '', params: [] }
  if (c === 'unfiled') return { sql: `${col} IS NULL`, params: [] }
  return { sql: `${col} = ?`, params: [c] }
}

/** Project id to stamp on new assets — null when the scope is 'all'/'unfiled'. */
export function scopeProjectId(): string | null {
  const c = value()
  return c === 'all' || c === 'unfiled' ? null : c
}
