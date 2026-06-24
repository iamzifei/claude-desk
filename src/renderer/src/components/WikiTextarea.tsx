import { JSX, useEffect, useRef, useState, KeyboardEvent, TextareaHTMLAttributes } from 'react'
import { cn } from '../lib/utils'

const KIND_LABEL: Record<string, string> = {
  material: '素材',
  topic: '选题',
  note: '笔记',
  conversation: '对话'
}

type Props = {
  value: string
  onChange: (v: string) => void
  /** Classes for the positioning wrapper — needed when the textarea must flex/fill. */
  wrapperClassName?: string
} & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'value' | 'onChange'>

/** A textarea with `[[title]]` autocomplete — type `[[` to pick a link target. */
export function WikiTextarea({
  value,
  onChange,
  className,
  wrapperClassName,
  ...rest
}: Props): JSX.Element {
  const taRef = useRef<HTMLTextAreaElement>(null)
  const [titles, setTitles] = useState<{ title: string; kind: string }[]>([])
  const [query, setQuery] = useState<string | null>(null)
  const [sel, setSel] = useState(0)

  useEffect(() => {
    window.api.links.titles().then(setTitles)
  }, [])

  // The partial text after an open `[[` immediately before the caret, else null.
  const detect = (v: string, pos: number): string | null => {
    const m = v.slice(0, pos).match(/\[\[([^[\]\n]*)$/)
    return m ? m[1] : null
  }

  const matches =
    query != null
      ? titles.filter((t) => t.title.toLowerCase().includes(query.toLowerCase())).slice(0, 7)
      : []

  const insert = (title: string): void => {
    const ta = taRef.current
    if (!ta) return
    const pos = ta.selectionStart
    const m = value.slice(0, pos).match(/\[\[([^[\]\n]*)$/)
    if (!m) return
    const start = pos - m[0].length
    const next = value.slice(0, start) + `[[${title}]]` + value.slice(pos)
    onChange(next)
    setQuery(null)
    requestAnimationFrame(() => {
      ta.focus()
      const c = start + title.length + 4
      ta.setSelectionRange(c, c)
    })
  }

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>): void => {
    if (matches.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSel((s) => Math.min(s + 1, matches.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSel((s) => Math.max(s - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      insert(matches[sel].title)
    } else if (e.key === 'Escape') {
      setQuery(null)
    }
  }

  return (
    <div className={cn('relative', wrapperClassName)}>
      <textarea
        ref={taRef}
        value={value}
        onChange={(e) => {
          onChange(e.target.value)
          setQuery(detect(e.target.value, e.target.selectionStart))
          setSel(0)
        }}
        onKeyDown={onKeyDown}
        className={className}
        {...rest}
      />
      {matches.length > 0 ? (
        <div className="absolute left-0 top-full z-20 mt-1 max-h-52 w-72 overflow-y-auto rounded-lg border border-border bg-card p-1 shadow-lg">
          <div className="px-2 py-1 text-[10.5px] text-muted-foreground/60">插入双链 [[ ]]</div>
          {matches.map((t, i) => (
            <button
              key={t.kind + t.title + i}
              onMouseEnter={() => setSel(i)}
              onClick={() => insert(t.title)}
              className={cn(
                'flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-[13px]',
                i === sel ? 'bg-accent' : 'hover:bg-accent/60'
              )}
            >
              <span className="truncate">{t.title}</span>
              <span className="ml-2 shrink-0 text-[10px] text-muted-foreground/60">
                {KIND_LABEL[t.kind]}
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
