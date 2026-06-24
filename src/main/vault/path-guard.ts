import { resolve, relative, isAbsolute } from 'path'

/**
 * Path-traversal guard for the knowledge-base (Vault) feature. Every read/write
 * is addressed by a path *relative* to the vault root; this resolves it and
 * refuses anything that escapes the root (`..`, absolute paths, symlink-style
 * tricks the resolver normalizes away). Pure & unit-tested — the same spirit as
 * `net/url-guard.ts` for the network side.
 *
 * @returns the absolute path, guaranteed to live inside `root`.
 * @throws if `rel` would escape the vault root.
 */
export function safeJoin(root: string, rel: string): string {
  const abs = resolve(root, rel)
  const r = relative(root, abs)
  // Empty relative → `abs` IS the root (allowed). A first segment of `..`
  // (any separator) means it climbed out; an absolute remainder means a
  // different root entirely. Both are rejected.
  const firstSeg = r.split(/[/\\]/)[0]
  if (r !== '' && (firstSeg === '..' || isAbsolute(r))) {
    throw new Error(`路径越界，拒绝访问：${rel}`)
  }
  return abs
}

/**
 * Names skipped while scanning a vault: VCS metadata, Obsidian's own config,
 * dependency dirs, trash, and OS cruft. Keeps the index focused on real notes.
 */
export function isIgnored(name: string): boolean {
  return (
    name === '.git' ||
    name === '.obsidian' ||
    name === 'node_modules' ||
    name === '.trash' ||
    name === '.DS_Store' ||
    name === '.vault-index'
  )
}
