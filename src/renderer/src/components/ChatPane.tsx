import { JSX, useEffect, useRef, useState, KeyboardEvent } from 'react'
import { ArrowUp, Square, TriangleAlert } from 'lucide-react'
import { useStore } from '../store'
import { cn } from '../lib/utils'
import { MessageBubble } from './MessageBubble'
import type { Message, StreamingState, Conversation } from '../types'

/**
 * A fully self-contained chat for ONE conversation — its own messages,
 * streaming, onChunk subscription and composer. This is what powers the split
 * pane, so two conversations can run side by side without sharing the global
 * chat session state (which belongs to the primary pane).
 */
export function ChatPane({ conversationId }: { conversationId: string }): JSX.Element {
  const [messages, setMessages] = useState<Message[]>([])
  const [streaming, setStreaming] = useState<StreamingState | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const conv = useStore((s) =>
    s.conversations.find((c) => c.id === conversationId)
  ) as Conversation | undefined
  const refreshConversations = useStore((s) => s.refreshConversations)

  // Load this conversation's history when it changes.
  useEffect(() => {
    setStreaming(null)
    window.api.conversations.messages(conversationId).then(setMessages)
  }, [conversationId])

  // Subscribe to streamed chunks for THIS conversation only.
  useEffect(() => {
    const off = window.api.agent.onChunk((cid, chunk) => {
      if (cid !== conversationId) return
      if (chunk.type === 'text') {
        setStreaming((s) => ({ text: (s?.text ?? '') + chunk.text, thinking: s?.thinking ?? '', error: null }))
      } else if (chunk.type === 'thinking') {
        setStreaming((s) => ({ text: s?.text ?? '', thinking: (s?.thinking ?? '') + chunk.text, error: null }))
      } else if (chunk.type === 'error') {
        setStreaming((s) => ({ text: s?.text ?? '', thinking: s?.thinking ?? '', error: chunk.message }))
      } else if (chunk.type === 'done') {
        window.api.conversations.messages(conversationId).then((m) => {
          setMessages(m)
          setStreaming(null)
        })
        refreshConversations()
      }
    })
    return off
  }, [conversationId, refreshConversations])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
  }, [messages, streaming])

  const send = async (text: string): Promise<void> => {
    if (streaming) return
    setMessages((m) => [
      ...m,
      { id: `tmp-${m.length}`, conversation_id: conversationId, role: 'user', content: text, created_at: Date.now() }
    ])
    setStreaming({ text: '', thinking: '', error: null })
    await window.api.agent.query(conversationId, text)
  }
  const cancel = (): void => {
    window.api.agent.cancel(conversationId)
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="truncate border-b border-border-soft px-4 py-1.5 text-[12.5px] text-muted-foreground">
        {conv?.title ?? '对话'}
      </div>
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto py-5">
        {messages.length === 0 && !streaming ? (
          <div className="flex h-full items-center justify-center px-6 text-center text-[13px] text-muted-foreground">
            这是分屏里的另一个对话，直接在下面输入开始。
          </div>
        ) : (
          <>
            {messages.map((m) => (
              <MessageBubble key={m.id} role={m.role} content={m.content} />
            ))}
            {streaming ? (
              <MessageBubble
                role="assistant"
                content={streaming.text || (streaming.error ? '' : '…')}
                thinking={streaming.thinking || undefined}
              />
            ) : null}
            {streaming?.error ? (
              <div className="mx-auto flex max-w-3xl items-center gap-2 px-6 py-2 text-[13px] text-destructive">
                <TriangleAlert className="h-4 w-4 shrink-0" /> {streaming.error}
              </div>
            ) : null}
          </>
        )}
      </div>
      <PaneComposer streaming={streaming !== null} onSend={send} onCancel={cancel} />
    </div>
  )
}

function PaneComposer({
  streaming,
  onSend,
  onCancel
}: {
  streaming: boolean
  onSend: (text: string) => void
  onCancel: () => void
}): JSX.Element {
  const [text, setText] = useState('')
  const submit = (): void => {
    const t = text.trim()
    if (!t || streaming) return
    onSend(t)
    setText('')
  }
  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>): void => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submit()
    }
  }
  return (
    <div className="px-4 pb-4 pt-1">
      <div className="flex items-end gap-2 rounded-xl border border-border bg-card p-1.5 focus-within:border-ring/60">
        <textarea
          rows={1}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="在这条对话里输入…"
          className="block max-h-[160px] min-h-[28px] w-full resize-none bg-transparent px-2 py-1 text-[14px] outline-none placeholder:text-muted-foreground"
        />
        {streaming ? (
          <button
            onClick={onCancel}
            title="停止"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted-foreground text-background"
          >
            <Square className="h-3.5 w-3.5 fill-current" />
          </button>
        ) : (
          <button
            onClick={submit}
            disabled={!text.trim()}
            title="发送"
            className={cn(
              'flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-colors hover:bg-primary/90',
              !text.trim() && 'bg-accent text-muted-foreground'
            )}
          >
            <ArrowUp className="h-[18px] w-[18px]" />
          </button>
        )}
      </div>
    </div>
  )
}
