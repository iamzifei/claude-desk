import { getDb } from './index'
import { buildGraph, type GraphItem, type GraphNode, type GraphEdge } from './graph-build'
import { scopeClause, scopeProjectId, getScope } from './scope'

export type { GraphNode, GraphEdge }

/** Assemble the knowledge graph, filtered by the active project scope. */
export function buildKnowledgeGraph(workspaceId: string): {
  nodes: GraphNode[]
  edges: GraphEdge[]
} {
  const db = getDb()
  const sc = scopeClause()
  const scopeAnd = sc.sql ? `AND ${sc.sql}` : ''
  const items: GraphItem[] = []
  for (const m of db
    .prepare(`SELECT id, title, tags FROM materials WHERE 1=1 ${scopeAnd}`)
    .all(...sc.params) as {
    id: string
    title: string
    tags: string | null
  }[])
    items.push({ kind: 'material', id: m.id, label: m.title, tags: m.tags })
  for (const a of db
    .prepare(`SELECT id, content, tags FROM atoms WHERE 1=1 ${scopeAnd}`)
    .all(...sc.params) as {
    id: string
    content: string
    tags: string | null
  }[])
    items.push({ kind: 'atom', id: a.id, label: a.content.slice(0, 18), tags: a.tags })
  for (const t of db
    .prepare(`SELECT id, title FROM topics WHERE workspace_id = ? ${scopeAnd}`)
    .all(workspaceId, ...sc.params) as {
    id: string
    title: string
  }[])
    items.push({ kind: 'topic', id: t.id, label: t.title, tags: null })

  const links = db
    .prepare('SELECT from_kind, from_id, to_kind, to_id FROM links WHERE to_id IS NOT NULL')
    .all() as { from_kind: string; from_id: string; to_kind: string | null; to_id: string | null }[]

  // Vault notes (Obsidian-style) + their resolved [[wikilinks]], across every
  // project in this workspace. Node id is `${projectId}::${relPath}` so notes
  // from different projects never collide. The graph then shows e.g. 人物关系
  // derived straight from the knowledge base files.
  // Vault notes always belong to a real project, so 'unfiled' shows none; a
  // specific project shows only its own; 'all' shows every project's notes.
  const scopePid = scopeProjectId()
  const projectIds =
    getScope() === 'unfiled'
      ? []
      : scopePid
        ? [scopePid]
        : (
            db.prepare('SELECT id FROM projects WHERE workspace_id = ?').all(workspaceId) as {
              id: string
            }[]
          ).map((p) => p.id)
  for (const pid of projectIds) {
    const files = db
      .prepare('SELECT rel_path, title FROM vault_files WHERE project_id = ?')
      .all(pid) as { rel_path: string; title: string | null }[]
    for (const f of files) {
      const label = f.title || f.rel_path.split('/').pop()?.replace(/\.md$/i, '') || f.rel_path
      items.push({ kind: 'vault', id: `${pid}::${f.rel_path}`, label, tags: null })
    }
    const vlinks = db
      .prepare(
        'SELECT src_rel, dst_rel FROM vault_links WHERE project_id = ? AND dst_rel IS NOT NULL'
      )
      .all(pid) as { src_rel: string; dst_rel: string }[]
    for (const l of vlinks) {
      links.push({
        from_kind: 'vault',
        from_id: `${pid}::${l.src_rel}`,
        to_kind: 'vault',
        to_id: `${pid}::${l.dst_rel}`
      })
    }
  }

  return buildGraph(items, links)
}
