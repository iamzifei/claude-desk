import { readFileSync, writeFileSync, mkdirSync, renameSync, rmSync, statSync } from 'fs'
import { dirname, extname } from 'path'
import { BrowserWindow } from 'electron'
import type { FSWatcher } from 'chokidar'
import { safeJoin } from './path-guard'
import { mimeForExt } from './mime'
import { buildTree, indexVault, type VaultNode } from './scan'
import { replaceVaultIndex, clearVaultIndex } from '../db/vault'

/**
 * VaultService — the bridge between a project's on-disk knowledge base and the
 * app. The folder is the source of truth: we read/write real `.md` files and
 * watch for external changes (e.g. edits made in Obsidian), re-deriving the
 * SQLite index on every change so the file tree, links, and graph stay current.
 */

export type { VaultNode }

/** Recompute and persist a project's derived index from disk. */
export function scanVault(projectId: string, root: string): { files: number; links: number } {
  const idx = indexVault(root)
  replaceVaultIndex(projectId, idx)
  return { files: idx.files.length, links: idx.links.length }
}

/** The display tree for the renderer's file browser. */
export function vaultTree(root: string): VaultNode {
  return buildTree(root)
}

export function readVaultFile(root: string, rel: string): string {
  return readFileSync(safeJoin(root, rel), 'utf8')
}

export function writeVaultFile(root: string, rel: string, content: string): void {
  const abs = safeJoin(root, rel)
  mkdirSync(dirname(abs), { recursive: true })
  writeFileSync(abs, content, 'utf8')
}

export function createEntry(root: string, rel: string, kind: 'file' | 'dir'): void {
  const abs = safeJoin(root, rel)
  if (kind === 'dir') {
    mkdirSync(abs, { recursive: true })
  } else {
    mkdirSync(dirname(abs), { recursive: true })
    writeFileSync(abs, '', { flag: 'wx' }) // wx → fail if it already exists
  }
}

export function renameEntry(root: string, from: string, to: string): void {
  const a = safeJoin(root, from)
  const b = safeJoin(root, to)
  mkdirSync(dirname(b), { recursive: true })
  renameSync(a, b)
}

export function removeEntry(root: string, rel: string): void {
  rmSync(safeJoin(root, rel), { recursive: true, force: true })
}

/** Absolute, in-vault path for shell operations (open / reveal). Guarded. */
export function vaultAbsPath(root: string, rel: string): string {
  return safeJoin(root, rel)
}

/**
 * Read a (typically binary) file as a `data:` URL for in-app preview — images,
 * PDFs, etc. Capped so a huge file can't blow up the renderer; over the cap the
 * caller should fall back to "open in default app".
 */
export function readDataUrl(root: string, rel: string, maxBytes = 25_000_000): string {
  const abs = safeJoin(root, rel)
  const buf = readFileSync(abs)
  if (buf.byteLength > maxBytes) throw new Error('文件过大，无法内嵌预览')
  const mime = mimeForExt(extname(rel))
  return `data:${mime};base64,${buf.toString('base64')}`
}

/** Disk mtime (ms) of a file, or null if missing — used for edit-conflict checks. */
export function fileMtime(root: string, rel: string): number | null {
  try {
    return Math.floor(statSync(safeJoin(root, rel)).mtimeMs)
  } catch {
    return null
  }
}

// ---- watching -------------------------------------------------------------

const watchers = new Map<string, FSWatcher>()

/** Start (or restart) watching a project's vault; re-indexes + notifies the UI. */
export async function watchVault(projectId: string, root: string): Promise<void> {
  stopWatch(projectId)
  // chokidar v5 is ESM-only and the main bundle is CJS, so import dynamically —
  // the same pattern coding.ts uses for the agent SDK.
  const { watch } = await import('chokidar')

  let timer: ReturnType<typeof setTimeout> | null = null
  const onChange = (): void => {
    // Debounce bursts (a save can fire several fs events) before re-indexing.
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      try {
        scanVault(projectId, root)
      } catch {
        /* a transient fs error shouldn't kill the watcher */
      }
      for (const win of BrowserWindow.getAllWindows()) {
        if (!win.webContents.isDestroyed()) win.webContents.send('vault:changed', projectId)
      }
    }, 250)
  }

  const w = watch(root, {
    ignored: (p: string) => /(^|[/\\])(\.git|\.obsidian|node_modules|\.trash)([/\\]|$)/.test(p),
    ignoreInitial: true,
    persistent: true,
    depth: 16
  })
  w.on('add', onChange)
    .on('change', onChange)
    .on('unlink', onChange)
    .on('addDir', onChange)
    .on('unlinkDir', onChange)
  watchers.set(projectId, w)
}

export function stopWatch(projectId: string): void {
  const w = watchers.get(projectId)
  if (w) {
    void w.close()
    watchers.delete(projectId)
  }
}

export function stopAllWatch(): void {
  for (const id of [...watchers.keys()]) stopWatch(id)
}

/** Forget a project's vault entirely (unbind / delete). */
export function forgetVault(projectId: string): void {
  stopWatch(projectId)
  clearVaultIndex(projectId)
}
