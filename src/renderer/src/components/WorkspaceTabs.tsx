import { JSX } from 'react'
import { Folder, Plus } from 'lucide-react'
import { useStore } from '../store'
import { cn } from '../lib/utils'
import { Button } from './ui/button'
import { Tip } from './ui/tooltip'

/** Top-level workspace tabs, matching 牛马AI's top bar. */
export function WorkspaceTabs(): JSX.Element {
  const workspaces = useStore((s) => s.workspaces)
  const activeId = useStore((s) => s.activeWorkspaceId)
  const switchWs = useStore((s) => s.switchWorkspace)
  const newWs = useStore((s) => s.newWorkspace)

  return (
    <div className="flex h-10 shrink-0 items-center gap-1 border-b border-border-soft px-3">
      {workspaces.map((w) => (
        <button
          key={w.id}
          onClick={() => switchWs(w.id)}
          title={w.name}
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
      ))}
      <Tip label="新建工作区">
        <Button variant="ghost" size="icon-sm" onClick={() => newWs()}>
          <Plus className="h-4 w-4" />
        </Button>
      </Tip>
    </div>
  )
}
