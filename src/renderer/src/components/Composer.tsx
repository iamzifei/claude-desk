import { JSX, useState, KeyboardEvent } from 'react'
import { useStore } from '../store'

export function Composer(): JSX.Element {
  const [text, setText] = useState('')
  const streaming = useStore((s) => s.streaming)
  const send = useStore((s) => s.send)
  const cancel = useStore((s) => s.cancel)
  const providers = useStore((s) => s.providers)
  const globalModel = useStore((s) => s.globalModel)
  const conversations = useStore((s) => s.conversations)
  const activeId = useStore((s) => s.activeId)
  const setActiveModel = useStore((s) => s.setActiveModel)
  const isStreaming = streaming !== null

  // Model shown in the composer: per-conversation override, else global default.
  const activeConv = conversations.find((c) => c.id === activeId)
  const currentModel = activeConv?.model || globalModel
  const allModels = Array.from(new Set(providers.flatMap((p) => p.models)))

  const submit = (): void => {
    const trimmed = text.trim()
    if (!trimmed || isStreaming) return
    send(trimmed)
    setText('')
  }

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>): void => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submit()
    }
  }

  return (
    <div className="composer-wrap">
      <div className="composer">
        <textarea
          className="composer-input"
          placeholder="发送消息…  (Enter 发送，Shift+Enter 换行)"
          value={text}
          rows={1}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
        />
        {isStreaming ? (
          <button className="composer-btn stop" onClick={cancel}>
            停止
          </button>
        ) : (
          <button className="composer-btn" onClick={submit} disabled={!text.trim()}>
            发送
          </button>
        )}
      </div>

      <div className="composer-tools">
        <select
          className="model-select"
          value={currentModel}
          onChange={(e) => setActiveModel(e.target.value)}
          title="模型"
        >
          {allModels.includes(currentModel) ? null : (
            <option value={currentModel}>{currentModel}</option>
          )}
          {allModels.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
        <button className="tool-btn" disabled title="工具（即将上线）">
          🛠 工具
        </button>
        <button className="tool-btn" disabled title="语音输入（即将上线）">
          🎙 语音输入
        </button>
      </div>
    </div>
  )
}
