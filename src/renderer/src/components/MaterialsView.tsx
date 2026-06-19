import { JSX, useEffect, useState } from 'react'
import {
  Library,
  Plus,
  Trash2,
  Link2,
  Tag,
  Pencil,
  ImagePlus,
  Download,
  Loader2,
  Atom,
  CircleCheck
} from 'lucide-react'
import { cn } from '../lib/utils'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Header, Empty } from './ScheduledView'
import { WikiText, Backlinks } from './WikiText'
import { WikiTextarea } from './WikiTextarea'
import { useFocusHighlight } from '../useFocusHighlight'
import { PLATFORM_OPTIONS, labelForPlatform } from '../platforms'
import type { Material, MaterialKind } from '../types'

const NONE = '__none__' // platform-filter key for un-tagged materials

export function MaterialsView(): JSX.Element {
  const [materials, setMaterials] = useState<Material[]>([])
  const [search, setSearch] = useState('')
  const [platform, setPlatform] = useState('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'inbox' | '已整理'>('all')
  const [editing, setEditing] = useState<Material | 'new' | null>(null)

  const refresh = async (): Promise<void> => {
    setMaterials(
      search.trim() ? await window.api.materials.search(search) : await window.api.materials.list()
    )
  }
  useEffect(() => {
    const t = setTimeout(refresh, 150)
    return () => clearTimeout(t)
  }, [search])

  // Platform groups present in the data drive the filter chips.
  const present = Array.from(new Set(materials.map((m) => m.platform).filter(Boolean))) as string[]
  const hasNone = materials.some((m) => !m.platform)
  const inboxCount = materials.filter((m) => m.status === 'inbox').length
  const visible = materials.filter(
    (m) =>
      (statusFilter === 'all' ? true : m.status === statusFilter) &&
      (platform === 'all' ? true : platform === NONE ? !m.platform : m.platform === platform)
  )
  const inContext = materials.filter((m) => m.in_context).length

  return (
    <div className="mx-auto flex h-full w-full max-w-2xl flex-col px-8 py-7">
      <Header
        icon={Library}
        title="素材库"
        desc={`沉淀你的灵感、金句、图片、参考链接。开启「入上下文」的素材会注入创作，让 AI 用你的料。${inContext ? `当前 ${inContext} 条已入上下文。` : ''}`}
        action={
          <Button size="sm" onClick={() => setEditing('new')}>
            <Plus className="h-4 w-4" /> 添加素材
          </Button>
        }
      />

      <div className="mt-3 flex flex-wrap gap-1.5">
        <FilterChip label="全部" active={statusFilter === 'all'} onClick={() => setStatusFilter('all')} />
        <FilterChip
          label={inboxCount ? `收件箱 ${inboxCount}` : '收件箱'}
          active={statusFilter === 'inbox'}
          onClick={() => setStatusFilter('inbox')}
        />
        <FilterChip
          label="已整理"
          active={statusFilter === '已整理'}
          onClick={() => setStatusFilter('已整理')}
        />
      </div>

      <Input
        placeholder="搜索素材（标题 / 内容 / 标签）…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mt-2.5"
      />

      {present.length || hasNone ? (
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          <FilterChip label="全部" active={platform === 'all'} onClick={() => setPlatform('all')} />
          {present.map((p) => (
            <FilterChip
              key={p}
              label={labelForPlatform(p)}
              active={platform === p}
              onClick={() => setPlatform(p)}
            />
          ))}
          {hasNone ? (
            <FilterChip
              label="未分类"
              active={platform === NONE}
              onClick={() => setPlatform(NONE)}
            />
          ) : null}
        </div>
      ) : null}

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
        {visible.length === 0 ? (
          <Empty>{search ? '没有匹配的素材' : '还没有素材。把灵感、金句、图片、参考链接存进来。'}</Empty>
        ) : (
          visible.map((m) => (
            <MaterialRow key={m.id} m={m} onEdit={() => setEditing(m)} onChange={refresh} />
          ))
        )}
      </div>
    </div>
  )
}

function FilterChip({
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

function MaterialForm({
  material,
  onDone
}: {
  material: Material | null
  onDone: () => void
}): JSX.Element {
  const [title, setTitle] = useState(material?.title ?? '')
  const [content, setContent] = useState(material?.content ?? '')
  const [url, setUrl] = useState(material?.url ?? '')
  const [tags, setTags] = useState(material?.tags ?? '')
  const [platform, setPlatform] = useState(material?.platform ?? '')
  const [kind, setKind] = useState<MaterialKind>(material?.kind ?? 'text')
  const [imagePath, setImagePath] = useState<string | null>(material?.image_path ?? null)
  const [fetching, setFetching] = useState(false)
  const [err, setErr] = useState('')
  const [allTags, setAllTags] = useState<string[]>([])
  useEffect(() => {
    window.api.tags.groups().then((gs) => setAllTags(gs.flatMap((g) => g.tags.map((t) => t.tag))))
  }, [])
  const current = tags.split(/[,，]/).map((t) => t.trim()).filter(Boolean)
  const addTag = (t: string): void => setTags(current.includes(t) ? tags : [...current, t].join(', '))

  // Pull a URL down to a pre-filled title + content.
  const fetchUrl = async (): Promise<void> => {
    if (!/^https?:\/\//i.test(url.trim())) {
      setErr('请输入有效的 http(s) 链接')
      return
    }
    setErr('')
    setFetching(true)
    try {
      const r = await window.api.materials.fetchUrl(url.trim())
      if (!title.trim()) setTitle(r.title)
      setContent(r.content)
      setKind('link')
    } catch (e) {
      setErr(e instanceof Error ? e.message : '抓取失败')
    } finally {
      setFetching(false)
    }
  }

  const pickImage = async (): Promise<void> => {
    const path = await window.api.materials.importImage()
    if (path) {
      setImagePath(path)
      setKind('image')
      if (!title.trim()) setTitle('图片素材')
    }
  }

  const submit = async (): Promise<void> => {
    if (!title.trim()) return
    const payload = {
      title: title.trim(),
      content: content.trim(),
      url: url.trim(),
      tags: tags.trim(),
      platform: platform.trim() || null,
      kind,
      image_path: imagePath
    }
    if (material) await window.api.materials.update(material.id, payload)
    else await window.api.materials.create(payload)
    onDone()
  }

  // Image materials may have an empty body (the picture is the content).
  const canSave = title.trim() && (kind === 'image' ? !!imagePath : !!content.trim())

  return (
    <div className="mt-3 space-y-2.5 rounded-xl border border-border bg-card p-4">
      {/* fetch-from-link */}
      <div className="flex gap-2">
        <Input
          placeholder="粘贴链接，点「抓取」自动填充内容…"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && fetchUrl()}
        />
        <Button size="sm" variant="secondary" onClick={fetchUrl} disabled={fetching || !url.trim()}>
          {fetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          抓取
        </Button>
      </div>
      {err ? <div className="text-[12px] text-destructive">{err}</div> : null}

      <Input
        placeholder="标题，如「品牌 slogan」「读者画像」"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />

      {imagePath ? <ImageThumb path={imagePath} large /> : null}

      <WikiTextarea
        placeholder={kind === 'image' ? '图片说明 / 用途（可选）…' : '素材内容：金句、要点、数据…（输入 [[ 关联其它素材）'}
        value={content}
        onChange={setContent}
        rows={4}
        className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring"
      />
      <div className="flex gap-2">
        <select
          value={platform}
          onChange={(e) => setPlatform(e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-2 text-sm outline-none focus-visible:border-ring"
        >
          <option value="">不分平台</option>
          {PLATFORM_OPTIONS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
        <Input
          placeholder="标签，逗号分隔（可选）"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
        />
      </div>
      <p className="-mt-1 text-[11.5px] text-muted-foreground">
        标上 <span className="text-primary">人设</span> / 风格 / 口吻 的素材，会被「去 AI 味」当作你的腔调来改写。
      </p>
      {allTags.filter((t) => !current.includes(t)).length ? (
        <div className="flex flex-wrap gap-1">
          {allTags
            .filter((t) => !current.includes(t))
            .slice(0, 10)
            .map((t) => (
              <button
                key={t}
                onClick={() => addTag(t)}
                className="rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground transition-colors hover:border-primary hover:bg-primary-soft hover:text-primary"
              >
                + {t}
              </button>
            ))}
        </div>
      ) : null}
      <div className="flex items-center justify-between gap-2">
        <Button size="sm" variant="ghost" onClick={pickImage}>
          <ImagePlus className="h-4 w-4" /> {imagePath ? '更换图片' : '添加图片'}
        </Button>
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={onDone}>
            取消
          </Button>
          <Button size="sm" onClick={submit} disabled={!canSave}>
            {material ? '保存' : '添加'}
          </Button>
        </div>
      </div>
    </div>
  )
}

/** Loads a stored image path into a data URL for display. */
function ImageThumb({ path, large }: { path: string; large?: boolean }): JSX.Element | null {
  const [src, setSrc] = useState<string | null>(null)
  useEffect(() => {
    let alive = true
    window.api.materials.imageData(path).then((d) => alive && setSrc(d))
    return () => {
      alive = false
    }
  }, [path])
  if (!src) return null
  return (
    <img
      src={src}
      alt=""
      className={cn(
        'rounded-lg border border-border object-cover',
        large ? 'max-h-48 w-full' : 'h-12 w-12 shrink-0'
      )}
    />
  )
}

function MaterialRow({
  m,
  onEdit,
  onChange
}: {
  m: Material
  onEdit: () => void
  onChange: () => void
}): JSX.Element {
  const [open, setOpen] = useState(false)
  const [extracting, setExtracting] = useState(false)
  const [extracted, setExtracted] = useState<number | null>(null)
  const { ref, focused } = useFocusHighlight(m.id)
  useEffect(() => {
    if (focused) setOpen(true)
  }, [focused])

  const splitAtoms = async (): Promise<void> => {
    if (extracting) return
    setExtracting(true)
    try {
      const atoms = await window.api.atoms.extractFromMaterial(m.id)
      setExtracted(atoms.length)
      setTimeout(() => setExtracted(null), 2500)
    } finally {
      setExtracting(false)
    }
  }

  return (
    <div
      ref={ref}
      className={cn(
        'rounded-xl border bg-card px-4 py-3 transition-shadow',
        focused ? 'border-primary ring-2 ring-primary/30' : m.in_context ? 'border-primary/40' : 'border-border'
      )}
    >
      <div className="flex items-center gap-3">
        {m.kind === 'image' && m.image_path ? <ImageThumb path={m.image_path} /> : null}
        <button className="min-w-0 flex-1 text-left" onClick={() => setOpen((v) => !v)}>
          <div className="flex items-center gap-2">
            <span className="truncate font-medium">{m.title}</span>
            {m.url ? <Link2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" /> : null}
            {m.platform ? (
              <span className="shrink-0 rounded bg-accent px-1.5 py-0.5 text-[10.5px] text-muted-foreground">
                {labelForPlatform(m.platform)}
              </span>
            ) : null}
          </div>
          <div className="mt-0.5 flex items-center gap-2 text-[12.5px] text-muted-foreground">
            <span className="truncate">
              {m.content.replace(/\n/g, ' ').slice(0, 60) || (m.kind === 'image' ? '图片素材' : '')}
            </span>
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
        {m.status === 'inbox' ? (
          <Button
            size="icon-sm"
            variant="ghost"
            title="标记为已整理(移出收件箱)"
            onClick={() => window.api.materials.setStatus(m.id, '已整理').then(onChange)}
          >
            <CircleCheck className="h-4 w-4 text-primary" />
          </Button>
        ) : null}
        <Button
          size="icon-sm"
          variant="ghost"
          title={
            extracted !== null
              ? extracted > 0
                ? `已拆出 ${extracted} 个原子`
                : '未拆出可复用原子,换段素材或检查网络后再试'
              : '拆成知识原子'
          }
          onClick={splitAtoms}
          disabled={extracting}
        >
          {extracting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Atom className={cn('h-4 w-4', extracted !== null && 'text-primary')} />
          )}
        </Button>
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
        <div className="mt-2 space-y-2">
          {m.kind === 'image' && m.image_path ? <ImageThumb path={m.image_path} large /> : null}
          {m.content ? (
            <div className="rounded-lg bg-muted/60 p-3 text-[12.5px] text-muted-foreground">
              <WikiText content={m.content} />
              {m.url ? <div className="mt-1.5 truncate text-primary">{m.url}</div> : null}
            </div>
          ) : m.url ? (
            <div className="truncate rounded-lg bg-muted/60 p-3 text-[12.5px] text-primary">{m.url}</div>
          ) : null}
          <Backlinks kind="material" id={m.id} />
        </div>
      ) : null}
    </div>
  )
}
