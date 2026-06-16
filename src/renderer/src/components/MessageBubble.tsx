import { JSX } from 'react'
import ReactMarkdown from 'react-markdown'
import { Bot, User } from 'lucide-react'

interface Props {
  role: 'user' | 'assistant'
  content: string
  thinking?: string
}

export function MessageBubble({ role, content, thinking }: Props): JSX.Element {
  const isUser = role === 'user'
  return (
    <div className="mx-auto flex max-w-3xl gap-3.5 px-6 py-3.5">
      <div
        className={
          isUser
            ? 'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-accent text-muted-foreground'
            : 'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground'
        }
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>
      <div className="min-w-0 flex-1">
        {thinking ? (
          <details className="mb-2.5 border-l-2 border-border pl-3">
            <summary className="cursor-pointer select-none text-[13px] text-muted-foreground">
              思考过程
            </summary>
            <div className="mt-1.5 whitespace-pre-wrap text-[13px] text-muted-foreground">
              {thinking}
            </div>
          </details>
        ) : null}
        {isUser ? (
          <div className="whitespace-pre-wrap break-words">{content}</div>
        ) : (
          <div className="markdown">
            <ReactMarkdown>{content}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  )
}
