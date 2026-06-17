import { JSX, useEffect, useState } from 'react'
import { Puzzle, Plus, Upload, Trash2 } from 'lucide-react'
import { cn } from '../lib/utils'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Header, Empty } from './ScheduledView'
import type { Skill } from '../types'

export function SkillsView(): JSX.Element {
  const [skills, setSkills] = useState<Skill[]>([])
  const [adding, setAdding] = useState(false)

  const refresh = async (): Promise<void> => setSkills(await window.api.skills.list())
  useEffect(() => {
    refresh()
  }, [])

  const importSkill = async (): Promise<void> => {
    const s = await window.api.skills.import()
    if (s) refresh()
  }

  return (
    <div className="mx-auto flex h-full w-full max-w-2xl flex-col px-8 py-7">
      <Header
        icon={Puzzle}
        title="Skill 管理"
        desc="启用的技能会注入到对话的系统提示里，让 AI 按你的指引工作。"
        action={
          <div className="flex gap-2">
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

      <div className="mt-4 min-h-0 flex-1 space-y-2 overflow-y-auto">
        {skills.length === 0 ? (
          <Empty>还没有技能。新建一个，或导入一个 SKILL.md。</Empty>
        ) : (
          skills.map((s) => <SkillRow key={s.id} skill={s} onChange={refresh} />)
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
    await window.api.skills.create({ name: name.trim(), description: description.trim(), content: content.trim() })
    onDone()
  }

  return (
    <div className="mt-4 space-y-2.5 rounded-xl border border-border bg-card p-4">
      <Input placeholder="技能名称，如「小红书文案专家」" value={name} onChange={(e) => setName(e.target.value)} />
      <Input placeholder="一句话描述（可选）" value={description} onChange={(e) => setDescription(e.target.value)} />
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
  return (
    <div className="rounded-xl border border-border bg-card px-4 py-3">
      <div className="flex items-center gap-3">
        <button className="min-w-0 flex-1 text-left" onClick={() => setOpen((v) => !v)}>
          <div className="flex items-center gap-2">
            <span className="truncate font-medium">{skill.name}</span>
            {skill.source === 'imported' ? (
              <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                导入
              </span>
            ) : null}
          </div>
          {skill.description ? (
            <div className="mt-0.5 truncate text-[12.5px] text-muted-foreground">{skill.description}</div>
          ) : null}
        </button>
        <label className="flex shrink-0 cursor-pointer items-center" title={skill.enabled ? '已启用' : '已停用'}>
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
        <Button
          size="icon-sm"
          variant="ghost"
          title="删除"
          onClick={() => window.api.skills.delete(skill.id).then(onChange)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
      {open ? (
        <pre className="mt-2 max-h-48 overflow-y-auto whitespace-pre-wrap rounded-lg bg-muted p-3 text-[12.5px] text-muted-foreground">
          {skill.content}
        </pre>
      ) : null}
    </div>
  )
}
