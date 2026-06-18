/**
 * Lightweight, dependency-free HTML → readable-text extraction for the
 * 「从链接抓取」(fetch-from-link) feature. Not a full Readability port — just
 * enough to pull a title and the main textual content out of a fetched page so
 * the creator can drop a URL and get a pre-filled material. Pure & testable.
 */
export interface Extracted {
  title: string
  content: string
}

const decodeEntities = (s: string): string =>
  s
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))

const attr = (tag: string, name: string): string | undefined =>
  tag.match(new RegExp(`${name}\\s*=\\s*["']([^"']*)["']`, 'i'))?.[1]

/** Pull a best-effort title: <title>, og:title, or first <h1>. */
function pickTitle(html: string): string {
  const og = html.match(/<meta[^>]+property=["']og:title["'][^>]*>/i)?.[0]
  if (og) {
    const c = attr(og, 'content')
    if (c) return decodeEntities(c).trim()
  }
  const t = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]
  if (t) return decodeEntities(t).replace(/\s+/g, ' ').trim()
  const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1]
  if (h1) return decodeEntities(h1.replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim()
  return '抓取的内容'
}

/**
 * Strip a page down to readable body text.
 * @param maxLen  cap output length (default 4000 chars) so context stays sane
 */
export function extractReadable(html: string, maxLen = 4000): Extracted {
  const title = pickTitle(html)

  // Prefer <article> / <main> when present — usually the real content.
  const main =
    html.match(/<article[^>]*>([\s\S]*?)<\/article>/i)?.[1] ??
    html.match(/<main[^>]*>([\s\S]*?)<\/main>/i)?.[1] ??
    html

  const text = main
    // drop non-content elements entirely (with their contents)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<svg[\s\S]*?<\/svg>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    // block-level tags become line breaks so paragraphs survive
    .replace(/<\/(p|div|h[1-6]|li|br|tr|section|article)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    // remaining tags vanish
    .replace(/<[^>]+>/g, ' ')
  const cleaned = decodeEntities(text)
    .replace(/[ \t\f\v]+/g, ' ')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  const content = cleaned.length > maxLen ? cleaned.slice(0, maxLen).trimEnd() + '…' : cleaned
  return { title, content }
}
