import { JSX } from 'react'
import { useStore } from '../store'

interface Props {
  onOpenSettings: () => void
}

export function Sidebar({ onOpenSettings }: Props): JSX.Element {
  const conversations = useStore((s) => s.conversations)
  const activeId = useStore((s) => s.activeId)
  const select = useStore((s) => s.selectConversation)
  const create = useStore((s) => s.newConversation)
  const remove = useStore((s) => s.deleteConversation)

  return (
    <aside className="sidebar">
      <button className="new-chat" onClick={() => create()}>
        + New chat
      </button>

      <div className="conv-list">
        {conversations.map((c) => (
          <div
            key={c.id}
            className={`conv-item ${c.id === activeId ? 'active' : ''}`}
            onClick={() => select(c.id)}
          >
            <span className="conv-title">{c.title}</span>
            <button
              className="conv-delete"
              title="Delete"
              onClick={(e) => {
                e.stopPropagation()
                remove(c.id)
              }}
            >
              ×
            </button>
          </div>
        ))}
      </div>

      <button className="settings-btn" onClick={onOpenSettings}>
        ⚙ Settings
      </button>
    </aside>
  )
}
