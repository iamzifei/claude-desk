import { JSX } from 'react'
import { useStore } from '../store'

/**
 * Dockable right panel — in 牛马AI this hosts 卡片预览 (canvas/card editor with
 * PNG/PDF export), 文件 (workspace files), and 浏览器 (embedded browser + agent).
 * Here it's a structural stub so the layout matches; each surface is Phase B/C.
 */
export function RightPanel(): JSX.Element | null {
  const panel = useStore((s) => s.rightPanel)
  const setPanel = useStore((s) => s.setRightPanel)
  if (!panel) return null

  const titles = { card: '卡片预览', files: '文件', browser: '浏览器' } as const

  return (
    <section className="right-panel">
      <div className="right-panel-head">
        <span>{titles[panel]}</span>
        <button className="right-panel-close" onClick={() => setPanel(panel)} title="关闭">
          ×
        </button>
      </div>
      <div className="right-panel-body">
        <div className="panel-stub">
          <div className="panel-stub-icon">
            {panel === 'card' ? '🖼' : panel === 'files' ? '📁' : '🌐'}
          </div>
          <p>「{titles[panel]}」面板</p>
          <p className="panel-stub-sub">布局已对齐牛马AI；此面板功能在后续阶段接入。</p>
        </div>
      </div>
    </section>
  )
}

/** Vertical icon strip to toggle the right-panel surfaces. */
export function RightDock(): JSX.Element {
  const panel = useStore((s) => s.rightPanel)
  const setPanel = useStore((s) => s.setRightPanel)
  const items: { key: 'card' | 'files' | 'browser'; icon: string; label: string }[] = [
    { key: 'card', icon: '🖼', label: '卡片预览' },
    { key: 'files', icon: '📁', label: '文件' },
    { key: 'browser', icon: '🌐', label: '浏览器' }
  ]
  return (
    <div className="right-dock">
      {items.map((it) => (
        <button
          key={it.key}
          className={`dock-btn ${panel === it.key ? 'active' : ''}`}
          title={it.label}
          onClick={() => setPanel(it.key)}
        >
          {it.icon}
        </button>
      ))}
    </div>
  )
}
