import { JSX, useEffect, useMemo, useRef, useState } from 'react'
import { Network } from 'lucide-react'
import { useStore } from '../store'
import { Header, Empty } from './ScheduledView'
import type { GraphNode, GraphEdge } from '../types'

interface P {
  x: number
  y: number
  vx: number
  vy: number
}
const W = 820
const H = 580
const COLOR: Record<string, string> = { material: '#6d5dfb', atom: '#a06dfb', topic: '#f59e0b' }
const KIND_LABEL: Record<string, string> = { material: '素材', atom: '原子', topic: '选题' }

/** Lightweight force-directed knowledge graph (no graph library). */
export function GraphView(): JSX.Element {
  const ws = useStore((s) => s.activeWorkspaceId)
  const jumpTo = useStore((s) => s.jumpTo)
  const [graph, setGraph] = useState<{ nodes: GraphNode[]; edges: GraphEdge[] }>({ nodes: [], edges: [] })
  const posRef = useRef<P[]>([])
  const [, force] = useState(0)
  const [hover, setHover] = useState<number | null>(null)

  useEffect(() => {
    if (ws) window.api.graph.build(ws).then(setGraph)
  }, [ws])

  // index + simulation edges + degree (for sizing)
  const idx = useMemo(() => new Map(graph.nodes.map((n, i) => [n.id, i])), [graph])
  const simEdges = useMemo(
    () =>
      graph.edges
        .map((e) => ({ s: idx.get(e.source), t: idx.get(e.target), type: e.type }))
        .filter((e): e is { s: number; t: number; type: 'link' | 'tag' } => e.s != null && e.t != null),
    [graph, idx]
  )
  const deg = useMemo(() => {
    const d = new Array(graph.nodes.length).fill(0)
    simEdges.forEach((e) => {
      d[e.s]++
      d[e.t]++
    })
    return d
  }, [simEdges, graph.nodes.length])

  // Run the force layout when the graph changes.
  useEffect(() => {
    const n = graph.nodes.length
    if (n === 0) {
      posRef.current = []
      return
    }
    posRef.current = graph.nodes.map((_, i) => ({
      x: W / 2 + Math.cos((i / n) * 6.283) * 160 + (i % 5),
      y: H / 2 + Math.sin((i / n) * 6.283) * 160,
      vx: 0,
      vy: 0
    }))
    let ticks = 0
    let raf = 0
    const step = (): void => {
      const p = posRef.current
      for (let i = 0; i < n; i++) {
        p[i].vx += (W / 2 - p[i].x) * 0.006
        p[i].vy += (H / 2 - p[i].y) * 0.006
      }
      for (let i = 0; i < n; i++)
        for (let k = i + 1; k < n; k++) {
          const dx = p[i].x - p[k].x
          const dy = p[i].y - p[k].y
          const d2 = dx * dx + dy * dy || 1
          const d = Math.sqrt(d2)
          const f = Math.min(2600 / d2, 22)
          const fx = (dx / d) * f
          const fy = (dy / d) * f
          p[i].vx += fx
          p[i].vy += fy
          p[k].vx -= fx
          p[k].vy -= fy
        }
      for (const e of simEdges) {
        const a = p[e.s]
        const b = p[e.t]
        const dx = b.x - a.x
        const dy = b.y - a.y
        const d = Math.sqrt(dx * dx + dy * dy) || 1
        const f = (d - 78) * 0.02
        const fx = (dx / d) * f
        const fy = (dy / d) * f
        a.vx += fx
        a.vy += fy
        b.vx -= fx
        b.vy -= fy
      }
      const rad = (i: number): number => 4 + Math.min(deg[i], 9) * 0.9
      // Integrate velocity (no clamp yet — the collision pass needs free room).
      for (let i = 0; i < n; i++) {
        p[i].vx *= 0.85
        p[i].vy *= 0.85
        p[i].x += p[i].vx
        p[i].y += p[i].vy
      }
      // Collision separation: push apart any two nodes whose circles + label
      // padding overlap, so small graphs don't pile into an unreadable clump.
      for (let i = 0; i < n; i++)
        for (let k = i + 1; k < n; k++) {
          const dx = p[k].x - p[i].x
          const dy = p[k].y - p[i].y
          const d = Math.sqrt(dx * dx + dy * dy) || 1
          const min = rad(i) + rad(k) + 22
          if (d < min) {
            const push = (min - d) / 2
            p[i].x -= (dx / d) * push
            p[i].y -= (dy / d) * push
            p[k].x += (dx / d) * push
            p[k].y += (dy / d) * push
          }
        }
      for (let i = 0; i < n; i++) {
        p[i].x = Math.max(20, Math.min(W - 20, p[i].x))
        p[i].y = Math.max(20, Math.min(H - 20, p[i].y))
      }
      force((t) => t + 1)
      if (++ticks < 340) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [graph, simEdges])

  const pos = posRef.current
  const ready = pos.length === graph.nodes.length

  const onNode = (n: GraphNode): void => {
    const i = n.id.indexOf(':')
    jumpTo({ kind: n.id.slice(0, i), id: n.id.slice(i + 1) })
  }

  return (
    <div className="mx-auto flex h-full w-full max-w-4xl flex-col px-6 py-7">
      <Header
        icon={Network}
        title="知识图谱"
        desc="把你的素材、原子、选题按 双链 与 共享标签 连成一张资产网络。点击节点跳转。"
      />
      {graph.nodes.length === 0 ? (
        <Empty>图谱还空着。多沉淀些素材/原子、用 [[ ]] 互链或打相同标签,网络就长出来了。</Empty>
      ) : (
        <>
          <div className="mt-2 flex items-center gap-3 text-[12px] text-muted-foreground">
            {Object.entries(KIND_LABEL).map(([k, label]) => (
              <span key={k} className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: COLOR[k] }} />
                {label}
              </span>
            ))}
            {graph.edges.length < graph.nodes.length / 2 ? (
              <span className="text-primary/80">孤立节点较多 —— 多用 [[ ]] 互链或打相同标签,网络会更连通</span>
            ) : null}
            <span className="ml-auto">{graph.nodes.length} 节点 · {graph.edges.length} 连线</span>
          </div>
          <div className="mt-2 min-h-0 flex-1 overflow-hidden rounded-xl border border-border bg-card">
            <svg viewBox={`0 0 ${W} ${H}`} className="h-full w-full" preserveAspectRatio="xMidYMid meet">
              {ready
                ? simEdges.map((e, i) => {
                    const a = pos[e.s]
                    const b = pos[e.t]
                    return (
                      <line
                        key={i}
                        x1={a.x}
                        y1={a.y}
                        x2={b.x}
                        y2={b.y}
                        stroke={e.type === 'link' ? '#8174ff' : '#b9bdd0'}
                        strokeWidth={e.type === 'link' ? 1.5 : 0.9}
                        strokeOpacity={0.45}
                        strokeDasharray={e.type === 'tag' ? '3 3' : undefined}
                      />
                    )
                  })
                : null}
              {ready
                ? graph.nodes.map((nd, i) => {
                    const p = pos[i]
                    const r = 4 + Math.min(deg[i], 9) * 0.9
                    const dim = hover !== null && hover !== i
                    return (
                      <g
                        key={nd.id}
                        className="cursor-pointer"
                        onClick={() => onNode(nd)}
                        onMouseEnter={() => setHover(i)}
                        onMouseLeave={() => setHover(null)}
                      >
                        <circle cx={p.x} cy={p.y} r={r} fill={COLOR[nd.kind] ?? '#888'} fillOpacity={dim ? 0.35 : 1} />
                        {hover === i || graph.nodes.length <= 36 ? (
                          <text
                            x={p.x}
                            y={p.y - r - 3}
                            textAnchor="middle"
                            className="pointer-events-none fill-foreground"
                            style={{ fontSize: 8.5, opacity: dim ? 0.4 : 0.9 }}
                          >
                            {nd.label.slice(0, 10)}
                          </text>
                        ) : null}
                      </g>
                    )
                  })
                : null}
            </svg>
          </div>
        </>
      )}
    </div>
  )
}
