import { JSX, useEffect, useRef, useState, type ReactNode, type PointerEvent } from 'react'
import {
  TriangleAlert,
  X,
  ChevronDown,
  Sparkles,
  Copy,
  Check,
  Loader2,
  GripVertical,
  Star
} from 'lucide-react'
import { useStore } from '../store'
import { cn } from '../lib/utils'
import { greeting } from '../utils'
import { hasPaneDrop, getDragTarget, getPaneDrag, isFavorited } from '../dnd'
import type { MainView, LayoutPreset, SplitTarget } from '../types'
import { MessageBubble } from './MessageBubble'
import { Composer } from './Composer'
import { ChatPane } from './ChatPane'
import { TabBar } from './TabBar'
import { FilesView } from './FilesView'
import { VaultView } from './VaultView'
import { FilePreview } from './FilePreview'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator
} from './ui/dropdown-menu'
import { ScheduledView } from './ScheduledView'
import { NotesView } from './NotesView'
import { DailyView } from './DailyView'
import { BrowserView } from './BrowserView'
import { SkillsView } from './SkillsView'
import { CodingView } from './CodingView'
import { MaterialsView } from './MaterialsView'
import { AtomsView } from './AtomsView'
import { TopicsView } from './TopicsView'
import { TagsView } from './TagsView'
import { GraphView } from './GraphView'
import { PublishView } from './PublishView'
import { OnboardingCard } from './OnboardingCard'
import { RewriteView } from './RewriteView'

/** Render a view by id. Chat is the fallback (uses the global session state). */
function renderView(view: MainView): JSX.Element {
  switch (view) {
    case 'scheduled':
      return <ScheduledView />
    case 'review':
      return <NotesView type="review" />
    case 'minutes':
      return <NotesView type="minutes" />
    case 'daily':
      return <DailyView />
    case 'browser':
      return <BrowserView />
    case 'skills':
      return <SkillsView />
    case 'coding':
      return <CodingView />
    case 'materials':
      return <MaterialsView />
    case 'atoms':
      return <AtomsView />
    case 'topics':
      return <TopicsView />
    case 'tags':
      return <TagsView />
    case 'graph':
      return <GraphView />
    case 'publish':
      return <PublishView />
    case 'rewrite':
      return <RewriteView />
    case 'files':
      return <FilesView />
    case 'vault':
      return <VaultView />
    default:
      return <ChatArea />
  }
}

// Reference views the split pane can show (chat stays on the primary side).
const SPLIT_VIEWS: { v: MainView; label: string }[] = [
  { v: 'vault', label: '知识库' },
  { v: 'materials', label: '素材库' },
  { v: 'atoms', label: '知识原子' },
  { v: 'tags', label: '标签' },
  { v: 'graph', label: '知识图谱' },
  { v: 'topics', label: '选题库' },
  { v: 'publish', label: '发布数据' },
  { v: 'rewrite', label: '改写工坊' },
  { v: 'skills', label: '技能' },
  { v: 'daily', label: '每日笔记' },
  { v: 'review', label: '每日回顾' },
  { v: 'minutes', label: '会议纪要' },
  { v: 'scheduled', label: '定时任务' },
  { v: 'browser', label: '浏览器' },
  { v: 'coding', label: '编程' },
  { v: 'files', label: '项目文件' }
]

/** One secondary tiling pane (index into store.panes): content picker + close. */
function Pane({ index }: { index: number }): JSX.Element | null {
  const target = useStore((s) => s.panes[index])
  const setPane = useStore((s) => s.setPane)
  const closePane = useStore((s) => s.closePane)
  const openTabs = useStore((s) => s.openTabs)
  const conversations = useStore((s) => s.conversations)
  const dragKind = useStore((s) => s.dragKind)
  const favorites = useStore((s) => s.favorites)
  const toggleFavorite = useStore((s) => s.toggleFavorite)
  const beginPaneReorder = useStore((s) => s.beginPaneReorder)
  const setPaneDropAt = useStore((s) => s.setPaneDropAt)
  const paneDragFrom = useStore((s) => s.paneDragFrom)
  const paneDropAt = useStore((s) => s.paneDropAt)
  const titleOf = (id: string): string => conversations.find((c) => c.id === id)?.title ?? '新对话'

  // Pointer-driven pane drag — reliable across the work area + sidebar, unlike
  // native HTML5 DnD (which Chromium starts inconsistently from in-app handles).
  // Hit-tests under the cursor each move to pick an insertion slot or the favorites zone.
  const startReorder = (e: PointerEvent<HTMLDivElement>): void => {
    e.preventDefault()
    beginPaneReorder(index)
    const move = (ev: globalThis.PointerEvent): void => {
      const el = document.elementFromPoint(ev.clientX, ev.clientY)
      if (el?.closest('[data-favzone]')) {
        setPaneDropAt('fav')
        return
      }
      const paneEl = el?.closest<HTMLElement>('[data-pane-index]')
      if (paneEl) {
        const ti = Number(paneEl.dataset.paneIndex)
        const r = paneEl.getBoundingClientRect()
        setPaneDropAt(ev.clientX - r.left > r.width / 2 ? ti + 1 : ti)
      } else setPaneDropAt(null)
    }
    const up = (): void => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      const st = useStore.getState()
      const from = st.paneDragFrom
      const at = st.paneDropAt
      if (from !== null) {
        if (at === 'fav') st.addFavorite(st.panes[from])
        else if (typeof at === 'number') st.reorderPanes(from, at)
      }
      st.endPaneReorder()
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  if (!target) return null
  const fav = isFavorited(favorites, target)
  const dragging = paneDragFrom !== null

  const currentLabel =
    target.kind === 'chat'
      ? titleOf(target.id)
      : target.kind === 'vault-file'
        ? (target.rel.split('/').pop() ?? '知识库文件')
        : (SPLIT_VIEWS.find((o) => o.v === target.view)?.label ?? '参考')

  return (
    <section
      data-pane-index={index}
      className={cn(
        'relative flex min-h-0 min-w-0 flex-col overflow-hidden bg-background transition-opacity',
        paneDragFrom === index && 'opacity-40'
      )}
    >
      {/* insert-reorder indicator: a bar on the edge where the pane will land */}
      {dragging && paneDropAt === index ? (
        <div className="pointer-events-none absolute left-0 top-0 z-30 h-full w-1 bg-primary" />
      ) : null}
      {dragging && paneDropAt === index + 1 ? (
        <div className="pointer-events-none absolute right-0 top-0 z-30 h-full w-1 bg-primary" />
      ) : null}
      {dragKind === 'pane' ? (
        <div className="absolute inset-0 z-20">
          <DropArea
            className="h-full w-full"
            label="放到此处"
            onDropTarget={(t) => setPane(index, t)}
          />
        </div>
      ) : null}
      <div className="flex h-9 shrink-0 items-center justify-between gap-1 border-b border-border-soft pl-0.5 pr-2.5">
        {/* drag handle — pointer-driven (not native HTML5 DnD). Drag to reorder
            (insert), or onto the sidebar 收藏 zone to pin. */}
        <div
          role="button"
          tabIndex={0}
          aria-label="拖动窗格：插入重排 / 拖到侧栏收藏"
          onPointerDown={startReorder}
          title="拖动窗格：插入重排 / 拖到侧栏收藏"
          className="flex h-7 shrink-0 cursor-grab touch-none select-none items-center rounded px-1 text-muted-foreground/50 hover:bg-accent hover:text-foreground active:cursor-grabbing"
        >
          <GripVertical className="h-4 w-4" />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger className="flex h-7 min-w-0 flex-1 items-center gap-1 rounded-md px-2 text-[12.5px] text-foreground outline-none transition-colors hover:bg-accent focus-visible:bg-accent">
            <span className="truncate">{currentLabel}</span>
            <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="max-h-[60vh] overflow-y-auto">
            {openTabs.length > 0 ? (
              <>
                <div className="px-2.5 py-1 text-[11px] font-medium text-muted-foreground/60">
                  对话
                </div>
                {openTabs.map((id) => (
                  <DropdownMenuItem key={id} onSelect={() => setPane(index, { kind: 'chat', id })}>
                    <span className="truncate">{titleOf(id)}</span>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
              </>
            ) : null}
            <div className="px-2.5 py-1 text-[11px] font-medium text-muted-foreground/60">参考</div>
            {SPLIT_VIEWS.map((o) => (
              <DropdownMenuItem
                key={o.v}
                onSelect={() => setPane(index, { kind: 'view', view: o.v })}
              >
                {o.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <button
          onClick={() => toggleFavorite(target)}
          title={fav ? '从收藏夹移除' : '添加到收藏夹'}
          className={cn(
            'rounded p-1 transition-colors hover:bg-accent',
            fav ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <Star className={cn('h-4 w-4', fav && 'fill-current')} />
        </button>
        <button
          onClick={() => closePane(index)}
          title="关闭此窗格"
          className="rounded p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      {target.kind === 'chat' ? (
        <ChatPane conversationId={target.id} />
      ) : target.kind === 'vault-file' ? (
        <FilePreview
          key={`${target.projectId}:${target.rel}`}
          projectId={target.projectId}
          rel={target.rel}
        />
      ) : (
        <div className="flex min-h-0 flex-1 flex-col">{renderView(target.view)}</div>
      )}
    </section>
  )
}

// Column/row track counts per preset (primary is the first cell, row-major).
const LAYOUT_DIMS: Record<LayoutPreset, { cols: number; rows: number }> = {
  single: { cols: 1, rows: 1 },
  'col-2': { cols: 2, rows: 1 },
  'row-2': { cols: 1, rows: 2 },
  'col-3': { cols: 3, rows: 1 },
  quad: { cols: 2, rows: 2 }
}
const eqFractions = (n: number): number[] => Array.from({ length: n }, () => 1 / n)
const MIN_FR = 0.08 // a pane never shrinks below 8% of an axis

/**
 * A drop target for a pane drag (only mounted during a drag). Pure overlay — it
 * doesn't wrap the cell's content, so normal interaction is never blocked and
 * there's no drag-enter/leave flicker. Accepts both "open this target" and
 * "swap with this pane" payloads.
 */
function DropArea({
  className,
  label,
  onDropTarget,
  onDropPane
}: {
  className?: string
  label: string
  onDropTarget: (t: SplitTarget) => void
  onDropPane?: (fromIndex: number) => void
}): JSX.Element {
  const [over, setOver] = useState(false)
  return (
    <div
      onDragOver={(e) => {
        if (hasPaneDrop(e)) {
          e.preventDefault()
          e.dataTransfer.dropEffect = 'copy'
          setOver(true)
        }
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        setOver(false)
        const from = getPaneDrag(e)
        if (from !== null && onDropPane) {
          e.preventDefault()
          onDropPane(from)
          return
        }
        const t = getDragTarget(e)
        if (t) {
          e.preventDefault()
          onDropTarget(t)
        }
      }}
      className={cn(
        'flex items-center justify-center transition-colors',
        over ? 'bg-primary/15' : 'bg-transparent',
        className
      )}
    >
      {over ? (
        <span className="rounded-md bg-background/90 px-2.5 py-1 text-[12px] font-medium text-primary shadow-sm">
          {label}
        </span>
      ) : null}
    </div>
  )
}

/**
 * Resizable grid for the work area. Tracks column/row fractions in state and
 * draws draggable gutters between them. Mounted with `key={layout}` so each
 * preset starts from equal splits (no reset effect needed).
 */
function PaneGrid({ cells }: { cells: ReactNode[] }): JSX.Element {
  const layout = useStore((s) => s.layout)
  const { cols: nc, rows: nr } = LAYOUT_DIMS[layout]
  const ref = useRef<HTMLDivElement>(null)
  const [cols, setCols] = useState<number[]>(() => eqFractions(nc))
  const [rows, setRows] = useState<number[]>(() => eqFractions(nr))

  // Drag a gutter: shift fraction between the two tracks it separates.
  const startResize =
    (axis: 'col' | 'row', i: number) =>
    (e: PointerEvent<HTMLDivElement>): void => {
      const el = ref.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const size = axis === 'col' ? rect.width : rect.height
      const startPos = axis === 'col' ? e.clientX : e.clientY
      const base = (axis === 'col' ? cols : rows).slice()
      const a0 = base[i - 1]
      const b0 = base[i]
      const move = (ev: globalThis.PointerEvent): void => {
        const cur = axis === 'col' ? ev.clientX : ev.clientY
        let d = (cur - startPos) / size
        d = Math.max(-(a0 - MIN_FR), Math.min(b0 - MIN_FR, d))
        const next = base.slice()
        next[i - 1] = a0 + d
        next[i] = b0 - d
        if (axis === 'col') setCols(next)
        else setRows(next)
      }
      const up = (): void => {
        window.removeEventListener('pointermove', move)
        window.removeEventListener('pointerup', up)
      }
      window.addEventListener('pointermove', move)
      window.addEventListener('pointerup', up)
    }

  const cum = (arr: number[], i: number): number => arr.slice(0, i).reduce((s, x) => s + x, 0)

  return (
    <div
      ref={ref}
      className="relative grid min-h-0 min-w-0 flex-1 gap-px bg-border"
      style={{
        gridTemplateColumns: cols.map((c) => `${c}fr`).join(' '),
        gridTemplateRows: rows.map((r) => `${r}fr`).join(' ')
      }}
    >
      {cells}
      {Array.from({ length: nc - 1 }, (_, k) => k + 1).map((i) => (
        <div
          key={`v${i}`}
          onPointerDown={startResize('col', i)}
          style={{ left: `${cum(cols, i) * 100}%` }}
          className="group absolute top-0 z-10 h-full w-2 -translate-x-1/2 cursor-col-resize"
        >
          <span className="mx-auto block h-full w-px transition-colors group-hover:bg-primary/40" />
        </div>
      ))}
      {Array.from({ length: nr - 1 }, (_, k) => k + 1).map((i) => (
        <div
          key={`h${i}`}
          onPointerDown={startResize('row', i)}
          style={{ top: `${cum(rows, i) * 100}%` }}
          className="group absolute left-0 z-10 h-2 w-full -translate-y-1/2 cursor-row-resize"
        >
          <span className="my-auto block h-px w-full transition-colors group-hover:bg-primary/40" />
        </div>
      ))}
    </div>
  )
}

export function ChatView(): JSX.Element {
  const view = useStore((s) => s.view)
  const panes = useStore((s) => s.panes)
  const layout = useStore((s) => s.layout)
  const dragKind = useStore((s) => s.dragKind)
  const openTargetPrimary = useStore((s) => s.openTargetPrimary)
  const setSplit = useStore((s) => s.setSplit)

  const cells: ReactNode[] = [
    <div
      key="primary"
      className="relative flex min-h-0 min-w-0 flex-col overflow-hidden bg-background"
    >
      {renderView(view)}
      {/* Drag a sidebar module/chat here to open it; drop on the right edge to split. */}
      {dragKind === 'pane' ? (
        <div className="absolute inset-0 z-20 flex">
          <DropArea
            className="flex-1"
            label="在此打开"
            onDropTarget={(t) => openTargetPrimary(t)}
          />
          <DropArea
            className="w-1/3 border-l-2 border-dashed border-primary/40"
            label="拖到此处分屏"
            onDropTarget={(t) => setSplit(t)}
          />
        </div>
      ) : null}
    </div>,
    ...panes.map((_, i) => <Pane key={i} index={i} />)
  ]

  return (
    <div className="flex min-h-0 min-w-0 flex-col rounded-tl-xl border-l border-t border-border bg-background">
      <PaneGrid key={layout} cells={cells} />
    </div>
  )
}

function ChatArea(): JSX.Element {
  const messages = useStore((s) => s.messages)
  const streaming = useStore((s) => s.streaming)
  const hasApiKey = useStore((s) => s.hasApiKey)
  const activeId = useStore((s) => s.activeId)
  const scrollRef = useRef<HTMLDivElement>(null)
  const empty = messages.length === 0 && !streaming

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
  }, [messages, streaming])

  return (
    <>
      <TabBar />
      <div className="flex min-h-0 flex-1">
        <main className="flex min-w-0 flex-1 flex-col">
          {empty ? (
            <div className="flex flex-1 flex-col items-center justify-center px-6">
              <OnboardingCard />
              <div className="mb-6 text-[26px] font-semibold tracking-tight">{greeting()}</div>
              {!hasApiKey ? (
                <p className="-mt-2 mb-4 text-[13px] text-muted-foreground">
                  点击左下角「设置」填入 API key，或在 ~/.env 设置 CLAUDE_API_KEY。
                </p>
              ) : null}
              <Composer />
            </div>
          ) : (
            <>
              <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto py-7">
                {messages.map((m) => (
                  <MessageBubble key={m.id} role={m.role} content={m.content} />
                ))}
                {streaming ? (
                  <MessageBubble
                    role="assistant"
                    content={streaming.text || (streaming.error ? '' : '…')}
                    thinking={streaming.thinking || undefined}
                  />
                ) : null}
                {streaming?.error ? (
                  <div className="mx-auto flex max-w-3xl items-center gap-2 px-6 py-2 text-[13px] text-destructive">
                    <TriangleAlert className="h-4 w-4 shrink-0" /> {streaming.error}
                  </div>
                ) : null}
              </div>
              <RecapCard key={activeId ?? 'none'} />
              <Composer />
            </>
          )}
        </main>
      </div>
    </>
  )
}

const RECAP_IDLE_MS = 60_000

/**
 * Idle recap (Claude-Code-style): after ~60s of no activity in a conversation,
 * generate a 3-line brief and surface it above the composer, with the
 * conversation's Session ID one click away — so the user can copy it and paste
 * it into another chat to migrate context, without hunting through menus.
 */
function RecapCard(): JSX.Element | null {
  const activeId = useStore((s) => s.activeId)
  const messages = useStore((s) => s.messages)
  const streaming = useStore((s) => s.streaming)
  // Mounted with key={activeId}, so switching conversations gives a fresh
  // instance — no manual reset of recap/dismissed/copied needed.
  const [recap, setRecap] = useState<{ brief: string; sessionId: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!activeId || messages.length === 0 || streaming || recap || dismissed) return
    let alive = true
    const t = setTimeout(async () => {
      setLoading(true)
      const r = await window.api.conversations.recap(activeId)
      if (!alive) return
      setLoading(false)
      if (r.brief) setRecap(r)
    }, RECAP_IDLE_MS)
    return () => {
      alive = false
      clearTimeout(t)
    }
    // `messages` in deps → any new turn resets the idle countdown.
  }, [activeId, messages, streaming, recap, dismissed])

  if (loading && !recap) {
    return (
      <div className="mx-auto flex w-full max-w-3xl items-center gap-2 px-6 pb-1 text-[12px] text-muted-foreground/70">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> 正在生成对话回顾…
      </div>
    )
  }
  if (!recap) return null

  const copy = (): void => {
    navigator.clipboard?.writeText(recap.sessionId)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-6 pb-1.5">
      <div className="rounded-xl border border-border bg-muted/40 px-3.5 py-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[12px] font-medium text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-primary" /> 对话回顾
          </div>
          <button
            onClick={() => setDismissed(true)}
            className="rounded p-0.5 text-muted-foreground/60 transition-colors hover:text-foreground"
            title="收起"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
        <p className="mt-1 whitespace-pre-wrap text-[13px] leading-relaxed text-foreground/90">
          {recap.brief}
        </p>
        <button
          onClick={copy}
          title="复制后可粘贴到其它对话以迁移上下文"
          className="mt-2 flex items-center gap-1.5 rounded-md border border-border-soft px-2 py-1 font-mono text-[11px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          {copied ? <Check className="h-3 w-3 text-primary" /> : <Copy className="h-3 w-3" />}
          <span className="max-w-[260px] truncate">
            {copied ? '已复制 Session ID' : recap.sessionId}
          </span>
        </button>
      </div>
    </div>
  )
}
