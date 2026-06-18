import { JSX, useState } from 'react'
import { Repeat2, Sparkles, Copy, Check, Loader2, Save } from 'lucide-react'
import { cn } from '../lib/utils'
import { Button } from './ui/button'
import { Header } from './ScheduledView'
import { PLATFORM_OPTIONS, labelForPlatform } from '../platforms'
import type { RewriteResult } from '../types'

export function RewriteView(): JSX.Element {
  const [source, setSource] = useState('')
  const [selected, setSelected] = useState<string[]>(['xiaohongshu', 'gongzhonghao', 'douyin'])
  const [results, setResults] = useState<RewriteResult[]>([])
  const [running, setRunning] = useState(false)

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

  return (
    <div className="mx-auto flex h-full w-full max-w-3xl flex-col px-8 py-7">
      <Header
        icon={Repeat2}
        title="多平台改写"
        desc="把一段内容一次改写成多个平台的母语化文案，保留原意、各用各的语气。已入上下文的素材会作为品牌背景一并参考。"
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
        <Button
          onClick={generate}
          disabled={!source.trim() || selected.length === 0 || running}
        >
          {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {running ? '改写中…' : '一键改写'}
        </Button>
      </div>

      <div className="mt-5 min-h-0 flex-1 space-y-3 overflow-y-auto pb-2">
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

function ResultCard({ result }: { result: RewriteResult }): JSX.Element {
  const [copied, setCopied] = useState(false)
  const [saved, setSaved] = useState(false)
  const copy = (): void => {
    navigator.clipboard.writeText(result.text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  const save = async (): Promise<void> => {
    if (saved) return
    await window.api.materials.create({
      title: `${labelForPlatform(result.platform)}改写稿`,
      content: result.text,
      platform: result.platform,
      kind: 'text'
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[13px] font-medium text-foreground">
          {labelForPlatform(result.platform)}
        </span>
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
