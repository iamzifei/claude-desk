import { JSX, useEffect, useRef, useState, type ReactNode, type WheelEvent } from 'react'
import {
  FileQuestion,
  ExternalLink,
  FolderOpen,
  Loader2,
  ZoomIn,
  ZoomOut,
  Maximize2
} from 'lucide-react'
import { MarkdownEditor } from './MarkdownEditor'
import { cn } from '../lib/utils'

type PreviewKind = 'markdown' | 'image' | 'pdf' | 'text' | 'binary'

const IMAGE_EXTS = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'avif', 'ico'])
const TEXT_EXTS = new Set([
  'txt',
  'csv',
  'tsv',
  'json',
  'yaml',
  'yml',
  'xml',
  'html',
  'css',
  'js',
  'ts',
  'py',
  'sh',
  'log'
])

/** Classify a file by extension into a preview surface (mirrors main/vault/mime). */
function previewKind(rel: string): PreviewKind {
  const dot = rel.lastIndexOf('.')
  const ext = dot >= 0 ? rel.slice(dot + 1).toLowerCase() : ''
  if (ext === 'md' || ext === 'markdown' || ext === 'mdx') return 'markdown'
  if (IMAGE_EXTS.has(ext)) return 'image'
  if (ext === 'pdf') return 'pdf'
  if (TEXT_EXTS.has(ext)) return 'text'
  return 'binary'
}

interface Props {
  projectId: string
  rel: string
}

/**
 * Preview any vault file, Obsidian / macOS-Quick-Look style: Markdown renders
 * (GFM, editable), images and PDFs embed inline, plain text/code shows as text,
 * and anything else offers "open in default app" / "reveal in Finder".
 * Mount with `key={`${projectId}:${rel}`}` so switching files is a clean remount.
 */
export function FilePreview({ projectId, rel }: Props): JSX.Element {
  const kind = previewKind(rel)

  // Markdown keeps its full editor (edit + GFM preview + conflict handling).
  if (kind === 'markdown') return <MarkdownEditor projectId={projectId} rel={rel} />

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex h-9 shrink-0 items-center justify-between border-b border-border-soft px-3">
        <span className="min-w-0 truncate text-[12.5px] text-muted-foreground" title={rel}>
          {rel}
        </span>
        <div className="flex items-center gap-0.5">
          <HeaderBtn
            title="用默认应用打开"
            onClick={() => window.api.vault.openExternal(projectId, rel)}
          >
            <ExternalLink className="h-4 w-4" />
          </HeaderBtn>
          <HeaderBtn title="在访达中显示" onClick={() => window.api.vault.reveal(projectId, rel)}>
            <FolderOpen className="h-4 w-4" />
          </HeaderBtn>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        {kind === 'image' ? (
          <ImagePreview projectId={projectId} rel={rel} />
        ) : kind === 'pdf' ? (
          <PdfPreview projectId={projectId} rel={rel} />
        ) : kind === 'text' ? (
          <TextPreview projectId={projectId} rel={rel} />
        ) : (
          <BinaryFallback projectId={projectId} rel={rel} />
        )}
      </div>
    </div>
  )
}

const MIN_SCALE = 0.1
const MAX_SCALE = 12
const clampScale = (s: number): number => Math.min(MAX_SCALE, Math.max(MIN_SCALE, s))

/**
 * Zoomable / pannable image viewer (Obsidian / macOS-Quick-Look style): scroll
 * to zoom toward the cursor, drag to pan, +/−/适应 controls, double-click to
 * toggle between fit and 1:1. The image fits the pane at scale 1.
 */
function ImagePreview({ projectId, rel }: Props): JSX.Element {
  const url = useDataUrl(projectId, rel)
  const containerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  const [tx, setTx] = useState(0)
  const [ty, setTy] = useState(0)
  const [dragging, setDragging] = useState(false)
  // Pointer-drag origin: screen point + the translate at drag start.
  const drag = useRef<{ x: number; y: number; tx: number; ty: number } | null>(null)

  const reset = (): void => {
    setScale(1)
    setTx(0)
    setTy(0)
  }

  // Zoom keeping the point under the cursor fixed. `cx/cy` are cursor offsets
  // from the container centre (the transform origin of the centred image).
  const zoomAt = (factor: number, cx: number, cy: number): void => {
    setScale((s) => {
      const ns = clampScale(s * factor)
      const ratio = ns / s
      setTx((t) => cx - ratio * (cx - t))
      setTy((t) => cy - ratio * (cy - t))
      return ns
    })
  }

  // Button zoom anchors on the pane centre (cx = cy = 0).
  const zoomButton = (factor: number): void => zoomAt(factor, 0, 0)

  const onWheel = (e: WheelEvent<HTMLDivElement>): void => {
    const el = containerRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const cx = e.clientX - r.left - r.width / 2
    const cy = e.clientY - r.top - r.height / 2
    zoomAt(e.deltaY < 0 ? 1.12 : 1 / 1.12, cx, cy)
  }

  if (url.loading) return <Centered>{<Spinner />}</Centered>
  if (url.error) return <Centered>无法预览：{url.error}</Centered>

  return (
    <div
      ref={containerRef}
      onWheel={onWheel}
      onDoubleClick={() => (scale === 1 ? zoomButton(2.5) : reset())}
      onPointerDown={(e) => {
        ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
        drag.current = { x: e.clientX, y: e.clientY, tx, ty }
        setDragging(true)
      }}
      onPointerMove={(e) => {
        if (!drag.current) return
        setTx(drag.current.tx + (e.clientX - drag.current.x))
        setTy(drag.current.ty + (e.clientY - drag.current.y))
      }}
      onPointerUp={() => {
        drag.current = null
        setDragging(false)
      }}
      className={cn(
        'relative flex h-full select-none items-center justify-center overflow-hidden p-6',
        dragging ? 'cursor-grabbing' : 'cursor-grab'
      )}
    >
      <img
        src={url.value}
        alt={rel}
        draggable={false}
        style={{
          transform: `translate(${tx}px, ${ty}px) scale(${scale})`,
          transition: dragging ? 'none' : 'transform 80ms ease-out'
        }}
        className="max-h-full max-w-full object-contain"
      />

      {/* zoom controls */}
      <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-0.5 rounded-lg border border-border-soft bg-background/90 p-0.5 shadow-sm backdrop-blur">
        <ZoomBtn title="缩小" onClick={() => zoomButton(1 / 1.25)}>
          <ZoomOut className="h-4 w-4" />
        </ZoomBtn>
        <button
          onClick={reset}
          title="适应窗口"
          className="min-w-[48px] rounded px-1.5 py-1 text-[11.5px] tabular-nums text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          {Math.round(scale * 100)}%
        </button>
        <ZoomBtn title="放大" onClick={() => zoomButton(1.25)}>
          <ZoomIn className="h-4 w-4" />
        </ZoomBtn>
        <ZoomBtn title="适应窗口" onClick={reset}>
          <Maximize2 className="h-4 w-4" />
        </ZoomBtn>
      </div>
    </div>
  )
}

function ZoomBtn({
  title,
  onClick,
  children
}: {
  title: string
  onClick: () => void
  children: JSX.Element
}): JSX.Element {
  return (
    <button
      onClick={onClick}
      title={title}
      className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
    >
      {children}
    </button>
  )
}

function PdfPreview({ projectId, rel }: Props): JSX.Element {
  const url = useDataUrl(projectId, rel)
  if (url.loading) return <Centered>{<Spinner />}</Centered>
  if (url.error)
    return (
      <Centered>
        无法内嵌预览：{url.error}
        <BinaryFallback projectId={projectId} rel={rel} />
      </Centered>
    )
  // The renderer ships with Chromium's PDF viewer; a data URL embeds cleanly.
  return <embed src={url.value} type="application/pdf" className="h-full w-full" />
}

function TextPreview({ projectId, rel }: Props): JSX.Element {
  const [text, setText] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    let alive = true
    window.api.vault
      .read(projectId, rel)
      .then((t) => alive && setText(t))
      .catch((e) => alive && setError(e instanceof Error ? e.message : String(e)))
    return () => {
      alive = false
    }
  }, [projectId, rel])
  if (error) return <Centered>无法读取：{error}</Centered>
  if (text === null) return <Centered>{<Spinner />}</Centered>
  return (
    <pre className="min-h-full whitespace-pre-wrap p-5 font-mono text-[12.5px] leading-relaxed text-foreground">
      {text}
    </pre>
  )
}

function BinaryFallback({ projectId, rel }: Props): JSX.Element {
  return (
    <div className="m-auto max-w-[280px] px-6 py-10 text-center">
      <FileQuestion className="mx-auto mb-3 h-9 w-9 text-muted-foreground/50" strokeWidth={1.5} />
      <p className="text-[13px] text-muted-foreground">这种文件暂不支持内嵌预览。</p>
      <div className="mt-3 flex justify-center gap-2">
        <button
          onClick={() => window.api.vault.openExternal(projectId, rel)}
          className="rounded-lg bg-primary px-3 py-1.5 text-[12.5px] font-medium text-primary-foreground hover:bg-primary/90"
        >
          用默认应用打开
        </button>
        <button
          onClick={() => window.api.vault.reveal(projectId, rel)}
          className="rounded-lg border border-border px-3 py-1.5 text-[12.5px] font-medium text-muted-foreground hover:bg-accent"
        >
          在访达中显示
        </button>
      </div>
    </div>
  )
}

// ---- helpers ----------------------------------------------------------------

function useDataUrl(
  projectId: string,
  rel: string
): { loading: boolean; value: string; error: string | null } {
  const [state, setState] = useState<{ loading: boolean; value: string; error: string | null }>({
    loading: true,
    value: '',
    error: null
  })
  useEffect(() => {
    let alive = true
    window.api.vault
      .readDataUrl(projectId, rel)
      .then((value) => alive && setState({ loading: false, value, error: null }))
      .catch(
        (e) =>
          alive &&
          setState({ loading: false, value: '', error: e instanceof Error ? e.message : String(e) })
      )
    return () => {
      alive = false
    }
  }, [projectId, rel])
  return state
}

function Centered({ children }: { children: ReactNode }): JSX.Element {
  return (
    <div className="m-auto flex h-full flex-col items-center justify-center gap-2 px-6 text-center text-[13px] text-muted-foreground">
      {children}
    </div>
  )
}

function Spinner(): JSX.Element {
  return <Loader2 className="h-4 w-4 animate-spin" />
}

function HeaderBtn({
  title,
  onClick,
  children
}: {
  title: string
  onClick: () => void
  children: JSX.Element
}): JSX.Element {
  return (
    <button
      title={title}
      onClick={onClick}
      className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
    >
      {children}
    </button>
  )
}
