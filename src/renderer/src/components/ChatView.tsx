import { JSX, useEffect, useRef } from 'react'
import { TriangleAlert, X, ChevronDown } from 'lucide-react'
import { useStore } from '../store'
import { greeting } from '../utils'
import type { MainView } from '../types'
import { MessageBubble } from './MessageBubble'
import { Composer } from './Composer'
import { ChatPane } from './ChatPane'
import { WorkspaceTabs } from './WorkspaceTabs'
import { TabBar } from './TabBar'
import { FilesView } from './FilesView'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator
} from './ui/dropdown-menu'
import { ScheduledView } from './ScheduledView'
import { NotesView } from './NotesView'
import { DailyView } from './DailyView'
import { BrowserView } from './BrowserView'
import { SkillsView } from './SkillsView'
import { CodingView } from './CodingView'
import { MaterialsView } from './MaterialsView'
import { AtomsView } from './AtomsView'
import { TopicsView } from './TopicsView'
import { TagsView } from './TagsView'
import { GraphView } from './GraphView'
import { PublishView } from './PublishView'
import { OnboardingCard } from './OnboardingCard'
import { RewriteView } from './RewriteView'

/** Render a view by id. Chat is the fallback (uses the global session state). */
function renderView(view: MainView): JSX.Element {
  switch (view) {
    case 'scheduled':
      return <ScheduledView />
    case 'review':
      return <NotesView type="review" />
    case 'minutes':
      return <NotesView type="minutes" />
    case 'daily':
      return <DailyView />
    case 'browser':
      return <BrowserView />
    case 'skills':
      return <SkillsView />
    case 'coding':
      return <CodingView />
    case 'materials':
      return <MaterialsView />
    case 'atoms':
      return <AtomsView />
    case 'topics':
      return <TopicsView />
    case 'tags':
      return <TagsView />
    case 'graph':
      return <GraphView />
    case 'publish':
      return <PublishView />
    case 'rewrite':
      return <RewriteView />
    case 'files':
      return <FilesView />
    default:
      return <ChatArea />
  }
}

// Reference views the split pane can show (chat stays on the primary side).
const SPLIT_VIEWS: { v: MainView; label: string }[] = [
  { v: 'materials', label: '素材库' },
  { v: 'atoms', label: '知识原子' },
  { v: 'tags', label: '标签' },
  { v: 'graph', label: '知识图谱' },
  { v: 'topics', label: '选题库' },
  { v: 'publish', label: '发布数据' },
  { v: 'rewrite', label: '改写工坊' },
  { v: 'skills', label: '技能' },
  { v: 'daily', label: '每日笔记' },
  { v: 'review', label: '每日回顾' },
  { v: 'minutes', label: '会议纪要' },
  { v: 'scheduled', label: '定时任务' },
  { v: 'browser', label: '浏览器' },
  { v: 'coding', label: '编程' },
  { v: 'files', label: '项目文件' }
]

function SplitPanel(): JSX.Element {
  const split = useStore((s) => s.split)!
  const setSplit = useStore((s) => s.setSplit)
  const closeSplit = useStore((s) => s.closeSplit)
  const openTabs = useStore((s) => s.openTabs)
  const conversations = useStore((s) => s.conversations)
  const titleOf = (id: string): string => conversations.find((c) => c.id === id)?.title ?? '新对话'

  const currentLabel =
    split.kind === 'chat'
      ? titleOf(split.id)
      : (SPLIT_VIEWS.find((o) => o.v === split.view)?.label ?? '参考')

  return (
    <section className="flex w-[44%] min-w-[340px] shrink-0 flex-col border-l border-border">
      <div className="flex h-9 shrink-0 items-center justify-between border-b border-border-soft px-2.5">
        <DropdownMenu>
          <DropdownMenuTrigger className="flex h-7 max-w-[240px] items-center gap-1 rounded-md px-2 text-[12.5px] text-foreground outline-none transition-colors hover:bg-accent focus-visible:bg-accent">
            <span className="truncate">{currentLabel}</span>
            <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="max-h-[60vh] overflow-y-auto">
            {openTabs.length > 0 ? (
              <>
                <div className="px-2.5 py-1 text-[11px] font-medium text-muted-foreground/60">对话</div>
                {openTabs.map((id) => (
                  <DropdownMenuItem key={id} onSelect={() => setSplit({ kind: 'chat', id })}>
                    <span className="truncate">{titleOf(id)}</span>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
              </>
            ) : null}
            <div className="px-2.5 py-1 text-[11px] font-medium text-muted-foreground/60">参考</div>
            {SPLIT_VIEWS.map((o) => (
              <DropdownMenuItem key={o.v} onSelect={() => setSplit({ kind: 'view', view: o.v })}>
                {o.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <button
          onClick={() => closeSplit()}
          title="关闭分屏"
          className="rounded p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      {split.kind === 'chat' ? (
        <ChatPane conversationId={split.id} />
      ) : (
        <div className="flex min-h-0 flex-1 flex-col">{renderView(split.view)}</div>
      )}
    </section>
  )
}

export function ChatView(): JSX.Element {
  const view = useStore((s) => s.view)
  const split = useStore((s) => s.split)

  return (
    <div className="flex min-h-0 min-w-0 flex-col rounded-tl-xl border-l border-t border-border bg-background">
      <WorkspaceTabs />
      <div className="flex min-h-0 flex-1">
        <div className="flex min-w-0 flex-1 flex-col">{renderView(view)}</div>
        {split ? <SplitPanel /> : null}
      </div>
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
              <OnboardingCard />
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
      </div>
    </>
  )
}
