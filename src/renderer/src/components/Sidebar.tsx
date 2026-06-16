import { JSX, useEffect, useState } from 'react'
import { useStore } from '../store'
import { groupByDate } from '../utils'
import type { Conversation } from '../types'

interface Props {
  onOpenSettings: () => void
}

export function Sidebar({ onOpenSettings }: Props): JSX.Element {
  const conversations = useStore((s) => s.conversations)
  const activeId = useStore((s) => s.activeId)
  const search = useStore((s) => s.search)
  const setSearch = useStore((s) => s.setSearch)
  const open = useStore((s) => s.openConversation)
  const create = useStore((s) => s.newConversation)

  const [results, setResults] = useState<Conversation[] | null>(null)

  // Debounced server-side search over titles + message bodies.
  useEffect(() => {
    if (!search.trim()) {
      setResults(null)
      return
    }
    const t = setTimeout(async () => {
      setResults(await window.api.conversations.search(search))
    }, 180)
    return () => clearTimeout(t)
  }, [search])

  const list = results ?? conversations
  const groups = groupByDate(list)

  return (
    <aside className="sidebar">
      <div className="sidebar-top">
        <button className="new-chat" onClick={() => create()}>
          + 新对话
        </button>
        <input
          className="search"
          placeholder="搜索对话…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="conv-list">
        {list.length === 0 ? (
          <div className="conv-empty">{search ? '没有匹配的对话' : '还没有对话'}</div>
        ) : (
          groups.map((g) => (
            <div key={g.label} className="conv-group">
              <div className="conv-group-label">{g.label}</div>
              {g.items.map((c) => (
                <ConvItem key={c.id} conv={c} active={c.id === activeId} onClick={() => open(c.id)} />
              ))}
            </div>
          ))
        )}
      </div>

      <div className="sidebar-rail">
        <button className="rail-btn" disabled title="技能市场（即将上线）">
          🧩 技能
        </button>
        <button className="rail-btn" onClick={onOpenSettings}>
          ⚙ 设置
        </button>
      </div>
    </aside>
  )
}

function ConvItem({
  conv,
  active,
  onClick
}: {
  conv: Conversation
  active: boolean
  onClick: () => void
}): JSX.Element {
  const [menu, setMenu] = useState(false)
  const remove = useStore((s) => s.deleteConversation)
  const archive = useStore((s) => s.archiveConversation)
  const rename = useStore((s) => s.renameConversation)

  const doRename = (): void => {
    setMenu(false)
    const title = window.prompt('重命名对话', conv.title)
    if (title && title.trim()) rename(conv.id, title.trim())
  }

  return (
    <div className={`conv-item ${active ? 'active' : ''}`} onClick={onClick}>
      <span className="conv-title">{conv.title}</span>
      <button
        className="conv-more"
        title="更多"
        onClick={(e) => {
          e.stopPropagation()
          setMenu((m) => !m)
        }}
      >
        ⋯
      </button>
      {menu ? (
        <div className="conv-menu" onClick={(e) => e.stopPropagation()}>
          <button onClick={doRename}>重命名</button>
          <button
            onClick={() => {
              setMenu(false)
              archive(conv.id)
            }}
          >
            归档
          </button>
          <button
            className="danger"
            onClick={() => {
              setMenu(false)
              if (window.confirm(`删除「${conv.title}」？`)) remove(conv.id)
            }}
          >
            删除
          </button>
        </div>
      ) : null}
    </div>
  )
}
