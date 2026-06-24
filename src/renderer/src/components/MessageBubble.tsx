import { JSX, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Bot, User, Save, Atom, Check, Loader2, Image as ImageIcon } from 'lucide-react'
import { useStore } from '../store'

interface Props {
  role: 'user' | 'assistant'
  content: string
  thinking?: string
}

export function MessageBubble({ role, content, thinking }: Props): JSX.Element {
  const isUser = role === 'user'
  return (
    <div className="group/msg mx-auto flex max-w-3xl gap-3.5 px-6 py-3.5">
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
          <>
            <div className="markdown">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
            </div>
            {content.trim() ? <AssistantActions content={content} /> : null}
          </>
        )}
      </div>
    </div>
  )
}

/** Harvest an AI reply back into the asset library (素材 / 原子) — closes the loop. */
function AssistantActions({ content }: { content: string }): JSX.Element {
  const openCard = useStore((s) => s.openCard)
  const [saved, setSaved] = useState(false)
  const [atoms, setAtoms] = useState<number | null>(null)
  const [splitting, setSplitting] = useState(false)

  const saveMaterial = async (): Promise<void> => {
    if (saved) return
    await window.api.materials.create({
      title: content.replace(/\n/g, ' ').slice(0, 24) || '对话沉淀',
      content,
      kind: 'text'
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 1800)
  }
  const splitAtoms = async (): Promise<void> => {
    if (splitting) return
    setSplitting(true)
    try {
      const a = await window.api.atoms.extractFromText(content, 'conversation')
      setAtoms(a.length)
      setTimeout(() => setAtoms(null), 2500)
    } finally {
      setSplitting(false)
    }
  }

  return (
    <div className="mt-1.5 flex items-center gap-1 opacity-0 transition-opacity group-hover/msg:opacity-100">
      <button
        onClick={saveMaterial}
        title="存为素材"
        className="flex items-center gap-1 rounded-md px-1.5 py-1 text-[11.5px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      >
        {saved ? <Check className="h-3.5 w-3.5 text-primary" /> : <Save className="h-3.5 w-3.5" />}
        存为素材
      </button>
      <button
        onClick={splitAtoms}
        title="拆为知识原子"
        className="flex items-center gap-1 rounded-md px-1.5 py-1 text-[11.5px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      >
        {splitting ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : atoms !== null ? (
          <Check className="h-3.5 w-3.5 text-primary" />
        ) : (
          <Atom className="h-3.5 w-3.5" />
        )}
        {atoms !== null ? `已拆 ${atoms} 个原子` : '拆为原子'}
      </button>
      <button
        onClick={() => openCard(content)}
        title="导出为卡片图"
        className="flex items-center gap-1 rounded-md px-1.5 py-1 text-[11.5px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      >
        <ImageIcon className="h-3.5 w-3.5" />
        导出卡片
      </button>
    </div>
  )
}
