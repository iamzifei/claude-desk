import type { Conversation } from './types'

/**
 * Arc/Dia-style sidebar grouping: pinned float to the top, the rest fall into
 * recency buckets (今天 / 昨天 / 过去 7 天 / 更早). Pure & unit-tested. The
 * caller passes `now` so the buckets are deterministic in tests.
 */
export interface ConvGroup {
  key: 'pinned' | 'today' | 'yesterday' | 'week' | 'earlier'
  label: string
  items: Conversation[]
}

const startOfDay = (t: number): number => {
  const d = new Date(t)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

export function groupConversations(convs: Conversation[], now: number): ConvGroup[] {
  const todayStart = startOfDay(now)
  const yesterdayStart = todayStart - 86_400_000
  const weekStart = todayStart - 6 * 86_400_000 // last 7 days incl. today

  const pinned: Conversation[] = []
  const today: Conversation[] = []
  const yesterday: Conversation[] = []
  const week: Conversation[] = []
  const earlier: Conversation[] = []

  // Newest first within every bucket.
  for (const c of [...convs].sort((a, b) => b.updated_at - a.updated_at)) {
    if (c.pinned) pinned.push(c)
    else if (c.updated_at >= todayStart) today.push(c)
    else if (c.updated_at >= yesterdayStart) yesterday.push(c)
    else if (c.updated_at >= weekStart) week.push(c)
    else earlier.push(c)
  }

  return (
    [
      { key: 'pinned', label: '置顶', items: pinned },
      { key: 'today', label: '今天', items: today },
      { key: 'yesterday', label: '昨天', items: yesterday },
      { key: 'week', label: '过去 7 天', items: week },
      { key: 'earlier', label: '更早', items: earlier }
    ] as ConvGroup[]
  ).filter((g) => g.items.length > 0)
}
