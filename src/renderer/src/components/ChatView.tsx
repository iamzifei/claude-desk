import { JSX, useEffect, useRef } from 'react'
import { useStore } from '../store'
import { MessageBubble } from './MessageBubble'
import { Composer } from './Composer'

export function ChatView(): JSX.Element {
  const messages = useStore((s) => s.messages)
  const streaming = useStore((s) => s.streaming)
  const hasApiKey = useStore((s) => s.hasApiKey)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to the newest content as it streams in.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
  }, [messages, streaming])

  return (
    <main className="chat">
      <div className="messages" ref={scrollRef}>
        {messages.length === 0 && !streaming ? (
          <div className="empty">
            <h1>Claude Desk</h1>
            <p>
              {hasApiKey
                ? 'Start a conversation below.'
                : 'Open Settings (bottom-left) and add your API key to begin.'}
            </p>
          </div>
        ) : null}

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

        {streaming?.error ? <div className="error-banner">⚠ {streaming.error}</div> : null}
      </div>

      <Composer />
    </main>
  )
}
