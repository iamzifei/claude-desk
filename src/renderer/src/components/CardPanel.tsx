import { JSX, ReactNode, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { Copy, Download, FileDown, Check } from 'lucide-react'
import { cn } from '../lib/utils'

// Background presets for the exported card (id → className + export bg color).
const BACKGROUNDS = [
  { id: 'cream', label: '米白', cls: 'bg-[#f7f4ee] text-[#2b2b30]', export: '#f7f4ee' },
  { id: 'white', label: '纯白', cls: 'bg-white text-[#2b2b30]', export: '#ffffff' },
  { id: 'sky', label: '天青', cls: 'bg-[#eef4f8] text-[#23303a]', export: '#eef4f8' },
  {
    id: 'sunset',
    label: '暮光',
    cls: 'bg-gradient-to-br from-[#f6d9b8] to-[#e8a87c] text-[#3a2417]',
    export: '#eeb88c'
  },
  { id: 'ink', label: '墨黑', cls: 'bg-[#1f1f23] text-[#ececf0]', export: '#1f1f23' }
] as const

const WIDTHS = [
  { id: 'sm', label: '窄', px: 380 },
  { id: 'md', label: '中', px: 480 },
  { id: 'lg', label: '宽', px: 600 }
] as const

/** Renders the given text as an exportable styled card (image/PDF). The caller
 *  supplies the text — a chat reply, an assembled draft, a rewrite result… */
export function CardPanel({ text }: { text: string }): JSX.Element {
  const cardRef = useRef<HTMLDivElement>(null)
  const [bg, setBg] = useState<(typeof BACKGROUNDS)[number]['id']>('cream')
  const [width, setWidth] = useState<(typeof WIDTHS)[number]['id']>('md')
  const [pad, setPad] = useState(40)
  const [radius, setRadius] = useState(20)
  const [busy, setBusy] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const bgDef = BACKGROUNDS.find((b) => b.id === bg)!
  const widthPx = WIDTHS.find((w) => w.id === width)!.px

  // Native capture: hand the card's on-screen rect to the main process, which
  // grabs those pixels at the display scale factor (crisp on retina).
  const capture = async (): Promise<{ dataUrl: string; w: number; h: number }> => {
    const el = cardRef.current
    if (!el) throw new Error('no card')
    const r = el.getBoundingClientRect()
    const dataUrl = await window.api.exporter.capture({
      x: r.left,
      y: r.top,
      width: r.width,
      height: r.height
    })
    return { dataUrl, w: Math.round(r.width), h: Math.round(r.height) }
  }

  const copyImage = async (): Promise<void> => {
    setBusy('copy')
    try {
      const { dataUrl } = await capture()
      await window.api.exporter.copyImage(dataUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } finally {
      setBusy(null)
    }
  }

  const downloadPng = async (): Promise<void> => {
    setBusy('png')
    try {
      const { dataUrl } = await capture()
      await window.api.exporter.saveBinary('card.png', dataUrl.split(',')[1])
    } finally {
      setBusy(null)
    }
  }

  const exportPdf = async (): Promise<void> => {
    setBusy('pdf')
    try {
      const { dataUrl, w, h } = await capture()
      const base64 = await window.api.exporter.pdfFromImage(dataUrl, w, h)
      await window.api.exporter.saveBinary('card.pdf', base64)
    } finally {
      setBusy(null)
    }
  }

  if (!text.trim()) {
    return (
      <div className="m-auto max-w-[240px] px-6 text-center text-muted-foreground">
        <p className="text-sm">还没有可生成卡片的内容</p>
        <p className="mt-1 text-xs text-muted-foreground/70">先和 AI 对话，再把回复导出成卡片。</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Preview */}
      <div className="flex min-h-0 flex-1 items-start justify-center overflow-auto bg-muted/40 p-5">
        <div
          ref={cardRef}
          data-card
          className={cn('markdown shadow-sm', bgDef.cls)}
          style={{ width: widthPx, padding: pad, borderRadius: radius }}
        >
          <ReactMarkdown>{text}</ReactMarkdown>
        </div>
      </div>

      {/* Controls (通用属性) */}
      <div className="space-y-3 border-t border-border-soft p-3">
        <Row label="背景">
          <div className="flex gap-1.5">
            {BACKGROUNDS.map((b) => (
              <button
                key={b.id}
                onClick={() => setBg(b.id)}
                title={b.label}
                className={cn(
                  'h-6 w-6 rounded-full border',
                  b.cls,
                  bg === b.id ? 'ring-2 ring-primary ring-offset-1 ring-offset-background' : 'border-border'
                )}
              />
            ))}
          </div>
        </Row>
        <Row label="宽度">
          <Segmented
            value={width}
            onChange={(v) => setWidth(v as typeof width)}
            options={WIDTHS.map((w) => ({ value: w.id, label: w.label }))}
          />
        </Row>
        <Row label="内边距">
          <input
            type="range"
            min={16}
            max={72}
            value={pad}
            onChange={(e) => setPad(+e.target.value)}
            className="flex-1 accent-[var(--primary)]"
          />
        </Row>
        <Row label="圆角">
          <input
            type="range"
            min={0}
            max={36}
            value={radius}
            onChange={(e) => setRadius(+e.target.value)}
            className="flex-1 accent-[var(--primary)]"
          />
        </Row>

        <div className="grid grid-cols-3 gap-1.5 pt-1">
          <ExportBtn onClick={copyImage} busy={busy === 'copy'} icon={copied ? Check : Copy}>
            {copied ? '已复制' : '复制图片'}
          </ExportBtn>
          <ExportBtn onClick={downloadPng} busy={busy === 'png'} icon={Download}>
            PNG
          </ExportBtn>
          <ExportBtn onClick={exportPdf} busy={busy === 'pdf'} icon={FileDown}>
            PDF
          </ExportBtn>
        </div>
      </div>
    </div>
  )
}

function Row({ label, children }: { label: string; children: ReactNode }): JSX.Element {
  return (
    <div className="flex items-center gap-3">
      <span className="w-12 shrink-0 text-[12px] text-muted-foreground">{label}</span>
      {children}
    </div>
  )
}

function Segmented({
  value,
  onChange,
  options
}: {
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
}): JSX.Element {
  return (
    <div className="flex flex-1 gap-1 rounded-md border border-border p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            'flex-1 rounded py-1 text-[12px] transition-colors',
            value === o.value ? 'bg-accent text-foreground' : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

function ExportBtn({
  onClick,
  busy,
  icon: Icon,
  children
}: {
  onClick: () => void
  busy: boolean
  icon: typeof Copy
  children: ReactNode
}): JSX.Element {
  return (
    <button
      onClick={onClick}
      disabled={busy}
      className="flex items-center justify-center gap-1.5 rounded-lg border border-border py-2 text-[12.5px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-50"
    >
      <Icon className="h-3.5 w-3.5" /> {busy ? '…' : children}
    </button>
  )
}
