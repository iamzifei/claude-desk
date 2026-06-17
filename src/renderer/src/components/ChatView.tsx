import { JSX, useEffect, useRef } from 'react'
import { TriangleAlert } from 'lucide-react'
import { useStore } from '../store'
import { greeting } from '../utils'
import { MessageBubble } from './MessageBubble'
import { Composer } from './Composer'
import { WorkspaceTabs } from './WorkspaceTabs'
import { TabBar } from './TabBar'
import { RightDock, RightPanel } from './RightPanel'
import { ScheduledView } from './ScheduledView'
import { NotesView } from './NotesView'

export function ChatView(): JSX.Element {
  const view = useStore((s) => s.view)

  return (
    <div className="flex min-h-0 min-w-0 flex-col rounded-tl-xl border-l border-t border-border bg-background">
      <WorkspaceTabs />
      {view === 'scheduled' ? (
        <ScheduledView />
      ) : view === 'review' ? (
        <NotesView type="review" />
      ) : view === 'minutes' ? (
        <NotesView type="minutes" />
      ) : (
        <ChatArea />
      )}
    </div>
  )
}

function ChatArea(): JSX.Element {
  const messages = useStore((s) => s.messages)
  const streaming = useStore((s) => s.streaming)
  const hasApiKey = useStore((s) => s.hasApiKey)
  const scrollRef = useRef<HTMLDivElement>(null)
  const empty = messages.length === 0 && !streaming

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
  }, [messages, streaming])

  return (
    <>
      <TabBar />
      <div className="flex min-h-0 flex-1">
        <main className="flex min-w-0 flex-1 flex-col">
          {empty ? (
            <div className="flex flex-1 flex-col items-center justify-center px-6">
              <div className="mb-6 text-[26px] font-semibold tracking-tight">{greeting()}</div>
              {!hasApiKey ? (
                <p className="-mt-2 mb-4 text-[13px] text-muted-foreground">
                  点击左下角「设置」填入 API key，或在 ~/.env 设置 CLAUDE_API_KEY。
                </p>
              ) : null}
              <Composer />
            </div>
          ) : (
            <>
              <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto py-7">
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
              </div>
              <Composer />
            </>
          )}
        </main>
        <RightPanel />
        <RightDock />
      </div>
    </>
  )
}
