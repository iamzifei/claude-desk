import { JSX } from 'react'
import { Image as ImageIcon, X } from 'lucide-react'
import { useStore } from '../store'
import { CardPanel } from './CardPanel'

/**
 * Card export modal. Promotes 卡片导出 from a chat-only right-dock toggle to a
 * first-class action any surface can trigger (message bubble / 装配初稿 /
 * 改写成稿) by calling `openCard(text)`. The card stays on-screen so the native
 * exporter can grab its pixels.
 */
export function CardExportModal(): JSX.Element | null {
  const text = useStore((s) => s.cardText)
  const close = useStore((s) => s.closeCard)
  if (text === null) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6"
      onClick={close}
    >
      <div
        className="flex h-[80vh] w-[760px] max-w-[calc(100vw-48px)] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border-soft px-4 py-2.5">
          <div className="flex items-center gap-2 text-[13px] font-medium text-foreground">
            <ImageIcon className="h-4 w-4 text-primary" /> 导出卡片图
          </div>
          <button
            onClick={close}
            className="rounded p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <CardPanel text={text} />
      </div>
    </div>
  )
}
