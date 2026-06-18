/**
 * Pure helpers for the global quick-switch search. Building a readable snippet
 * around the first match is the only non-trivial bit, so it's unit-tested here.
 */

/** Build a ~maxLen preview centered on the first case-insensitive match. */
export function snippet(content: string, query: string, maxLen = 70): string {
  const text = content.replace(/\s+/g, ' ').trim()
  if (!query.trim() || text.length <= maxLen) return text.slice(0, maxLen)
  const idx = text.toLowerCase().indexOf(query.trim().toLowerCase())
  if (idx === -1) return text.slice(0, maxLen) + (text.length > maxLen ? '…' : '')
  const start = Math.max(0, idx - Math.floor((maxLen - query.length) / 2))
  const end = Math.min(text.length, start + maxLen)
  return (start > 0 ? '…' : '') + text.slice(start, end) + (end < text.length ? '…' : '')
}

/** Build the LIKE pattern for a query (escapes %/_ so they're literal). */
export function likePattern(query: string): string {
  return `%${query.trim().replace(/[%_]/g, (m) => `\\${m}`)}%`
}
