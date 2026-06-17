import { JSX, useEffect, useRef, useState } from 'react'
import {
  Code2,
  FolderOpen,
  Sparkles,
  Square,
  TriangleAlert,
  Terminal,
  FileEdit,
  FileText,
  Search as SearchIcon,
  Wrench
} from 'lucide-react'
import { Button } from './ui/button'
import { Header } from './ScheduledView'
import type { CodingEvent } from '../types'

interface LogItem {
  kind: 'text' | 'tool' | 'result' | 'error'
  name?: string
  text: string
}

const toolIcon = (name?: string): JSX.Element => {
  switch (name) {
    case 'Bash':
      return <Terminal className="h-3.5 w-3.5" />
    case 'Edit':
    case 'MultiEdit':
    case 'Write':
      return <FileEdit className="h-3.5 w-3.5" />
    case 'Read':
      return <FileText className="h-3.5 w-3.5" />
    case 'Glob':
    case 'Grep':
      return <SearchIcon className="h-3.5 w-3.5" />
    default:
      return <Wrench className="h-3.5 w-3.5" />
  }
}

export function CodingView(): JSX.Element {
  const [cwd, setCwd] = useState<string | null>(null)
  const [task, setTask] = useState('')
  const [running, setRunning] = useState(false)
  const [log, setLog] = useState<LogItem[]>([])
  const runIdRef = useRef<string>('')
  const logRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    return window.api.coding.onEvent((rid, ev: CodingEvent) => {
      if (rid !== runIdRef.current) return
      if (ev.type === 'text') setLog((l) => [...l, { kind: 'text', text: ev.text }])
      else if (ev.type === 'tool')
        setLog((l) => [...l, { kind: 'tool', name: ev.name, text: ev.summary }])
      else if (ev.type === 'result' && ev.text.trim())
        setLog((l) => [...l, { kind: 'result', text: ev.text }])
      else if (ev.type === 'error') setLog((l) => [...l, { kind: 'error', text: ev.message }])
      else if (ev.type === 'done') setRunning(false)
    })
  }, [])

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight })
  }, [log])

  const pickFolder = async (): Promise<void> => {
    const dir = await window.api.app.openFolder()
    if (dir) setCwd(dir)
  }

  const run = async (): Promise<void> => {
    if (!task.trim() || !cwd || running) return
    const runId = `${Date.now()}`
    runIdRef.current = runId
    setLog([])
    setRunning(true)
    await window.api.coding.run(runId, task.trim(), cwd)
  }
  const stop = (): void => {
    if (runIdRef.current) window.api.coding.cancel(runIdRef.current)
    setRunning(false)
  }

  return (
    <div className="mx-auto flex h-full w-full max-w-3xl flex-col px-8 py-7">
      <Header
        icon={Code2}
        title="编程"
        desc="真·编程 agent（Claude Code 引擎）：在你选的目录里读写文件、运行命令。"
        action={
          <Button size="sm" variant="secondary" onClick={pickFolder}>
            <FolderOpen className="h-4 w-4" /> {cwd ? '更换目录' : '选择目录'}
          </Button>
        }
      />

      {cwd ? (
        <div className="mt-3 flex items-start gap-2 rounded-lg border border-primary/30 bg-primary-soft/60 px-3 py-2 text-[12px] text-muted-foreground">
          <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
          <span>
            工作目录：<span className="font-mono text-foreground">{cwd}</span>
            <br />
            agent 可在此目录内读写文件、执行命令。请只对你信任的目录使用。
          </span>
        </div>
      ) : (
        <div className="mt-3 rounded-lg border border-border bg-muted/40 px-3 py-2 text-[12.5px] text-muted-foreground">
          先「选择目录」，agent 会在该目录里工作。
        </div>
      )}

      <div ref={logRef} className="mt-4 min-h-0 flex-1 space-y-1.5 overflow-y-auto">
        {log.length === 0 ? (
          <div className="py-12 text-center text-[13px] text-muted-foreground/70">
            {running ? '思考中…' : '描述一个编程任务，让 agent 去做。'}
          </div>
        ) : (
          log.map((it, i) =>
            it.kind === 'tool' ? (
              <div
                key={i}
                className="flex items-center gap-2 rounded-md bg-muted/60 px-2.5 py-1.5 font-mono text-[12px] text-muted-foreground"
              >
                <span className="text-primary">{toolIcon(it.name)}</span>
                <span className="shrink-0 font-sans font-medium text-foreground">{it.name}</span>
                <span className="truncate">{it.text}</span>
              </div>
            ) : it.kind === 'result' ? (
              <div key={i} className="rounded-lg border border-primary/30 bg-primary-soft/40 px-3.5 py-2.5 text-[13.5px]">
                {it.text}
              </div>
            ) : it.kind === 'error' ? (
              <div key={i} className="px-2 py-1 text-[13px] text-destructive">
                ⚠ {it.text}
              </div>
            ) : (
              <div key={i} className="px-2 py-1 text-[13.5px] leading-relaxed">
                {it.text}
              </div>
            )
          )
        )}
      </div>

      <div className="mt-3 flex items-end gap-2">
        <Sparkles className="mb-2.5 h-4 w-4 shrink-0 text-primary" />
        <textarea
          value={task}
          onChange={(e) => setTask(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              run()
            }
          }}
          rows={1}
          placeholder="如「给 utils.ts 加一个防抖函数并写测试」「修复 build 报错」"
          disabled={running || !cwd}
          className="max-h-32 flex-1 resize-none rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus-visible:border-ring disabled:opacity-60"
        />
        {running ? (
          <Button variant="secondary" onClick={stop}>
            <Square className="h-3.5 w-3.5 fill-current" /> 停止
          </Button>
        ) : (
          <Button onClick={run} disabled={!task.trim() || !cwd}>
            <Sparkles className="h-4 w-4" /> 运行
          </Button>
        )}
      </div>
    </div>
  )
}
