import { JSX, useEffect, useRef, useState, KeyboardEvent } from 'react'
import { Inbox } from 'lucide-react'
import { useStore } from '../store'

/**
 * ⌘⇧I quick capture — jot a snippet from anywhere and drop it straight into the
 * materials Inbox (status='inbox') to be processed later (拆原子/打标签/链接).
 * Mirrors the Obsidian "capture now, process later" loop so a fleeting idea is
 * never lost mid-task.
 */
export function QuickCapture(): JSX.Element | null {
  const open = useStore((s) => s.quickCaptureOpen)
  const setOpen = useStore((s) => s.setQuickCaptureOpen)
  const [text, setText] = useState('')
  const [saved, setSaved] = useState(false)
  const ref = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (open) {
      setText('')
      setSaved(false)
      setTimeout(() => ref.current?.focus(), 0)
    }
  }, [open])

  if (!open) return null

  const save = async (): Promise<void> => {
    const body = text.trim()
    if (!body) {
      setOpen(false)
      return
    }
    // Title = first line (trimmed to a sane length); the rest stays as content.
    const firstLine = body.split('\n')[0].slice(0, 30)
    await window.api.materials.create({ title: firstLine || '速记', content: body, kind: 'text', status: 'inbox' })
    setSaved(true)
    setTimeout(() => setOpen(false), 500)
  }

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>): void => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      save()
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 pt-[14vh]"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-[560px] max-w-[calc(100vw-40px)] overflow-hidden rounded-2xl border border-border bg-card shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-border-soft px-4 py-2.5 text-[12.5px] text-muted-foreground">
          <Inbox className="h-4 w-4 text-primary" /> 快速采集到收件箱
        </div>
        <textarea
          ref={ref}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
          rows={4}
          placeholder="随手记一段灵感 / 金句 / 链接…先丢进收件箱,回头再拆原子、打标签。"
          className="w-full resize-none bg-transparent px-4 py-3 text-[14px] outline-none placeholder:text-muted-foreground"
        />
        <div className="flex items-center justify-between border-t border-border-soft px-4 py-2 text-[11.5px] text-muted-foreground">
          <span>{saved ? '已存入收件箱 ✓' : '⌘↵ 保存 · Esc 取消'}</span>
          <button
            onClick={save}
            className="rounded-md bg-primary px-3 py-1 text-[12px] font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            存入收件箱
          </button>
        </div>
      </div>
    </div>
  )
}
