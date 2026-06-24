import { JSX, useCallback, useEffect, useState } from 'react'
import { Link2, X, Plus, CornerDownLeft } from 'lucide-react'
import { useStore } from '../store'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog'
import { Tip } from './ui/tooltip'
import type { ContextRef } from '../types'

/**
 * Context-migration bar above the composer. Shows the conversations whose
 * history is injected as context for this conversation, and lets you add more
 * by pasting a Session ID or picking from recent chats (Codex-style "paste a
 * session id to sync context").
 */
export function ContextRefsBar({ conversationId }: { conversationId: string }): JSX.Element | null {
  const [refs, setRefs] = useState<ContextRef[]>([])
  const [pickerOpen, setPickerOpen] = useState(false)

  const load = useCallback(() => {
    window.api.conversations.contextRefs(conversationId).then(setRefs)
  }, [conversationId])
  useEffect(() => load(), [load])

  // Refresh when a pasted Session ID gets auto-imported for this conversation.
  useEffect(
    () =>
      window.api.conversations.onContextChanged((id) => {
        if (id === conversationId) load()
      }),
    [conversationId, load]
  )

  const remove = async (refId: string): Promise<void> => {
    await window.api.conversations.removeContextRef(conversationId, refId)
    load()
  }

  return (
    <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
      {refs.map((r) => (
        <Tip key={r.id} label={`引用了「${r.title}」的 ${r.messageCount} 条消息作为上下文`}>
          <span className="flex items-center gap-1 rounded-full border border-primary/30 bg-primary-soft/60 py-0.5 pl-2 pr-1 text-[11.5px] text-primary">
            <Link2 className="h-3 w-3" />
            <span className="max-w-[160px] truncate">{r.title}</span>
            <button
              onClick={() => remove(r.id)}
              className="rounded-full p-0.5 hover:bg-primary/15"
              title="移除引用"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        </Tip>
      ))}
      <button
        onClick={() => setPickerOpen(true)}
        className="flex items-center gap-1 rounded-full border border-dashed border-border px-2 py-0.5 text-[11.5px] text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
      >
        <Plus className="h-3 w-3" /> 引用对话
      </button>

      <ContextPickerModal
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        conversationId={conversationId}
        existingIds={new Set(refs.map((r) => r.id))}
        onChanged={load}
      />
    </div>
  )
}

function ContextPickerModal({
  open,
  onOpenChange,
  conversationId,
  existingIds,
  onChanged
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  conversationId: string
  existingIds: Set<string>
  onChanged: () => void
}): JSX.Element {
  const conversations = useStore((s) => s.conversations)
  const [paste, setPaste] = useState('')
  const [error, setError] = useState<string | null>(null)

  const add = async (refId: string): Promise<boolean> => {
    const res = await window.api.conversations.addContextRef(conversationId, refId.trim())
    if (!res) {
      setError('找不到该 Session ID 对应的对话，或不能引用自己')
      return false
    }
    setError(null)
    onChanged()
    return true
  }

  const candidates = conversations.filter((c) => c.id !== conversationId && !existingIds.has(c.id))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>引用对话上下文</DialogTitle>
        </DialogHeader>

        <div className="mt-1">
          <label className="text-[12px] text-muted-foreground">粘贴 Session ID</label>
          <div className="mt-1 flex gap-1.5">
            <input
              value={paste}
              onChange={(e) => {
                setPaste(e.target.value)
                setError(null)
              }}
              onKeyDown={async (e) => {
                if (e.key === 'Enter' && paste.trim()) {
                  if (await add(paste)) setPaste('')
                }
              }}
              placeholder="例如 87a19da2-…（对话菜单可复制）"
              className="h-8 min-w-0 flex-1 rounded-lg border border-border bg-background px-2.5 text-[13px] outline-none focus:border-ring"
            />
            <button
              onClick={async () => {
                if (paste.trim() && (await add(paste))) setPaste('')
              }}
              disabled={!paste.trim()}
              className="flex items-center gap-1 rounded-lg bg-primary px-2.5 text-[12.5px] font-medium text-primary-foreground disabled:bg-accent disabled:text-muted-foreground"
            >
              <CornerDownLeft className="h-3.5 w-3.5" /> 引用
            </button>
          </div>
          {error ? <p className="mt-1 text-[12px] text-red-600">{error}</p> : null}
        </div>

        <div className="mt-3">
          <div className="pb-1 text-[12px] text-muted-foreground">或从最近对话选择</div>
          <div className="max-h-[40vh] overflow-y-auto">
            {candidates.length === 0 ? (
              <p className="px-1 py-2 text-[12.5px] text-muted-foreground/60">没有可引用的对话</p>
            ) : (
              candidates.map((c) => (
                <button
                  key={c.id}
                  onClick={() => add(c.id)}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[13px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  <Link2 className="h-3.5 w-3.5 shrink-0 opacity-60" />
                  <span className="truncate">{c.title}</span>
                </button>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
