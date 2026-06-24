import { JSX, useState } from 'react'
import {
  ChevronUp,
  ChevronDown,
  Folder,
  BookText,
  FolderInput,
  Archive,
  ArchiveRestore,
  Trash2,
  Plus,
  PencilLine,
  Check
} from 'lucide-react'
import { useStore } from '../store'
import { cn } from '../lib/utils'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog'
import { Tip } from './ui/tooltip'
import type { Project } from '../types'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * Project manager — reorder (up/down), archive/restore, rename, bind a vault,
 * and delete projects in one place. Reorder writes the new `sort` order; archive
 * hides a project from the switcher without losing its data.
 */
export function ProjectsModal({ open, onOpenChange }: Props): JSX.Element {
  const projects = useStore((s) => s.projects)
  const archivedProjects = useStore((s) => s.archivedProjects)
  const reorder = useStore((s) => s.reorderProjects)
  const newProject = useStore((s) => s.newProject)

  const move = (index: number, dir: -1 | 1): void => {
    const ids = projects.map((p) => p.id)
    const j = index + dir
    if (j < 0 || j >= ids.length) return
    ;[ids[index], ids[j]] = [ids[j], ids[index]]
    reorder(ids)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>项目管理</DialogTitle>
        </DialogHeader>

        <div className="mt-1 max-h-[60vh] overflow-y-auto">
          {projects.length === 0 ? (
            <p className="px-1 py-4 text-center text-[13px] text-muted-foreground">还没有项目</p>
          ) : (
            <div className="flex flex-col gap-1">
              {projects.map((p, i) => (
                <ProjectRow
                  key={p.id}
                  project={p}
                  canUp={i > 0}
                  canDown={i < projects.length - 1}
                  onUp={() => move(i, -1)}
                  onDown={() => move(i, 1)}
                />
              ))}
            </div>
          )}

          {archivedProjects.length > 0 ? (
            <div className="mt-4">
              <div className="px-1 pb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground/55">
                已归档 ({archivedProjects.length})
              </div>
              <div className="flex flex-col gap-1">
                {archivedProjects.map((p) => (
                  <ArchivedRow key={p.id} project={p} />
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <button
          onClick={() => newProject()}
          className="mt-3 flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-border px-3 py-2 text-[13px] text-muted-foreground transition-colors hover:border-primary/50 hover:bg-accent hover:text-primary"
        >
          <Plus className="h-4 w-4" /> 新建项目
        </button>
      </DialogContent>
    </Dialog>
  )
}

function ProjectRow({
  project,
  canUp,
  canDown,
  onUp,
  onDown
}: {
  project: Project
  canUp: boolean
  canDown: boolean
  onUp: () => void
  onDown: () => void
}): JSX.Element {
  const rename = useStore((s) => s.renameProject)
  const bindDir = useStore((s) => s.bindProjectDir)
  const openVault = useStore((s) => s.openProjectVault)
  const archive = useStore((s) => s.archiveProject)
  const remove = useStore((s) => s.deleteProject)
  const bound = !!project.dir_path

  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(project.name)
  const commit = (): void => {
    const next = draft.trim()
    if (next && next !== project.name) rename(project.id, next)
    setEditing(false)
  }

  return (
    <div className="group flex items-center gap-2 rounded-lg border border-border-soft px-2.5 py-2">
      {/* reorder */}
      <div className="flex flex-col">
        <ReorderBtn disabled={!canUp} onClick={onUp}>
          <ChevronUp className="h-3.5 w-3.5" />
        </ReorderBtn>
        <ReorderBtn disabled={!canDown} onClick={onDown}>
          <ChevronDown className="h-3.5 w-3.5" />
        </ReorderBtn>
      </div>

      <Folder
        className={cn('h-4 w-4 shrink-0', bound ? 'text-primary' : 'text-muted-foreground')}
      />

      {editing ? (
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit()
            else if (e.key === 'Escape') setEditing(false)
          }}
          className="h-6 min-w-0 flex-1 rounded border border-ring bg-background px-1.5 text-[13px] text-foreground outline-none"
        />
      ) : (
        <button
          className="min-w-0 flex-1 truncate text-left text-[13.5px]"
          onDoubleClick={() => {
            setDraft(project.name)
            setEditing(true)
          }}
        >
          {project.name}
          {bound ? (
            <span className="ml-2 text-[11px] text-muted-foreground/60">· 已绑定知识库</span>
          ) : null}
        </button>
      )}

      {/* actions */}
      <div className="flex shrink-0 items-center gap-0.5">
        {editing ? (
          <RowBtn title="确定" onClick={commit}>
            <Check className="h-4 w-4 text-primary" />
          </RowBtn>
        ) : (
          <RowBtn
            title="重命名"
            onClick={() => {
              setDraft(project.name)
              setEditing(true)
            }}
          >
            <PencilLine className="h-4 w-4" />
          </RowBtn>
        )}
        {bound ? (
          <RowBtn title="打开知识库" onClick={() => openVault(project.id)}>
            <BookText className="h-4 w-4" />
          </RowBtn>
        ) : null}
        <RowBtn
          title={bound ? '更换知识库文件夹' : '绑定知识库文件夹'}
          onClick={() => bindDir(project.id)}
        >
          <FolderInput className="h-4 w-4" />
        </RowBtn>
        <RowBtn title="归档" onClick={() => archive(project.id)}>
          <Archive className="h-4 w-4" />
        </RowBtn>
        <RowBtn
          title="删除"
          danger
          onClick={() => {
            if (window.confirm(`删除项目「${project.name}」？对话会移到未归类。`))
              remove(project.id)
          }}
        >
          <Trash2 className="h-4 w-4" />
        </RowBtn>
      </div>
    </div>
  )
}

function ArchivedRow({ project }: { project: Project }): JSX.Element {
  const unarchive = useStore((s) => s.unarchiveProject)
  const remove = useStore((s) => s.deleteProject)
  return (
    <div className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-muted-foreground">
      <Folder className="h-4 w-4 shrink-0 opacity-60" />
      <span className="min-w-0 flex-1 truncate text-[13px]">{project.name}</span>
      <Tip label="恢复">
        <button
          onClick={() => unarchive(project.id)}
          className="rounded p-1 transition-colors hover:bg-accent hover:text-foreground"
        >
          <ArchiveRestore className="h-4 w-4" />
        </button>
      </Tip>
      <Tip label="删除">
        <button
          onClick={() => {
            if (window.confirm(`彻底删除项目「${project.name}」？`)) remove(project.id)
          }}
          className="rounded p-1 transition-colors hover:bg-accent hover:text-red-600"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </Tip>
    </div>
  )
}

function ReorderBtn({
  disabled,
  onClick,
  children
}: {
  disabled: boolean
  onClick: () => void
  children: JSX.Element
}): JSX.Element {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className="rounded text-muted-foreground/60 transition-colors hover:text-foreground disabled:opacity-25 disabled:hover:text-muted-foreground/60"
    >
      {children}
    </button>
  )
}

function RowBtn({
  title,
  onClick,
  danger,
  children
}: {
  title: string
  onClick: () => void
  danger?: boolean
  children: JSX.Element
}): JSX.Element {
  return (
    <Tip label={title}>
      <button
        onClick={onClick}
        className={cn(
          'rounded p-1 text-muted-foreground transition-colors hover:bg-accent',
          danger ? 'hover:text-red-600' : 'hover:text-foreground'
        )}
      >
        {children}
      </button>
    </Tip>
  )
}
