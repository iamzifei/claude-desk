import { JSX, useEffect, useRef, useState, KeyboardEvent } from 'react'
import { Search, MessageSquare, Library, Atom, FileText } from 'lucide-react'
import { useStore } from '../store'
import { cn } from '../lib/utils'
import type { SearchHit, SearchKind } from '../types'

const KIND_ICON: Record<SearchKind, typeof Search> = {
  conversation: MessageSquare,
  material: Library,
  atom: Atom,
  note: FileText
}

/** ⌘K command palette: search everything (对话/素材/原子/笔记) and jump. */
export function QuickSwitcher(): JSX.Element | null {
  const open = useStore((s) => s.quickOpen)
  const setOpen = useStore((s) => s.setQuickOpen)
  const wsId = useStore((s) => s.activeWorkspaceId)
  const conversations = useStore((s) => s.conversations)
  const openConversation = useStore((s) => s.openConversation)
  const setView = useStore((s) => s.setView)

  const [q, setQ] = useState('')
  const [hits, setHits] = useState<SearchHit[]>([])
  const [sel, setSel] = useState(0)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) {
      setQ('')
      setSel(0)
    }
  }, [open])

  // Empty query → recent conversations; otherwise the unified search.
  useEffect(() => {
    if (!open) return
    if (!q.trim()) {
      setHits(
        conversations
          .slice(0, 8)
          .map((c) => ({ kind: 'conversation' as const, id: c.id, title: c.title, snippet: '', meta: '对话' }))
      )
      setSel(0)
      return
    }
    const t = setTimeout(async () => {
      setHits(await window.api.search.all(wsId, q))
      setSel(0)
    }, 140)
    return () => clearTimeout(t)
  }, [q, open, wsId, conversations])

  useEffect(() => {
    listRef.current?.querySelector('[data-sel="true"]')?.scrollIntoView({ block: 'nearest' })
  }, [sel])

  if (!open) return null

  const jump = (h: SearchHit): void => {
    if (h.kind === 'conversation') openConversation(h.id)
    else if (h.kind === 'material') setView('materials')
    else if (h.kind === 'atom') setView('atoms')
    else if (h.kind === 'note') setView(h.noteType === 'minutes' ? 'minutes' : 'review')
    setOpen(false)
  }
  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSel((s) => Math.min(s + 1, hits.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSel((s) => Math.max(s - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (hits[sel]) jump(hits[sel])
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 pt-[12vh]"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-[560px] max-w-[calc(100vw-40px)] overflow-hidden rounded-2xl border border-border bg-card shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2.5 border-b border-border-soft px-4">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="搜索对话 / 素材 / 原子 / 笔记…"
            className="h-12 flex-1 bg-transparent text-[14px] outline-none placeholder:text-muted-foreground"
          />
        </div>
        <div ref={listRef} className="max-h-[52vh] overflow-y-auto p-1.5">
          {hits.length === 0 ? (
            <div className="px-3 py-7 text-center text-[13px] text-muted-foreground">
              {q ? '没有匹配' : '输入以搜索，或选择最近对话'}
            </div>
          ) : (
            hits.map((h, i) => {
              const Icon = KIND_ICON[h.kind]
              return (
                <button
                  key={h.kind + h.id}
                  data-sel={i === sel}
                  onMouseEnter={() => setSel(i)}
                  onClick={() => jump(h)}
                  className={cn(
                    'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left transition-colors',
                    i === sel ? 'bg-accent' : 'hover:bg-accent/60'
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13.5px] text-foreground">{h.title}</div>
                    {h.snippet ? (
                      <div className="truncate text-[12px] text-muted-foreground">{h.snippet}</div>
                    ) : null}
                  </div>
                  {h.meta ? (
                    <span className="shrink-0 rounded bg-accent px-1.5 py-0.5 text-[10.5px] text-muted-foreground">
                      {h.meta}
                    </span>
                  ) : null}
                </button>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
