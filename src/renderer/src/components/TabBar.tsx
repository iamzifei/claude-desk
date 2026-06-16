import { JSX } from 'react'
import { X } from 'lucide-react'
import { useStore } from '../store'
import { cn } from '../lib/utils'

/** Open conversations as tabs in the main area (牛马AI's ConversationTab). */
export function TabBar(): JSX.Element | null {
  const openTabs = useStore((s) => s.openTabs)
  const conversations = useStore((s) => s.conversations)
  const activeId = useStore((s) => s.activeId)
  const open = useStore((s) => s.openConversation)
  const close = useStore((s) => s.closeTab)

  if (openTabs.length === 0) return null
  const titleOf = (id: string): string => conversations.find((c) => c.id === id)?.title ?? '新对话'

  return (
    <div className="flex h-9 shrink-0 items-end gap-0.5 overflow-x-auto border-b border-border-soft px-3 pt-1">
      {openTabs.map((id) => (
        <div
          key={id}
          onClick={() => open(id)}
          title={titleOf(id)}
          className={cn(
            'group flex max-w-[190px] cursor-pointer items-center gap-1.5 rounded-t-lg border border-b-0 px-3 py-1.5 text-[13px] -mb-px',
            id === activeId
              ? 'border-border-soft bg-background text-foreground'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
        >
          <span className="truncate">{titleOf(id)}</span>
          <button
            onClick={(e) => {
              e.stopPropagation()
              close(id)
            }}
            className="rounded p-0.5 text-muted-foreground opacity-0 transition-opacity hover:bg-accent hover:text-foreground group-hover:opacity-100"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ))}
    </div>
  )
}
