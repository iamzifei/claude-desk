/**
 * Pure retrieval helpers for 选题装配 (topic assembly).
 *
 * Chinese has no spaces between words, so LIKE-matching a whole topic title
 * (e.g. "我用 AI 做副业的 3 个月复盘") against the asset library finds nothing —
 * no single material contains that exact phrase. The fix is the standard
 * segmenter-free Chinese IR trick: expand the title/angle into overlapping
 * search terms (ASCII tokens kept whole, CJK runs expanded into 2-/3-grams),
 * search each term, then rank assets by how many *distinct* terms they match.
 * Noise grams (e.g. "做副", "业的") simply match nothing and cost nothing.
 *
 * Kept dependency-free so it can be unit-tested in isolation.
 */

// High-frequency CJK characters that carry no retrieval signal on their own.
// Dropping grams made entirely of these avoids matching everything.
const STOP = new Set(
  '的了在和是我你他她它们个月年天这那有就不也要把被让给跟到从为以及与之一二三四五六七八九十零上下中里啊吗呢吧'.split(
    ''
  )
)

/** Split text into ASCII-word and CJK runs, dropping punctuation/whitespace. */
export function segment(text: string): string[] {
  return text.match(/[A-Za-z0-9]+|[一-鿿]+/g) || []
}

/** Expand a CJK run into 2- and 3-grams; runs of ≤3 chars also pass whole. */
function grams(run: string): string[] {
  const out: string[] = []
  if (run.length <= 3) out.push(run)
  for (let n = 2; n <= 3; n++) {
    for (let i = 0; i + n <= run.length; i++) out.push(run.slice(i, i + n))
  }
  return out
}

/**
 * Build a deduped list of search terms from a topic title (and optional angle).
 * ASCII tokens of length ≥2 (and not pure digits) are kept lowercased; CJK runs
 * become 2-/3-grams, dropping grams that are entirely stopword characters.
 */
export function buildRetrievalTerms(title: string, angle?: string | null): string[] {
  const runs = segment([title, angle || ''].join(' '))
  const terms = new Set<string>()
  for (const run of runs) {
    if (/^[A-Za-z0-9]+$/.test(run)) {
      if (run.length >= 2 && !/^\d+$/.test(run)) terms.add(run.toLowerCase())
    } else {
      for (const g of grams(run)) {
        if (g.length >= 2 && ![...g].every((ch) => STOP.has(ch))) terms.add(g)
      }
    }
  }
  return [...terms]
}

/**
 * Rank assets by how many distinct query terms each matches (one point per term
 * per asset, so a term appearing twice in one doc doesn't inflate the score).
 * `keyOf` namespaces an id by kind so material/atom ids never collide.
 */
export function rankByTermMatches<T>(
  hitsPerTerm: T[][],
  keyOf: (hit: T) => string
): { key: string; score: number }[] {
  const score = new Map<string, number>()
  for (const hits of hitsPerTerm) {
    const seen = new Set<string>()
    for (const h of hits) {
      const k = keyOf(h)
      if (seen.has(k)) continue
      seen.add(k)
      score.set(k, (score.get(k) || 0) + 1)
    }
  }
  return [...score.entries()]
    .map(([key, s]) => ({ key, score: s }))
    .sort((a, b) => b.score - a.score)
}
