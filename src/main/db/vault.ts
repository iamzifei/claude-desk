import { getDb } from './index'
import type { VaultIndex } from '../vault/scan'

/**
 * Persistence for the Vault *derived index*. The disk `.md` files are the
 * source of truth (decision 2026-06-23); these tables are a rebuildable cache
 * that powers fast file/link lookups and feeds the relationship graph. Dropping
 * and re-deriving them from disk is always safe.
 */

export interface VaultFileRow {
  project_id: string
  rel_path: string
  title: string | null
  frontmatter: string | null
  mtime: number
  size: number
}

export interface VaultLinkRow {
  project_id: string
  src_rel: string
  dst_title: string
  dst_rel: string | null
}

/** The vault folder bound to a project, or null if unbound. */
export function vaultRoot(projectId: string): string | null {
  const row = getDb().prepare('SELECT dir_path FROM projects WHERE id = ?').get(projectId) as
    | { dir_path: string | null }
    | undefined
  return row?.dir_path ?? null
}

/** Replace a project's entire derived index in one transaction. */
export function replaceVaultIndex(projectId: string, idx: VaultIndex): void {
  const db = getDb()
  const tx = db.transaction(() => {
    db.prepare('DELETE FROM vault_files WHERE project_id = ?').run(projectId)
    db.prepare('DELETE FROM vault_links WHERE project_id = ?').run(projectId)
    const fi = db.prepare(
      `INSERT INTO vault_files (project_id, rel_path, title, frontmatter, mtime, size)
       VALUES (@project_id, @rel_path, @title, @frontmatter, @mtime, @size)`
    )
    for (const f of idx.files) {
      fi.run({
        project_id: projectId,
        rel_path: f.rel,
        title: f.title,
        frontmatter: f.frontmatter,
        mtime: f.mtime,
        size: f.size
      })
    }
    const li = db.prepare(
      `INSERT INTO vault_links (project_id, src_rel, dst_title, dst_rel)
       VALUES (@project_id, @src_rel, @dst_title, @dst_rel)`
    )
    for (const l of idx.links) {
      li.run({
        project_id: projectId,
        src_rel: l.srcRel,
        dst_title: l.dstTitle,
        dst_rel: l.dstRel
      })
    }
  })
  tx()
}

export function listVaultFiles(projectId: string): VaultFileRow[] {
  return getDb()
    .prepare('SELECT * FROM vault_files WHERE project_id = ? ORDER BY rel_path')
    .all(projectId) as VaultFileRow[]
}

export function listVaultLinks(projectId: string): VaultLinkRow[] {
  return getDb()
    .prepare('SELECT * FROM vault_links WHERE project_id = ?')
    .all(projectId) as VaultLinkRow[]
}

/** Drop a project's index (e.g. on unbind/delete). */
export function clearVaultIndex(projectId: string): void {
  const db = getDb()
  db.prepare('DELETE FROM vault_files WHERE project_id = ?').run(projectId)
  db.prepare('DELETE FROM vault_links WHERE project_id = ?').run(projectId)
}
