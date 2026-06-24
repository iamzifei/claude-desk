import { JSX, useEffect, useState } from 'react'
import { Tags, Library, Atom } from 'lucide-react'
import { cn } from '../lib/utils'
import { useStore } from '../store'
import { Header, Empty } from './ScheduledView'
import type { TagGroup, TaggedItem } from '../types'

export function TagsView(): JSX.Element {
  const [groups, setGroups] = useState<TagGroup[]>([])
  const [active, setActive] = useState<string | null>(null)
  const [items, setItems] = useState<TaggedItem[]>([])
  const jumpTo = useStore((s) => s.jumpTo)
  const projectScope = useStore((s) => s.projectScope)

  useEffect(() => {
    window.api.tags.groups().then(setGroups)
  }, [projectScope])
  useEffect(() => {
    if (active) window.api.tags.byTag(active).then(setItems)
    else setItems([])
  }, [active, projectScope])

  const empty = groups.length === 0

  return (
    <div className="mx-auto flex h-full w-full max-w-3xl flex-col px-8 py-7">
      <Header
        icon={Tags}
        title="标签"
        desc="按标签浏览你的素材与原子。支持 `平台/小红书` 这样的层级标签,会按前缀自动归组。"
      />

      {empty ? (
        <Empty>还没有标签。在素材/原子上加标签(逗号分隔,可用「平台/小红书」分层)。</Empty>
      ) : (
        <div className="mt-3 space-y-3">
          {groups.map((g) => (
            <div key={g.prefix}>
              <div className="px-0.5 pb-1 text-[11.5px] font-semibold uppercase tracking-wide text-muted-foreground/60">
                {g.prefix}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {g.tags.map((t) => (
                  <button
                    key={t.tag}
                    onClick={() => setActive((a) => (a === t.tag ? null : t.tag))}
                    className={cn(
                      'flex items-center gap-1 rounded-full border px-2.5 py-1 text-[12.5px] transition-colors',
                      active === t.tag
                        ? 'border-primary bg-primary-soft text-primary'
                        : 'border-border text-muted-foreground hover:bg-accent hover:text-foreground'
                    )}
                  >
                    {t.tag.includes('/') ? t.tag.split('/').slice(1).join('/') : t.tag}
                    <span className="text-[10.5px] text-muted-foreground/60">{t.count}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {active ? (
        <div className="mt-5 min-h-0 flex-1 overflow-y-auto">
          <div className="mb-2 text-[12.5px] text-muted-foreground">
            标签「<span className="text-primary">{active}</span>」下的 {items.length} 条
          </div>
          <div className="space-y-2">
            {items.map((it) => (
              <button
                key={it.kind + it.id}
                onClick={() => jumpTo({ kind: it.kind, id: it.id })}
                className="flex w-full items-center gap-2.5 rounded-xl border border-border bg-card px-4 py-2.5 text-left transition-colors hover:border-primary/40"
              >
                {it.kind === 'material' ? (
                  <Library className="h-4 w-4 shrink-0 text-muted-foreground" />
                ) : (
                  <Atom className="h-4 w-4 shrink-0 text-muted-foreground" />
                )}
                <span className="min-w-0 flex-1 truncate text-[13.5px]">{it.title}</span>
                <span className="shrink-0 rounded bg-accent px-1.5 py-0.5 text-[10.5px] text-muted-foreground">
                  {it.kind === 'material' ? '素材' : '原子'}
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}
