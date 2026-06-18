import { JSX, useEffect, useRef, useState } from 'react'
import { TriangleAlert } from 'lucide-react'
import { useStore } from '../store'
import { MessageBubble } from './MessageBubble'
import { ComposerUI, type ChatSession } from './Composer'
import type { Message, StreamingState, Conversation } from '../types'

/**
 * A fully self-contained chat for ONE conversation — its own messages,
 * streaming, onChunk subscription and composer. This powers the split pane so
 * two conversations can run side by side without sharing the global chat
 * session state (which belongs to the primary pane). It reuses the same
 * <ComposerUI> as the main view so the input is identical (联网 / 模型 / 语音 / 发送).
 */
export function ChatPane({ conversationId }: { conversationId: string }): JSX.Element {
  const [messages, setMessages] = useState<Message[]>([])
  const [streaming, setStreaming] = useState<StreamingState | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const conv = useStore((s) =>
    s.conversations.find((c) => c.id === conversationId)
  ) as Conversation | undefined
  const providers = useStore((s) => s.providers)
  const globalModel = useStore((s) => s.globalModel)
  const refreshConversations = useStore((s) => s.refreshConversations)

  useEffect(() => {
    setStreaming(null)
    window.api.conversations.messages(conversationId).then(setMessages)
  }, [conversationId])

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

  const session: ChatSession = {
    model: conv?.model || globalModel,
    models: Array.from(new Set(providers.flatMap((p) => p.models))),
    setModel: async (m) => {
      await window.api.conversations.setModel(conversationId, m)
      refreshConversations()
    },
    streaming: streaming !== null,
    empty: messages.length === 0 && streaming === null,
    send: (text, web) => {
      if (streaming) return
      setMessages((m) => [
        ...m,
        { id: `tmp-${m.length}`, conversation_id: conversationId, role: 'user', content: text, created_at: Date.now() }
      ])
      setStreaming({ text: '', thinking: '', error: null })
      window.api.agent.query(conversationId, text, web)
    },
    cancel: () => window.api.agent.cancel(conversationId)
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
      <ComposerUI session={session} compact />
    </div>
  )
}
