import { JSX, useEffect, useState } from 'react'
import { Link2 } from 'lucide-react'
import { useStore } from '../store'
import { cn } from '../lib/utils'
import type { Backlink, LinkKind } from '../types'

type Token = { text: string } | { link: string }

/** Split content into text + [[wikilink]] tokens (mirrors main/db/link-parse). */
function tokenize(text: string): Token[] {
  if (!text) return []
  const tokens: Token[] = []
  const re = /\[\[([^\]]+?)\]\]/g
  let last = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) tokens.push({ text: text.slice(last, m.index) })
    tokens.push({ link: m[1].split('|')[0].trim() })
    last = m.index + m[0].length
  }
  if (last < text.length) tokens.push({ text: text.slice(last) })
  return tokens
}

/** Render content with `[[title]]` rendered as clickable links that jump. */
export function WikiText({ content, className }: { content: string; className?: string }): JSX.Element {
  const jumpTo = useStore((s) => s.jumpTo)
  const open = async (title: string): Promise<void> => {
    const t = await window.api.links.resolve(title)
    if (t) jumpTo(t)
  }
  return (
    <span className={cn('whitespace-pre-wrap', className)}>
      {tokenize(content).map((tok, i) =>
        'link' in tok ? (
          <button
            key={i}
            onClick={(e) => {
              e.stopPropagation()
              open(tok.link)
            }}
            className="rounded bg-primary-soft px-1 text-primary transition-colors hover:bg-primary/15"
          >
            {tok.link}
          </button>
        ) : (
          <span key={i}>{tok.text}</span>
        )
      )}
    </span>
  )
}

const KIND_LABEL: Record<LinkKind, string> = {
  material: '素材',
  atom: '原子',
  note: '笔记',
  topic: '选题',
  conversation: '对话'
}

/** "被引用于" — entities that wikilink to this one. */
export function Backlinks({ kind, id }: { kind: LinkKind; id: string }): JSX.Element | null {
  const [links, setLinks] = useState<Backlink[]>([])
  const jumpTo = useStore((s) => s.jumpTo)
  useEffect(() => {
    window.api.links.backlinks(kind, id).then(setLinks)
  }, [kind, id])
  if (links.length === 0) return null
  return (
    <div className="mt-2 flex flex-wrap items-center gap-1.5 border-t border-border-soft pt-2 text-[12px] text-muted-foreground">
      <Link2 className="h-3.5 w-3.5" />
      <span>被引用于</span>
      {links.map((b) => (
        <button
          key={b.from_kind + b.from_id}
          onClick={() => jumpTo({ kind: b.from_kind, id: b.from_id })}
          className="rounded bg-accent px-1.5 py-0.5 text-foreground/80 transition-colors hover:bg-primary-soft hover:text-primary"
        >
          {b.title}
          <span className="ml-1 text-[10px] text-muted-foreground/60">{KIND_LABEL[b.from_kind]}</span>
        </button>
      ))}
    </div>
  )
}
