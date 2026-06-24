import matter from 'gray-matter'
import { extractWikiLinks } from '../db/link-parse'

/**
 * Parsed view of a single `.md` note: its display title (frontmatter `title`
 * wins, else the filename), the raw frontmatter object, and the `[[wikilinks]]`
 * found in the body. Pure & unit-tested — the disk file stays the source of
 * truth; this just derives an index entry from it.
 */
export interface ParsedMd {
  title: string
  frontmatter: Record<string, unknown>
  links: string[]
}

/**
 * @param raw            full file contents (frontmatter + body)
 * @param fallbackTitle  used when there's no `title:` in frontmatter (the
 *                       filename without extension)
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
    title: fmTitle ?? fallbackTitle,
    frontmatter: data,
    links: extractWikiLinks(body)
  }
}
