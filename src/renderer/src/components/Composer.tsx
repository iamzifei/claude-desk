import { JSX, useState, KeyboardEvent } from 'react'
import { useStore } from '../store'

export function Composer(): JSX.Element {
  const [text, setText] = useState('')
  const streaming = useStore((s) => s.streaming)
  const send = useStore((s) => s.send)
  const cancel = useStore((s) => s.cancel)
  const isStreaming = streaming !== null

  const submit = (): void => {
    const trimmed = text.trim()
    if (!trimmed || isStreaming) return
    send(trimmed)
    setText('')
  }

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>): void => {
    // Enter sends; Shift+Enter inserts a newline.
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submit()
    }
  }

  return (
    <div className="composer">
      <textarea
        className="composer-input"
        placeholder="Send a message…  (Enter to send, Shift+Enter for newline)"
        value={text}
        rows={1}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={onKeyDown}
      />
      {isStreaming ? (
        <button className="composer-btn stop" onClick={cancel}>
          Stop
        </button>
      ) : (
        <button className="composer-btn" onClick={submit} disabled={!text.trim()}>
          Send
        </button>
      )}
    </div>
  )
}
