import { JSX, useState, useRef, useEffect, KeyboardEvent } from 'react'
import { Globe, Mic, ArrowUp, Square, ChevronDown, Sparkles, Loader2 } from 'lucide-react'
import { useStore } from '../store'
import { cn } from '../lib/utils'
import { useVoiceInput } from '../useVoiceInput'
import { Tip } from './ui/tooltip'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem
} from './ui/dropdown-menu'

/** A chat target the composer drives — the primary session or a split pane. */
export interface ChatSession {
  model: string
  models: string[]
  setModel: (m: string) => void
  streaming: boolean
  empty: boolean
  send: (text: string, web: boolean) => void
  cancel: () => void
}

const CHIPS: { label: string; prompt: string }[] = [
  {
    label: '小红书',
    prompt: '帮我写一篇小红书图文，主题「」。要求：标题有钩子（emoji 适度）、正文分点易读、结尾引导互动、附 3-5 个话题标签。'
  },
  {
    label: '公众号',
    prompt: '帮我写一篇公众号文章，主题「」。要求：抓人的标题、清晰的结构、有信息增量、口吻贴合读者。'
  },
  {
    label: '抖音脚本',
    prompt: '帮我写一条抖音短视频口播脚本，主题「」。给出 3 秒钩子开场、分镜与口播文案，控制在 60 秒内。'
  },
  { label: '视频脚本', prompt: '帮我写一个视频脚本，主题「」。包含开场、主体、结尾，并标注节奏与镜头建议。' },
  { label: '起标题', prompt: '帮我给「」起 10 个高点击率标题，覆盖悬念/利益/反差/数字等不同钩子类型。' },
  { label: '选题', prompt: '围绕「」帮我策划 10 个内容选题，每个说明切入角度和钩子。' },
  { label: '改写润色', prompt: '帮我润色改写下面这段内容，让它更有感染力、更口语化：\n' },
  { label: '评论回复', prompt: '帮我写几条高情商的评论区回复：\n' }
]

/** The composer used by the primary view — reads the global chat session. */
export function Composer(): JSX.Element {
  const streaming = useStore((s) => s.streaming)
  const messages = useStore((s) => s.messages)
  const send = useStore((s) => s.send)
  const cancel = useStore((s) => s.cancel)
  const providers = useStore((s) => s.providers)
  const globalModel = useStore((s) => s.globalModel)
  const conversations = useStore((s) => s.conversations)
  const activeId = useStore((s) => s.activeId)
  const setActiveModel = useStore((s) => s.setActiveModel)

  const activeConv = conversations.find((c) => c.id === activeId)
  const session: ChatSession = {
    model: activeConv?.model || globalModel,
    models: Array.from(new Set(providers.flatMap((p) => p.models))),
    setModel: setActiveModel,
    streaming: streaming !== null,
    empty: messages.length === 0 && streaming === null,
    send,
    cancel
  }
  return <ComposerUI session={session} />
}

/** Presentational composer driven by a ChatSession. Reused by the split pane. */
export function ComposerUI({
  session,
  compact = false
}: {
  session: ChatSession
  compact?: boolean
}): JSX.Element {
  const [text, setText] = useState('')
  const [web, setWeb] = useState(false)
  const taRef = useRef<HTMLTextAreaElement>(null)
  const { recording, transcribing, toggle: toggleMic } = useVoiceInput((t) => {
    setText((prev) => (prev ? prev + ' ' : '') + t)
    taRef.current?.focus()
  })

  const shortModel = session.model.replace(/^claude-/, '').replace(/-\d{8}$/, '')

  useEffect(() => {
    const el = taRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 200) + 'px'
  }, [text])

  const submit = (): void => {
    const trimmed = text.trim()
    if (!trimmed || session.streaming) return
    session.send(trimmed, web)
    setText('')
  }
  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>): void => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submit()
    }
  }

  return (
    <div className={cn('mx-auto w-full max-w-3xl', compact ? 'px-4 pb-4 pt-1' : 'px-6 pb-5 pt-2')}>
      <div className="rounded-2xl border border-border bg-card p-1.5 shadow-[0_2px_12px_rgba(0,0,0,0.04)] transition-colors focus-within:border-ring/60">
        <textarea
          ref={taRef}
          rows={1}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="描述你想创作的内容，或直接提问…  (Enter 发送，Shift+Enter 换行)"
          className="block max-h-[200px] w-full resize-none bg-transparent px-2.5 pb-1 pt-2 text-[14.5px] leading-relaxed outline-none placeholder:text-muted-foreground"
        />
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-1.5">
            <Tip label={web ? '联网搜索已开启' : '开启联网搜索（实时网络信息）'}>
              <button
                onClick={() => setWeb((v) => !v)}
                className={cn(
                  'flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12.5px] transition-colors',
                  web
                    ? 'border-primary bg-primary-soft text-primary'
                    : 'border-border text-muted-foreground hover:bg-accent'
                )}
              >
                <Globe className="h-3.5 w-3.5" /> 联网
              </button>
            </Tip>
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
                {session.models.map((m) => (
                  <DropdownMenuItem key={m} onSelect={() => session.setModel(m)}>
                    {m}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <Tip label={recording ? '停止录音' : transcribing ? '转写中…' : '语音输入'}>
              <button
                onClick={toggleMic}
                disabled={transcribing}
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-lg transition-colors disabled:opacity-60',
                  recording
                    ? 'animate-pulse bg-destructive/15 text-destructive'
                    : 'text-muted-foreground hover:bg-accent'
                )}
              >
                {transcribing ? (
                  <Loader2 className="h-[17px] w-[17px] animate-spin" />
                ) : recording ? (
                  <Square className="h-3.5 w-3.5 fill-current" />
                ) : (
                  <Mic className="h-[17px] w-[17px]" />
                )}
              </button>
            </Tip>
            {session.streaming ? (
              <button
                onClick={session.cancel}
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

      {session.empty && !compact ? (
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
