import { JSX, useState, useEffect } from 'react'
import {
  Repeat2,
  Sparkles,
  Copy,
  Check,
  Loader2,
  Save,
  Stethoscope,
  Wand2,
  TriangleAlert
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { cn } from '../lib/utils'
import { useStore } from '../store'
import { Button } from './ui/button'
import { Header } from './ScheduledView'
import { PLATFORM_OPTIONS, labelForPlatform } from '../platforms'
import { isEngineError, engineErrorText } from '../engine-error'
import type { RewriteResult } from '../types'

export function RewriteView(): JSX.Element {
  const [source, setSource] = useState('')
  const seed = useStore((s) => s.rewriteSeed)
  // Consume a draft handed over from 选题装配.
  useEffect(() => {
    if (seed) {
      setSource(seed)
      useStore.setState({ rewriteSeed: null })
    }
  }, [seed])
  const [selected, setSelected] = useState<string[]>(['xiaohongshu', 'gongzhonghao', 'douyin'])
  const [results, setResults] = useState<RewriteResult[]>([])
  const [running, setRunning] = useState(false)
  const [diag, setDiag] = useState<string | null>(null)
  const [deai, setDeai] = useState<string | null>(null)
  const [busy, setBusy] = useState<'diag' | 'deai' | null>(null)

  const toggle = (id: string): void =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))

  const generate = async (): Promise<void> => {
    if (!source.trim() || selected.length === 0 || running) return
    setRunning(true)
    setResults([])
    try {
      const out = await window.api.rewrite.run(source.trim(), selected)
      setResults(out)
    } finally {
      setRunning(false)
    }
  }

  const diagnose = async (): Promise<void> => {
    if (!source.trim() || busy) return
    setBusy('diag')
    setDiag(null)
    try {
      setDiag(await window.api.diagnose.run(source.trim()))
    } finally {
      setBusy(null)
    }
  }

  const deAI = async (): Promise<void> => {
    if (!source.trim() || busy) return
    setBusy('deai')
    setDeai(null)
    try {
      setDeai(await window.api.diagnose.deai(source.trim()))
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="mx-auto flex h-full w-full max-w-3xl flex-col px-8 py-7">
      <Header
        icon={Repeat2}
        title="改写工坊"
        desc="一段初稿 → 「诊断」看五维问题、「去 AI 味」改成人话、「一键改写」出多平台母语化文案。已入上下文的素材/原子会作为品牌背景一并参考。"
      />

      <textarea
        placeholder="粘贴或输入你的原始内容（一个观点、一段初稿、一条要点）…"
        value={source}
        onChange={(e) => setSource(e.target.value)}
        rows={5}
        className="mt-3 w-full resize-none rounded-xl border border-input bg-background px-3.5 py-3 text-sm outline-none focus-visible:border-ring"
      />

      <div className="mt-3 flex flex-wrap gap-2">
        {PLATFORM_OPTIONS.map((p) => {
          const on = selected.includes(p.id)
          return (
            <button
              key={p.id}
              onClick={() => toggle(p.id)}
              className={cn(
                'rounded-full border px-3 py-1.5 text-[12.5px] transition-colors',
                on
                  ? 'border-primary bg-primary-soft text-primary'
                  : 'border-border text-muted-foreground hover:bg-accent hover:text-foreground'
              )}
              title={p.hint}
            >
              {p.label}
            </button>
          )
        })}
      </div>

      <div className="mt-3 flex items-center justify-between">
        <span className="text-[12px] text-muted-foreground">
          已选 {selected.length} 个平台
        </span>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={diagnose} disabled={!source.trim() || busy !== null}>
            {busy === 'diag' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Stethoscope className="h-4 w-4" />
            )}
            诊断
          </Button>
          <Button variant="secondary" onClick={deAI} disabled={!source.trim() || busy !== null}>
            {busy === 'deai' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Wand2 className="h-4 w-4" />
            )}
            去 AI 味
          </Button>
          <Button onClick={generate} disabled={!source.trim() || selected.length === 0 || running}>
            {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {running ? '改写中…' : '一键改写'}
          </Button>
        </div>
      </div>

      <div className="mt-5 min-h-0 flex-1 space-y-3 overflow-y-auto pb-2">
        {diag !== null ? (
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="mb-2 flex items-center gap-1.5 text-[13px] font-medium text-foreground">
              <Stethoscope className="h-4 w-4 text-primary" /> 五维诊断
            </div>
            <div className="markdown text-[13.5px] leading-relaxed text-foreground/90">
              <ReactMarkdown>{diag}</ReactMarkdown>
            </div>
          </div>
        ) : null}
        {deai !== null ? <ResultCard result={{ platform: 'deai', text: deai }} label="去 AI 味成稿" /> : null}
        {running && results.length === 0
          ? selected.map((id) => <ResultSkeleton key={id} platform={id} />)
          : results.map((r) => <ResultCard key={r.platform} result={r} />)}
      </div>
    </div>
  )
}

function ResultSkeleton({ platform }: { platform: string }): JSX.Element {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="mb-2 text-[13px] font-medium text-foreground">{labelForPlatform(platform)}</div>
      <div className="space-y-2">
        <div className="h-3 w-3/4 animate-pulse rounded bg-muted" />
        <div className="h-3 w-5/6 animate-pulse rounded bg-muted" />
        <div className="h-3 w-2/3 animate-pulse rounded bg-muted" />
      </div>
    </div>
  )
}

function ResultCard({ result, label }: { result: RewriteResult; label?: string }): JSX.Element {
  const [copied, setCopied] = useState(false)
  const [saved, setSaved] = useState(false)
  const title = label ?? labelForPlatform(result.platform)
  const isPlatform = result.platform !== 'deai'

  // A failed generation comes back as a `[错误] …` sentinel — show it as an error
  // (no copy/save), not as a draft the creator might mistake for real output.
  if (isEngineError(result.text)) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
        <div className="mb-1 flex items-center gap-1.5 text-[13px] font-medium text-destructive">
          <TriangleAlert className="h-4 w-4" /> {title} · 生成失败
        </div>
        <div className="text-[12.5px] leading-relaxed text-muted-foreground">
          {engineErrorText(result.text)}
          <br />
          已自动重试仍未成功，请检查网络或 API key 后，点上方「一键改写」重试。
        </div>
      </div>
    )
  }
  const copy = (): void => {
    navigator.clipboard.writeText(result.text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  const save = async (): Promise<void> => {
    if (saved) return
    await window.api.materials.create({
      title: `${title}稿`,
      content: result.text,
      platform: isPlatform ? result.platform : null,
      kind: 'text'
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[13px] font-medium text-foreground">{title}</span>
        <div className="flex items-center gap-0.5">
          <Button size="icon-sm" variant="ghost" title="存为素材" onClick={save}>
            {saved ? <Check className="h-4 w-4 text-primary" /> : <Save className="h-4 w-4" />}
          </Button>
          <Button size="icon-sm" variant="ghost" title="复制" onClick={copy}>
            {copied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
          </Button>
        </div>
      </div>
      <div className="whitespace-pre-wrap text-[13.5px] leading-relaxed text-foreground/90">
        {result.text}
      </div>
    </div>
  )
}
