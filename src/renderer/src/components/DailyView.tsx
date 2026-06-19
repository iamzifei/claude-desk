import { JSX, useEffect, useRef, useState } from 'react'
import { CalendarDays, Check, Trash2 } from 'lucide-react'
import { useStore } from '../store'
import { Header, Empty } from './ScheduledView'
import { WikiTextarea } from './WikiTextarea'
import { WikiText } from './WikiText'
import type { Note } from '../types'

/**
 * 每日笔记 (daily note) — one free-form capture surface per day. Today's note is
 * editable and autosaves; past days are listed read-only below. Complements the
 * AI 每日回顾 (which summarizes) with a place to jot as the day goes.
 */
export function DailyView(): JSX.Element {
  const ws = useStore((s) => s.activeWorkspaceId)
  const [today, setToday] = useState<Note | null>(null)
  const [past, setPast] = useState<Note[]>([])
  const [text, setText] = useState('')
  const [savedAt, setSavedAt] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const load = async (): Promise<void> => {
    if (!ws) return
    const t = await window.api.notes.daily(ws)
    setToday(t)
    setText(t.content)
    const all = await window.api.notes.list(ws, 'daily')
    setPast(all.filter((n) => n.id !== t.id))
  }
  useEffect(() => {
    load()
  }, [ws])

  // Debounced autosave of today's note.
  const onChange = (v: string): void => {
    setText(v)
    setSavedAt(false)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(async () => {
      if (today) {
        await window.api.notes.update(today.id, v)
        setSavedAt(true)
      }
    }, 600)
  }

  const removePast = async (id: string): Promise<void> => {
    await window.api.notes.delete(id)
    load()
  }

  return (
    <div className="mx-auto flex h-full w-full max-w-2xl flex-col px-8 py-7">
      <Header
        icon={CalendarDays}
        title="每日笔记"
        desc="每天一页随手记:灵感、待办、闪念。支持 [[ 双链。今天这页自动保存。"
      />

      <div className="mt-4 rounded-xl border border-border bg-card p-4">
        <div className="mb-2 flex items-center justify-between text-[12.5px]">
          <span className="font-medium text-foreground">{today?.title ?? '今天'}</span>
          {savedAt ? (
            <span className="flex items-center gap-1 text-muted-foreground">
              <Check className="h-3.5 w-3.5 text-primary" /> 已保存
            </span>
          ) : null}
        </div>
        <WikiTextarea
          value={text}
          onChange={onChange}
          rows={8}
          placeholder="今天想记点什么…（输入 [[ 关联素材/原子/选题）"
          className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring"
        />
      </div>

      <div className="mt-5 min-h-0 flex-1 overflow-y-auto">
        <div className="mb-2 text-[12px] font-medium text-muted-foreground">往期</div>
        {past.length === 0 ? (
          <Empty>还没有往期每日笔记。</Empty>
        ) : (
          <div className="space-y-2">
            {past.map((n) => (
              <div key={n.id} className="group rounded-xl border border-border bg-card px-4 py-3">
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-[13px] font-medium text-foreground">{n.title}</span>
                  <button
                    onClick={() => removePast(n.id)}
                    title="删除"
                    className="text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                {n.content.trim() ? (
                  <div className="text-[13px] leading-relaxed text-foreground/80">
                    <WikiText content={n.content} />
                  </div>
                ) : (
                  <span className="text-[12.5px] text-muted-foreground/70">（空）</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
