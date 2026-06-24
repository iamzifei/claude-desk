import { JSX, useCallback, useEffect, useMemo, useState } from 'react'
import {
  Folder,
  FolderOpen,
  FileText,
  FilePlus2,
  FolderPlus,
  RefreshCw,
  MoreHorizontal,
  Trash2,
  PencilLine,
  Library,
  Star
} from 'lucide-react'
import { useStore } from '../store'
import { cn } from '../lib/utils'
import { isFavorited } from '../dnd'
import { FilePreview } from './FilePreview'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem
} from './ui/dropdown-menu'
import type { Project, VaultNode, SplitTarget } from '../types'

/**
 * 知识库 (Vault) — browse and edit the Markdown folder bound to a project.
 * The disk folder is the source of truth (Obsidian-compatible): the tree mirrors
 * real files, edits write straight back, and external changes flow in via the
 * vault watcher (`vault:changed`).
 */
export function VaultView(): JSX.Element {
  const projects = useStore((s) => s.projects)
  const activeProjectId = useStore((s) => s.activeProjectId)
  const conv = useStore((s) => s.conversations.find((c) => c.id === s.activeId))
  const bindProjectDir = useStore((s) => s.bindProjectDir)
  const newProject = useStore((s) => s.newProject)

  // Project resolution order: explicit selection (sidebar) → active
  // conversation's project → first bound project → first project at all.
  const project: Project | undefined = useMemo(() => {
    const explicit = projects.find((p) => p.id === activeProjectId)
    if (explicit) return explicit
    const own = projects.find((p) => p.id === conv?.project_id)
    if (own?.dir_path) return own
    return projects.find((p) => p.dir_path) ?? own ?? projects[0]
  }, [projects, activeProjectId, conv?.project_id])

  const projectId = project?.id ?? null
  const bound = !!project?.dir_path

  const [tree, setTree] = useState<VaultNode | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [stats, setStats] = useState<{ files: number; links: number } | null>(null)

  const reloadTree = useCallback(async (): Promise<void> => {
    if (!projectId) return
    setTree(await window.api.vault.tree(projectId))
  }, [projectId])

  // Start watching + initial index whenever the bound project changes. When
  // unbound, the component renders the Empty state below, so a stale tree is
  // never shown — no need to clear it synchronously here.
  useEffect(() => {
    if (!projectId || !bound) return
    let alive = true
    window.api.vault.watch(projectId).then(() => {
      if (alive) reloadTree()
    })
    const off = window.api.vault.onChanged((changed) => {
      if (changed === projectId) reloadTree()
    })
    return () => {
      alive = false
      off()
    }
  }, [projectId, bound, reloadTree])

  const reindex = async (): Promise<void> => {
    if (!projectId) return
    setStats(await window.api.vault.reindex(projectId))
    await reloadTree()
  }

  const newNote = async (): Promise<void> => {
    if (!projectId) return
    const base = '未命名'
    const existing = new Set(flatten(tree).map((n) => n.rel))
    let rel = `${base}.md`
    for (let i = 2; existing.has(rel); i++) rel = `${base}-${i}.md`
    await window.api.vault.create(projectId, rel, 'file')
    await reloadTree()
    setSelected(rel)
  }

  const newFolder = async (): Promise<void> => {
    if (!projectId) return
    const existing = new Set(flatten(tree).map((n) => n.rel))
    let rel = '新建文件夹'
    for (let i = 2; existing.has(rel); i++) rel = `新建文件夹-${i}`
    await window.api.vault.create(projectId, rel, 'dir')
    await reloadTree()
  }

  // Rename to a new leaf name (Electron has no window.prompt — the tree row
  // edits inline and hands the new name here).
  const rename = async (node: VaultNode, nextName: string): Promise<void> => {
    if (!projectId) return
    const trimmed = nextName.trim()
    if (!trimmed || trimmed === node.name) return
    const parent = node.rel.includes('/') ? node.rel.slice(0, node.rel.lastIndexOf('/') + 1) : ''
    const to = parent + trimmed
    await window.api.vault.rename(projectId, node.rel, to)
    if (selected === node.rel) setSelected(to)
    await reloadTree()
  }

  const remove = async (node: VaultNode): Promise<void> => {
    if (!projectId) return
    if (!window.confirm(`删除「${node.name}」？此操作会从磁盘移除文件。`)) return
    await window.api.vault.remove(projectId, node.rel)
    if (selected === node.rel) setSelected(null)
    await reloadTree()
  }

  // ---- empty states --------------------------------------------------------
  if (!project) {
    return (
      <Empty
        title="还没有项目"
        hint="知识库挂在项目上。先新建一个项目，再绑定它的 Obsidian 文件夹。"
        action={{ label: '新建项目', onClick: newProject }}
      />
    )
  }
  if (!bound) {
    return (
      <Empty
        title={`项目「${project.name}」未绑定知识库`}
        hint="选择一个文件夹（可直接选你的 Obsidian vault），它的 Markdown 文件会作为知识库载入。"
        action={{ label: '绑定知识库文件夹', onClick: () => bindProjectDir(project.id) }}
      />
    )
  }

  return (
    <div className="flex min-h-0 flex-1">
      {/* file tree */}
      <div className="flex w-[248px] shrink-0 flex-col border-r border-border bg-sidebar/40">
        <div className="flex h-9 shrink-0 items-center gap-1 px-2.5">
          <Library className="h-4 w-4 text-primary" />
          <span
            className="flex-1 truncate text-[12.5px] font-medium"
            title={project.dir_path ?? ''}
          >
            {project.name}
          </span>
          <IconBtn title="新建笔记" onClick={newNote}>
            <FilePlus2 className="h-4 w-4" />
          </IconBtn>
          <IconBtn title="新建文件夹" onClick={newFolder}>
            <FolderPlus className="h-4 w-4" />
          </IconBtn>
          <IconBtn title="重新索引" onClick={reindex}>
            <RefreshCw className="h-4 w-4" />
          </IconBtn>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-1.5 pb-2">
          {tree && (tree.children?.length ?? 0) > 0 ? (
            tree.children!.map((n) => (
              <TreeNode
                key={n.rel}
                node={n}
                depth={0}
                projectId={project.id}
                selected={selected}
                onSelect={setSelected}
                onRename={rename}
                onRemove={remove}
              />
            ))
          ) : (
            <div className="px-2 py-3 text-[12.5px] text-muted-foreground/60">空知识库</div>
          )}
        </div>
        {stats ? (
          <div className="shrink-0 border-t border-border-soft px-3 py-1.5 text-[11px] text-muted-foreground/60">
            {stats.files} 篇 · {stats.links} 条链接
          </div>
        ) : null}
      </div>

      {/* preview / editor — md edits, images & pdf embed, others fall back */}
      {selected && projectId ? (
        <FilePreview key={`${projectId}:${selected}`} projectId={projectId} rel={selected} />
      ) : (
        <div className="m-auto max-w-[260px] px-6 text-center text-[13px] text-muted-foreground/70">
          从左侧选择一个文件预览
        </div>
      )}
    </div>
  )
}

// ---- tree node --------------------------------------------------------------

interface TreeNodeProps {
  node: VaultNode
  depth: number
  projectId: string
  selected: string | null
  onSelect: (rel: string) => void
  onRename: (n: VaultNode, nextName: string) => void
  onRemove: (n: VaultNode) => void
}

function TreeNode({
  node,
  depth,
  projectId,
  selected,
  onSelect,
  onRename,
  onRemove
}: TreeNodeProps): JSX.Element {
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(node.name)
  const favorites = useStore((s) => s.favorites)
  const toggleFavorite = useStore((s) => s.toggleFavorite)
  const isSel = selected === node.rel
  const favTarget: SplitTarget = { kind: 'vault-file', projectId, rel: node.rel }
  const fav = !node.isDir && isFavorited(favorites, favTarget)

  const startEdit = (): void => {
    setDraft(node.name)
    setEditing(true)
  }
  const commit = (): void => {
    setEditing(false)
    onRename(node, draft)
  }

  return (
    <div>
      <div
        className={cn(
          'group/row flex items-center gap-1.5 rounded-md py-1 pr-1 text-[13px] transition-colors',
          isSel
            ? 'bg-accent text-foreground'
            : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground'
        )}
        style={{ paddingLeft: 6 + depth * 12 }}
      >
        <button
          className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
          onClick={() => (node.isDir ? setOpen((o) => !o) : onSelect(node.rel))}
          onDoubleClick={startEdit}
        >
          {node.isDir ? (
            open ? (
              <FolderOpen className="h-4 w-4 shrink-0 text-primary" />
            ) : (
              <Folder className="h-4 w-4 shrink-0 text-primary" />
            )
          ) : (
            <FileText className="h-4 w-4 shrink-0 opacity-70" />
          )}
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
            <span className="truncate">{node.name}</span>
          )}
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger className="rounded p-0.5 text-muted-foreground opacity-0 outline-none transition-opacity hover:text-foreground group-hover/row:opacity-100 data-[state=open]:opacity-100">
            <MoreHorizontal className="h-3.5 w-3.5" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => setTimeout(startEdit, 0)}>
              <PencilLine className="h-3.5 w-3.5" /> 重命名
            </DropdownMenuItem>
            {!node.isDir ? (
              <DropdownMenuItem onSelect={() => toggleFavorite(favTarget)}>
                <Star className={cn('h-3.5 w-3.5', fav && 'fill-current text-primary')} />{' '}
                {fav ? '从收藏夹移除' : '添加到收藏夹'}
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuItem onSelect={() => onRemove(node)} className="text-red-600">
              <Trash2 className="h-3.5 w-3.5" /> 删除
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {node.isDir && open
        ? (node.children ?? []).map((c) => (
            <TreeNode
              key={c.rel}
              node={c}
              depth={depth + 1}
              projectId={projectId}
              selected={selected}
              onSelect={onSelect}
              onRename={onRename}
              onRemove={onRemove}
            />
          ))
        : null}
    </div>
  )
}

// ---- helpers ----------------------------------------------------------------

/** Flatten a tree into all its nodes (for name-collision checks). */
function flatten(tree: VaultNode | null): VaultNode[] {
  if (!tree) return []
  const out: VaultNode[] = []
  const walk = (n: VaultNode): void => {
    if (n.rel) out.push(n)
    for (const c of n.children ?? []) walk(c)
  }
  walk(tree)
  return out
}

function IconBtn({
  title,
  onClick,
  children
}: {
  title: string
  onClick: () => void
  children: JSX.Element
}): JSX.Element {
  return (
    <button
      title={title}
      onClick={onClick}
      className="rounded p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
    >
      {children}
    </button>
  )
}

function Empty({
  title,
  hint,
  action
}: {
  title: string
  hint: string
  action: { label: string; onClick: () => void }
}): JSX.Element {
  return (
    <div className="m-auto max-w-[300px] px-6 text-center">
      <Library className="mx-auto mb-3 h-9 w-9 text-muted-foreground/50" strokeWidth={1.5} />
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">{hint}</p>
      <button
        onClick={action.onClick}
        className="mt-3.5 rounded-lg bg-primary px-3.5 py-2 text-[13px] font-medium text-primary-foreground transition-colors hover:bg-primary/90"
      >
        {action.label}
      </button>
    </div>
  )
}
