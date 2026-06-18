import { getDb } from './index'
import { buildGraph, type GraphItem, type GraphNode, type GraphEdge } from './graph-build'

export type { GraphNode, GraphEdge }

/** Assemble the knowledge graph: materials + atoms (global) + topics (workspace). */
export function buildKnowledgeGraph(workspaceId: string): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const db = getDb()
  const items: GraphItem[] = []
  for (const m of db.prepare('SELECT id, title, tags FROM materials').all() as {
    id: string
    title: string
    tags: string | null
  }[])
    items.push({ kind: 'material', id: m.id, label: m.title, tags: m.tags })
  for (const a of db.prepare('SELECT id, content, tags FROM atoms').all() as {
    id: string
    content: string
    tags: string | null
  }[])
    items.push({ kind: 'atom', id: a.id, label: a.content.slice(0, 18), tags: a.tags })
  for (const t of db.prepare('SELECT id, title FROM topics WHERE workspace_id = ?').all(workspaceId) as {
    id: string
    title: string
  }[])
    items.push({ kind: 'topic', id: t.id, label: t.title, tags: null })

  const links = db
    .prepare('SELECT from_kind, from_id, to_kind, to_id FROM links WHERE to_id IS NOT NULL')
    .all() as { from_kind: string; from_id: string; to_kind: string | null; to_id: string | null }[]

  return buildGraph(items, links)
}
