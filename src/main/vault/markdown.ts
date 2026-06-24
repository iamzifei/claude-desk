import matter from 'gray-matter'
import { extractWikiLinks } from '../db/link-parse'

/**
 * Parsed view of a single `.md` note: its display title, the raw frontmatter
 * object, and the `[[wikilinks]]` found in the body. Pure & unit-tested — the
 * disk file stays the source of truth; this just derives an index entry from it.
 *
 * Title precedence (so the graph / file tree show something meaningful rather
 * than an opaque filename like `133_20241023_0`):
 *   1. frontmatter `title:`
 *   2. first Markdown `# H1` heading
 *   3. first non-empty body line (lightly de-marked-down, trimmed)
 *   4. the filename fallback
 */
export interface ParsedMd {
  title: string
  frontmatter: Record<string, unknown>
  links: string[]
}

/** First H1 heading, else first meaningful content line. Null if none. */
function titleFromBody(body: string): string | null {
  const lines = body.split('\n')
  for (const line of lines) {
    const h1 = line.match(/^#\s+(.+?)\s*#*\s*$/)
    if (h1 && h1[1].trim()) return clean(h1[1])
  }
  for (const raw of lines) {
    const t = raw.trim()
    if (!t) continue
    if (/^(#{1,6}\s|[-*>|]|`{3}|!\[|<!--)/.test(t)) continue // skip headings/lists/quotes/code/img/comments
    const c = clean(t)
    if (c) return c.slice(0, 40)
  }
  return null
}

/** Strip light Markdown so a heading/line reads as a plain label. */
function clean(s: string): string {
  return s
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1') // [text](url) → text
    .replace(/[*_`~]/g, '')
    .replace(/^\[\[|\]\]$/g, '')
    .trim()
}

/**
 * @param raw            full file contents (frontmatter + body)
 * @param fallbackTitle  used when no title can be derived (the filename w/o ext)
 */
export function parseMarkdown(raw: string, fallbackTitle: string): ParsedMd {
  let data: Record<string, unknown> = {}
  let body = raw
  try {
    const g = matter(raw)
    data = (g.data ?? {}) as Record<string, unknown>
    body = g.content
  } catch {
    // Malformed YAML frontmatter → treat the whole file as body, never crash a
    // scan over one bad note.
    data = {}
    body = raw
  }
  const fmTitle = typeof data.title === 'string' && data.title.trim() ? data.title.trim() : null
  return {
    title: fmTitle ?? titleFromBody(body) ?? fallbackTitle,
    frontmatter: data,
    links: extractWikiLinks(body)
  }
}
