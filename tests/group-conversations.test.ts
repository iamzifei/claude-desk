import { describe, it, expect } from 'vitest'
import { groupConversations } from '../src/renderer/src/group-conversations'

const NOW = new Date(2026, 5, 18, 15, 0, 0).getTime() // 2026-06-18 15:00 local
const DAY = 86_400_000

function conv(id: string, updatedAt: number, pinned = 0): any {
  return { id, title: id, updated_at: updatedAt, created_at: updatedAt, pinned, archived: 0 }
}

describe('groupConversations', () => {
  it('buckets by recency and floats pinned to the top', () => {
    const groups = groupConversations(
      [
        conv('a', NOW - 1000), // today
        conv('b', NOW - DAY - 1000), // yesterday
        conv('c', NOW - 3 * DAY), // last 7 days
        conv('d', NOW - 30 * DAY), // earlier
        conv('p', NOW - 30 * DAY, 1) // pinned (even though old)
      ],
      NOW
    )
    const byKey = Object.fromEntries(groups.map((g) => [g.key, g.items.map((i) => i.id)]))
    expect(byKey.pinned).toEqual(['p'])
    expect(byKey.today).toEqual(['a'])
    expect(byKey.yesterday).toEqual(['b'])
    expect(byKey.week).toEqual(['c'])
    expect(byKey.earlier).toEqual(['d'])
  })

  it('omits empty groups and orders newest-first within a bucket', () => {
    const groups = groupConversations(
      [conv('old', NOW - 5000), conv('new', NOW - 1000)],
      NOW
    )
    expect(groups).toHaveLength(1)
    expect(groups[0].key).toBe('today')
    expect(groups[0].items.map((i) => i.id)).toEqual(['new', 'old'])
  })

  it('returns [] for no conversations', () => {
    expect(groupConversations([], NOW)).toEqual([])
  })

  it('sorts multiple pinned newest-first', () => {
    const groups = groupConversations(
      [conv('p1', NOW - 9000, 1), conv('p2', NOW - 1000, 1)],
      NOW
    )
    expect(groups[0].items.map((i) => i.id)).toEqual(['p2', 'p1'])
  })
})
