/**
 * Wikilink parsing. Extracts `[[title]]` references from a piece of content.
 * Pure & dependency-free so it's unit-tested. Mirrors Obsidian's syntax;
 * supports `[[title|alias]]` (alias ignored for resolution) and de-dupes.
 */
export function extractWikiLinks(text: string): string[] {
  if (!text) return []
  const out: string[] = []
  const seen = new Set<string>()
  const re = /\[\[([^\]]+?)\]\]/g
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    // Drop a trailing |alias and trim.
    const title = m[1].split('|')[0].trim()
    if (title && !seen.has(title)) {
      seen.add(title)
      out.push(title)
    }
  }
  return out
}

/**
 * Split content into plain-text and wikilink tokens, for rendering `[[ ]]` as
 * clickable links. Pure. Each token is either {text} or {link: title}.
 */
export type LinkToken = { text: string } | { link: string }

export function tokenizeWikiLinks(text: string): LinkToken[] {
  if (!text) return []
  const tokens: LinkToken[] = []
  const re = /\[\[([^\]]+?)\]\]/g
  let last = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) tokens.push({ text: text.slice(last, m.index) })
    tokens.push({ link: m[1].split('|')[0].trim() })
    last = m.index + m[0].length
  }
  if (last < text.length) tokens.push({ text: text.slice(last) })
  return tokens
}
