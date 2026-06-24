import { JSX, useState, useRef, useEffect, KeyboardEvent } from 'react'
import { Globe, Mic, ArrowUp, Square, ChevronDown, Sparkles, Loader2 } from 'lucide-react'
import { useStore } from '../store'
import { cn } from '../lib/utils'
import { useVoiceInput } from '../useVoiceInput'
import { ContextRefsBar } from './ContextRefs'
import { hasSkillDrag, getSkillDrag } from '../dnd'
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
    prompt:
      '帮我写一篇小红书图文，主题「」。要求：标题有钩子（emoji 适度）、正文分点易读、结尾引导互动、附 3-5 个话题标签。'
  },
  {
    label: '公众号',
    prompt:
      '帮我写一篇公众号文章，主题「」。要求：抓人的标题、清晰的结构、有信息增量、口吻贴合读者。'
  },
  {
    label: '抖音脚本',
    prompt:
      '帮我写一条抖音短视频口播脚本，主题「」。给出 3 秒钩子开场、分镜与口播文案，控制在 60 秒内。'
  },
  {
    label: '视频脚本',
    prompt: '帮我写一个视频脚本，主题「」。包含开场、主体、结尾，并标注节奏与镜头建议。'
  },
  {
    label: '起标题',
    prompt: '帮我给「」起 10 个高点击率标题，覆盖悬念/利益/反差/数字等不同钩子类型。'
  },
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
  // The primary composer carries the context-migration bar (per active conversation).
  return (
    <ComposerUI
      session={session}
      header={activeId ? <ContextRefsBar conversationId={activeId} /> : undefined}
    />
  )
}

/** Presentational composer driven by a ChatSession. Reused by the split pane. */
export function ComposerUI({
  session,
  compact = false,
  header
}: {
  session: ChatSession
  compact?: boolean
  header?: JSX.Element
}): JSX.Element {
  const [text, setText] = useState('')
  const [web, setWeb] = useState(false)
  const [skillOver, setSkillOver] = useState(false)
  const taRef = useRef<HTMLTextAreaElement>(null)

  // `/` skill picker — Claude-Code-style on-demand invocation. The slug typed as
  // /slug is resolved server-side at send time (db/skills.buildInvokedSkillsPrompt).
  const [skills, setSkills] = useState<
    { name: string; slug: string; description: string | null }[]
  >([])
  const [slashQuery, setSlashQuery] = useState<string | null>(null)
  const [slashSel, setSlashSel] = useState(0)
  useEffect(() => {
    window.api.skills.names().then(setSkills)
  }, [])

  const matches =
    slashQuery != null
      ? skills
          .filter((s) => {
            const q = slashQuery.toLowerCase()
            return (
              s.slug.toLowerCase().includes(q) ||
              s.name.toLowerCase().includes(q) ||
              (s.description ?? '').toLowerCase().includes(q)
            )
          })
          .slice(0, 8)
      : []

  /** Replace the partial `/word` before the caret with `/slug `. */
  const insertSkill = (slug: string): void => {
    const ta = taRef.current
    if (!ta) return
    const pos = ta.selectionStart
    const m = text.slice(0, pos).match(/\/([^\s/]*)$/)
    if (!m) return
    const start = pos - m[0].length
    const next = `${text.slice(0, start)}/${slug} ${text.slice(pos)}`
    setText(next)
    setSlashQuery(null)
    requestAnimationFrame(() => {
      ta.focus()
      const c = start + slug.length + 2
      ta.setSelectionRange(c, c)
    })
  }

  const onChangeText = (v: string, caret: number): void => {
    setText(v)
    const m = v.slice(0, caret).match(/(?:^|\s)\/([^\s/]*)$/)
    setSlashQuery(m ? m[1] : null)
    setSlashSel(0)
  }

  // Dragging a skill onto the composer inserts its /slug (same on-demand path).
  const dropSkill = (slug: string): void => {
    setText((prev) => (prev ? `${prev} /${slug} ` : `/${slug} `))
    requestAnimationFrame(() => taRef.current?.focus())
  }

  const {
    recording,
    transcribing,
    toggle: toggleMic
  } = useVoiceInput((t) => {
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
    if (slashQuery != null && matches.length) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSlashSel((s) => Math.min(s + 1, matches.length - 1))
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSlashSel((s) => Math.max(s - 1, 0))
        return
      }
      if (e.key === 'Enter') {
        e.preventDefault()
        insertSkill(matches[slashSel].slug)
        return
      }
      if (e.key === 'Escape') {
        e.preventDefault()
        setSlashQuery(null)
        return
      }
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submit()
    }
  }

  return (
    <div className={cn('mx-auto w-full max-w-3xl', compact ? 'px-4 pb-4 pt-1' : 'px-6 pb-5 pt-2')}>
      {header}
      <div
        onDragOver={(e) => {
          if (hasSkillDrag(e)) {
            e.preventDefault()
            e.dataTransfer.dropEffect = 'copy'
            setSkillOver(true)
          }
        }}
        onDragLeave={() => setSkillOver(false)}
        onDrop={(e) => {
          setSkillOver(false)
          const s = getSkillDrag(e)
          if (s) {
            e.preventDefault()
            dropSkill(s.slug)
          }
        }}
        className={cn(
          'relative rounded-2xl border bg-card p-1.5 shadow-[0_2px_12px_rgba(0,0,0,0.04)] transition-colors focus-within:border-ring/60',
          skillOver ? 'border-primary ring-2 ring-primary/30' : 'border-border'
        )}
      >
        {/* `/` skill picker */}
        {slashQuery != null && matches.length > 0 ? (
          <div className="absolute bottom-full left-2 z-30 mb-2 max-h-64 w-80 overflow-y-auto rounded-xl border border-border bg-card p-1 shadow-lg">
            <div className="px-2 py-1 text-[10.5px] text-muted-foreground/60">
              调用技能（/ 输入，↑↓ 选择，Enter 确认）
            </div>
            {matches.map((m, i) => (
              <button
                key={m.slug + i}
                onMouseEnter={() => setSlashSel(i)}
                onClick={() => insertSkill(m.slug)}
                className={cn(
                  'flex w-full flex-col items-start rounded-lg px-2 py-1.5 text-left',
                  i === slashSel ? 'bg-accent' : 'hover:bg-accent/60'
                )}
              >
                <span className="flex items-center gap-1.5 text-[13px]">
                  <span className="font-mono text-primary">/{m.slug}</span>
                  <span className="truncate text-muted-foreground">{m.name}</span>
                </span>
                {m.description ? (
                  <span className="mt-0.5 line-clamp-1 text-[11.5px] text-muted-foreground/70">
                    {m.description}
                  </span>
                ) : null}
              </button>
            ))}
          </div>
        ) : null}
        <textarea
          ref={taRef}
          rows={1}
          value={text}
          onChange={(e) => onChangeText(e.target.value, e.target.selectionStart)}
          onKeyDown={onKeyDown}
          placeholder="描述你想创作的内容，或直接提问…  输入 / 调用技能  (Enter 发送，Shift+Enter 换行)"
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
