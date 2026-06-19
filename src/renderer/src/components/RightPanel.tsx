import { JSX } from 'react'
import { Image, Folder, FolderOpen, FileText, File, X, type LucideIcon } from 'lucide-react'
import { useStore } from '../store'
import { cn } from '../lib/utils'
import { Tip } from './ui/tooltip'
import { CardPanel } from './CardPanel'

type PanelKey = 'card' | 'files'
const TITLES: Record<PanelKey, string> = { card: '卡片预览', files: '文件' }

export function RightPanel(): JSX.Element | null {
  const panel = useStore((s) => s.rightPanel)
  const setPanel = useStore((s) => s.setRightPanel)
  const messages = useStore((s) => s.messages)
  if (!panel) return null

  const lastAssistant = [...messages].reverse().find((m) => m.role === 'assistant')

  return (
    <section className="flex w-[340px] shrink-0 flex-col border-l border-border bg-background">
      <div className="flex h-9 items-center justify-between border-b border-border-soft px-3.5 text-[13px] font-semibold">
        <span>{TITLES[panel]}</span>
        <button
          onClick={() => setPanel(panel)}
          className="rounded p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="flex min-h-0 flex-1 flex-col">
        {panel === 'files' ? <FilesList /> : <CardPanel text={lastAssistant?.content ?? ''} />}
      </div>
    </section>
  )
}

function FilesList(): JSX.Element {
  const files = useStore((s) => s.files)
  const conv = useStore((s) => s.conversations.find((c) => c.id === s.activeId))
  const project = useStore((s) => s.projects.find((p) => p.id === conv?.project_id))

  if (!project || !project.dir_path) {
    return (
      <div className="m-auto max-w-[240px] px-6 text-center text-muted-foreground">
        <FolderOpen className="mx-auto mb-3 h-9 w-9 opacity-60" strokeWidth={1.5} />
        <p className="text-sm">{project ? `项目「${project.name}」未绑定文件夹` : '当前对话不属于任何项目'}</p>
        <p className="mt-1 text-xs text-muted-foreground/70">
          {project ? '在左栏项目菜单里「绑定文件夹」。' : '把对话放进一个绑定了文件夹的项目即可浏览文件。'}
        </p>
      </div>
    )
  }
  return (
    <div className="overflow-y-auto p-2">
      <div className="truncate px-2 pb-2 pt-1 text-[11px] text-muted-foreground/70" title={project.dir_path}>
        {project.dir_path}
      </div>
      {files.length === 0 ? (
        <div className="px-2.5 py-1.5 text-[12.5px] text-muted-foreground/60">空文件夹</div>
      ) : (
        files.map((f) => (
          <div
            key={f.path}
            className="flex items-center gap-2 rounded-md px-2 py-1.5 text-[13px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            {f.isDir ? (
              <Folder className="h-4 w-4 text-primary" />
            ) : (
              <File className="h-4 w-4" />
            )}
            <span className="truncate">{f.name}</span>
          </div>
        ))
      )}
    </div>
  )
}

export function RightDock(): JSX.Element {
  const panel = useStore((s) => s.rightPanel)
  const setPanel = useStore((s) => s.setRightPanel)
  const items: { key: PanelKey; icon: LucideIcon; label: string }[] = [
    { key: 'card', icon: Image, label: '卡片预览' },
    { key: 'files', icon: FileText, label: '文件' }
  ]
  return (
    <div className="flex w-12 shrink-0 flex-col items-center gap-1 border-l border-border bg-sidebar pt-2.5">
      {items.map((it) => (
        <Tip key={it.key} label={it.label} side="left">
          <button
            data-dock={it.key}
            onClick={() => setPanel(it.key)}
            className={cn(
              'flex h-9 w-9 items-center justify-center rounded-lg transition-colors',
              panel === it.key
                ? 'bg-accent text-foreground'
                : 'text-muted-foreground hover:bg-accent/60'
            )}
          >
            <it.icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
          </button>
        </Tip>
      ))}
    </div>
  )
}
