import { JSX } from 'react'
import ReactMarkdown from 'react-markdown'

interface Props {
  role: 'user' | 'assistant'
  content: string
  thinking?: string
}

export function MessageBubble({ role, content, thinking }: Props): JSX.Element {
  return (
    <div className={`bubble-row ${role}`}>
      <div className="bubble-avatar">{role === 'user' ? 'You' : 'AI'}</div>
      <div className="bubble">
        {thinking ? (
          <details className="thinking">
            <summary>Thinking…</summary>
            <div className="thinking-body">{thinking}</div>
          </details>
        ) : null}
        {role === 'assistant' ? (
          <div className="markdown">
            <ReactMarkdown>{content}</ReactMarkdown>
          </div>
        ) : (
          <div className="user-text">{content}</div>
        )}
      </div>
    </div>
  )
}
