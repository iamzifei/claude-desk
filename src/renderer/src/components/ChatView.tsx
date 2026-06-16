import { JSX, useEffect, useRef } from 'react'
import { useStore } from '../store'
import { MessageBubble } from './MessageBubble'
import { Composer } from './Composer'
import { TabBar } from './TabBar'
import { RightDock, RightPanel } from './RightPanel'

export function ChatView(): JSX.Element {
  const messages = useStore((s) => s.messages)
  const streaming = useStore((s) => s.streaming)
  const hasApiKey = useStore((s) => s.hasApiKey)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
  }, [messages, streaming])

  return (
    <div className="main">
      <TabBar />
      <div className="main-body">
        <main className="chat">
          <div className="messages" ref={scrollRef}>
            {messages.length === 0 && !streaming ? (
              <div className="empty">
                <h1>牛马AI · Desk</h1>
                <p>
                  {hasApiKey
                    ? '开始一段对话吧。'
                    : '点击左下角「设置」填入 API key，或在 ~/.env 设置 CLAUDE_API_KEY。'}
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

        <RightPanel />
        <RightDock />
      </div>
    </div>
  )
}
