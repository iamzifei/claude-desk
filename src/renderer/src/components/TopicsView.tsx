import { JSX, useEffect, useState } from 'react'
import {
  Lightbulb,
  Plus,
  Trash2,
  Pencil,
  Sparkles,
  Loader2,
  Copy,
  Check,
  Save,
  Repeat2,
  Stethoscope,
  Wand2,
  TriangleAlert,
  Image as ImageIcon
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { cn } from '../lib/utils'
import { useStore } from '../store'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Header, Empty } from './ScheduledView'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog'
import { Backlinks } from './WikiText'
import { useFocusHighlight } from '../useFocusHighlight'
import { recommendFormat } from '../format-match'
import { PLATFORM_OPTIONS } from '../platforms'
import { isEngineError, engineErrorText } from '../engine-error'
import type { Topic, TopicStatus } from '../types'

const STATUSES: TopicStatus[] = ['灵感', '待写', '进行', '已发']

export function TopicsView(): JSX.Element {
  const ws = useStore((s) => s.activeWorkspaceId)
  const projectScope = useStore((s) => s.projectScope)
  const [topics, setTopics] = useState<Topic[]>([])
  const [filter, setFilter] = useState<'all' | TopicStatus>('all')
  const [editing, setEditing] = useState<Topic | 'new' | null>(null)
  const [draft, setDraft] = useState<{ topic: Topic; text: string } | null>(null)

  const refresh = async (): Promise<void> => {
    if (ws) setTopics(await window.api.topics.list(ws))
  }
  useEffect(() => {
    refresh()
  }, [ws, projectScope])

  const visible = topics.filter((t) => (filter === 'all' ? true : t.status === filter))

  return (
    <div className="mx-auto flex h-full w-full max-w-3xl flex-col px-8 py-7">
      <Header
        icon={Lightbulb}
        title="选题库"
        desc="把选题沉淀下来,一键从你的素材库 / 知识原子里「装配」成初稿——稿子从资产里长出来,不从零写。"
        action={
          <Button size="sm" onClick={() => setEditing('new')}>
            <Plus className="h-4 w-4" /> 新建选题
          </Button>
        }
      />

      <div className="mt-3 flex flex-wrap gap-1.5">
        <FilterChip label="全部" active={filter === 'all'} onClick={() => setFilter('all')} />
        {STATUSES.map((s) => (
          <FilterChip key={s} label={s} active={filter === s} onClick={() => setFilter(s)} />
        ))}
      </div>

      {editing ? (
        <TopicForm
          topic={editing === 'new' ? null : editing}
          onDone={() => {
            setEditing(null)
            refresh()
          }}
        />
      ) : null}

      <div className="mt-4 min-h-0 flex-1 space-y-2 overflow-y-auto">
        {visible.length === 0 ? (
          <Empty>还没有选题。把灵感记下来,再一键装配成稿。</Empty>
        ) : (
          visible.map((t) => (
            <TopicRow
              key={t.id}
              t={t}
              onEdit={() => setEditing(t)}
              onChange={refresh}
              onAssembled={(text) => setDraft({ topic: t, text })}
            />
          ))
        )}
      </div>

      {draft ? <DraftDialog topic={draft.topic} text={draft.text} onClose={() => setDraft(null)} /> : null}
    </div>
  )
}

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }): JSX.Element {
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

function TopicForm({ topic, onDone }: { topic: Topic | null; onDone: () => void }): JSX.Element {
  const ws = useStore((s) => s.activeWorkspaceId)
  const [title, setTitle] = useState(topic?.title ?? '')
  const [angle, setAngle] = useState(topic?.angle ?? '')
  const [platform, setPlatform] = useState(topic?.platform ?? '')

  const submit = async (): Promise<void> => {
    if (!title.trim() || !ws) return
    const payload = { title: title.trim(), angle: angle.trim() || null, platform: platform.trim() || null }
    if (topic) await window.api.topics.update(topic.id, payload)
    else await window.api.topics.create(ws, payload)
    onDone()
  }

  return (
    <div className="mt-3 space-y-2.5 rounded-xl border border-border bg-card p-4">
      <Input placeholder="选题标题，如「副业最大的坑」" value={title} onChange={(e) => setTitle(e.target.value)} />
      <Input placeholder="切入角度（可选），如「反常识 / 个人经历」" value={angle} onChange={(e) => setAngle(e.target.value)} />
      <div className="flex items-center justify-between gap-2">
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
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={onDone}>
            取消
          </Button>
          <Button size="sm" onClick={submit} disabled={!title.trim()}>
            {topic ? '保存' : '添加'}
          </Button>
        </div>
      </div>
    </div>
  )
}

function TopicRow({
  t,
  onEdit,
  onChange,
  onAssembled
}: {
  t: Topic
  onEdit: () => void
  onChange: () => void
  onAssembled: (text: string) => void
}): JSX.Element {
  const [assembling, setAssembling] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { ref, focused } = useFocusHighlight(t.id)

  const assemble = async (): Promise<void> => {
    if (assembling) return
    setAssembling(true)
    setError(null)
    try {
      const r = await window.api.topics.assemble(t.id)
      // A failed assembly comes back as a `[错误] …` sentinel — surface it inline
      // instead of opening a draft dialog full of an error message.
      if (isEngineError(r.draft)) {
        setError(engineErrorText(r.draft))
        return
      }
      onAssembled(r.draft)
      if (t.status === '灵感') {
        await window.api.topics.setStatus(t.id, '进行')
        onChange()
      }
    } finally {
      setAssembling(false)
    }
  }

  return (
    <div
      ref={ref}
      className={cn(
        'rounded-xl border bg-card px-4 py-3 transition-shadow',
        focused ? 'border-primary ring-2 ring-primary/30' : 'border-border'
      )}
    >
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <div className="truncate font-medium">{t.title}</div>
          <div className="mt-0.5 flex items-center gap-2 text-[12px] text-muted-foreground">
            {t.angle ? <span className="truncate">{t.angle}</span> : null}
            {t.platform ? (
              <span className="rounded bg-accent px-1.5 py-0.5 text-[10.5px]">{labelFor(t.platform)}</span>
            ) : null}
            {(() => {
              const rec = recommendFormat(t.title, t.angle)
              return (
                <span
                  title={rec.reason}
                  className="rounded bg-primary-soft px-1.5 py-0.5 text-[10.5px] text-primary"
                >
                  建议 {rec.format} · {rec.platform}
                </span>
              )
            })()}
          </div>
        </div>
        <select
          value={t.status}
          onChange={(e) => window.api.topics.setStatus(t.id, e.target.value as TopicStatus).then(onChange)}
          className="h-7 rounded-md border border-input bg-background px-1.5 text-[12px] outline-none focus-visible:border-ring"
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <Button size="sm" onClick={assemble} disabled={assembling}>
          {assembling ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {assembling ? '装配中…' : '装配成稿'}
        </Button>
        <Button size="icon-sm" variant="ghost" title="编辑" onClick={onEdit}>
          <Pencil className="h-4 w-4" />
        </Button>
        <Button
          size="icon-sm"
          variant="ghost"
          title="删除"
          onClick={() => window.api.topics.delete(t.id).then(onChange)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
      {error ? (
        <div className="mt-2 flex items-start gap-1.5 text-[12px] text-destructive">
          <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>装配失败：{error} 已自动重试仍未成功，请检查网络/API key 后重试。</span>
        </div>
      ) : null}
      <Backlinks kind="topic" id={t.id} />
    </div>
  )
}

function DraftDialog({
  topic,
  text,
  onClose
}: {
  topic: Topic
  text: string
  onClose: () => void
}): JSX.Element {
  const sendToRewrite = useStore((s) => s.sendToRewrite)
  const openCard = useStore((s) => s.openCard)
  const [draft, setDraft] = useState(text)
  const [copied, setCopied] = useState(false)
  const [saved, setSaved] = useState(false)
  const [report, setReport] = useState<string | null>(null)
  const [busy, setBusy] = useState<'diagnose' | 'deai' | null>(null)

  // Diagnose & de-AI right here — no need to detour through 改写工坊 first.
  const diagnose = async (): Promise<void> => {
    if (busy) return
    setBusy('diagnose')
    try {
      const rep = await window.api.diagnose.run(draft)
      setReport(isEngineError(rep) ? `**诊断失败**：${engineErrorText(rep)}` : rep)
    } finally {
      setBusy(null)
    }
  }
  const deAI = async (): Promise<void> => {
    if (busy) return
    setBusy('deai')
    try {
      const out = await window.api.diagnose.deai(draft)
      if (out && !out.startsWith('[错误]')) setDraft(out)
    } finally {
      setBusy(null)
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="flex max-h-[85vh] w-[680px] flex-col overflow-hidden p-0">
        <DialogHeader className="mb-0 border-b border-border-soft px-5 py-3.5">
          <DialogTitle>装配初稿 · {topic.title}</DialogTitle>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <div className="markdown text-[13.5px] leading-relaxed">
            <ReactMarkdown>{draft}</ReactMarkdown>
          </div>
          {report ? (
            <div className="mt-4 rounded-lg border border-border-soft bg-muted/40 px-4 py-3">
              <div className="mb-1.5 flex items-center gap-1.5 text-[12px] font-medium text-muted-foreground">
                <Stethoscope className="h-3.5 w-3.5" /> 五维诊断
              </div>
              <div className="markdown text-[12.5px] leading-relaxed">
                <ReactMarkdown>{report}</ReactMarkdown>
              </div>
            </div>
          ) : null}
        </div>
        <div className="flex flex-wrap justify-end gap-2 border-t border-border-soft px-5 py-3">
          <Button variant="secondary" onClick={diagnose} disabled={!!busy}>
            {busy === 'diagnose' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Stethoscope className="h-4 w-4" />
            )}{' '}
            诊断
          </Button>
          <Button variant="secondary" onClick={deAI} disabled={!!busy}>
            {busy === 'deai' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}{' '}
            去 AI 味
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              navigator.clipboard.writeText(draft)
              setCopied(true)
              setTimeout(() => setCopied(false), 1500)
            }}
          >
            {copied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />} 复制
          </Button>
          <Button variant="secondary" onClick={() => openCard(draft)}>
            <ImageIcon className="h-4 w-4" /> 导出卡片
          </Button>
          <Button
            variant="secondary"
            onClick={async () => {
              // Embed a [[选题]] wikilink so the saved draft back-links to its
              // topic — the topic row's 反链 panel then surfaces this draft.
              await window.api.materials.create({
                title: `${topic.title} 初稿`,
                content: `${draft}\n\n— 整理自选题 [[${topic.title}]]`,
                kind: 'text'
              })
              setSaved(true)
              setTimeout(() => setSaved(false), 1500)
            }}
          >
            {saved ? <Check className="h-4 w-4 text-primary" /> : <Save className="h-4 w-4" />} 存为素材
          </Button>
          <Button
            onClick={() => {
              sendToRewrite(draft)
              onClose()
            }}
          >
            <Repeat2 className="h-4 w-4" /> 去改写
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function labelFor(id: string): string {
  return PLATFORM_OPTIONS.find((p) => p.id === id)?.label ?? id
}
