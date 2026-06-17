import { describe, it, expect } from 'vitest'
import { computeNextRun } from '../src/main/db/schedule-util'

describe('computeNextRun', () => {
  it('interval: adds interval_min minutes', () => {
    const from = 1_000_000
    expect(
      computeNextRun({ schedule_kind: 'interval', interval_min: 30, at_hour: null, at_minute: null }, from)
    ).toBe(from + 30 * 60_000)
  })

  it('interval: clamps to a minimum of 1 minute', () => {
    const from = 0
    expect(
      computeNextRun({ schedule_kind: 'interval', interval_min: 0, at_hour: null, at_minute: null }, from)
    ).toBe(60_000)
  })

  it('daily: schedules later today when the time has not passed', () => {
    const from = new Date(2026, 0, 1, 8, 0, 0).getTime()
    const next = computeNextRun(
      { schedule_kind: 'daily', interval_min: null, at_hour: 9, at_minute: 30 },
      from
    )
    expect(new Date(next).getHours()).toBe(9)
    expect(new Date(next).getMinutes()).toBe(30)
    expect(new Date(next).getDate()).toBe(1)
  })

  it('daily: rolls to tomorrow when the time already passed', () => {
    const from = new Date(2026, 0, 1, 10, 0, 0).getTime()
    const next = computeNextRun(
      { schedule_kind: 'daily', interval_min: null, at_hour: 9, at_minute: 0 },
      from
    )
    expect(new Date(next).getDate()).toBe(2)
    expect(new Date(next).getHours()).toBe(9)
  })
})
