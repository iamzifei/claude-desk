import { JSX, useEffect, useState } from 'react'
import { Atom as AtomIcon, Trash2, Pencil, Tag, Sparkles, Loader2 } from 'lucide-react'
import { cn } from '../lib/utils'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Header, Empty } from './ScheduledView'
import { WikiText, Backlinks } from './WikiText'
import { useFocusHighlight } from '../useFocusHighlight'
import type { Atom, AtomType } from '../types'

const ATOM_TYPES: AtomType[] = ['观点', '金句', '数据', '案例', '钩子', '方法']

export function AtomsView(): JSX.Element {
  const [atoms, setAtoms] = useState<Atom[]>([])
  const [search, setSearch] = useState('')
  const [type, setType] = useState('all')
  const [raw, setRaw] = useState('')
  const [extracting, setExtracting] = useState(false)

  const refresh = async (): Promise<void> => {
    setAtoms(search.trim() ? await window.api.atoms.search(search) : await window.api.atoms.list())
  }
  useEffect(() => {
    const t = setTimeout(refresh, 150)
    return () => clearTimeout(t)
  }, [search])

  const extract = async (): Promise<void> => {
    if (!raw.trim() || extracting) return
    setExtracting(true)
    try {
      await window.api.atoms.extractFromText(raw.trim(), 'manual')
      setRaw('')
      await refresh()
    } finally {
      setExtracting(false)
    }
  }

  const present = Array.from(new Set(atoms.map((a) => a.type)))
  const visible = atoms.filter((a) => (type === 'all' ? true : a.type === type))
  const inContext = atoms.filter((a) => a.in_context).length

  return (
    <div className="mx-auto flex h-full w-full max-w-2xl flex-col px-8 py-7">
      <Header
        icon={AtomIcon}
        title="知识原子"
        desc={`把素材拆成可复用的最小单元(观点/金句/数据/案例/钩子/方法)。开启「入上下文」的原子会注入创作。${inContext ? `当前 ${inContext} 条已入上下文。` : ''}`}
      />

      {/* 拆原子:粘贴任意文本 → 自动拆成原子入库 */}
      <div className="mt-3 rounded-xl border border-border bg-card p-3">
        <textarea
          placeholder="粘贴一段素材/灵感/对话,点「拆成原子」自动切分入库…"
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          rows={3}
          className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring"
        />
        <div className="mt-2 flex justify-end">
          <Button size="sm" onClick={extract} disabled={!raw.trim() || extracting}>
            {extracting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {extracting ? '拆分中…' : '拆成原子'}
          </Button>
        </div>
      </div>

      <Input
        placeholder="搜索原子(内容 / 标签)…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mt-3"
      />

      <div className="mt-2.5 flex flex-wrap gap-1.5">
        <TypeChip label="全部" active={type === 'all'} onClick={() => setType('all')} />
        {ATOM_TYPES.filter((t) => present.includes(t)).map((t) => (
          <TypeChip key={t} label={t} active={type === t} onClick={() => setType(t)} />
        ))}
      </div>

      <div className="mt-4 min-h-0 flex-1 space-y-2 overflow-y-auto">
        {visible.length === 0 ? (
          <Empty>{search ? '没有匹配的原子' : '还没有原子。粘贴素材上面「拆成原子」,或在素材库里拆。'}</Empty>
        ) : (
          visible.map((a) => <AtomRow key={a.id} a={a} onChange={refresh} />)
        )}
      </div>
    </div>
  )
}

function TypeChip({
  label,
  active,
  onClick
}: {
  label: string
  active: boolean
  onClick: () => void
}): JSX.Element {
  return (
    <button
      onClick={onClick}
      className={cn(
        'rounded-full border px-2.5 py-1 text-[12px] transition-colors',
        active
          ? 'border-primary bg-primary-soft text-primary'
          : 'border-border text-muted-foreground hover:bg-accent hover:text-foreground'
      )}
    >
      {label}
    </button>
  )
}

function AtomRow({ a, onChange }: { a: Atom; onChange: () => void }): JSX.Element {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(a.content)
  const { ref, focused } = useFocusHighlight(a.id)

  const save = async (): Promise<void> => {
    await window.api.atoms.update(a.id, { content: draft, type: a.type, tags: a.tags ?? undefined })
    setEditing(false)
    onChange()
  }

  return (
    <div
      ref={ref}
      className={cn(
        'rounded-xl border bg-card px-4 py-3 transition-shadow',
        focused ? 'border-primary ring-2 ring-primary/30' : a.in_context ? 'border-primary/40' : 'border-border'
      )}
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 shrink-0 rounded bg-accent px-1.5 py-0.5 text-[10.5px] text-muted-foreground">
          {a.type}
        </span>
        <div className="min-w-0 flex-1">
          {editing ? (
            <textarea
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={save}
              rows={3}
              className="w-full resize-none rounded-md border border-ring bg-background px-2.5 py-1.5 text-[13.5px] outline-none"
            />
          ) : (
            <div className="text-[13.5px] leading-relaxed">
              <WikiText content={a.content} />
            </div>
          )}
          {a.tags ? (
            <div className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground/70">
              <Tag className="h-3 w-3" /> {a.tags}
            </div>
          ) : null}
          <Backlinks kind="atom" id={a.id} />
        </div>

        <label className="flex shrink-0 cursor-pointer items-center" title={a.in_context ? '已入上下文' : '加入创作上下文'}>
          <input
            type="checkbox"
            className="peer sr-only"
            checked={!!a.in_context}
            onChange={(e) => window.api.atoms.toggleContext(a.id, e.target.checked).then(onChange)}
          />
          <span className="h-5 w-9 rounded-full bg-muted p-0.5 transition-colors peer-checked:bg-primary">
            <span
              className={cn('block h-4 w-4 rounded-full bg-white transition-transform', a.in_context && 'translate-x-4')}
            />
          </span>
        </label>
        <Button size="icon-sm" variant="ghost" title="编辑" onClick={() => setEditing((v) => !v)}>
          <Pencil className="h-4 w-4" />
        </Button>
        <Button size="icon-sm" variant="ghost" title="删除" onClick={() => window.api.atoms.delete(a.id).then(onChange)}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
