export interface ScheduleSpec {
  schedule_kind: 'interval' | 'daily'
  interval_min: number | null
  at_hour: number | null
  at_minute: number | null
}

/** Next fire time (ms) for a task spec, computed from `from`. Pure. */
export function computeNextRun(t: ScheduleSpec, from: number): number {
  if (t.schedule_kind === 'interval') {
    return from + Math.max(1, t.interval_min ?? 60) * 60_000
  }
  // daily at_hour:at_minute — next occurrence strictly after `from`
  const d = new Date(from)
  const next = new Date(
    d.getFullYear(),
    d.getMonth(),
    d.getDate(),
    t.at_hour ?? 9,
    t.at_minute ?? 0,
    0,
    0
  )
  if (next.getTime() <= from) next.setDate(next.getDate() + 1)
  return next.getTime()
}
