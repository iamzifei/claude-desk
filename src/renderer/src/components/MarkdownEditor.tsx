import { JSX, useCallback, useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Columns2, Eye, Pencil, Check, Loader2, AlertTriangle } from 'lucide-react'
import { WikiTextarea } from './WikiTextarea'
import { cn } from '../lib/utils'

type Mode = 'split' | 'edit' | 'preview'

/** Strip a leading `--- ... ---` YAML frontmatter block for the preview pane. */
function stripFrontmatter(raw: string): string {
  const m = raw.match(/^---\n[\s\S]*?\n---\n?/)
  return m ? raw.slice(m[0].length) : raw
}

interface Props {
  projectId: string
  rel: string
}

/**
 * Edit a single `.md` note from the vault. The disk file is the source of
 * truth: we load it on open, debounce-save edits back to disk, and reconcile
 * external edits (Obsidian, etc.) via mtime — never silently clobbering a file
 * that changed underneath us while we held unsaved changes.
 *
 * Mount with `key={rel}` so switching files gets a fresh editor instance.
 */
export function MarkdownEditor({ projectId, rel }: Props): JSX.Element {
  const [text, setText] = useState<string | null>(null)
  const [mode, setMode] = useState<Mode>('split')
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [conflict, setConflict] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  // Disk mtime we last reconciled with — distinguishes our own saves from
  // external edits when the watcher fires.
  const savedMtime = useRef<number | null>(null)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ---- load on open --------------------------------------------------------
  // Mounted with key=`${projectId}:${rel}`, so each note gets a fresh instance —
  // initial state is already clean and needs no synchronous reset here.
  useEffect(() => {
    let alive = true
    Promise.all([window.api.vault.read(projectId, rel), window.api.vault.mtime(projectId, rel)])
      .then(([content, mtime]) => {
        if (!alive) return
        setText(content)
        savedMtime.current = mtime
      })
      .catch((e) => alive && setLoadError(e instanceof Error ? e.message : String(e)))
    return () => {
      alive = false
    }
  }, [projectId, rel])

  // ---- save (shared by debounce + explicit/force) --------------------------
  const persist = useCallback(
    async (content: string): Promise<void> => {
      setSaving(true)
      try {
        await window.api.vault.write(projectId, rel, content)
        savedMtime.current = await window.api.vault.mtime(projectId, rel)
        setDirty(false)
        setConflict(false)
      } finally {
        setSaving(false)
      }
    },
    [projectId, rel]
  )

  const onChange = (v: string): void => {
    setText(v)
    setDirty(true)
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      // Don't auto-save over an unresolved external edit — wait for the user.
      void window.api.vault.mtime(projectId, rel).then((disk) => {
        if (disk !== null && savedMtime.current !== null && disk !== savedMtime.current) {
          setConflict(true)
        } else {
          void persist(v)
        }
      })
    }, 600)
  }

  // ---- reconcile external edits (watcher → vault:changed) ------------------
  useEffect(() => {
    return window.api.vault.onChanged(async (changedProject) => {
      if (changedProject !== projectId) return
      const disk = await window.api.vault.mtime(projectId, rel)
      if (disk === null || disk === savedMtime.current) return // our own save / unrelated
      if (dirty) {
        setConflict(true) // external change while we have unsaved edits
      } else {
        // No local edits → adopt the external version silently.
        const content = await window.api.vault.read(projectId, rel)
        setText(content)
        savedMtime.current = disk
      }
    })
  }, [projectId, rel, dirty])

  const reloadFromDisk = async (): Promise<void> => {
    const [content, mtime] = await Promise.all([
      window.api.vault.read(projectId, rel),
      window.api.vault.mtime(projectId, rel)
    ])
    setText(content)
    savedMtime.current = mtime
    setDirty(false)
    setConflict(false)
  }

  if (loadError) {
    return (
      <div className="m-auto max-w-[260px] px-6 text-center text-[13px] text-muted-foreground">
        无法打开「{rel}」：{loadError}
      </div>
    )
  }
  if (text === null) {
    return (
      <div className="m-auto flex items-center gap-2 text-[13px] text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> 载入中…
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* toolbar */}
      <div className="flex h-9 shrink-0 items-center justify-between border-b border-border-soft px-3">
        <div className="flex min-w-0 items-center gap-2 text-[12.5px] text-muted-foreground">
          <span className="truncate" title={rel}>
            {rel}
          </span>
          {saving ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground/70" />
          ) : dirty ? (
            <span className="text-[11px] text-muted-foreground/60">未保存</span>
          ) : (
            <Check className="h-3.5 w-3.5 text-primary/70" />
          )}
        </div>
        <div className="flex items-center gap-0.5">
          {(
            [
              ['split', Columns2, '分栏'],
              ['edit', Pencil, '编辑'],
              ['preview', Eye, '预览']
            ] as const
          ).map(([m, Icon, label]) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              title={label}
              className={cn(
                'rounded p-1.5 transition-colors',
                mode === m
                  ? 'bg-accent text-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              )}
            >
              <Icon className="h-4 w-4" />
            </button>
          ))}
        </div>
      </div>

      {/* conflict banner */}
      {conflict ? (
        <div className="flex items-center gap-2 border-b border-amber-300/60 bg-amber-50 px-3 py-1.5 text-[12.5px] text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span className="flex-1">该文件已被外部修改，你有未保存的改动。</span>
          <button
            onClick={() => text !== null && persist(text)}
            className="rounded bg-amber-200/70 px-2 py-0.5 font-medium hover:bg-amber-200 dark:bg-amber-800/50"
          >
            保留我的
          </button>
          <button
            onClick={reloadFromDisk}
            className="rounded px-2 py-0.5 font-medium hover:bg-amber-200/60 dark:hover:bg-amber-800/40"
          >
            重新载入
          </button>
        </div>
      ) : null}

      {/* body */}
      <div className="flex min-h-0 flex-1">
        {mode !== 'preview' ? (
          <WikiTextarea
            value={text}
            onChange={onChange}
            spellCheck={false}
            wrapperClassName={cn(
              'flex min-h-0 flex-1 flex-col',
              mode === 'split' && 'border-r border-border-soft'
            )}
            className="h-full w-full resize-none border-0 bg-background p-5 font-mono text-[13.5px] leading-relaxed outline-none"
          />
        ) : null}
        {mode !== 'edit' ? (
          <div className="markdown min-h-0 flex-1 overflow-y-auto p-5">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{stripFrontmatter(text)}</ReactMarkdown>
          </div>
        ) : null}
      </div>
    </div>
  )
}
