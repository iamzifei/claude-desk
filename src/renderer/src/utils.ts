import type { Conversation } from './types'

export type DateGroup = '今天' | '昨天' | '更早'

/** Group conversations by recency, matching 牛马AI's 今天 / 昨天 / 更早 buckets. */
export function groupByDate(convs: Conversation[]): { label: DateGroup; items: Conversation[] }[] {
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const startOfYesterday = startOfToday - 86_400_000

  const buckets: Record<DateGroup, Conversation[]> = { 今天: [], 昨天: [], 更早: [] }
  for (const c of convs) {
    if (c.updated_at >= startOfToday) buckets['今天'].push(c)
    else if (c.updated_at >= startOfYesterday) buckets['昨天'].push(c)
    else buckets['更早'].push(c)
  }
  return (['今天', '昨天', '更早'] as DateGroup[])
    .map((label) => ({ label, items: buckets[label] }))
    .filter((g) => g.items.length > 0)
}
