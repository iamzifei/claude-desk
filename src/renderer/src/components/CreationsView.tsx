import { JSX, useEffect, useState } from 'react'
import {
  Workflow,
  Plus,
  FileText,
  Clapperboard,
  Trash2,
  ChevronRight,
  UserRound
} from 'lucide-react'
import { cn } from '../lib/utils'
import { useStore } from '../store'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Header, Empty } from './ScheduledView'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog'
import { PHASES } from '../pipeline-meta'
import { CreationWorkspace } from './CreationWorkspace'
import type { Creation, CreationFormat, Persona } from '../types'

/**
 * 创作流水线 — list of guided creations (each walks the shared 7-phase flow:
 * 选题→策略→写作→去AI味→配图→排版→复盘, isomorphic with lingxi's workspace).
 * Selecting a card opens the CreationWorkspace (StepRail + phase screen).
 */
export function CreationsView(): JSX.Element {
  const projectScope = useStore((s) => s.projectScope)
  const [creations, setCreations] = useState<Creation[]>([])
  const [openId, setOpenId] = useState<string | null>(null)
  const [showNew, setShowNew] = useState(false)

  const refresh = (): void => {
    void window.api.creations.list().then(setCreations)
  }
  useEffect(refresh, [projectScope])

  if (openId) {
    return (
      <CreationWorkspace
        creationId={openId}
        onBack={() => {
          setOpenId(null)
          refresh()
        }}
      />
    )
  }

  return (
    <div className="mx-auto flex h-full w-full max-w-3xl flex-col px-8 py-7">
      <Header
        icon={Workflow}
        title="创作流水线"
        desc="7 个阶段带你从选题走到复盘：选题 → 策略 → 写作 → 去AI味 → 配图 → 排版 → 复盘。每个阶段一次对话，产出可回溯、可重跑。"
        action={
          <Button size="sm" onClick={() => setShowNew(true)}>
            <Plus className="h-4 w-4" /> 新建创作
          </Button>
        }
      />

      <div className="min-h-0 flex-1 overflow-y-auto pt-4">
        {creations.length === 0 ? (
          <Empty>还没有创作。点右上角「新建创作」，从选题开始你的第一篇。</Empty>
        ) : (
          <div className="flex flex-col gap-2">
            {creations.map((c) => (
              <CreationCard
                key={c.id}
                creation={c}
                onOpen={() => setOpenId(c.id)}
                onDelete={async () => {
                  if (window.confirm(`删除创作「${c.title}」？所有阶段产出会一并删除。`)) {
                    await window.api.creations.delete(c.id)
                    refresh()
                  }
                }}
              />
            ))}
          </div>
        )}
      </div>

      <NewCreationDialog
        open={showNew}
        onOpenChange={setShowNew}
        onCreated={(c) => {
          setShowNew(false)
          refresh()
          setOpenId(c.id)
        }}
      />
    </div>
  )
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts
  const min = Math.floor(diff / 60000)
  if (min < 1) return '刚刚'
  if (min < 60) return `${min} 分钟前`
  const h = Math.floor(min / 60)
  if (h < 24) return `${h} 小时前`
  const d = Math.floor(h / 24)
  if (d < 30) return `${d} 天前`
  const date = new Date(ts)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function CreationCard({
  creation: c,
  onOpen,
  onDelete
}: {
  creation: Creation
  onOpen: () => void
  onDelete: () => void
}): JSX.Element {
  const FormatIcon = c.format === 'script' ? Clapperboard : FileText
  const phase = PHASES.find((p) => p.id === c.current_phase)
  const doneCount = PHASES.filter((p) => c.phases[p.id]?.status === 'done').length
  const hasStale = PHASES.some((p) => c.phases[p.id]?.status === 'stale')
  const hasError = PHASES.some((p) => c.phases[p.id]?.status === 'error')

  return (
    <div
      onClick={onOpen}
      className="group flex cursor-pointer items-center gap-3 rounded-xl border border-border-soft bg-card px-4 py-3 transition-colors hover:border-primary/40"
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
        <FormatIcon className="h-[18px] w-[18px]" strokeWidth={1.75} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-[14px] font-medium text-foreground">{c.title}</span>
          <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">
            {c.format === 'script' ? '短视频脚本' : '长文'}
          </span>
        </div>
        <div className="mt-0.5 flex items-center gap-2 text-[12px] text-muted-foreground">
          <span>
            阶段 {c.current_phase}/7 · {phase?.label ?? ''}
          </span>
          <span className="text-muted-foreground/50">已完成 {doneCount} 个阶段</span>
          {hasError ? <span className="text-destructive">有阶段出错</span> : null}
          {hasStale ? <span className="text-amber-500">有阶段需重跑</span> : null}
          <span className="ml-auto shrink-0 text-muted-foreground/60">{timeAgo(c.updated_at)}</span>
        </div>
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation()
          onDelete()
        }}
        title="删除创作"
        className="rounded p-1 text-muted-foreground/40 opacity-0 transition hover:text-destructive group-hover:opacity-100"
      >
        <Trash2 className="h-4 w-4" />
      </button>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/40" />
    </div>
  )
}

/** New-creation wizard: 标题 + 形态（长文/脚本 two cards）+ 人设 dropdown. */
function NewCreationDialog({
  open,
  onOpenChange,
  onCreated
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  onCreated: (c: Creation) => void
}): JSX.Element {
  const [title, setTitle] = useState('')
  const [format, setFormat] = useState<CreationFormat>('article')
  const [personas, setPersonas] = useState<Persona[]>([])
  const [personaId, setPersonaId] = useState<string>('')
  const [busy, setBusy] = useState(false)

  // Load personas when the dialog opens; preselect the default persona.
  useEffect(() => {
    if (!open) return
    void (async () => {
      const list = await window.api.personas.list()
      setPersonas(list)
      const def = list.find((p) => p.is_default)
      setPersonaId(def?.id ?? '')
    })()
  }, [open])

  const create = async (): Promise<void> => {
    if (busy) return
    setBusy(true)
    try {
      const c = await window.api.creations.create(
        title.trim() || '未命名创作',
        format,
        personaId || null
      )
      setTitle('')
      onCreated(c)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>新建创作</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div>
            <label className="mb-1.5 block text-[12.5px] font-medium text-muted-foreground">
              标题（可先起个工作名，之后可改）
            </label>
            <Input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="例如：为什么坚持日更反而涨粉慢"
              onKeyDown={(e) => {
                if (e.key === 'Enter') void create()
              }}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-[12.5px] font-medium text-muted-foreground">
              内容形态
            </label>
            <div className="grid grid-cols-2 gap-2">
              <FormatCard
                icon={FileText}
                title="长文"
                desc="公众号 / 知乎长文，走爆款写作方法论"
                active={format === 'article'}
                onClick={() => setFormat('article')}
              />
              <FormatCard
                icon={Clapperboard}
                title="短视频脚本"
                desc="口播脚本，配图阶段自动跳过，排版改出拍摄清单"
                active={format === 'script'}
                onClick={() => setFormat('script')}
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 flex items-center gap-1 text-[12.5px] font-medium text-muted-foreground">
              <UserRound className="h-3.5 w-3.5" /> 人设
            </label>
            <select
              value={personaId}
              onChange={(e) => setPersonaId(e.target.value)}
              className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm outline-none focus-visible:border-ring"
            >
              <option value="">无人设（中性口吻）</option>
              {personas.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                  {p.is_default ? '（默认）' : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
              取消
            </Button>
            <Button size="sm" disabled={busy} onClick={() => void create()}>
              创建并开始选题
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function FormatCard({
  icon: Icon,
  title,
  desc,
  active,
  onClick
}: {
  icon: typeof FileText
  title: string
  desc: string
  active: boolean
  onClick: () => void
}): JSX.Element {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex flex-col items-start gap-1.5 rounded-xl border p-3 text-left transition-colors',
        active
          ? 'border-primary bg-primary-soft/40'
          : 'border-border-soft hover:border-primary/40 hover:bg-accent/40'
      )}
    >
      <Icon
        className={cn('h-5 w-5', active ? 'text-primary' : 'text-muted-foreground')}
        strokeWidth={1.75}
      />
      <span className="text-[13.5px] font-medium text-foreground">{title}</span>
      <span className="text-[11.5px] leading-snug text-muted-foreground">{desc}</span>
    </button>
  )
}
