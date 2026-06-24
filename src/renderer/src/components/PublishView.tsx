import { JSX, useEffect, useState } from 'react'
import { BarChart3, Plus, Trash2, Pencil, Sparkles, Loader2, Link2, Star, Check } from 'lucide-react'
import { useStore } from '../store'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Header, Empty } from './ScheduledView'
import { PLATFORM_OPTIONS, labelForPlatform } from '../platforms'
import type { Publication } from '../types'

export function PublishView(): JSX.Element {
  const ws = useStore((s) => s.activeWorkspaceId)
  const projectScope = useStore((s) => s.projectScope)
  const setView = useStore((s) => s.setView)
  const [pubs, setPubs] = useState<Publication[]>([])
  const [editing, setEditing] = useState<Publication | 'new' | null>(null)
  const [suggesting, setSuggesting] = useState(false)
  const [suggested, setSuggested] = useState<number | null>(null)

  const refresh = async (): Promise<void> => {
    if (ws) setPubs(await window.api.publications.list(ws))
  }
  useEffect(() => {
    refresh()
  }, [ws, projectScope])

  const suggest = async (): Promise<void> => {
    if (!ws || suggesting) return
    setSuggesting(true)
    setSuggested(null)
    try {
      const topics = await window.api.publications.suggestTopics(ws)
      setSuggested(topics.length)
    } finally {
      setSuggesting(false)
    }
  }

  const total = pubs.reduce(
    (a, p) => ({ v: a.v + p.views, l: a.l + p.likes, s: a.s + p.saves }),
    { v: 0, l: 0, s: 0 }
  )
  // Per-platform breakdown (best avg-engagement platform surfaces first).
  const byPlatform = Object.values(
    pubs.reduce<Record<string, { platform: string; n: number; views: number; likes: number; saves: number }>>(
      (acc, p) => {
        const key = p.platform ?? '未分'
        const g = acc[key] ?? { platform: key, n: 0, views: 0, likes: 0, saves: 0 }
        g.n++
        g.views += p.views
        g.likes += p.likes
        g.saves += p.saves
        acc[key] = g
        return acc
      },
      {}
    )
  ).sort((a, b) => b.saves + b.likes - (a.saves + a.likes))

  return (
    <div className="mx-auto flex h-full w-full max-w-4xl flex-col px-8 py-7">
      <Header
        icon={BarChart3}
        title="发布数据"
        desc="记录各平台发布与数据,让表现反哺下一轮选题——发布越多,选题越准,形成增长飞轮。"
        action={
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={suggest} disabled={suggesting || pubs.length === 0}>
              {suggesting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              据数据出选题
            </Button>
            <Button size="sm" onClick={() => setEditing('new')}>
              <Plus className="h-4 w-4" /> 记录发布
            </Button>
          </div>
        }
      />

      {suggested !== null ? (
        suggested > 0 ? (
          <button
            onClick={() => setView('topics')}
            className="mt-3 rounded-lg border border-primary/40 bg-primary-soft px-3 py-2 text-left text-[13px] text-primary"
          >
            ✓ 已据数据生成 {suggested} 个选题,点此去「选题库」查看 →
          </button>
        ) : (
          <div className="mt-3 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-[13px] text-muted-foreground">
            未能生成选题,已自动重试仍未成功。请检查网络或 API key 后重试。
          </div>
        )
      ) : null}

      {pubs.length > 0 ? (
        <div className="mt-3 flex gap-4 rounded-xl border border-border bg-card px-4 py-3 text-[13px]">
          <Stat label="发布" value={pubs.length} />
          <Stat label="总播放" value={total.v} />
          <Stat label="总赞" value={total.l} />
          <Stat label="总收藏" value={total.s} />
        </div>
      ) : null}

      {byPlatform.length > 1 ? (
        <div className="mt-2 rounded-xl border border-border-soft bg-card/60 px-4 py-2.5">
          <div className="mb-1.5 text-[11.5px] font-medium uppercase tracking-wide text-muted-foreground/60">
            按平台
          </div>
          <div className="space-y-1">
            {byPlatform.map((g) => (
              <div key={g.platform} className="flex items-center gap-3 text-[12.5px]">
                <span className="w-16 shrink-0 text-foreground">{labelForPlatform(g.platform)}</span>
                <span className="text-muted-foreground">{g.n} 条</span>
                <span className="ml-auto text-muted-foreground">
                  播放 {g.views.toLocaleString()} · 赞 {g.likes} · 藏 {g.saves}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {editing ? (
        <PubForm
          pub={editing === 'new' ? null : editing}
          onDone={() => {
            setEditing(null)
            refresh()
          }}
        />
      ) : null}

      <div className="mt-4 min-h-0 flex-1 space-y-2 overflow-y-auto">
        {pubs.length === 0 ? (
          <Empty>还没有发布记录。发完一条内容,把数据记下来,系统就能据此给你出下一轮选题。</Empty>
        ) : (
          pubs.map((p) => <PubRow key={p.id} p={p} onEdit={() => setEditing(p)} onChange={refresh} />)
        )}
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number }): JSX.Element {
  return (
    <div>
      <div className="text-[16px] font-semibold text-foreground">{value.toLocaleString()}</div>
      <div className="text-[11px] text-muted-foreground">{label}</div>
    </div>
  )
}

function PubRow({ p, onEdit, onChange }: { p: Publication; onEdit: () => void; onChange: () => void }): JSX.Element {
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const saveTemplate = async (): Promise<void> => {
    if (saving) return
    setSaving(true)
    try {
      await window.api.publications.saveTemplate(p.id)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } finally {
      setSaving(false)
    }
  }
  return (
    <div className="rounded-xl border border-border bg-card px-4 py-3">
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate font-medium">{p.title}</span>
            {p.url ? <Link2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" /> : null}
            {p.platform ? (
              <span className="shrink-0 rounded bg-accent px-1.5 py-0.5 text-[10.5px] text-muted-foreground">
                {labelForPlatform(p.platform)}
              </span>
            ) : null}
          </div>
          <div className="mt-1 flex gap-3 text-[12px] text-muted-foreground">
            <span>播放 {p.views.toLocaleString()}</span>
            <span>赞 {p.likes}</span>
            <span>评 {p.comments}</span>
            <span>藏 {p.saves}</span>
          </div>
        </div>
        <Button
          size="icon-sm"
          variant="ghost"
          title={saved ? '已存为爆款模板（在「技能」里）' : '把这条的结构存为爆款模板'}
          onClick={saveTemplate}
          disabled={saving}
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : saved ? (
            <Check className="h-4 w-4 text-primary" />
          ) : (
            <Star className="h-4 w-4" />
          )}
        </Button>
        <Button size="icon-sm" variant="ghost" title="编辑数据" onClick={onEdit}>
          <Pencil className="h-4 w-4" />
        </Button>
        <Button
          size="icon-sm"
          variant="ghost"
          title="删除"
          onClick={() => window.api.publications.delete(p.id).then(onChange)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

function PubForm({ pub, onDone }: { pub: Publication | null; onDone: () => void }): JSX.Element {
  const ws = useStore((s) => s.activeWorkspaceId)
  const [title, setTitle] = useState(pub?.title ?? '')
  const [platform, setPlatform] = useState(pub?.platform ?? '')
  const [url, setUrl] = useState(pub?.url ?? '')
  const [m, setM] = useState({
    views: pub?.views ?? 0,
    likes: pub?.likes ?? 0,
    comments: pub?.comments ?? 0,
    saves: pub?.saves ?? 0
  })

  const submit = async (): Promise<void> => {
    if (!title.trim() || !ws) return
    const payload = { title: title.trim(), platform: platform || null, url: url.trim() || null, ...m }
    if (pub) await window.api.publications.update(pub.id, payload)
    else await window.api.publications.create(ws, payload)
    onDone()
  }

  const num = (k: keyof typeof m, label: string): JSX.Element => (
    <label className="flex-1 space-y-1">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <input
        type="number"
        min={0}
        value={m[k]}
        onChange={(e) => setM((s) => ({ ...s, [k]: Math.max(0, Number(e.target.value) || 0) }))}
        className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm outline-none focus-visible:border-ring"
      />
    </label>
  )

  return (
    <div className="mt-3 space-y-2.5 rounded-xl border border-border bg-card p-4">
      <Input placeholder="发布标题" value={title} onChange={(e) => setTitle(e.target.value)} />
      <div className="flex gap-2">
        <select
          value={platform}
          onChange={(e) => setPlatform(e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-2 text-sm outline-none focus-visible:border-ring"
        >
          <option value="">平台</option>
          {PLATFORM_OPTIONS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
        <Input placeholder="链接（可选）" value={url} onChange={(e) => setUrl(e.target.value)} />
      </div>
      <div className="flex gap-2">
        {num('views', '播放')}
        {num('likes', '点赞')}
        {num('comments', '评论')}
        {num('saves', '收藏')}
      </div>
      <div className="flex justify-end gap-2">
        <Button size="sm" variant="secondary" onClick={onDone}>
          取消
        </Button>
        <Button size="sm" onClick={submit} disabled={!title.trim()}>
          {pub ? '保存' : '记录'}
        </Button>
      </div>
    </div>
  )
}
