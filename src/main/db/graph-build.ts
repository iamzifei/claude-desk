import { parseTags } from './tag-util'

/**
 * Build the knowledge-graph node/edge set from entities + resolved wikilinks +
 * shared tags. Pure & unit-tested; the force layout itself runs client-side.
 */
export interface GraphItem {
  kind: string // 'material' | 'atom' | 'topic'
  id: string
  label: string
  tags?: string | null
}
export interface RawLink {
  from_kind: string
  from_id: string
  to_kind: string | null
  to_id: string | null
}
export interface GraphNode {
  id: string // namespaced "kind:id"
  kind: string
  label: string
}
export interface GraphEdge {
  source: string
  target: string
  type: 'link' | 'tag'
}

const nid = (kind: string, id: string): string => `${kind}:${id}`

export function buildGraph(
  items: GraphItem[],
  links: RawLink[]
): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const nodeSet = new Set(items.map((i) => nid(i.kind, i.id)))
  const nodes: GraphNode[] = items.map((i) => ({ id: nid(i.kind, i.id), kind: i.kind, label: i.label }))

  const edges = new Map<string, GraphEdge>()
  const addEdge = (a: string, b: string, type: 'link' | 'tag'): void => {
    if (a === b || !nodeSet.has(a) || !nodeSet.has(b)) return
    const key = [a, b].sort().join('|')
    const existing = edges.get(key)
    if (!existing) edges.set(key, { source: a, target: b, type })
    else if (existing.type === 'tag' && type === 'link') existing.type = 'link' // a real link beats a tag co-occurrence
  }

  // Wikilink edges.
  for (const l of links) {
    if (!l.to_id || !l.to_kind) continue
    addEdge(nid(l.from_kind, l.from_id), nid(l.to_kind, l.to_id), 'link')
  }

  // Shared-tag edges (connect items co-occurring on a tag; skip huge clusters
  // so a single broad tag doesn't explode the edge count).
  const byTag = new Map<string, string[]>()
  for (const i of items) {
    for (const t of parseTags(i.tags ?? null)) {
      const arr = byTag.get(t) ?? []
      arr.push(nid(i.kind, i.id))
      byTag.set(t, arr)
    }
  }
  for (const ids of byTag.values()) {
    if (ids.length < 2 || ids.length > 12) continue
    for (let a = 0; a < ids.length; a++)
      for (let b = a + 1; b < ids.length; b++) addEdge(ids[a], ids[b], 'tag')
  }

  return { nodes, edges: [...edges.values()] }
}
