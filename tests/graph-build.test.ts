import { describe, it, expect } from 'vitest'
import { buildGraph } from '../src/main/db/graph-build'

describe('buildGraph', () => {
  const items = [
    { kind: 'material', id: 'a', label: 'A', tags: 'AI' },
    { kind: 'material', id: 'b', label: 'B', tags: 'AI' },
    { kind: 'atom', id: 'c', label: 'C', tags: null }
  ]

  it('creates one node per item (namespaced id)', () => {
    const { nodes } = buildGraph(items, [])
    expect(nodes.map((n) => n.id).sort()).toEqual(['atom:c', 'material:a', 'material:b'])
  })

  it('adds wikilink edges between existing nodes', () => {
    const { edges } = buildGraph(items, [
      { from_kind: 'atom', from_id: 'c', to_kind: 'material', to_id: 'a' }
    ])
    const link = edges.find((e) => e.type === 'link')
    expect(link).toBeTruthy()
    expect([link!.source, link!.target].sort()).toEqual(['atom:c', 'material:a'])
  })

  it('adds shared-tag edges and a link supersedes a tag edge', () => {
    const { edges } = buildGraph(items, [
      { from_kind: 'material', from_id: 'a', to_kind: 'material', to_id: 'b' }
    ])
    // a–b share tag AI AND are wikilinked → single edge, type 'link'
    const ab = edges.find(
      (e) => [e.source, e.target].sort().join() === ['material:a', 'material:b'].sort().join()
    )
    expect(ab?.type).toBe('link')
    expect(edges).toHaveLength(1)
  })

  it('drops links to non-existent nodes', () => {
    const noTags = [
      { kind: 'material', id: 'a', label: 'A', tags: null },
      { kind: 'material', id: 'b', label: 'B', tags: null }
    ]
    const { edges } = buildGraph(noTags, [
      { from_kind: 'material', from_id: 'a', to_kind: 'material', to_id: 'zzz' }
    ])
    expect(edges).toEqual([])
  })

  it('ignores unresolved links (null target)', () => {
    const { edges } = buildGraph(
      [{ kind: 'material', id: 'a', label: 'A', tags: null }],
      [{ from_kind: 'material', from_id: 'a', to_kind: null, to_id: null }]
    )
    expect(edges).toEqual([])
  })
})
