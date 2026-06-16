import { JSX, useState, useRef, useEffect, KeyboardEvent } from 'react'
import { Plus, Wrench, Globe, Mic, ArrowUp, Square, ChevronDown, Sparkles } from 'lucide-react'
import { useStore } from '../store'
import { cn } from '../lib/utils'
import { Tip } from './ui/tooltip'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem
} from './ui/dropdown-menu'

const CHIPS: { label: string; prompt: string }[] = [
  { label: '写作', prompt: '帮我写一篇关于「」的文章，' },
  { label: 'PPT', prompt: '帮我做一份关于「」的演示大纲，' },
  { label: '调研报告', prompt: '帮我写一份关于「」的调研报告，' },
  { label: '需求分析', prompt: '帮我分析「」的产品需求，' },
  { label: '视频', prompt: '帮我写一个关于「」的短视频脚本，' },
  { label: '设计', prompt: '帮我设计「」，' },
  { label: 'Excel', prompt: '帮我用表格整理「」，' },
  { label: '编程', prompt: '帮我实现「」，要求：' }
]

export function Composer(): JSX.Element {
  const [text, setText] = useState('')
  const [web, setWeb] = useState(false)
  const taRef = useRef<HTMLTextAreaElement>(null)
  const streaming = useStore((s) => s.streaming)
  const messages = useStore((s) => s.messages)
  const send = useStore((s) => s.send)
  const cancel = useStore((s) => s.cancel)
  const providers = useStore((s) => s.providers)
  const globalModel = useStore((s) => s.globalModel)
  const conversations = useStore((s) => s.conversations)
  const activeId = useStore((s) => s.activeId)
  const setActiveModel = useStore((s) => s.setActiveModel)
  const isStreaming = streaming !== null

  const activeConv = conversations.find((c) => c.id === activeId)
  const currentModel = activeConv?.model || globalModel
  const allModels = Array.from(new Set(providers.flatMap((p) => p.models)))
  const showChips = messages.length === 0 && !isStreaming

  // Auto-grow the textarea.
  useEffect(() => {
    const el = taRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 200) + 'px'
  }, [text])

  const submit = (): void => {
    const trimmed = text.trim()
    if (!trimmed || isStreaming) return
    send(trimmed)
    setText('')
  }
  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>): void => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submit()
    }
  }
  const shortModel = currentModel.replace(/^claude-/, '').replace(/-\d{8}$/, '')

  return (
    <div className="mx-auto w-full max-w-3xl px-6 pb-5 pt-2">
      <div className="rounded-2xl border border-border bg-card p-1.5 shadow-[0_2px_12px_rgba(0,0,0,0.04)] transition-colors focus-within:border-ring/60">
        <textarea
          ref={taRef}
          rows={1}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="发送消息…  (Enter 发送，Shift+Enter 换行)"
          className="block max-h-[200px] w-full resize-none bg-transparent px-2.5 pb-1 pt-2 text-[14.5px] leading-relaxed outline-none placeholder:text-muted-foreground"
        />
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-1.5">
            <Tip label="附件（即将上线）">
              <button
                disabled
                className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground disabled:opacity-45"
              >
                <Plus className="h-[18px] w-[18px]" />
              </button>
            </Tip>
            <Tip label="工具（即将上线）">
              <button
                disabled
                className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground disabled:opacity-45"
              >
                <Wrench className="h-[17px] w-[17px]" />
              </button>
            </Tip>
            <button
              onClick={() => setWeb((v) => !v)}
              title="联网搜索（即将上线）"
              className={cn(
                'flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12.5px] transition-colors',
                web
                  ? 'border-primary bg-primary-soft text-primary'
                  : 'border-border text-muted-foreground hover:bg-accent'
              )}
            >
              <Globe className="h-3.5 w-3.5" /> 联网
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-[12.5px] text-muted-foreground transition-colors hover:bg-accent">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  {shortModel}
                  <ChevronDown className="h-3 w-3" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {allModels.map((m) => (
                  <DropdownMenuItem key={m} onSelect={() => setActiveModel(m)}>
                    {m}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <Tip label="语音输入（即将上线）">
              <button
                disabled
                className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground disabled:opacity-45"
              >
                <Mic className="h-[17px] w-[17px]" />
              </button>
            </Tip>
            {isStreaming ? (
              <button
                onClick={cancel}
                title="停止"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-muted-foreground text-background"
              >
                <Square className="h-3.5 w-3.5 fill-current" />
              </button>
            ) : (
              <button
                onClick={submit}
                disabled={!text.trim()}
                title="发送"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground transition-colors hover:bg-primary/90 disabled:bg-accent disabled:text-muted-foreground"
              >
                <ArrowUp className="h-[18px] w-[18px]" />
              </button>
            )}
          </div>
        </div>
      </div>

      {showChips ? (
        <div className="mt-3.5 flex flex-wrap justify-center gap-2">
          {CHIPS.map((c) => (
            <button
              key={c.label}
              onClick={() => setText(c.prompt)}
              className="rounded-full border border-border bg-card px-3.5 py-1.5 text-[13px] text-muted-foreground transition-colors hover:border-primary hover:bg-primary-soft hover:text-primary"
            >
              {c.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
