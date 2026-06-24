import { JSX, useEffect, useState } from 'react'
import { Clock, Play, Trash2, Plus } from 'lucide-react'
import { useStore } from '../store'
import { cn } from '../lib/utils'
import { Button } from './ui/button'
import { Input } from './ui/input'
import type { ScheduledTask } from '../types'

export function ScheduledView(): JSX.Element {
  const ws = useStore((s) => s.activeWorkspaceId)
  const [tasks, setTasks] = useState<ScheduledTask[]>([])
  const [adding, setAdding] = useState(false)

  const refresh = async (): Promise<void> => {
    if (ws) setTasks(await window.api.scheduledTasks.list(ws))
  }
  useEffect(() => {
    refresh()
    return window.api.app.onDataChanged(refresh)
  }, [ws])

  return (
    <div className="mx-auto flex h-full w-full max-w-2xl flex-col px-8 py-7">
      <Header
        icon={Clock}
        title="定时任务"
        desc="到点自动把一段提示词交给 AI，结果会生成一条新对话。"
        action={
          <Button size="sm" onClick={() => setAdding((v) => !v)}>
            <Plus className="h-4 w-4" /> 新建
          </Button>
        }
      />

      {adding ? (
        <TaskForm
          onDone={() => {
            setAdding(false)
            refresh()
          }}
        />
      ) : null}

      <div className="mt-4 min-h-0 flex-1 space-y-2 overflow-y-auto">
        {tasks.length === 0 ? (
          <Empty>还没有定时任务</Empty>
        ) : (
          tasks.map((t) => <TaskRow key={t.id} task={t} onChange={refresh} />)
        )}
      </div>
    </div>
  )
}

function TaskForm({ onDone }: { onDone: () => void }): JSX.Element {
  const ws = useStore((s) => s.activeWorkspaceId)
  const [name, setName] = useState('')
  const [prompt, setPrompt] = useState('')
  const [kind, setKind] = useState<'interval' | 'daily'>('daily')
  const [interval, setInterval] = useState(60)
  const [hour, setHour] = useState(9)
  const [minute, setMinute] = useState(0)

  const submit = async (): Promise<void> => {
    if (!ws || !name.trim() || !prompt.trim()) return
    await window.api.scheduledTasks.create(ws, {
      name: name.trim(),
      prompt: prompt.trim(),
      schedule_kind: kind,
      interval_min: kind === 'interval' ? interval : null,
      at_hour: kind === 'daily' ? hour : null,
      at_minute: kind === 'daily' ? minute : null
    })
    onDone()
  }

  return (
    <div className="mt-4 space-y-3 rounded-xl border border-border bg-card p-4">
      <Input
        placeholder="任务名称，如「每日资讯摘要」"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <textarea
        placeholder="提示词，如「总结今天 AI 领域值得关注的 3 条新闻」"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        rows={3}
        className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring"
      />
      <div className="flex flex-wrap items-center gap-2 text-[13px]">
        <select
          value={kind}
          onChange={(e) => setKind(e.target.value as 'interval' | 'daily')}
          className="h-8 rounded-md border border-input bg-background px-2 text-sm outline-none"
        >
          <option value="daily">每天</option>
          <option value="interval">每隔</option>
        </select>
        {kind === 'daily' ? (
          <>
            <NumberBox value={hour} min={0} max={23} onChange={setHour} /> 时
            <NumberBox value={minute} min={0} max={59} onChange={setMinute} /> 分
          </>
        ) : (
          <>
            <NumberBox value={interval} min={1} max={1440} onChange={setInterval} /> 分钟
          </>
        )}
        <div className="ml-auto flex gap-2">
          <Button size="sm" variant="secondary" onClick={onDone}>
            取消
          </Button>
          <Button size="sm" onClick={submit} disabled={!name.trim() || !prompt.trim()}>
            创建
          </Button>
        </div>
      </div>
    </div>
  )
}

function TaskRow({ task, onChange }: { task: ScheduledTask; onChange: () => void }): JSX.Element {
  const [running, setRunning] = useState(false)
  const schedule =
    task.schedule_kind === 'daily'
      ? `每天 ${pad(task.at_hour)}:${pad(task.at_minute)}`
      : `每隔 ${task.interval_min} 分钟`

  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-medium">{task.name}</span>
          <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
            {schedule}
          </span>
        </div>
        <div className="mt-0.5 truncate text-[12.5px] text-muted-foreground">{task.prompt}</div>
        <div className="mt-1 text-[11px] text-muted-foreground/70">
          下次：{task.next_run ? new Date(task.next_run).toLocaleString() : '—'}
          {task.last_run ? ` · 上次：${new Date(task.last_run).toLocaleString()}` : ''}
        </div>
      </div>
      <label
        className="flex shrink-0 cursor-pointer items-center"
        title={task.enabled ? '已启用' : '已停用'}
      >
        <input
          type="checkbox"
          className="peer sr-only"
          checked={!!task.enabled}
          onChange={(e) =>
            window.api.scheduledTasks.toggle(task.id, e.target.checked).then(onChange)
          }
        />
        <span className="h-5 w-9 rounded-full bg-muted p-0.5 transition-colors peer-checked:bg-primary">
          <span
            className={cn(
              'block h-4 w-4 rounded-full bg-white transition-transform',
              task.enabled && 'translate-x-4'
            )}
          />
        </span>
      </label>
      <Button
        size="icon-sm"
        variant="ghost"
        title="立即运行"
        disabled={running}
        onClick={async () => {
          setRunning(true)
          await window.api.scheduledTasks.runNow(task.id)
          setRunning(false)
          onChange()
        }}
      >
        <Play className="h-4 w-4" />
      </Button>
      <Button
        size="icon-sm"
        variant="ghost"
        title="删除"
        onClick={() => window.api.scheduledTasks.delete(task.id).then(onChange)}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  )
}

function NumberBox({
  value,
  min,
  max,
  onChange
}: {
  value: number
  min: number
  max: number
  onChange: (n: number) => void
}): JSX.Element {
  return (
    <input
      type="number"
      min={min}
      max={max}
      value={value}
      onChange={(e) => onChange(Math.max(min, Math.min(max, +e.target.value)))}
      className="h-8 w-16 rounded-md border border-input bg-background px-2 text-sm outline-none focus-visible:border-ring"
    />
  )
}

export function Header({
  icon: Icon,
  title,
  desc,
  action
}: {
  icon: typeof Clock
  title: string
  desc: string
  action?: JSX.Element
}): JSX.Element {
  return (
    <div className="flex shrink-0 items-start justify-between gap-4 border-b border-border-soft pb-4">
      <div className="flex min-w-0 gap-3">
        <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-foreground">
          <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
        </div>
        <div className="min-w-0">
          <h1 className="text-[17px] font-semibold">{title}</h1>
          {/* clamp so a long description never swallows a short split pane */}
          <p className="mt-0.5 line-clamp-2 text-[13px] text-muted-foreground">{desc}</p>
        </div>
      </div>
      {action}
    </div>
  )
}

export function Empty({ children }: { children: React.ReactNode }): JSX.Element {
  return <div className="py-16 text-center text-[13px] text-muted-foreground/70">{children}</div>
}

const pad = (n: number | null): string => String(n ?? 0).padStart(2, '0')
