import { JSX } from 'react'
import { useStore } from '../store'
import { Dialog, DialogContent } from './ui/dialog'

/**
 * "更新内容" — a plain-language what's-new shown once after a major (x.y) update.
 * Driven by store.whatsNew (the matching CHANGELOG entry); dismissing records the
 * version as seen so it won't pop again until the next big release.
 */
export function WhatsNew(): JSX.Element | null {
  const open = useStore((s) => s.whatsNewOpen)
  const entry = useStore((s) => s.whatsNew)
  const dismiss = useStore((s) => s.dismissWhatsNew)
  if (!entry) return null

  const Icon = entry.icon
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) void dismiss()
      }}
    >
      <DialogContent className="max-w-md">
        <div className="px-1 pt-1">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
              <Icon className="h-5 w-5" strokeWidth={1.75} />
            </div>
            <div>
              <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground/70">
                已更新到 v{entry.version}
              </div>
              <h2 className="text-[17px] font-semibold text-foreground">{entry.title}</h2>
            </div>
          </div>
          <ul className="mt-4 space-y-2.5">
            {entry.items.map((it, i) => {
              const ItemIcon = it.icon
              return (
                <li key={i} className="flex gap-2.5 text-[13.5px] leading-relaxed">
                  <ItemIcon
                    className="mt-0.5 h-4 w-4 shrink-0 text-primary/70"
                    strokeWidth={1.75}
                  />
                  <span className="text-muted-foreground">{it.text}</span>
                </li>
              )
            })}
          </ul>
          <button
            onClick={() => void dismiss()}
            className="mt-5 w-full rounded-lg bg-primary py-2 text-[13.5px] font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            开始体验
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
