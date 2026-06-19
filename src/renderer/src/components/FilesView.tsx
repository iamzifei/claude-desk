import { JSX, useEffect, useState } from 'react'
import { Folder, FolderOpen, File } from 'lucide-react'
import { useStore } from '../store'
import type { FileEntry } from '../types'

/**
 * 项目文件 — browse the bound directory of the active conversation's project.
 * A niche/dev affordance; lives only as a 分屏「参考」option (not in the sidebar
 * nav). Self-loads its listing so it no longer rides the removed right dock.
 */
export function FilesView(): JSX.Element {
  const conv = useStore((s) => s.conversations.find((c) => c.id === s.activeId))
  const project = useStore((s) => s.projects.find((p) => p.id === conv?.project_id))
  const dir = project?.dir_path ?? null
  const [files, setFiles] = useState<FileEntry[]>([])

  useEffect(() => {
    if (dir) window.api.files.listDir(dir).then(setFiles)
    else setFiles([])
  }, [dir])

  if (!project || !dir) {
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
      <div className="truncate px-2 pb-2 pt-1 text-[11px] text-muted-foreground/70" title={dir}>
        {dir}
      </div>
      {files.length === 0 ? (
        <div className="px-2.5 py-1.5 text-[12.5px] text-muted-foreground/60">空文件夹</div>
      ) : (
        files.map((f) => (
          <div
            key={f.path}
            className="flex items-center gap-2 rounded-md px-2 py-1.5 text-[13px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            {f.isDir ? <Folder className="h-4 w-4 text-primary" /> : <File className="h-4 w-4" />}
            <span className="truncate">{f.name}</span>
          </div>
        ))
      )}
    </div>
  )
}
