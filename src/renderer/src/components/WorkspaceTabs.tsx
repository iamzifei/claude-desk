import { JSX, useState } from 'react'
import { Folder, Plus, SplitSquareHorizontal } from 'lucide-react'
import { useStore } from '../store'
import { cn } from '../lib/utils'
import { Button } from './ui/button'
import { Tip } from './ui/tooltip'
import { formatAccelerator } from '../shortcuts'

/** Top-level workspace tabs, matching 牛马AI's top bar. */
export function WorkspaceTabs(): JSX.Element {
  const workspaces = useStore((s) => s.workspaces)
  const activeId = useStore((s) => s.activeWorkspaceId)
  const switchWs = useStore((s) => s.switchWorkspace)
  const newWs = useStore((s) => s.newWorkspace)
  const renameWs = useStore((s) => s.renameWorkspace)
  const newWsKey = useStore((s) => s.shortcuts['new-workspace'])
  const splitView = useStore((s) => s.splitView)
  const toggleSplit = useStore((s) => s.toggleSplit)
  const splitKey = useStore((s) => s.shortcuts['new-split'])

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
    <div className="flex h-10 shrink-0 items-center gap-1 border-b border-border-soft px-3">
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
            className="h-7 w-[140px] rounded-lg border border-ring bg-background px-2.5 text-[13px] outline-none"
          />
        ) : (
          <button
            key={w.id}
            onClick={() => switchWs(w.id)}
            onDoubleClick={() => beginEdit(w.id, w.name)}
            title={`${w.name}（双击重命名）`}
            className={cn(
              'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] transition-colors',
              w.id === activeId
                ? 'bg-accent font-medium text-foreground'
                : 'text-muted-foreground hover:bg-accent/60'
            )}
          >
            <Folder className="h-3.5 w-3.5" />
            <span className="max-w-[140px] truncate">{w.name}</span>
          </button>
        )
      )}
      <Tip label={`新建工作区 ${formatAccelerator(newWsKey)}`}>
        <Button variant="ghost" size="icon-sm" onClick={() => newWs()}>
          <Plus className="h-4 w-4" />
        </Button>
      </Tip>
      <Tip label={`分屏 ${formatAccelerator(splitKey)}`}>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => toggleSplit()}
          className={cn('ml-auto', splitView && 'text-primary')}
        >
          <SplitSquareHorizontal className="h-4 w-4" />
        </Button>
      </Tip>
    </div>
  )
}
