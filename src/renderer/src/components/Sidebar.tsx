import { JSX, useEffect, useState } from 'react'
import {
  PencilLine,
  Search,
  Clock,
  Globe,
  Puzzle,
  BarChart3,
  ClipboardList,
  CalendarDays,
  Code2,
  Library,
  Atom,
  Lightbulb,
  Tags,
  Network,
  Repeat2,
  TrendingUp,
  Settings,
  MoreHorizontal,
  ChevronRight,
  ChevronDown,
  Plus,
  Folder,
  Archive,
  Trash2,
  FolderInput,
  Pin,
  PinOff,
  SplitSquareHorizontal,
  type LucideIcon
} from 'lucide-react'
import { useStore } from '../store'
import { cn } from '../lib/utils'
import { Logo } from './Logo'
import { groupConversations } from '../group-conversations'
import type { Conversation, Project } from '../types'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator
} from './ui/dropdown-menu'
import { Tip } from './ui/tooltip'

interface Props {
  onOpenSettings: () => void
}

type NavAction =
  | 'new'
  | 'search'
  | 'scheduled'
  | 'review'
  | 'minutes'
  | 'daily'
  | 'browser'
  | 'skills'
  | 'coding'
  | 'materials'
  | 'atoms'
  | 'topics'
  | 'tags'
  | 'graph'
  | 'publish'
  | 'rewrite'
const NAV: { icon: LucideIcon; label: string; action: NavAction }[] = [
  { icon: PencilLine, label: '新建创作', action: 'new' },
  { icon: Search, label: '搜索', action: 'search' },
  { icon: Library, label: '素材库', action: 'materials' },
  { icon: Atom, label: '知识原子', action: 'atoms' },
  { icon: Tags, label: '标签', action: 'tags' },
  { icon: Network, label: '知识图谱', action: 'graph' },
  { icon: Lightbulb, label: '选题库', action: 'topics' },
  { icon: Repeat2, label: '多平台改写', action: 'rewrite' },
  { icon: TrendingUp, label: '发布数据', action: 'publish' },
  { icon: Puzzle, label: '技能', action: 'skills' },
  { icon: Code2, label: '编程', action: 'coding' },
  { icon: Globe, label: '浏览器', action: 'browser' },
  { icon: Clock, label: '定时任务', action: 'scheduled' },
  { icon: CalendarDays, label: '每日笔记', action: 'daily' },
  { icon: BarChart3, label: '每日回顾', action: 'review' },
  { icon: ClipboardList, label: '会议纪要', action: 'minutes' }
]

export function Sidebar({ onOpenSettings }: Props): JSX.Element {
  const conversations = useStore((s) => s.conversations)
  const archived = useStore((s) => s.archived)
  const projects = useStore((s) => s.projects)
  const search = useStore((s) => s.search)
  const create = useStore((s) => s.newConversation)
  const newProject = useStore((s) => s.newProject)
  const ws = useStore((s) => s.activeWorkspaceId)
  const view = useStore((s) => s.view)
  const setView = useStore((s) => s.setView)
  const setQuickOpen = useStore((s) => s.setQuickOpen)

  const [results, setResults] = useState<Conversation[] | null>(null)
  const [showArchived, setShowArchived] = useState(false)

  useEffect(() => {
    if (!search.trim() || !ws) {
      setResults(null)
      return
    }
    const t = setTimeout(async () => setResults(await window.api.conversations.search(ws, search)), 180)
    return () => clearTimeout(t)
  }, [search, ws])

  const all = results ?? conversations
  const ungrouped = all.filter((c) => !c.project_id)
  const inProject = (p: Project): Conversation[] => all.filter((c) => c.project_id === p.id)

  return (
    <aside className="flex min-h-0 flex-col bg-sidebar">
      <div className="flex items-center gap-2 px-4 pb-2.5 pt-1">
        <Logo className="h-6 w-6 rounded-[7px] shadow-sm" />
        <span className="text-sm font-semibold tracking-tight">
          墨栖 <span className="text-muted-foreground/70">InkNest</span>
        </span>
      </div>

      <nav className="flex flex-col gap-px px-2 pb-2">
        {NAV.map((item) => (
          <button
            key={item.label}
            onClick={() => {
              if (item.action === 'new') create(null)
              else if (item.action === 'search') setQuickOpen(true)
              else setView(item.action)
            }}
            className={cn(
              'flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13.5px] transition-colors',
              item.action === view
                ? 'bg-accent text-foreground'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground'
            )}
          >
            <item.icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
        {projects.map((p) => (
          <ProjectGroup key={p.id} project={p} items={inProject(p)} />
        ))}

        <div className="mb-1.5">
          <div className="flex items-center justify-between px-2 pb-1 pt-1.5">
            <span className="text-[11.5px] font-semibold uppercase tracking-wide text-muted-foreground/70">
              对话
            </span>
            <Tip label="新建项目">
              <button
                onClick={() => newProject()}
                className="flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[11px] text-muted-foreground/70 transition-colors hover:bg-accent hover:text-primary"
              >
                <Plus className="h-3 w-3" /> 项目
              </button>
            </Tip>
          </div>
          {ungrouped.length === 0 ? (
            <div className="px-2.5 py-1.5 text-[12.5px] text-muted-foreground/60">
              {search ? '没有匹配' : '还没有开始对话'}
            </div>
          ) : (
            groupConversations(ungrouped, Date.now()).map((g) => (
              <div key={g.key} className="mb-0.5">
                <div className="flex items-center gap-1 px-2.5 pb-0.5 pt-1.5 text-[10.5px] font-medium uppercase tracking-wider text-muted-foreground/45">
                  {g.key === 'pinned' ? <Pin className="h-2.5 w-2.5" /> : null}
                  {g.label}
                </div>
                {g.items.map((c) => (
                  <ConvItem key={c.id} conv={c} />
                ))}
              </div>
            ))
          )}
        </div>

        {archived.length > 0 ? (
          <div className="mb-1.5">
            <button
              onClick={() => setShowArchived((v) => !v)}
              className="flex w-full items-center gap-1 px-2 py-1 text-[11.5px] font-semibold uppercase tracking-wide text-muted-foreground/70"
            >
              {showArchived ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
              归档
              <span className="ml-auto font-normal text-muted-foreground/50">{archived.length}</span>
            </button>
            {showArchived ? archived.map((c) => <ConvItem key={c.id} conv={c} />) : null}
          </div>
        ) : null}
      </div>

      <div className="flex items-center justify-between border-t border-border-soft px-3 py-2.5">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
            J
          </div>
          <span className="text-[13px] text-muted-foreground">James</span>
        </div>
        <Tip label="设置">
          <button
            onClick={onOpenSettings}
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <Settings className="h-4 w-4" />
          </button>
        </Tip>
      </div>
    </aside>
  )
}

function ProjectGroup({ project, items }: { project: Project; items: Conversation[] }): JSX.Element {
  const [open, setOpen] = useState(true)
  const create = useStore((s) => s.newConversation)
  const rename = useStore((s) => s.renameProject)
  const remove = useStore((s) => s.deleteProject)
  const bindDir = useStore((s) => s.bindProjectDir)

  return (
    <div className="mb-1.5">
      <div className="group flex items-center gap-1 px-2 py-1">
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex flex-1 items-center gap-1 text-[12.5px] font-medium text-muted-foreground"
        >
          {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          <Folder className="h-3.5 w-3.5" />
          <span className="truncate">{project.name}</span>
        </button>
        <Tip label="此项目内新建对话">
          <button
            onClick={() => create(project.id)}
            className="rounded p-0.5 text-muted-foreground/70 opacity-0 transition hover:bg-accent hover:text-primary group-hover:opacity-100"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </Tip>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="rounded p-0.5 text-muted-foreground/70 opacity-0 transition hover:bg-accent hover:text-foreground group-hover:opacity-100">
              <MoreHorizontal className="h-3.5 w-3.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onSelect={() => {
                const n = window.prompt('重命名项目', project.name)
                if (n?.trim()) rename(project.id, n.trim())
              }}
            >
              <PencilLine /> 重命名
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => bindDir(project.id)}>
              <FolderInput /> {project.dir_path ? '更换文件夹' : '绑定文件夹'}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              destructive
              onSelect={() => {
                if (window.confirm(`删除项目「${project.name}」？对话会移到最近对话。`))
                  remove(project.id)
              }}
            >
              <Trash2 /> 删除项目
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {open ? (
        items.length === 0 ? (
          <div className="px-2.5 py-1 text-[12.5px] text-muted-foreground/50">空项目</div>
        ) : (
          items.map((c) => <ConvItem key={c.id} conv={c} />)
        )
      ) : null}
    </div>
  )
}

function ConvItem({ conv }: { conv: Conversation }): JSX.Element {
  const activeId = useStore((s) => s.activeId)
  const open = useStore((s) => s.openConversation)
  const remove = useStore((s) => s.deleteConversation)
  const archive = useStore((s) => s.archiveConversation)
  const rename = useStore((s) => s.renameConversation)
  const togglePin = useStore((s) => s.togglePin)
  const openSplitChat = useStore((s) => s.openSplitChat)

  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(conv.title)
  const [menuOpen, setMenuOpen] = useState(false)
  const active = conv.id === activeId

  const commit = (): void => {
    if (draft.trim() && draft.trim() !== conv.title) rename(conv.id, draft.trim())
    setEditing(false)
  }

  return (
    <div
      onClick={() => open(conv.id)}
      onDoubleClick={() => {
        setDraft(conv.title)
        setEditing(true)
      }}
      className={cn(
        'group relative flex cursor-pointer items-center gap-2 rounded-lg py-[7px] pl-2.5 pr-1.5 text-[13.5px] transition-colors',
        active ? 'bg-accent text-foreground' : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground'
      )}
    >
      {/* Arc-style leading indicator: filled when active, a quiet ring otherwise. */}
      <span
        className={cn(
          'h-1.5 w-1.5 shrink-0 rounded-full transition-colors',
          active ? 'bg-primary' : 'bg-muted-foreground/30 group-hover:bg-muted-foreground/50'
        )}
      />

      {editing ? (
        <input
          autoFocus
          value={draft}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit()
            else if (e.key === 'Escape') setEditing(false)
          }}
          className="h-5 min-w-0 flex-1 rounded border border-ring bg-background px-1 text-[13px] outline-none"
        />
      ) : (
        <span className="min-w-0 flex-1 truncate">{conv.title}</span>
      )}

      {conv.pinned && !editing ? (
        <Pin className="h-3 w-3 shrink-0 text-muted-foreground/50 group-hover:hidden" />
      ) : null}

      {/* Hover actions: open-in-split + the overflow menu. Use opacity (not
          `hidden`) so the menu trigger stays in layout — otherwise Radix loses
          its anchor when the cursor leaves the row and the menu jumps to 0,0. */}
      <div
        className={cn(
          'flex shrink-0 items-center gap-0.5 transition-opacity',
          menuOpen
            ? 'opacity-100'
            : 'opacity-0 pointer-events-none group-hover:pointer-events-auto group-hover:opacity-100'
        )}
      >
        <Tip label="在分屏中打开">
          <button
            onClick={(e) => {
              e.stopPropagation()
              openSplitChat(conv.id)
            }}
            className="rounded p-0.5 text-muted-foreground/70 transition hover:text-foreground"
          >
            <SplitSquareHorizontal className="h-3.5 w-3.5" />
          </button>
        </Tip>
        <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
          <DropdownMenuTrigger asChild>
            <button
              onClick={(e) => e.stopPropagation()}
              className="rounded p-0.5 text-muted-foreground/70 transition hover:text-foreground data-[state=open]:text-foreground"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
            <DropdownMenuItem onSelect={() => togglePin(conv.id, !conv.pinned)}>
              {conv.pinned ? <PinOff /> : <Pin />} {conv.pinned ? '取消置顶' : '置顶'}
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => {
                setDraft(conv.title)
                setEditing(true)
              }}
            >
              <PencilLine /> 重命名
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => openSplitChat(conv.id)}>
              <SplitSquareHorizontal /> 在分屏打开
            </DropdownMenuItem>
            {conv.archived ? null : (
              <DropdownMenuItem onSelect={() => archive(conv.id)}>
                <Archive /> 归档
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              destructive
              onSelect={() => {
                if (window.confirm(`删除「${conv.title}」？`)) remove(conv.id)
              }}
            >
              <Trash2 /> 删除
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
