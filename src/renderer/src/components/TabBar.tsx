import { JSX } from 'react'
import { useStore } from '../store'

/** Open conversations shown as tabs in the main area (like 牛马AI's ConversationTab). */
export function TabBar(): JSX.Element | null {
  const openTabs = useStore((s) => s.openTabs)
  const conversations = useStore((s) => s.conversations)
  const activeId = useStore((s) => s.activeId)
  const open = useStore((s) => s.openConversation)
  const close = useStore((s) => s.closeTab)

  if (openTabs.length === 0) return null

  const titleOf = (id: string): string =>
    conversations.find((c) => c.id === id)?.title ?? '新对话'

  return (
    <div className="tabbar">
      {openTabs.map((id) => (
        <div
          key={id}
          className={`tab ${id === activeId ? 'active' : ''}`}
          onClick={() => open(id)}
          title={titleOf(id)}
        >
          <span className="tab-title">{titleOf(id)}</span>
          <button
            className="tab-close"
            title="关闭"
            onClick={(e) => {
              e.stopPropagation()
              close(id)
            }}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  )
}
