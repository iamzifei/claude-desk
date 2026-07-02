import { JSX, useEffect, useState } from 'react'
import {
  UserRound,
  Plus,
  Pencil,
  Trash2,
  Upload,
  Download,
  Star,
  History,
  Wrench,
  Megaphone,
  Award,
  Coffee,
  MessageCircleQuestion,
  type LucideIcon
} from 'lucide-react'
import { cn } from '../lib/utils'
import { useStore } from '../store'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Header, Empty } from './ScheduledView'
import { PLATFORM_OPTIONS } from '../platforms'
import type { Persona, NewPersona, PersonaDimensionKey } from '../types'

/**
 * 人设五维 (persona five-dimension) profile manager.
 *
 * The dimension metadata below mirrors the main process's persona-util.ts
 * (which itself mirrors lingxi's PERSONA_DIMENSIONS) so both apps show the
 * exact same guided questionnaire — a profile built here reads identically
 * on the cloud side after a JSON export/import round trip.
 */
interface DimensionMeta {
  key: PersonaDimensionKey
  icon: LucideIcon
  label: string
  effect: string
  question: string
  placeholder: string
}

const DIMENSIONS: DimensionMeta[] = [
  {
    key: 'past',
    icon: History,
    label: '过去（故事）',
    effect: '让人共情你、记住你',
    question: '你走到今天这一行，最大的一次转折是什么？有没有一段特别难的日子？',
    placeholder:
      '讲一段你的经历/转折——立可信度用。每行一条，写成有画面/数字的事实句，例如：开馆第一年只有 7 个会员，靠白天送外卖撑房租'
  },
  {
    key: 'expertise',
    icon: Wrench,
    label: '专业（干货）',
    effect: '让人觉得你有用',
    question: '你能教会一个完全外行的人做什么？同行里你比多数人做得好的一件事是什么？',
    placeholder:
      '写你的垂直领域本事——证明有用。每行一条，例如：能让完全没运动过的中年人 4 周建立每天 20 分钟的锻炼习惯'
  },
  {
    key: 'stance',
    icon: Megaphone,
    label: '观点态度',
    effect: '让人认同你、站队你',
    question: '行业里哪个流行说法你最反对？有没有大家都在做但你坚决不做的事？',
    placeholder: '写你的立场和好恶——让人站队用。每行一条，例如：反对健身房年卡套路——我只卖月卡'
  },
  {
    key: 'proof',
    icon: Award,
    label: '结果实力',
    effect: '让人信你',
    question: '有什么可展示的成果（作品/数据/案例/年限）？你帮别人拿到过的最好结果是什么？',
    placeholder:
      '论证实力用事实，不用形容词。每行一条，例如：带过 200+ 名 40 岁以上会员，最年长 71 岁'
  },
  {
    key: 'life',
    icon: Coffee,
    label: '生活（温度）',
    effect: '让人觉得你是活人，有温度',
    question: '工作之外，你的日常里有什么反复出现的场景？有没有「不体面但真实」的细节愿意公开？',
    placeholder:
      '写真实的日常——温度来源。每行一条，例如：每天早上 6 点在人民公园免费带晨练，风雨无阻第 3 年'
  }
]

/** Default publishing-ratio suggestion (persona-builder skill Step 4). */
const DEFAULT_CALENDAR: Record<string, string> = {
  expertise: '每周1',
  stance: '每周1',
  past: '每月1-2',
  proof: '每月1-2',
  life: '不定期'
}

const FORMALITY_OPTIONS = ['轻松', '半正式', '正式']
const EXPERTISE_OPTIONS = ['科普向', '专业易懂', '深度专业']
const PERSON_OPTIONS = ['我', '我们']

/** How many of the five dimensions carry at least one material point. */
function filledCount(dims: Record<PersonaDimensionKey, string[]>): number {
  return DIMENSIONS.filter((d) => dims[d.key].length > 0).length
}

export function PersonaView(): JSX.Element {
  const projectScope = useStore((s) => s.projectScope)
  const [personas, setPersonas] = useState<Persona[]>([])
  const [editing, setEditing] = useState<Persona | 'new' | null>(null)

  const refresh = async (): Promise<void> => {
    setPersonas(await window.api.personas.list())
  }
  useEffect(() => {
    refresh()
  }, [projectScope])

  const importJson = async (): Promise<void> => {
    const p = await window.api.personas.import()
    if (p) refresh()
  }

  if (editing) {
    return (
      <PersonaForm
        persona={editing === 'new' ? null : editing}
        onDone={() => {
          setEditing(null)
          refresh()
        }}
      />
    )
  }

  return (
    <div className="mx-auto flex h-full w-full max-w-3xl flex-col px-8 py-7">
      <Header
        icon={UserRound}
        title="人设"
        desc="人设五维档案：过去 / 专业 / 观点 / 实力 / 生活。设为默认后注入所有对话——AI 用你的口吻、立场和真实素材来写。"
        action={
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={importJson}>
              <Upload className="h-4 w-4" /> 导入 JSON
            </Button>
            <Button size="sm" onClick={() => setEditing('new')}>
              <Plus className="h-4 w-4" /> 新建人设
            </Button>
          </div>
        }
      />

      <div className="mt-4 min-h-0 flex-1 space-y-2 overflow-y-auto">
        {personas.length === 0 ? (
          <Empty>
            还没有人设档案。点「新建人设」按五维问答填写；也可以在对话中用 /persona 让 AI
            引导你完成五维问答，再把结果导入这里。
          </Empty>
        ) : (
          personas.map((p) => (
            <PersonaRow key={p.id} p={p} onEdit={() => setEditing(p)} onChange={refresh} />
          ))
        )}
      </div>
    </div>
  )
}

function PersonaRow({
  p,
  onEdit,
  onChange
}: {
  p: Persona
  onEdit: () => void
  onChange: () => void
}): JSX.Element {
  const filled = filledCount(p.dimensions)
  const isDefault = p.is_default === 1

  return (
    <div className="rounded-xl border border-border bg-card px-4 py-3">
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate font-medium">{p.name}</span>
            {isDefault ? (
              <span className="flex items-center gap-1 rounded bg-primary-soft px-1.5 py-0.5 text-[10.5px] text-primary">
                <Star className="h-3 w-3" /> 默认 · 注入所有对话
              </span>
            ) : null}
          </div>
          <div className="mt-0.5 flex items-center gap-2 text-[12px] text-muted-foreground">
            {p.positioning ? <span className="truncate">{p.positioning}</span> : null}
            <span
              className={cn(
                'shrink-0 rounded px-1.5 py-0.5 text-[10.5px]',
                filled === 5 ? 'bg-primary-soft text-primary' : 'bg-accent'
              )}
            >
              {filled}/5 维已填
            </span>
          </div>
        </div>
        <Button
          size="sm"
          variant={isDefault ? 'secondary' : 'outline'}
          onClick={() => window.api.personas.setDefault(p.id, !isDefault).then(onChange)}
        >
          <Star className={cn('h-4 w-4', isDefault && 'text-primary')} />
          {isDefault ? '取消默认' : '设为默认'}
        </Button>
        <Button
          size="icon-sm"
          variant="ghost"
          title="导出 JSON（与云端灵犀互认）"
          onClick={() => window.api.personas.export(p.id)}
        >
          <Download className="h-4 w-4" />
        </Button>
        <Button size="icon-sm" variant="ghost" title="编辑" onClick={onEdit}>
          <Pencil className="h-4 w-4" />
        </Button>
        <Button
          size="icon-sm"
          variant="ghost"
          title="删除"
          onClick={() => window.api.personas.delete(p.id).then(onChange)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

/** Textarea draft per dimension — one material point per line. */
type DimensionDraft = Record<PersonaDimensionKey, string>

function toDraft(p: Persona | null): DimensionDraft {
  return {
    past: p?.dimensions.past.join('\n') ?? '',
    expertise: p?.dimensions.expertise.join('\n') ?? '',
    stance: p?.dimensions.stance.join('\n') ?? '',
    proof: p?.dimensions.proof.join('\n') ?? '',
    life: p?.dimensions.life.join('\n') ?? ''
  }
}

/** One point per line, trimmed, empty lines dropped. */
function parseLines(value: string): string[] {
  return value
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
}

function PersonaForm({
  persona,
  onDone
}: {
  persona: Persona | null
  onDone: () => void
}): JSX.Element {
  const [name, setName] = useState(persona?.name ?? '')
  const [positioning, setPositioning] = useState(persona?.positioning ?? '')
  const [formality, setFormality] = useState(persona?.toneFormality || '半正式')
  const [expertiseTone, setExpertiseTone] = useState(persona?.toneExpertise || '专业易懂')
  const [person, setPerson] = useState(persona?.tonePerson || '我')
  const [platforms, setPlatforms] = useState<string[]>(persona?.targetPlatforms ?? [])
  const [banned, setBanned] = useState(persona?.bannedWords.join('、') ?? '')
  const [dims, setDims] = useState<DimensionDraft>(toDraft(persona))
  const [makeDefault, setMakeDefault] = useState(persona?.is_default === 1)
  const [saving, setSaving] = useState(false)

  const parsedDims = {
    past: parseLines(dims.past),
    expertise: parseLines(dims.expertise),
    stance: parseLines(dims.stance),
    proof: parseLines(dims.proof),
    life: parseLines(dims.life)
  }
  const filled = filledCount(parsedDims)

  const submit = async (): Promise<void> => {
    if (!name.trim() || saving) return
    setSaving(true)
    try {
      const payload: NewPersona = {
        name: name.trim(),
        positioning: positioning.trim(),
        toneFormality: formality,
        toneExpertise: expertiseTone,
        tonePerson: person,
        targetPlatforms: platforms,
        // Banned words accept both Chinese and ASCII commas as separators.
        bannedWords: banned
          .split(/[,，、]/)
          .map((w) => w.trim())
          .filter(Boolean),
        dimensions: parsedDims,
        // Keep an existing calendar; seed new personas with the skill's
        // recommended publishing ratio so the prompt carries 配比 guidance.
        contentCalendar: persona?.contentCalendar && Object.keys(persona.contentCalendar).length
          ? persona.contentCalendar
          : DEFAULT_CALENDAR
      }
      let id: string
      if (persona) {
        await window.api.personas.update(persona.id, payload)
        id = persona.id
      } else {
        id = (await window.api.personas.create(payload)).id
      }
      // Only touch the default flag when it actually changed, so saving an
      // unrelated edit never silently steals/drops the global default.
      const wasDefault = persona?.is_default === 1
      if (makeDefault !== wasDefault) await window.api.personas.setDefault(id, makeDefault)
      onDone()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto flex h-full w-full max-w-3xl flex-col px-8 py-7">
      <Header
        icon={UserRound}
        title={persona ? '编辑人设' : '新建人设'}
        desc="每维 2-3 条素材即可开始——素材要具象到能直接进稿子：「我很努力」不算素材，「连续三个月睡在店里的行军床」才算。"
        action={
          <span className="rounded bg-accent px-2 py-1 text-[12px] text-muted-foreground">
            {filled}/5 维已填
          </span>
        }
      />

      <div className="mt-4 min-h-0 flex-1 space-y-3 overflow-y-auto pb-2">
        {/* 基础信息 */}
        <section className="space-y-2.5 rounded-xl border border-border bg-card p-4">
          <div className="text-[13px] font-medium">基础信息</div>
          <Input
            placeholder="人设名称，如「修老房的陈工」（行业+名字 / 状态+名字）"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Input
            placeholder="一句话定位：身份 ×（人群或细分）× 差异点，如「给街边小店做线上化的前餐饮老板」"
            value={positioning}
            onChange={(e) => setPositioning(e.target.value)}
          />
          <div className="flex flex-wrap items-center gap-2">
            <ToneSelect label="正式度" value={formality} options={FORMALITY_OPTIONS} onChange={setFormality} />
            <ToneSelect label="专业度" value={expertiseTone} options={EXPERTISE_OPTIONS} onChange={setExpertiseTone} />
            <ToneSelect label="人称" value={person} options={PERSON_OPTIONS} onChange={setPerson} />
          </div>
          <div>
            <div className="mb-1.5 text-[12px] text-muted-foreground">目标平台</div>
            <div className="flex flex-wrap gap-1.5">
              {PLATFORM_OPTIONS.map((opt) => {
                const active = platforms.includes(opt.id)
                return (
                  <button
                    key={opt.id}
                    onClick={() =>
                      setPlatforms(
                        active ? platforms.filter((x) => x !== opt.id) : [...platforms, opt.id]
                      )
                    }
                    className={cn(
                      'rounded-full border px-2.5 py-1 text-[12px] transition-colors',
                      active
                        ? 'border-primary bg-primary-soft text-primary'
                        : 'border-border text-muted-foreground hover:bg-accent hover:text-foreground'
                    )}
                  >
                    {opt.label}
                  </button>
                )
              })}
            </div>
          </div>
          <Input
            placeholder="禁用词（用逗号分隔），如「家人们、绝绝子、宝子」"
            value={banned}
            onChange={(e) => setBanned(e.target.value)}
          />
        </section>

        {/* 五维素材 */}
        {DIMENSIONS.map((d) => {
          const Icon = d.icon
          const count = parseLines(dims[d.key]).length
          return (
            <section key={d.key} className="space-y-2 rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-2">
                <Icon className="h-4 w-4 text-primary" strokeWidth={1.75} />
                <span className="text-[13px] font-medium">{d.label}</span>
                <span className="text-[12px] text-muted-foreground">{d.effect}</span>
                <span
                  className={cn(
                    'ml-auto rounded px-1.5 py-0.5 text-[10.5px]',
                    count > 0 ? 'bg-primary-soft text-primary' : 'bg-accent text-muted-foreground'
                  )}
                >
                  {count > 0 ? `${count} 条素材` : '未填写'}
                </span>
              </div>
              <div className="flex items-start gap-1.5 text-[12px] text-muted-foreground">
                <MessageCircleQuestion className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
                <span>{d.question}</span>
              </div>
              <textarea
                value={dims[d.key]}
                onChange={(e) => setDims({ ...dims, [d.key]: e.target.value })}
                placeholder={d.placeholder}
                rows={3}
                className="w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm leading-relaxed outline-none placeholder:text-muted-foreground/70 focus-visible:border-ring"
              />
            </section>
          )
        })}
      </div>

      <div className="flex items-center justify-between border-t border-border-soft pt-3">
        <label className="flex cursor-pointer items-center gap-2 text-[13px]">
          <input
            type="checkbox"
            checked={makeDefault}
            onChange={(e) => setMakeDefault(e.target.checked)}
            className="h-3.5 w-3.5 accent-[var(--primary)]"
          />
          设为默认人设（注入所有对话）
        </label>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onDone}>
            取消
          </Button>
          <Button onClick={submit} disabled={!name.trim() || saving}>
            {persona ? '保存' : '创建'}
          </Button>
        </div>
      </div>
    </div>
  )
}

function ToneSelect({
  label,
  value,
  options,
  onChange
}: {
  label: string
  value: string
  options: string[]
  onChange: (v: string) => void
}): JSX.Element {
  return (
    <label className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 rounded-md border border-input bg-background px-1.5 text-[12.5px] text-foreground outline-none focus-visible:border-ring"
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  )
}
