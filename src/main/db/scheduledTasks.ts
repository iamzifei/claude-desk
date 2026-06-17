import { randomUUID } from 'crypto'
import { getDb } from './index'

export interface ScheduledTask {
  id: string
  workspace_id: string | null
  name: string
  prompt: string
  schedule_kind: 'interval' | 'daily'
  interval_min: number | null
  at_hour: number | null
  at_minute: number | null
  enabled: number
  last_run: number | null
  next_run: number | null
  created_at: number
}

export type NewTask = Pick<
  ScheduledTask,
  'name' | 'prompt' | 'schedule_kind' | 'interval_min' | 'at_hour' | 'at_minute'
>

/** Next fire time (ms) for a task, computed from `from`. */
export function computeNextRun(t: NewTask, from: number): number {
  if (t.schedule_kind === 'interval') {
    return from + Math.max(1, t.interval_min ?? 60) * 60_000
  }
  // daily at_hour:at_minute — next occurrence strictly after `from`
  const d = new Date(from)
  const next = new Date(d.getFullYear(), d.getMonth(), d.getDate(), t.at_hour ?? 9, t.at_minute ?? 0, 0, 0)
  if (next.getTime() <= from) next.setDate(next.getDate() + 1)
  return next.getTime()
}

export function listTasks(workspaceId: string): ScheduledTask[] {
  return getDb()
    .prepare('SELECT * FROM scheduled_tasks WHERE workspace_id = ? ORDER BY created_at DESC')
    .all(workspaceId) as ScheduledTask[]
}

export function createTask(workspaceId: string, t: NewTask): ScheduledTask {
  const now = Date.now()
  const task: ScheduledTask = {
    id: randomUUID(),
    workspace_id: workspaceId,
    ...t,
    enabled: 1,
    last_run: null,
    next_run: computeNextRun(t, now),
    created_at: now
  }
  getDb()
    .prepare(
      `INSERT INTO scheduled_tasks
        (id, workspace_id, name, prompt, schedule_kind, interval_min, at_hour, at_minute, enabled, last_run, next_run, created_at)
       VALUES (@id, @workspace_id, @name, @prompt, @schedule_kind, @interval_min, @at_hour, @at_minute, @enabled, @last_run, @next_run, @created_at)`
    )
    .run(task)
  return task
}

export function getTaskById(id: string): ScheduledTask | undefined {
  return getDb().prepare('SELECT * FROM scheduled_tasks WHERE id = ?').get(id) as
    | ScheduledTask
    | undefined
}

export function deleteTask(id: string): void {
  getDb().prepare('DELETE FROM scheduled_tasks WHERE id = ?').run(id)
}

export function toggleTask(id: string, enabled: boolean): void {
  const next = enabled ? computeNextRunForId(id) : null
  getDb()
    .prepare('UPDATE scheduled_tasks SET enabled = ?, next_run = ? WHERE id = ?')
    .run(enabled ? 1 : 0, next, id)
}

function computeNextRunForId(id: string): number {
  const t = getDb().prepare('SELECT * FROM scheduled_tasks WHERE id = ?').get(id) as ScheduledTask
  return computeNextRun(t, Date.now())
}

/** Enabled tasks whose next_run is due (≤ now), across all workspaces. */
export function dueTasks(now: number): ScheduledTask[] {
  return getDb()
    .prepare('SELECT * FROM scheduled_tasks WHERE enabled = 1 AND next_run IS NOT NULL AND next_run <= ?')
    .all(now) as ScheduledTask[]
}

export function markRun(id: string, ranAt: number): void {
  const t = getDb().prepare('SELECT * FROM scheduled_tasks WHERE id = ?').get(id) as ScheduledTask
  const next = computeNextRun(t, ranAt)
  getDb()
    .prepare('UPDATE scheduled_tasks SET last_run = ?, next_run = ? WHERE id = ?')
    .run(ranAt, next, id)
}
