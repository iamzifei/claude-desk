import { JSX, useState } from 'react'
import { Folder, Plus, X, Square, Columns2, Rows2, Columns3, Grid2x2 } from 'lucide-react'
import { useStore } from '../store'
import { cn } from '../lib/utils'
import { Button } from './ui/button'
import { Tip } from './ui/tooltip'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem
} from './ui/dropdown-menu'
import { formatAccelerator, isMac } from '../shortcuts'
import type { LayoutPreset } from '../types'

const LAYOUTS: { v: LayoutPreset; label: string; icon: typeof Square }[] = [
  { v: 'single', label: '单栏', icon: Square },
  { v: 'col-2', label: '左右两栏', icon: Columns2 },
  { v: 'row-2', label: '上下两栏', icon: Rows2 },
  { v: 'col-3', label: '三栏', icon: Columns3 },
  { v: 'quad', label: '四象限', icon: Grid2x2 }
]

/** Top-level workspace tabs, matching 牛马AI's top bar. */
export function WorkspaceTabs(): JSX.Element {
  const workspaces = useStore((s) => s.workspaces)
  const activeId = useStore((s) => s.activeWorkspaceId)
  const switchWs = useStore((s) => s.switchWorkspace)
  const newWs = useStore((s) => s.newWorkspace)
  const renameWs = useStore((s) => s.renameWorkspace)
  const removeWs = useStore((s) => s.removeWorkspace)
  const newWsKey = useStore((s) => s.shortcuts['new-workspace'])
  const layout = useStore((s) => s.layout)
  const setLayout = useStore((s) => s.setLayout)
  const splitKey = useStore((s) => s.shortcuts['new-split'])
  const CurrentLayoutIcon = (LAYOUTS.find((l) => l.v === layout) ?? LAYOUTS[0]).icon

  const [editing, setEditing] = useState<string | null>(null)
  const [draft, setDraft] = useState('')

  const beginEdit = (id: string, name: string): void => {
    setEditing(id)
    setDraft(name)
  }
  const commit = (): void => {
    if (editing) renameWs(editing, draft)
    setEditing(null)
  }

  return (
    // This is now the top window bar: draggable, with left clearance for the
    // macOS traffic lights. Interactive children opt out of dragging (no-drag).
    <div
      className={cn(
        'drag-region flex h-10 shrink-0 items-center gap-1 border-b border-border-soft bg-sidebar pr-3',
        isMac ? 'pl-[78px]' : 'pl-3'
      )}
    >
      {workspaces.map((w) =>
        editing === w.id ? (
          <input
            key={w.id}
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commit()
              else if (e.key === 'Escape') setEditing(null)
            }}
            className="no-drag h-7 w-[140px] rounded-lg border border-ring bg-background px-2.5 text-[13px] outline-none"
          />
        ) : (
          <div
            key={w.id}
            onClick={() => switchWs(w.id)}
            onDoubleClick={() => beginEdit(w.id, w.name)}
            title={`${w.name}（双击重命名）`}
            className={cn(
              'group/ws no-drag flex cursor-pointer items-center gap-1.5 rounded-lg py-1.5 pl-3 pr-1.5 text-[13px] transition-colors',
              w.id === activeId
                ? 'bg-accent font-medium text-foreground'
                : 'text-muted-foreground hover:bg-accent/60'
            )}
          >
            <Folder className="h-3.5 w-3.5 shrink-0" />
            <span className="max-w-[140px] truncate">{w.name}</span>
            {workspaces.length > 1 ? (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  if (window.confirm(`关闭工作区「${w.name}」？它下面的对话会一并删除。`))
                    removeWs(w.id)
                }}
                title="关闭工作区"
                className="rounded p-0.5 text-muted-foreground/60 opacity-0 transition hover:bg-background/60 hover:text-foreground group-hover/ws:opacity-100"
              >
                <X className="h-3 w-3" />
              </button>
            ) : (
              <span className="w-3.5" />
            )}
          </div>
        )
      )}
      <Tip label={`新建工作区 ${formatAccelerator(newWsKey)}`}>
        <Button variant="ghost" size="icon-sm" className="no-drag" onClick={() => newWs()}>
          <Plus className="h-4 w-4" />
        </Button>
      </Tip>
      <DropdownMenu>
        <Tip label={`窗格布局 ${formatAccelerator(splitKey)}`}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              className={cn('no-drag ml-auto', layout !== 'single' && 'text-primary')}
            >
              <CurrentLayoutIcon className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
        </Tip>
        <DropdownMenuContent align="end">
          {LAYOUTS.map((l) => (
            <DropdownMenuItem
              key={l.v}
              onSelect={() => setLayout(l.v)}
              className={cn(layout === l.v && 'text-primary')}
            >
              <l.icon className="h-4 w-4" /> {l.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
