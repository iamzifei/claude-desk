import { JSX, useEffect, useState } from 'react'
import {
  Puzzle,
  Plus,
  Upload,
  Trash2,
  RefreshCw,
  Loader2,
  Search,
  GripVertical,
  Star
} from 'lucide-react'
import { cn } from '../lib/utils'
import { useStore } from '../store'
import { setSkillDrag, isFavorited } from '../dnd'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Header, Empty } from './ScheduledView'
import type { Skill } from '../types'

type Filter = 'all' | 'installed' | 'custom'

export function SkillsView(): JSX.Element {
  const [skills, setSkills] = useState<Skill[]>([])
  const [adding, setAdding] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [filter, setFilter] = useState<Filter>('all')
  const [query, setQuery] = useState('')

  const refresh = async (): Promise<void> => setSkills(await window.api.skills.list())
  useEffect(() => {
    refresh()
    // The startup scan of installed skills finishes after mount — refresh then.
    return window.api.app.onDataChanged(refresh)
  }, [])

  const importSkill = async (): Promise<void> => {
    const s = await window.api.skills.import()
    if (s) refresh()
  }
  const rescan = async (): Promise<void> => {
    setScanning(true)
    setSkills(await window.api.skills.rescan())
    setScanning(false)
  }

  const installedCount = skills.filter((s) => s.source === 'installed').length
  const q = query.trim().toLowerCase()
  const shown = skills.filter((s) => {
    const isInstalled = s.source === 'installed'
    if (filter === 'installed' && !isInstalled) return false
    if (filter === 'custom' && isInstalled) return false
    if (q && !(s.name.toLowerCase().includes(q) || (s.description ?? '').toLowerCase().includes(q)))
      return false
    return true
  })

  return (
    <div className="mx-auto flex h-full w-full max-w-2xl flex-col px-8 py-7">
      <Header
        icon={Puzzle}
        title="Skill 管理"
        desc="「启用」=常驻注入系统提示；临时调用就在对话里输入 / 选择，或把技能拖进输入框（仅本条生效）。已自动扫描本机 Skills。"
        action={
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={rescan} disabled={scanning}>
              {scanning ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}{' '}
              重新扫描
            </Button>
            <Button size="sm" variant="secondary" onClick={importSkill}>
              <Upload className="h-4 w-4" /> 导入
            </Button>
            <Button size="sm" onClick={() => setAdding((v) => !v)}>
              <Plus className="h-4 w-4" /> 新建
            </Button>
          </div>
        }
      />

      {adding ? (
        <SkillForm
          onDone={() => {
            setAdding(false)
            refresh()
          }}
        />
      ) : null}

      {/* filter + search — installed libraries can be large */}
      <div className="mt-4 flex items-center gap-2">
        {(
          [
            ['all', `全部 ${skills.length}`],
            ['installed', `已安装 ${installedCount}`],
            ['custom', `自定义 ${skills.length - installedCount}`]
          ] as [Filter, string][]
        ).map(([v, label]) => (
          <button
            key={v}
            onClick={() => setFilter(v)}
            className={cn(
              'rounded-full border px-2.5 py-1 text-[12px] transition-colors',
              filter === v
                ? 'border-primary bg-primary-soft text-primary'
                : 'border-border text-muted-foreground hover:bg-accent'
            )}
          >
            {label}
          </button>
        ))}
        <div className="relative ml-auto w-44">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/60" />
          <Input
            placeholder="搜索技能…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-8 pl-7 text-[13px]"
          />
        </div>
      </div>

      <div className="mt-3 min-h-0 flex-1 space-y-2 overflow-y-auto">
        {shown.length === 0 ? (
          <Empty>
            {skills.length === 0
              ? '还没有技能。新建一个、导入 SKILL.md，或点「重新扫描」读取本机已安装的 Skills。'
              : '没有匹配的技能。'}
          </Empty>
        ) : (
          shown.map((s) => <SkillRow key={s.id} skill={s} onChange={refresh} />)
        )}
      </div>
    </div>
  )
}

function SkillForm({ onDone }: { onDone: () => void }): JSX.Element {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [content, setContent] = useState('')

  const submit = async (): Promise<void> => {
    if (!name.trim() || !content.trim()) return
    await window.api.skills.create({
      name: name.trim(),
      description: description.trim(),
      content: content.trim()
    })
    onDone()
  }

  return (
    <div className="mt-4 space-y-2.5 rounded-xl border border-border bg-card p-4">
      <Input
        placeholder="技能名称，如「小红书文案专家」"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <Input
        placeholder="一句话描述（可选）"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />
      <textarea
        placeholder="技能指引（会作为系统提示注入）。例如：你是一位小红书爆款写手，标题要有钩子，正文分点、emoji 适度…"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={5}
        className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring"
      />
      <div className="flex justify-end gap-2">
        <Button size="sm" variant="secondary" onClick={onDone}>
          取消
        </Button>
        <Button size="sm" onClick={submit} disabled={!name.trim() || !content.trim()}>
          创建
        </Button>
      </div>
    </div>
  )
}

function SkillRow({ skill, onChange }: { skill: Skill; onChange: () => void }): JSX.Element {
  const [open, setOpen] = useState(false)
  const setDragKind = useStore((s) => s.setDragKind)
  const favorites = useStore((s) => s.favorites)
  const toggleFavorite = useStore((s) => s.toggleFavorite)
  const favTarget = { kind: 'skill' as const, name: skill.name, slug: skill.slug }
  const fav = isFavorited(favorites, favTarget)
  const installed = skill.source === 'installed'
  const badge = installed ? '已安装' : skill.source === 'imported' ? '导入' : null
  // Installed skills live on disk (`inst:<path>`); show the path on expand.
  const path = installed ? skill.id.replace(/^inst:/, '') : null
  return (
    <div
      draggable
      onDragStart={(e) => {
        setSkillDrag(e, { name: skill.name, slug: skill.slug })
        setDragKind('skill')
      }}
      onDragEnd={() => setDragKind(null)}
      className="rounded-xl border border-border bg-card px-4 py-3"
    >
      <div className="flex items-center gap-3">
        <GripVertical
          className="h-3.5 w-3.5 shrink-0 cursor-grab text-muted-foreground/40"
          aria-hidden
        />
        <button className="min-w-0 flex-1 text-left" onClick={() => setOpen((v) => !v)}>
          <div className="flex items-center gap-2">
            <span className="truncate font-medium">{skill.name}</span>
            {badge ? (
              <span
                className={cn(
                  'shrink-0 rounded-full px-2 py-0.5 text-[11px]',
                  installed ? 'bg-primary-soft text-primary' : 'bg-muted text-muted-foreground'
                )}
              >
                {badge}
              </span>
            ) : null}
          </div>
          {skill.description ? (
            <div className="mt-0.5 truncate text-[12.5px] text-muted-foreground">
              {skill.description}
            </div>
          ) : null}
        </button>
        <button
          onClick={() => toggleFavorite(favTarget)}
          title={fav ? '从收藏夹移除' : '收藏（之后可从收藏夹拖进对话）'}
          className={cn(
            'shrink-0 rounded p-1 transition-colors hover:bg-accent',
            fav ? 'text-primary' : 'text-muted-foreground/50 hover:text-foreground'
          )}
        >
          <Star className={cn('h-4 w-4', fav && 'fill-current')} />
        </button>
        <label
          className="flex shrink-0 cursor-pointer items-center"
          title={skill.enabled ? '已启用' : '已停用'}
        >
          <input
            type="checkbox"
            className="peer sr-only"
            checked={!!skill.enabled}
            onChange={(e) => window.api.skills.toggle(skill.id, e.target.checked).then(onChange)}
          />
          <span className="h-5 w-9 rounded-full bg-muted p-0.5 transition-colors peer-checked:bg-primary">
            <span
              className={cn(
                'block h-4 w-4 rounded-full bg-white transition-transform',
                skill.enabled && 'translate-x-4'
              )}
            />
          </span>
        </label>
        {installed ? (
          <span
            className="shrink-0 px-1 text-[11px] text-muted-foreground/50"
            title="已安装的技能在磁盘上，停用即可；如需移除请删除对应文件"
          >
            磁盘
          </span>
        ) : (
          <Button
            size="icon-sm"
            variant="ghost"
            title="删除"
            onClick={() => window.api.skills.delete(skill.id).then(onChange)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
      {open ? (
        <>
          {path ? (
            <div
              className="mt-2 truncate font-mono text-[11px] text-muted-foreground/60"
              title={path}
            >
              {path}
            </div>
          ) : null}
          <pre className="mt-1.5 max-h-48 overflow-y-auto whitespace-pre-wrap rounded-lg bg-muted p-3 text-[12.5px] text-muted-foreground">
            {skill.content}
          </pre>
        </>
      ) : null}
    </div>
  )
}
