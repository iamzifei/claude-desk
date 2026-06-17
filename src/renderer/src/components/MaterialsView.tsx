import { JSX, useEffect, useState } from 'react'
import { Library, Plus, Trash2, Link2, Tag, Pencil } from 'lucide-react'
import { cn } from '../lib/utils'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Header, Empty } from './ScheduledView'
import type { Material } from '../types'

export function MaterialsView(): JSX.Element {
  const [materials, setMaterials] = useState<Material[]>([])
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<Material | 'new' | null>(null)

  const refresh = async (): Promise<void> => {
    setMaterials(search.trim() ? await window.api.materials.search(search) : await window.api.materials.list())
  }
  useEffect(() => {
    const t = setTimeout(refresh, 150)
    return () => clearTimeout(t)
  }, [search])

  const inContext = materials.filter((m) => m.in_context).length

  return (
    <div className="mx-auto flex h-full w-full max-w-2xl flex-col px-8 py-7">
      <Header
        icon={Library}
        title="素材库"
        desc={`沉淀你的灵感、金句、数据、参考。开启「入上下文」的素材会注入创作，让 AI 用你的料。${inContext ? `当前 ${inContext} 条已入上下文。` : ''}`}
        action={
          <Button size="sm" onClick={() => setEditing('new')}>
            <Plus className="h-4 w-4" /> 添加素材
          </Button>
        }
      />

      <Input
        placeholder="搜索素材（标题 / 内容 / 标签）…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mt-3"
      />

      {editing ? (
        <MaterialForm
          material={editing === 'new' ? null : editing}
          onDone={() => {
            setEditing(null)
            refresh()
          }}
        />
      ) : null}

      <div className="mt-4 min-h-0 flex-1 space-y-2 overflow-y-auto">
        {materials.length === 0 ? (
          <Empty>{search ? '没有匹配的素材' : '还没有素材。把灵感、金句、参考链接存进来。'}</Empty>
        ) : (
          materials.map((m) => (
            <MaterialRow key={m.id} m={m} onEdit={() => setEditing(m)} onChange={refresh} />
          ))
        )}
      </div>
    </div>
  )
}

function MaterialForm({ material, onDone }: { material: Material | null; onDone: () => void }): JSX.Element {
  const [title, setTitle] = useState(material?.title ?? '')
  const [content, setContent] = useState(material?.content ?? '')
  const [url, setUrl] = useState(material?.url ?? '')
  const [tags, setTags] = useState(material?.tags ?? '')

  const submit = async (): Promise<void> => {
    if (!title.trim() || !content.trim()) return
    const payload = { title: title.trim(), content: content.trim(), url: url.trim(), tags: tags.trim() }
    if (material) await window.api.materials.update(material.id, payload)
    else await window.api.materials.create(payload)
    onDone()
  }

  return (
    <div className="mt-3 space-y-2.5 rounded-xl border border-border bg-card p-4">
      <Input placeholder="标题，如「品牌 slogan」「读者画像」" value={title} onChange={(e) => setTitle(e.target.value)} />
      <textarea
        placeholder="素材内容：金句、要点、数据、风格说明…"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={4}
        className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring"
      />
      <div className="flex gap-2">
        <Input placeholder="来源链接（可选）" value={url} onChange={(e) => setUrl(e.target.value)} />
        <Input placeholder="标签，逗号分隔（可选）" value={tags} onChange={(e) => setTags(e.target.value)} />
      </div>
      <div className="flex justify-end gap-2">
        <Button size="sm" variant="secondary" onClick={onDone}>
          取消
        </Button>
        <Button size="sm" onClick={submit} disabled={!title.trim() || !content.trim()}>
          {material ? '保存' : '添加'}
        </Button>
      </div>
    </div>
  )
}

function MaterialRow({ m, onEdit, onChange }: { m: Material; onEdit: () => void; onChange: () => void }): JSX.Element {
  const [open, setOpen] = useState(false)
  return (
    <div className={cn('rounded-xl border bg-card px-4 py-3', m.in_context ? 'border-primary/40' : 'border-border')}>
      <div className="flex items-center gap-3">
        <button className="min-w-0 flex-1 text-left" onClick={() => setOpen((v) => !v)}>
          <div className="flex items-center gap-2">
            <span className="truncate font-medium">{m.title}</span>
            {m.url ? <Link2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" /> : null}
          </div>
          <div className="mt-0.5 flex items-center gap-2 text-[12.5px] text-muted-foreground">
            <span className="truncate">{m.content.replace(/\n/g, ' ').slice(0, 60)}</span>
          </div>
          {m.tags ? (
            <div className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground/70">
              <Tag className="h-3 w-3" /> {m.tags}
            </div>
          ) : null}
        </button>

        <label
          className="flex shrink-0 cursor-pointer items-center"
          title={m.in_context ? '已入上下文' : '加入创作上下文'}
        >
          <input
            type="checkbox"
            className="peer sr-only"
            checked={!!m.in_context}
            onChange={(e) => window.api.materials.toggleContext(m.id, e.target.checked).then(onChange)}
          />
          <span className="h-5 w-9 rounded-full bg-muted p-0.5 transition-colors peer-checked:bg-primary">
            <span
              className={cn(
                'block h-4 w-4 rounded-full bg-white transition-transform',
                m.in_context && 'translate-x-4'
              )}
            />
          </span>
        </label>
        <Button size="icon-sm" variant="ghost" title="编辑" onClick={onEdit}>
          <Pencil className="h-4 w-4" />
        </Button>
        <Button
          size="icon-sm"
          variant="ghost"
          title="删除"
          onClick={() => window.api.materials.delete(m.id).then(onChange)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
      {open ? (
        <div className="mt-2 whitespace-pre-wrap rounded-lg bg-muted/60 p-3 text-[12.5px] text-muted-foreground">
          {m.content}
          {m.url ? (
            <div className="mt-1.5 truncate text-primary">{m.url}</div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
