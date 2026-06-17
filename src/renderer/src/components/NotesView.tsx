import { JSX, useEffect, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { BarChart3, ClipboardList, Sparkles, Trash2, ChevronLeft, Copy, Check } from 'lucide-react'
import { useStore } from '../store'
import { Button } from './ui/button'
import { Header, Empty } from './ScheduledView'
import type { Note } from '../types'

interface Props {
  type: 'review' | 'minutes'
}

export function NotesView({ type }: Props): JSX.Element {
  const ws = useStore((s) => s.activeWorkspaceId)
  const [notes, setNotes] = useState<Note[]>([])
  const [open, setOpen] = useState<Note | null>(null)
  const [busy, setBusy] = useState(false)
  const [transcript, setTranscript] = useState('')

  const meta =
    type === 'review'
      ? { icon: BarChart3, title: '每日回顾', desc: '把今天的对话总结成一份回顾。' }
      : { icon: ClipboardList, title: '会议纪要', desc: '粘贴会议记录/转写，整理成结构化纪要。' }

  const refresh = async (): Promise<void> => {
    if (ws) setNotes(await window.api.notes.list(ws, type))
  }
  useEffect(() => {
    setOpen(null)
    refresh()
  }, [ws, type])

  const generate = async (): Promise<void> => {
    if (!ws || busy) return
    if (type === 'minutes' && !transcript.trim()) return
    setBusy(true)
    try {
      const note =
        type === 'review'
          ? await window.api.notes.generateReview(ws)
          : await window.api.notes.generateMinutes(ws, transcript.trim())
      setTranscript('')
      await refresh()
      setOpen(note)
    } finally {
      setBusy(false)
    }
  }

  if (open) return <NoteReader note={open} onBack={() => setOpen(null)} />

  return (
    <div className="mx-auto flex h-full w-full max-w-2xl flex-col px-8 py-7">
      <Header
        icon={meta.icon}
        title={meta.title}
        desc={meta.desc}
        action={
          type === 'review' ? (
            <Button size="sm" onClick={generate} disabled={busy}>
              <Sparkles className="h-4 w-4" /> {busy ? '生成中…' : '生成今日回顾'}
            </Button>
          ) : undefined
        }
      />

      {type === 'minutes' ? (
        <div className="mt-4 space-y-2.5 rounded-xl border border-border bg-card p-4">
          <textarea
            placeholder="把会议记录或转写文字粘贴到这里…"
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            rows={5}
            className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring"
          />
          <div className="flex justify-end">
            <Button size="sm" onClick={generate} disabled={busy || !transcript.trim()}>
              <Sparkles className="h-4 w-4" /> {busy ? '生成中…' : '生成纪要'}
            </Button>
          </div>
        </div>
      ) : null}

      <div className="mt-4 min-h-0 flex-1 space-y-2 overflow-y-auto">
        {notes.length === 0 ? (
          <Empty>{busy ? '正在生成…' : '还没有记录'}</Empty>
        ) : (
          notes.map((n) => (
            <div
              key={n.id}
              onClick={() => setOpen(n)}
              className="group flex cursor-pointer items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 transition-colors hover:border-primary/40"
            >
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{n.title}</div>
                <div className="mt-0.5 truncate text-[12.5px] text-muted-foreground">
                  {n.content.replace(/[#*`>\-\n]/g, ' ').slice(0, 80)}
                </div>
              </div>
              <Button
                size="icon-sm"
                variant="ghost"
                title="删除"
                onClick={(e) => {
                  e.stopPropagation()
                  window.api.notes.delete(n.id).then(refresh)
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

function NoteReader({ note, onBack }: { note: Note; onBack: () => void }): JSX.Element {
  const [copied, setCopied] = useState(false)
  return (
    <div className="mx-auto flex h-full w-full max-w-2xl flex-col px-8 py-7">
      <div className="flex items-center gap-2 border-b border-border-soft pb-3">
        <Button size="icon-sm" variant="ghost" onClick={onBack} title="返回">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="flex-1 truncate font-semibold">{note.title}</span>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            navigator.clipboard.writeText(note.content)
            setCopied(true)
            setTimeout(() => setCopied(false), 1500)
          }}
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied ? '已复制' : '复制'}
        </Button>
      </div>
      <div className="markdown mt-5 min-h-0 flex-1 overflow-y-auto pb-6">
        <ReactMarkdown>{note.content}</ReactMarkdown>
      </div>
    </div>
  )
}
