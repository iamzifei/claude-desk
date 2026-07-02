import { JSX, useEffect, useRef, useState } from 'react'
import {
  ArrowLeft,
  Play,
  RotateCcw,
  Square,
  Check,
  CircleDashed,
  CircleX,
  History,
  ChevronRight,
  Library,
  FileText,
  Clapperboard,
  Loader2,
  TriangleAlert,
  UserRound
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { cn } from '../lib/utils'
import { Button } from './ui/button'
import { PHASES, STATUS_LABELS, canRunPhase, approxUsage, type PhaseMeta } from '../pipeline-meta'
import type { Creation, Chunk, Persona, PhaseStatus } from '../types'

interface StreamState {
  phaseId: number
  text: string
  thinking: string
}

/**
 * 流水线工作台 — left StepRail (7 phases with lingxi-aligned status styles) +
 * right phase screen (streamed markdown output, per-phase input, run/rerun/
 * advance controls, save-to-materials). One conversation turn per phase; the
 * main process persists outputs and flips downstream phases to 'stale' on
 * rerun (see agent/pipeline.ts).
 */
export function CreationWorkspace({
  creationId,
  onBack
}: {
  creationId: string
  onBack: () => void
}): JSX.Element {
  const [creation, setCreation] = useState<Creation | null>(null)
  const [phaseId, setPhaseId] = useState(1)
  const [inputs, setInputs] = useState<Record<number, string>>({})
  const [stream, setStream] = useState<StreamState | null>(null)
  const [personas, setPersonas] = useState<Persona[]>([])
  const [savedPhase, setSavedPhase] = useState<number | null>(null)
  const outputRef = useRef<HTMLDivElement>(null)

  const refresh = async (): Promise<Creation | undefined> => {
    const c = await window.api.creations.get(creationId)
    if (c) setCreation(c)
    return c
  }

  // Initial load: land on the creation's current phase, prefill saved inputs.
  useEffect(() => {
    void (async () => {
      const c = await refresh()
      if (!c) return
      setPhaseId(c.current_phase)
      const init: Record<number, string> = {}
      for (const p of PHASES) init[p.id] = c.phases[p.id]?.input ?? ''
      setInputs(init)
      setPersonas(await window.api.personas.list())
      // Resume the streaming view if a phase is mid-run (e.g. after view switch).
      const running = PHASES.find((p) => c.phases[p.id]?.status === 'running')
      if (running) setStream({ phaseId: running.id, text: '', thinking: '' })
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [creationId])

  // Streamed phase chunks → grow the live output; done/error → re-fetch state.
  useEffect(() => {
    return window.api.pipeline.onChunk((cid, pid, chunk: Chunk) => {
      if (cid !== creationId) return
      if (chunk.type === 'text') {
        setStream((s) => (s && s.phaseId === pid ? { ...s, text: s.text + chunk.text } : s))
      } else if (chunk.type === 'thinking') {
        setStream((s) => (s && s.phaseId === pid ? { ...s, thinking: s.thinking + chunk.text } : s))
      } else {
        // done / error → the DB now holds the truth; drop the live buffer.
        setStream(null)
        void refresh()
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [creationId])

  // Keep the output scrolled to the bottom while streaming.
  useEffect(() => {
    const el = outputRef.current
    if (el && stream) el.scrollTop = el.scrollHeight
  }, [stream])

  if (!creation) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    )
  }

  const meta = PHASES.find((p) => p.id === phaseId) ?? PHASES[0]
  const state = creation.phases[phaseId]
  const running = stream?.phaseId === phaseId
  const anyRunning =
    stream !== null || PHASES.some((p) => creation.phases[p.id]?.status === 'running')
  const runnable = canRunPhase(creation, phaseId)
  const FormatIcon = creation.format === 'script' ? Clapperboard : FileText

  const run = async (): Promise<void> => {
    if (anyRunning || !runnable) return
    setSavedPhase(null)
    setStream({ phaseId, text: '', thinking: '' })
    // Optimistic local flip so the rail pulses immediately.
    setCreation((c) =>
      c
        ? {
            ...c,
            phases: {
              ...c.phases,
              [phaseId]: { ...c.phases[phaseId], status: 'running' as PhaseStatus }
            }
          }
        : c
    )
    await window.api.pipeline.runPhase(creationId, phaseId, inputs[phaseId] ?? '')
  }

  const cancel = async (): Promise<void> => {
    await window.api.pipeline.cancel(creationId)
  }

  const saveAsMaterial = async (): Promise<void> => {
    const output = creation.phases[phaseId]?.output
    if (!output?.trim()) return
    await window.api.materials.create({
      title: `${creation.title} · ${meta.label}`,
      content: output,
      tags: `#创作流水线/${meta.key}`
    })
    setSavedPhase(phaseId)
  }

  // The next phase the user can advance to (skips a script's 配图 phase).
  const nextMeta = PHASES.find((p) => p.id > phaseId && creation.phases[p.id]?.status !== 'skipped')

  const personaName = creation.persona_id
    ? (personas.find((p) => p.id === creation.persona_id)?.name ?? '已绑定人设')
    : (personas.find((p) => p.is_default)?.name ?? null)

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* ---- top bar: back + title + format/persona meta ------------------ */}
      <div className="flex shrink-0 items-center gap-3 border-b border-border-soft px-5 py-3">
        <button
          onClick={onBack}
          className="flex items-center gap-1 rounded-lg px-2 py-1 text-[13px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> 创作列表
        </button>
        <div className="h-4 w-px bg-border" />
        <FormatIcon className="h-4 w-4 shrink-0 text-primary" strokeWidth={1.75} />
        <span className="min-w-0 truncate text-[14px] font-semibold text-foreground">
          {creation.title}
        </span>
        <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">
          {creation.format === 'script' ? '短视频脚本' : '长文'}
        </span>
        {personaName ? (
          <span className="ml-auto flex shrink-0 items-center gap-1 text-[12px] text-muted-foreground">
            <UserRound className="h-3.5 w-3.5" /> {personaName}
            {!creation.persona_id ? '（默认）' : ''}
          </span>
        ) : null}
      </div>

      <div className="flex min-h-0 flex-1">
        {/* ---- StepRail ---------------------------------------------------- */}
        <nav className="flex w-52 shrink-0 flex-col gap-0.5 overflow-y-auto border-r border-border-soft px-2.5 py-3">
          {PHASES.map((p) => (
            <StepRow
              key={p.id}
              meta={p}
              status={creation.phases[p.id]?.status ?? 'pending'}
              active={p.id === phaseId}
              reachable={canRunPhase(creation, p.id) || !!creation.phases[p.id]?.output}
              onClick={() => setPhaseId(p.id)}
            />
          ))}
        </nav>

        {/* ---- phase screen ------------------------------------------------ */}
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="shrink-0 border-b border-border-soft px-6 pb-3 pt-4">
            <div className="flex items-center gap-2">
              <h2 className="text-[16px] font-semibold text-foreground">
                阶段 {meta.id} · {meta.label}
              </h2>
              <StatusChip status={state?.status ?? 'pending'} />
            </div>
            <p className="mt-0.5 text-[12.5px] text-muted-foreground">{meta.hint}</p>
          </div>

          <div ref={outputRef} className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
            {state?.status === 'skipped' ? (
              <SkipNote />
            ) : running ? (
              <div className="markdown text-[14px] leading-relaxed">
                {stream.text ? (
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{stream.text}</ReactMarkdown>
                ) : (
                  <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {stream.thinking ? '思考中…' : '正在启动本阶段…'}
                  </div>
                )}
              </div>
            ) : state?.output ? (
              <>
                {state.status === 'stale' ? (
                  <div className="mb-3 flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[12.5px] text-amber-600 dark:text-amber-400">
                    <History className="h-4 w-4 shrink-0" />
                    上游阶段重跑过，本阶段产出可能已过时——建议重新运行。
                  </div>
                ) : null}
                {state.status === 'error' ? <ErrorBanner message={state.error} /> : null}
                <div className="markdown text-[14px] leading-relaxed">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{state.output}</ReactMarkdown>
                </div>
                <UsageLine text={state.output} />
              </>
            ) : state?.status === 'error' ? (
              <ErrorBanner message={state.error} />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
                <CircleDashed className="h-8 w-8 text-muted-foreground/30" strokeWidth={1.5} />
                <p className="text-[13px] text-muted-foreground/70">
                  {runnable
                    ? '填写本阶段输入（可留空），点「运行」开始。'
                    : '先完成上游阶段，才能运行这一步。'}
                </p>
              </div>
            )}
          </div>

          {/* ---- input + actions ------------------------------------------- */}
          {state?.status !== 'skipped' ? (
            <div className="shrink-0 border-t border-border-soft px-6 py-3.5">
              <textarea
                value={inputs[phaseId] ?? ''}
                onChange={(e) => setInputs((v) => ({ ...v, [phaseId]: e.target.value }))}
                placeholder={meta.inputHint}
                rows={meta.id === 7 ? 5 : 2}
                disabled={running}
                className="w-full resize-y rounded-lg border border-input bg-background px-3 py-2 text-[13px] outline-none placeholder:text-muted-foreground/50 focus-visible:border-ring disabled:opacity-60"
              />
              <div className="mt-2 flex items-center gap-2">
                {running ? (
                  <Button size="sm" variant="outline" onClick={() => void cancel()}>
                    <Square className="h-3.5 w-3.5" /> 停止
                  </Button>
                ) : (
                  <Button size="sm" disabled={!runnable || anyRunning} onClick={() => void run()}>
                    {state?.status === 'error' ? (
                      <>
                        <RotateCcw className="h-3.5 w-3.5" /> 重试
                      </>
                    ) : state?.output ? (
                      <>
                        <RotateCcw className="h-3.5 w-3.5" /> 重新运行
                      </>
                    ) : (
                      <>
                        <Play className="h-3.5 w-3.5" /> 运行
                      </>
                    )}
                  </Button>
                )}
                {state?.output && !running ? (
                  <Button size="sm" variant="outline" onClick={() => void saveAsMaterial()}>
                    {savedPhase === phaseId ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-500" /> 已存为素材
                      </>
                    ) : (
                      <>
                        <Library className="h-3.5 w-3.5" /> 存为素材
                      </>
                    )}
                  </Button>
                ) : null}
                {state?.status === 'done' && nextMeta && !running ? (
                  <Button size="sm" variant="secondary" onClick={() => setPhaseId(nextMeta.id)}>
                    确认，进入「{nextMeta.label}」 <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

/** One StepRail row — status styles aligned with lingxi's rail (spec §2.3). */
function StepRow({
  meta,
  status,
  active,
  reachable,
  onClick
}: {
  meta: PhaseMeta
  status: PhaseStatus
  active: boolean
  reachable: boolean
  onClick: () => void
}): JSX.Element {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors',
        active ? 'bg-accent' : 'hover:bg-accent/60',
        !reachable && status !== 'skipped' && 'opacity-50'
      )}
    >
      <StepIcon status={status} index={meta.id} />
      <span
        className={cn(
          'flex-1 text-[13px]',
          status === 'skipped'
            ? 'text-muted-foreground/50 line-through'
            : active
              ? 'font-medium text-foreground'
              : 'text-muted-foreground'
        )}
      >
        {meta.label}
      </span>
      {status === 'stale' ? (
        <span className="shrink-0 rounded bg-amber-500/15 px-1 py-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-400">
          需重跑
        </span>
      ) : null}
      {status === 'skipped' ? (
        <span className="shrink-0 text-[10px] text-muted-foreground/50">跳过</span>
      ) : null}
    </button>
  )
}

/** Status glyph: 完成绿勾 / 进行中紫脉冲 / 待灰 / 错误红 / stale 黄 / 跳过灰. */
function StepIcon({ status, index }: { status: PhaseStatus; index: number }): JSX.Element {
  if (status === 'done')
    return (
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/15">
        <Check className="h-3 w-3 text-emerald-500" strokeWidth={2.5} />
      </span>
    )
  if (status === 'running')
    return (
      <span className="relative flex h-5 w-5 shrink-0 items-center justify-center">
        <span className="absolute h-3.5 w-3.5 animate-ping rounded-full bg-primary/50" />
        <span className="relative h-2.5 w-2.5 rounded-full bg-primary" />
      </span>
    )
  if (status === 'error')
    return <CircleX className="h-5 w-5 shrink-0 text-destructive" strokeWidth={1.75} />
  if (status === 'stale')
    return <History className="h-5 w-5 shrink-0 text-amber-500" strokeWidth={1.75} />
  // pending / skipped → numbered grey circle
  return (
    <span
      className={cn(
        'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10.5px]',
        'border-border text-muted-foreground/60'
      )}
    >
      {index}
    </span>
  )
}

function StatusChip({ status }: { status: PhaseStatus }): JSX.Element {
  const styles: Record<PhaseStatus, string> = {
    pending: 'bg-muted text-muted-foreground',
    running: 'bg-primary-soft text-primary',
    done: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
    error: 'bg-destructive/10 text-destructive',
    stale: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
    skipped: 'bg-muted text-muted-foreground/60'
  }
  return (
    <span className={cn('rounded px-1.5 py-0.5 text-[11px] font-medium', styles[status])}>
      {STATUS_LABELS[status]}
    </span>
  )
}

function SkipNote(): JSX.Element {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
      <Clapperboard className="h-8 w-8 text-muted-foreground/30" strokeWidth={1.5} />
      <p className="text-[13px] text-muted-foreground/70">
        短视频脚本不需要配图阶段——「排版」阶段会直接产出拍摄清单。
      </p>
    </div>
  )
}

function ErrorBanner({ message }: { message?: string }): JSX.Element {
  return (
    <div className="mb-3 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-[12.5px] text-destructive">
      <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
      <span>
        {message || '本阶段运行出错。'}
        <span className="text-destructive/70">（可点「重试」，或修改下方输入后重新运行）</span>
      </span>
    </div>
  )
}

/** Post-run usage line — char count + clearly-labelled token estimate. */
function UsageLine({ text }: { text: string }): JSX.Element {
  const { chars, approxTokens } = approxUsage(text)
  return (
    <p className="mt-4 border-t border-border-soft pt-2 text-[11.5px] text-muted-foreground/60">
      本阶段产出约 {chars.toLocaleString()} 字 · 估算 ~{approxTokens.toLocaleString()} tokens
      （接口未返回精确用量，按字数近似）
    </p>
  )
}
