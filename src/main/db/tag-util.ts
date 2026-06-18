/**
 * Tag helpers. Tags are stored as comma-separated strings on materials/atoms;
 * these pure functions parse, aggregate, and group them (supporting the
 * `平台/小红书` hierarchical convention). Unit-tested.
 */
export function parseTags(s: string | null | undefined): string[] {
  if (!s) return []
  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of s.split(/[,，]/)) {
    const t = raw.trim()
    if (t && !seen.has(t)) {
      seen.add(t)
      out.push(t)
    }
  }
  return out
}

export interface TagCount {
  tag: string
  count: number
}

/** Count tag occurrences across many tag-strings, sorted by count then name. */
export function aggregate(tagStrings: (string | null)[]): TagCount[] {
  const m = new Map<string, number>()
  for (const s of tagStrings) for (const t of parseTags(s)) m.set(t, (m.get(t) ?? 0) + 1)
  return [...m.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag))
}

export interface TagGroup {
  prefix: string // top-level segment, or '其他' for un-prefixed tags
  tags: TagCount[]
}

/** Group tags by their first `/` segment (hierarchical display). */
export function groupByPrefix(tags: TagCount[]): TagGroup[] {
  const groups = new Map<string, TagCount[]>()
  for (const tc of tags) {
    const prefix = tc.tag.includes('/') ? tc.tag.split('/')[0].trim() : '其他'
    if (!groups.has(prefix)) groups.set(prefix, [])
    groups.get(prefix)!.push(tc)
  }
  // Named prefixes first (by total count), '其他' last.
  return [...groups.entries()]
    .map(([prefix, t]) => ({ prefix, tags: t }))
    .sort((a, b) => {
      if (a.prefix === '其他') return 1
      if (b.prefix === '其他') return -1
      const ca = a.tags.reduce((s, x) => s + x.count, 0)
      const cb = b.tags.reduce((s, x) => s + x.count, 0)
      return cb - ca
    })
}
