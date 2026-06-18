import { describe, it, expect } from 'vitest'
import {
  segment,
  buildRetrievalTerms,
  rankByTermMatches
} from '../src/main/agent/assembly-retrieval'

describe('segment', () => {
  it('splits ASCII words and CJK runs, dropping punctuation/spaces', () => {
    expect(segment('我用 AI 做副业的 3 个月复盘')).toEqual([
      '我用',
      'AI',
      '做副业的',
      '3',
      '个月复盘'
    ])
  })
})

describe('buildRetrievalTerms', () => {
  it('extracts the bigram that matches a real asset title', () => {
    const terms = buildRetrievalTerms('我用 AI 做副业的 3 个月复盘')
    // "副业" is the key term that should match the seeded "AI 副业避坑清单".
    expect(terms).toContain('副业')
    expect(terms).toContain('ai') // ASCII tokens lowercased
  })

  it('drops pure-digit and single-char noise', () => {
    const terms = buildRetrievalTerms('3 个月复盘')
    expect(terms).not.toContain('3')
    expect(terms.every((t) => t.length >= 2)).toBe(true)
  })

  it('drops grams made entirely of stopwords', () => {
    // "的了" is all-stopword and must not become a search term.
    expect(buildRetrievalTerms('的了的了')).not.toContain('的了')
  })

  it('folds in the angle text', () => {
    const terms = buildRetrievalTerms('复盘', '把接单流程做成可复制 SOP')
    expect(terms).toContain('sop')
    expect(terms).toContain('接单')
  })
})

describe('rankByTermMatches', () => {
  const key = (h: { kind: string; id: string }): string => `${h.kind}:${h.id}`

  it('ranks an asset matching more distinct terms higher', () => {
    // material A matches two terms, material B matches one.
    const hitsPerTerm = [
      [{ kind: 'material', id: 'A' }],
      [
        { kind: 'material', id: 'A' },
        { kind: 'material', id: 'B' }
      ]
    ]
    const ranked = rankByTermMatches(hitsPerTerm, key)
    expect(ranked[0]).toEqual({ key: 'material:A', score: 2 })
    expect(ranked[1]).toEqual({ key: 'material:B', score: 1 })
  })

  it('counts one point per term even if a doc appears twice in one term', () => {
    const hitsPerTerm = [
      [
        { kind: 'atom', id: 'X' },
        { kind: 'atom', id: 'X' }
      ]
    ]
    expect(rankByTermMatches(hitsPerTerm, key)).toEqual([{ key: 'atom:X', score: 1 }])
  })

  it('namespaces by kind so material/atom ids never collide', () => {
    const hitsPerTerm = [
      [
        { kind: 'material', id: '1' },
        { kind: 'atom', id: '1' }
      ]
    ]
    const ranked = rankByTermMatches(hitsPerTerm, key)
    expect(ranked).toHaveLength(2)
  })
})
