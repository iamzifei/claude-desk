import {
  JSX,
  useEffect,
  useRef,
  useState,
  type WheelEvent,
  type PointerEvent,
  type MouseEvent
} from 'react'
import { Network } from 'lucide-react'
import {
  forceSimulation,
  forceManyBody,
  forceLink,
  forceCollide,
  forceX,
  forceY,
  type Simulation,
  type SimulationNodeDatum,
  type SimulationLinkDatum
} from 'd3-force'
import { useStore } from '../store'
import { Header, Empty } from './ScheduledView'
import type { GraphNode, GraphEdge } from '../types'

const COLOR: Record<string, string> = {
  material: '#6d5dfb',
  atom: '#a06dfb',
  topic: '#f59e0b',
  vault: '#10b981'
}
const KIND_LABEL: Record<string, string> = {
  material: '素材',
  atom: '原子',
  topic: '选题',
  vault: '知识库'
}

interface SimNode extends SimulationNodeDatum {
  id: string
  kind: string
  label: string
  deg: number
}
interface SimLink extends SimulationLinkDatum<SimNode> {
  type: 'link' | 'tag'
}
interface Transform {
  x: number
  y: number
  k: number
}

const radius = (n: SimNode): number => 3 + Math.sqrt(n.deg) * 1.7

/**
 * Obsidian-style knowledge graph: a real force-directed layout (d3-force,
 * Barnes-Hut O(n log n) so it scales to thousands of nodes) drawn to canvas
 * for smoothness. Pan (drag background), zoom (wheel), drag nodes, hover to
 * highlight neighbours, click to jump.
 */
export function GraphView(): JSX.Element {
  const ws = useStore((s) => s.activeWorkspaceId)
  const projectScope = useStore((s) => s.projectScope)
  const jumpTo = useStore((s) => s.jumpTo)
  const [graph, setGraph] = useState<{ nodes: GraphNode[]; edges: GraphEdge[] }>({
    nodes: [],
    edges: []
  })

  useEffect(() => {
    if (ws) window.api.graph.build(ws).then(setGraph)
  }, [ws, projectScope])

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  // Mutable rendering/interaction state kept off React to avoid per-tick renders.
  const st = useRef({
    nodes: [] as SimNode[],
    links: [] as SimLink[],
    adj: new Map<string, Set<string>>(),
    tf: { x: 0, y: 0, k: 1 } as Transform,
    hover: null as SimNode | null,
    sim: null as Simulation<SimNode, SimLink> | null,
    w: 0,
    h: 0,
    dpr: 1,
    draw: () => {},
    // transient pointer interaction
    drag: null as SimNode | null,
    pan: false,
    px: 0,
    py: 0,
    moved: false
  })

  // Build the simulation + canvas renderer whenever the graph changes.
  useEffect(() => {
    const wrap = wrapRef.current
    const canvas = canvasRef.current
    if (!wrap || !canvas) return
    const s = st.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resize = (): void => {
      const r = wrap.getBoundingClientRect()
      s.w = r.width
      s.h = r.height
      s.dpr = window.devicePixelRatio || 1
      canvas.width = Math.round(s.w * s.dpr)
      canvas.height = Math.round(s.h * s.dpr)
      s.draw()
    }

    const deg = new Map<string, number>()
    for (const e of graph.edges) {
      deg.set(e.source, (deg.get(e.source) ?? 0) + 1)
      deg.set(e.target, (deg.get(e.target) ?? 0) + 1)
    }
    const ids = new Set(graph.nodes.map((n) => n.id))
    const nodes: SimNode[] = graph.nodes.map((n) => ({
      id: n.id,
      kind: n.kind,
      label: n.label,
      deg: deg.get(n.id) ?? 0
    }))
    const links: SimLink[] = graph.edges
      .filter((e) => ids.has(e.source) && ids.has(e.target))
      .map((e) => ({ source: e.source, target: e.target, type: e.type }))
    const adj = new Map<string, Set<string>>()
    const link = (a: string, b: string): void => {
      if (!adj.has(a)) adj.set(a, new Set())
      adj.get(a)!.add(b)
    }
    for (const l of links) {
      link(l.source as string, l.target as string)
      link(l.target as string, l.source as string)
    }
    s.nodes = nodes
    s.links = links
    s.adj = adj
    s.hover = null
    s.drag = null
    s.pan = false

    const r = wrap.getBoundingClientRect()
    s.w = r.width
    s.h = r.height
    s.dpr = window.devicePixelRatio || 1
    canvas.width = Math.round(s.w * s.dpr)
    canvas.height = Math.round(s.h * s.dpr)
    // Fit larger graphs by starting zoomed out; layout is centred on world (0,0).
    const k = nodes.length > 600 ? 0.55 : nodes.length > 200 ? 0.75 : 1
    s.tf = { x: s.w / 2, y: s.h / 2, k }

    const draw = (): void => {
      const { x: tx, y: ty, k: kk } = s.tf
      ctx.setTransform(s.dpr, 0, 0, s.dpr, 0, 0)
      ctx.clearRect(0, 0, s.w, s.h)
      ctx.translate(tx, ty)
      ctx.scale(kk, kk)
      const hov = s.hover
      const nbrs = hov ? (s.adj.get(hov.id) ?? new Set<string>()) : null
      // edges
      ctx.lineWidth = 1 / kk
      for (const l of s.links) {
        const a = l.source as SimNode
        const b = l.target as SimNode
        const active = hov && (a.id === hov.id || b.id === hov.id)
        ctx.strokeStyle =
          l.type === 'link'
            ? active
              ? 'rgba(129,116,255,0.95)'
              : 'rgba(129,116,255,0.34)'
            : active
              ? 'rgba(150,155,180,0.8)'
              : 'rgba(185,189,208,0.26)'
        ctx.beginPath()
        ctx.moveTo(a.x ?? 0, a.y ?? 0)
        ctx.lineTo(b.x ?? 0, b.y ?? 0)
        ctx.stroke()
      }
      // nodes
      for (const n of s.nodes) {
        const dim = hov && hov.id !== n.id && !(nbrs && nbrs.has(n.id))
        ctx.globalAlpha = dim ? 0.22 : 1
        ctx.beginPath()
        ctx.arc(n.x ?? 0, n.y ?? 0, radius(n), 0, 6.2832)
        ctx.fillStyle = COLOR[n.kind] ?? '#888'
        ctx.fill()
        if (hov && hov.id === n.id) {
          ctx.globalAlpha = 1
          ctx.lineWidth = 1.6 / kk
          ctx.strokeStyle = '#fff'
          ctx.stroke()
        }
      }
      ctx.globalAlpha = 1
      // labels only when zoomed in (or small graph), plus the hovered neighbourhood
      const showAll = kk > 1.4 || s.nodes.length <= 60
      if (showAll || hov) {
        ctx.fillStyle = 'rgba(38,38,48,0.92)'
        ctx.font = `${11 / kk}px ui-sans-serif, -apple-system, system-ui`
        ctx.textAlign = 'center'
        for (const n of s.nodes) {
          const show = hov ? hov.id === n.id || (nbrs && nbrs.has(n.id)) : showAll
          if (!show) continue
          ctx.fillText(n.label.slice(0, 14), n.x ?? 0, (n.y ?? 0) - radius(n) - 3 / kk)
        }
      }
      ctx.setTransform(1, 0, 0, 1, 0, 0)
    }
    s.draw = draw

    const sim = forceSimulation<SimNode>(nodes)
      .force('charge', forceManyBody<SimNode>().strength(-36).distanceMax(340))
      .force(
        'link',
        forceLink<SimNode, SimLink>(links)
          .id((d) => d.id)
          .distance(34)
          .strength(0.65)
      )
      .force(
        'collide',
        forceCollide<SimNode>().radius((n) => radius(n) + 2)
      )
      .force('x', forceX<SimNode>(0).strength(0.05))
      .force('y', forceY<SimNode>(0).strength(0.05))
      .alpha(1)
      .alphaDecay(0.024)
    s.sim = sim
    sim.on('tick', draw)
    draw()

    const ro = new ResizeObserver(resize)
    ro.observe(wrap)
    return () => {
      sim.stop()
      ro.disconnect()
    }
  }, [graph])

  // ---- pointer interaction (pan / zoom / drag / hover / click) ----
  const toWorld = (e: { clientX: number; clientY: number }): { x: number; y: number } => {
    const c = canvasRef.current!
    const r = c.getBoundingClientRect()
    const s = st.current
    return { x: (e.clientX - r.left - s.tf.x) / s.tf.k, y: (e.clientY - r.top - s.tf.y) / s.tf.k }
  }
  const pick = (e: { clientX: number; clientY: number }): SimNode | null => {
    const w = toWorld(e)
    const s = st.current
    let best: SimNode | null = null
    let bd = Infinity
    for (const n of s.nodes) {
      const dx = (n.x ?? 0) - w.x
      const dy = (n.y ?? 0) - w.y
      const d = dx * dx + dy * dy
      const rr = radius(n) + 4
      if (d < rr * rr && d < bd) {
        bd = d
        best = n
      }
    }
    return best
  }

  const onWheel = (e: WheelEvent): void => {
    e.preventDefault()
    const s = st.current
    const c = canvasRef.current!
    const r = c.getBoundingClientRect()
    const mx = e.clientX - r.left
    const my = e.clientY - r.top
    const factor = Math.exp(-e.deltaY * 0.0015)
    const k = Math.max(0.15, Math.min(6, s.tf.k * factor))
    // zoom toward the cursor
    s.tf = { k, x: mx - ((mx - s.tf.x) * k) / s.tf.k, y: my - ((my - s.tf.y) * k) / s.tf.k }
    s.draw()
  }
  const onPointerDown = (e: PointerEvent): void => {
    const s = st.current
    ;(e.target as Element).setPointerCapture?.(e.pointerId)
    s.moved = false
    s.px = e.clientX
    s.py = e.clientY
    const hit = pick(e)
    if (hit) {
      s.drag = hit
      hit.fx = hit.x
      hit.fy = hit.y
      s.sim?.alphaTarget(0.3).restart()
    } else {
      s.pan = true
    }
  }
  const onPointerMove = (e: PointerEvent): void => {
    const s = st.current
    if (s.drag) {
      const w = toWorld(e)
      s.drag.fx = w.x
      s.drag.fy = w.y
      s.moved = true
      return // sim tick redraws
    }
    if (s.pan) {
      s.tf = { ...s.tf, x: s.tf.x + (e.clientX - s.px), y: s.tf.y + (e.clientY - s.py) }
      s.px = e.clientX
      s.py = e.clientY
      s.moved = true
      s.draw()
      return
    }
    const hit = pick(e)
    if (hit !== s.hover) {
      s.hover = hit
      const c = canvasRef.current
      if (c) c.style.cursor = hit ? 'pointer' : 'grab'
      s.draw()
    }
  }
  const endPointer = (): void => {
    const s = st.current
    if (s.drag) {
      s.drag.fx = null
      s.drag.fy = null
      s.sim?.alphaTarget(0)
    }
    s.drag = null
    s.pan = false
  }
  const onClick = (e: MouseEvent<HTMLCanvasElement>): void => {
    if (st.current.moved) return
    const hit = pick(e)
    if (hit) {
      const i = hit.id.indexOf(':')
      jumpTo({ kind: hit.id.slice(0, i), id: hit.id.slice(i + 1) })
    }
  }

  return (
    <div className="mx-auto flex h-full w-full max-w-4xl flex-col px-6 py-7">
      <Header
        icon={Network}
        title="知识图谱"
        desc="把素材、原子、选题与知识库按 双链 与 共享标签 连成网络。滚轮缩放，拖背景平移，拖节点固定，点击跳转。"
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
              <span className="text-primary/80">
                孤立节点较多 —— 多用 [[ ]] 互链或打相同标签,网络会更连通
              </span>
            ) : null}
            <span className="ml-auto">
              {graph.nodes.length} 节点 · {graph.edges.length} 连线
            </span>
          </div>
          <div
            ref={wrapRef}
            className="relative mt-2 min-h-0 flex-1 overflow-hidden rounded-xl border border-border bg-card"
          >
            <canvas
              ref={canvasRef}
              className="absolute inset-0 h-full w-full touch-none"
              style={{ cursor: 'grab' }}
              onWheel={onWheel}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={endPointer}
              onPointerCancel={endPointer}
              onClick={onClick}
            />
          </div>
        </>
      )}
    </div>
  )
}
