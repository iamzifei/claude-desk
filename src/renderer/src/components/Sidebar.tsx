import { JSX, useEffect, useState, type ReactNode } from 'react'
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
  BookText,
  Layers,
  Check,
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
  SlidersHorizontal,
  UserRound,
  Copy,
  HelpCircle,
  FileDown,
  Star,
  X,
  Workflow,
  type LucideIcon
} from 'lucide-react'
import { useStore } from '../store'
import { cn } from '../lib/utils'
import { formatAccelerator } from '../shortcuts'
import { Logo } from './Logo'
import { ProjectsModal } from './ProjectsModal'
import { groupConversations } from '../group-conversations'
import {
  setDragTarget,
  hasPaneDrop,
  getDragTarget,
  hasSkillDrag,
  getSkillDrag,
  setSkillDrag,
  isFavorited
} from '../dnd'
import type { Conversation, SplitTarget, Favorite } from '../types'
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
  | 'scheduled'
  | 'review'
  | 'minutes'
  | 'daily'
  | 'browser'
  | 'skills'
  | 'coding'
  | 'materials'
  | 'personas'
  | 'atoms'
  | 'topics'
  | 'tags'
  | 'graph'
  | 'publish'
  | 'rewrite'
  | 'vault'
  | 'creations'
interface NavItem {
  icon: LucideIcon
  label: string
  action: NavAction
}

// 项目为中心的两组导航：常驻「创作」组 = 产品主轴（素材→原子→选题→改写→发布，
// 知识库与图谱并列）；「更多」组（默认折叠）收纳低频的笔记与开发类工具，降低首屏
// 认知负担。新建/搜索提升为顶部快捷行，不再混在导航里。
const CREATE_ITEMS: NavItem[] = [
  { icon: Workflow, label: '创作流水线', action: 'creations' },
  { icon: BookText, label: '知识库', action: 'vault' },
  { icon: Library, label: '素材库', action: 'materials' },
  { icon: Atom, label: '知识原子', action: 'atoms' },
  { icon: Tags, label: '标签', action: 'tags' },
  { icon: Network, label: '知识图谱', action: 'graph' },
  { icon: Lightbulb, label: '选题库', action: 'topics' },
  { icon: UserRound, label: '人设', action: 'personas' },
  { icon: Repeat2, label: '多平台改写', action: 'rewrite' },
  { icon: TrendingUp, label: '成稿库', action: 'publish' }
]
const MORE_ITEMS: NavItem[] = [
  { icon: CalendarDays, label: '每日笔记', action: 'daily' },
  { icon: BarChart3, label: '每日回顾', action: 'review' },
  { icon: ClipboardList, label: '会议纪要', action: 'minutes' },
  { icon: Puzzle, label: '技能', action: 'skills' },
  { icon: Clock, label: '定时任务', action: 'scheduled' },
  { icon: Globe, label: '浏览器', action: 'browser' },
  { icon: Code2, label: '编程', action: 'coding' }
]

export function Sidebar({ onOpenSettings }: Props): JSX.Element {
  const conversations = useStore((s) => s.conversations)
  const archived = useStore((s) => s.archived)
  const search = useStore((s) => s.search)
  const create = useStore((s) => s.newConversation)
  const ws = useStore((s) => s.activeWorkspaceId)
  const view = useStore((s) => s.view)
  const setView = useStore((s) => s.setView)
  const setQuickOpen = useStore((s) => s.setQuickOpen)
  const shortcuts = useStore((s) => s.shortcuts)
  const scope = useStore((s) => s.projectScope)
  const setDragKind = useStore((s) => s.setDragKind)
  const setTourOpen = useStore((s) => s.setTourOpen)
  const favorites = useStore((s) => s.favorites)
  const toggleFavorite = useStore((s) => s.toggleFavorite)

  const [results, setResults] = useState<Conversation[] | null>(null)
  const [showArchived, setShowArchived] = useState(false)
  const [showMore, setShowMore] = useState(false)

  // The project the new-conversation button creates into (null under 全部/未归类).
  const currentProjectId = scope !== 'all' && scope !== 'unfiled' ? scope : null

  // Modules: draggable into the work area, and favoritable via a hover star.
  const renderNavItem = (item: NavItem): JSX.Element => {
    const t: SplitTarget = { kind: 'view', view: item.action }
    const fav = isFavorited(favorites, t)
    return (
      <div key={item.label} className="group/nav relative flex items-center">
        <button
          draggable
          onDragStart={(e) => {
            setDragTarget(e, t)
            setDragKind('pane')
          }}
          onDragEnd={() => setDragKind(null)}
          onClick={() => setView(item.action)}
          className={cn(
            'flex flex-1 items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13.5px] transition-colors',
            item.action === view
              ? 'bg-accent text-foreground'
              : 'text-muted-foreground hover:bg-accent hover:text-foreground'
          )}
        >
          <item.icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
          <span className="flex-1 text-left">{item.label}</span>
        </button>
        <button
          onClick={() => toggleFavorite(t)}
          title={fav ? '从收藏夹移除' : '添加到收藏夹'}
          className={cn(
            'absolute right-1.5 rounded p-0.5 transition',
            fav
              ? 'text-primary'
              : 'text-muted-foreground/40 opacity-0 hover:text-primary group-hover/nav:opacity-100'
          )}
        >
          <Star className={cn('h-3.5 w-3.5', fav && 'fill-current')} />
        </button>
      </div>
    )
  }

  useEffect(() => {
    if (!search.trim() || !ws) {
      setResults(null)
      return
    }
    const t = setTimeout(
      async () => setResults(await window.api.conversations.search(ws, search)),
      180
    )
    return () => clearTimeout(t)
  }, [search, ws])

  // Conversations scoped to the current project (the hero switcher above):
  // 全部 → everything, 未归类 → only ungrouped, <project> → that project's chats.
  const scoped = (results ?? conversations).filter((c) =>
    scope === 'all' ? true : scope === 'unfiled' ? !c.project_id : c.project_id === scope
  )
  const convGroups = groupConversations(scoped, Date.now())

  return (
    <aside className="flex min-h-0 flex-col bg-sidebar">
      <div className="flex items-center gap-2 px-4 pb-2 pt-1">
        <Logo className="h-6 w-6 rounded-[7px] shadow-sm" />
        <span className="text-sm font-semibold tracking-tight">
          灵犀 <span className="text-muted-foreground/70">桌面版</span>
        </span>
      </div>

      {/* Hero: the active project drives scope for both conversations and assets. */}
      <ProjectBar />

      {/* Quick actions — pinned above the scroll region for one-click reach. */}
      <div className="flex gap-1 px-3 pb-1.5 pt-1">
        <button
          onClick={() => create(currentProjectId)}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary px-2.5 py-1.5 text-[12.5px] font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <PencilLine className="h-3.5 w-3.5" /> 新建对话
        </button>
        <Tip label={`搜索 ${formatAccelerator(shortcuts['quick-switch'])}`}>
          <button
            onClick={() => setQuickOpen(true)}
            className="flex items-center justify-center rounded-lg border border-border-soft px-2.5 py-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <Search className="h-4 w-4" />
          </button>
        </Tip>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        {/* 收藏 — Finder-style pinned shortcuts (drag a pane/module here). */}
        <FavoritesBar />

        {/* 对话 — scoped to the current project (short, so it sits above nav). */}
        <div className="px-2 pb-1 pt-1">
          <SectionLabel>对话</SectionLabel>
          {scoped.length === 0 ? (
            <div className="px-2.5 py-1.5 text-[12.5px] text-muted-foreground/60">
              {search ? '没有匹配' : currentProjectId ? '此项目还没有对话' : '还没有开始对话'}
            </div>
          ) : (
            convGroups.map((g) => (
              <div key={g.key} className="mb-0.5">
                <div className="flex items-center gap-1 px-2.5 pb-0.5 pt-1 text-[10.5px] font-medium uppercase tracking-wider text-muted-foreground/45">
                  {g.key === 'pinned' ? <Pin className="h-2.5 w-2.5" /> : null}
                  {g.label}
                </div>
                {g.items.map((c) => (
                  <ConvItem key={c.id} conv={c} />
                ))}
              </div>
            ))
          )}

          {archived.length > 0 ? (
            <div className="mt-0.5">
              <button
                onClick={() => setShowArchived((v) => !v)}
                className="flex w-full items-center gap-1 px-2.5 py-1 text-[10.5px] font-medium uppercase tracking-wider text-muted-foreground/45 transition-colors hover:text-muted-foreground"
              >
                {showArchived ? (
                  <ChevronDown className="h-3 w-3" />
                ) : (
                  <ChevronRight className="h-3 w-3" />
                )}
                归档
                <span className="ml-auto">{archived.length}</span>
              </button>
              {showArchived ? archived.map((c) => <ConvItem key={c.id} conv={c} />) : null}
            </div>
          ) : null}
        </div>

        {/* 创作 — the core asset/creation loop (always visible). */}
        <nav className="flex flex-col px-2 pb-1 pt-1.5">
          <SectionLabel>创作</SectionLabel>
          <div className="flex flex-col gap-px">{CREATE_ITEMS.map(renderNavItem)}</div>
        </nav>

        {/* 更多 — low-frequency notes + dev tools, collapsed by default. */}
        <nav className="flex flex-col px-2 pb-2">
          <button
            onClick={() => setShowMore((v) => !v)}
            className="flex w-full items-center gap-1 px-2.5 pb-0.5 pt-1 text-[11px] font-medium text-muted-foreground/55 transition-colors hover:text-muted-foreground"
          >
            {showMore ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            更多
          </button>
          {showMore ? (
            <div className="flex flex-col gap-px">{MORE_ITEMS.map(renderNavItem)}</div>
          ) : null}
        </nav>
      </div>

      <div className="flex items-center justify-between border-t border-border-soft px-3 py-2.5">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
            J
          </div>
          <span className="text-[13px] text-muted-foreground">James</span>
        </div>
        <div className="flex items-center gap-0.5">
          <Tip label="新手引导">
            <button
              onClick={() => setTourOpen(true)}
              className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <HelpCircle className="h-4 w-4" />
            </button>
          </Tip>
          <Tip label="设置">
            <button
              onClick={onOpenSettings}
              className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <Settings className="h-4 w-4" />
            </button>
          </Tip>
        </div>
      </div>
    </aside>
  )
}

// Display label for a pinned favorite (view → nav label, chat → title, file → name).
const VIEW_LABELS: Record<string, string> = Object.fromEntries(
  [...CREATE_ITEMS, ...MORE_ITEMS].map((it) => [it.action, it.label])
)

/**
 * Finder-style favorites: a sidebar drop zone that pins panes/modules dragged
 * from the work area, AND skills dragged from the 技能 view. Pane favorites open
 * on click + drag back out; skill favorites drag into a conversation to invoke
 * them (handy for frequently-used skills instead of `/`-searching).
 */
function FavoritesBar(): JSX.Element | null {
  const favorites = useStore((s) => s.favorites)
  const addFavorite = useStore((s) => s.addFavorite)
  const removeFavorite = useStore((s) => s.removeFavorite)
  const openPrimary = useStore((s) => s.openTargetPrimary)
  const dragKind = useStore((s) => s.dragKind)
  const setDragKind = useStore((s) => s.setDragKind)
  const conversations = useStore((s) => s.conversations)
  const paneDragFrom = useStore((s) => s.paneDragFrom)
  const paneDropAt = useStore((s) => s.paneDropAt)
  const [over, setOver] = useState(false)
  // any draggable in flight (native skill/module, or pointer-driven pane)
  const dragging = dragKind !== null || paneDragFrom !== null
  const highlight = over || paneDropAt === 'fav' // pointer pane hovering the zone

  const labelOf = (t: Favorite): string =>
    t.kind === 'skill'
      ? t.name
      : t.kind === 'view'
        ? (VIEW_LABELS[t.view] ?? t.view)
        : t.kind === 'chat'
          ? (conversations.find((c) => c.id === t.id)?.title ?? '对话')
          : (t.rel.split('/').pop() ?? '文件')

  return (
    <div className="px-2 pb-1 pt-1">
      <SectionLabel>收藏</SectionLabel>
      <div
        data-favzone
        onDragOver={(e) => {
          if (hasPaneDrop(e) || hasSkillDrag(e)) {
            e.preventDefault()
            e.dataTransfer.dropEffect = 'copy' // ensure the drop is permitted
            setOver(true)
          }
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          setOver(false)
          const skill = getSkillDrag(e)
          if (skill) {
            e.preventDefault()
            addFavorite({ kind: 'skill', name: skill.name, slug: skill.slug })
            return
          }
          const t = getDragTarget(e)
          if (t) {
            e.preventDefault()
            addFavorite(t)
          }
        }}
        className={cn(
          'rounded-lg border border-dashed transition-colors',
          highlight
            ? 'border-primary bg-primary-soft/40'
            : dragging
              ? 'border-primary/50 bg-primary-soft/20'
              : favorites.length
                ? 'border-transparent'
                : 'border-border/70'
        )}
      >
        {favorites.length === 0 ? (
          <div className="flex items-center gap-1 px-2 py-1.5 text-[11.5px] text-muted-foreground/60">
            {dragging ? (
              <>
                松手收藏到这里 <Star className="h-3 w-3 fill-current" />
              </>
            ) : (
              '把窗格、模块或技能拖到这里收藏'
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-px p-0.5">
            {favorites.map((t, i) => (
              <div
                key={i}
                draggable
                onDragStart={(e) => {
                  if (t.kind === 'skill') {
                    setSkillDrag(e, { name: t.name, slug: t.slug })
                    setDragKind('skill')
                  } else {
                    setDragTarget(e, t)
                    setDragKind('pane')
                  }
                }}
                onDragEnd={() => setDragKind(null)}
                onClick={() => {
                  if (t.kind !== 'skill') openPrimary(t)
                }}
                title={t.kind === 'skill' ? '拖进对话即可调用此技能' : undefined}
                className={cn(
                  'group flex items-center gap-2 rounded-md px-1.5 py-1 text-[13px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground',
                  t.kind === 'skill' ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'
                )}
              >
                {t.kind === 'skill' ? (
                  <Puzzle className="h-3.5 w-3.5 shrink-0 text-primary/60" />
                ) : (
                  <Star className="h-3.5 w-3.5 shrink-0 text-primary/60" />
                )}
                <span className="min-w-0 flex-1 truncate">
                  {t.kind === 'skill' ? (
                    <span className="font-mono text-[12px]">/{t.slug}</span>
                  ) : (
                    labelOf(t)
                  )}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    removeFavorite(i)
                  }}
                  title="移除收藏"
                  className="rounded p-0.5 text-muted-foreground/50 opacity-0 transition hover:text-foreground group-hover:opacity-100"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function SectionLabel({ children }: { children: ReactNode }): JSX.Element {
  return (
    <div className="px-2.5 pb-0.5 pt-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground/55">
      {children}
    </div>
  )
}

/**
 * Hero project switcher — the app's primary scope control. Selecting a project
 * filters the conversation list AND every asset view (素材/原子/标签/图谱/选题/
 * 发布) + graph to it. 全部 shows everything; 未归类 shows items with no project.
 * Per-project management (rename / bind / open / delete / new) lives here too,
 * so the concept exists in exactly one place.
 */
function ProjectBar(): JSX.Element {
  const projects = useStore((s) => s.projects)
  const scope = useStore((s) => s.projectScope)
  const setScope = useStore((s) => s.setProjectScope)
  const newProject = useStore((s) => s.newProject)
  const rename = useStore((s) => s.renameProject)
  const remove = useStore((s) => s.deleteProject)
  const archive = useStore((s) => s.archiveProject)
  const bindDir = useStore((s) => s.bindProjectDir)
  const openVault = useStore((s) => s.openProjectVault)

  const current = projects.find((p) => p.id === scope)
  const label =
    scope === 'all' ? '全部项目' : scope === 'unfiled' ? '未归类' : (current?.name ?? '项目')

  const [manageOpen, setManageOpen] = useState(false)

  // Inline rename of the current project (Electron has no window.prompt).
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const startEdit = (): void => {
    if (!current) return
    setDraft(current.name)
    setEditing(true)
  }
  const commit = (): void => {
    const next = draft.trim()
    if (current && next && next !== current.name) rename(current.id, next)
    setEditing(false)
  }

  return (
    <div className="flex items-center gap-1 px-3 pb-1.5">
      {editing && current ? (
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit()
            else if (e.key === 'Escape') setEditing(false)
          }}
          className="h-8 min-w-0 flex-1 rounded-lg border border-ring bg-background px-2.5 text-[12.5px] text-foreground outline-none"
        />
      ) : (
        <DropdownMenu>
          <DropdownMenuTrigger className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-border-soft bg-background/60 px-2.5 py-1.5 text-[12.5px] text-foreground outline-none transition-colors hover:bg-accent focus-visible:bg-accent">
            <Folder className="h-3.5 w-3.5 shrink-0 text-primary" />
            <span className="min-w-0 flex-1 truncate text-left font-medium">{label}</span>
            <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="max-h-[60vh] w-[208px] overflow-y-auto">
            <ScopeRow value="all" text="全部项目" scope={scope} onPick={setScope} icon={Layers} />
            <ScopeRow
              value="unfiled"
              text="未归类"
              scope={scope}
              onPick={setScope}
              icon={FolderInput}
            />
            {projects.length > 0 ? <DropdownMenuSeparator /> : null}
            {projects.map((p) => (
              <ScopeRow
                key={p.id}
                value={p.id}
                text={p.name}
                scope={scope}
                onPick={setScope}
                icon={Folder}
              />
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => newProject()}>
              <Plus /> 新建项目
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setManageOpen(true)}>
              <SlidersHorizontal /> 管理项目…
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* Open this project's knowledge base directly (only when bound). */}
      {current?.dir_path ? (
        <Tip label="打开知识库">
          <button
            onClick={() => openVault(current.id)}
            className="rounded-lg p-1.5 text-primary/80 transition-colors hover:bg-accent hover:text-primary"
          >
            <BookText className="h-4 w-4" />
          </button>
        </Tip>
      ) : null}

      {/* Manage the current project (rename / bind / delete). */}
      {current ? (
        <DropdownMenu>
          <DropdownMenuTrigger className="rounded-lg p-1.5 text-muted-foreground outline-none transition-colors hover:bg-accent hover:text-foreground focus-visible:bg-accent">
            <MoreHorizontal className="h-4 w-4" />
          </DropdownMenuTrigger>
          {/* Prevent Radix from restoring focus to the trigger on close — otherwise
              it steals focus from the rename input we mount, which then blurs and
              commits instantly (looked like 重命名 "没反应"). */}
          <DropdownMenuContent align="end" onCloseAutoFocus={(e) => e.preventDefault()}>
            <DropdownMenuItem onSelect={() => startEdit()}>
              <PencilLine /> 重命名
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => bindDir(current.id)}>
              <FolderInput /> {current.dir_path ? '更换知识库文件夹' : '绑定知识库文件夹'}
            </DropdownMenuItem>
            {current.dir_path ? (
              <DropdownMenuItem onSelect={() => openVault(current.id)}>
                <BookText /> 打开知识库
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuItem onSelect={() => setManageOpen(true)}>
              <SlidersHorizontal /> 管理项目…
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => archive(current.id)}>
              <Archive /> 归档项目
            </DropdownMenuItem>
            <DropdownMenuItem
              destructive
              onSelect={() => {
                if (window.confirm(`删除项目「${current.name}」？对话会移到未归类。`))
                  remove(current.id)
              }}
            >
              <Trash2 /> 删除项目
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}

      <ProjectsModal open={manageOpen} onOpenChange={setManageOpen} />
    </div>
  )
}

/** One selectable scope row in the project switcher dropdown. */
function ScopeRow({
  value,
  text,
  scope,
  onPick,
  icon: Icon
}: {
  value: string
  text: string
  scope: string
  onPick: (v: string) => void
  icon: LucideIcon
}): JSX.Element {
  return (
    <DropdownMenuItem onSelect={() => onPick(value)}>
      <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      <span className="flex-1 truncate">{text}</span>
      {scope === value ? <Check className="h-3.5 w-3.5 text-primary" /> : null}
    </DropdownMenuItem>
  )
}

function ConvItem({ conv }: { conv: Conversation }): JSX.Element {
  const activeId = useStore((s) => s.activeId)
  const open = useStore((s) => s.openConversation)
  const remove = useStore((s) => s.deleteConversation)
  const archive = useStore((s) => s.archiveConversation)
  const rename = useStore((s) => s.renameConversation)
  const togglePin = useStore((s) => s.togglePin)
  const exportToVault = useStore((s) => s.exportConversationToVault)
  const setDragKind = useStore((s) => s.setDragKind)
  const favorites = useStore((s) => s.favorites)
  const toggleFavorite = useStore((s) => s.toggleFavorite)
  const isFav = isFavorited(favorites, { kind: 'chat', id: conv.id })
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
      draggable={!editing}
      onDragStart={(e) => {
        setDragTarget(e, { kind: 'chat', id: conv.id })
        setDragKind('pane')
      }}
      onDragEnd={() => setDragKind(null)}
      onClick={() => open(conv.id)}
      onDoubleClick={() => {
        setDraft(conv.title)
        setEditing(true)
      }}
      className={cn(
        'group relative flex cursor-pointer items-center gap-2 rounded-lg py-[7px] pl-2.5 pr-1.5 text-[13.5px] transition-colors',
        active
          ? 'bg-accent text-foreground'
          : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground'
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
            <DropdownMenuItem onSelect={() => navigator.clipboard?.writeText(conv.id)}>
              <Copy /> 复制 Session ID
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => toggleFavorite({ kind: 'chat', id: conv.id })}>
              <Star className={cn(isFav && 'fill-current text-primary')} />{' '}
              {isFav ? '从收藏夹移除' : '添加到收藏夹'}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => exportToVault(conv.id)}>
              <FileDown /> 导出到知识库
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
