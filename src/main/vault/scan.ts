import { readdirSync, readFileSync, statSync, type Dirent, type Stats } from 'fs'
import { join, basename } from 'path'
import { isIgnored } from './path-guard'
import { parseMarkdown } from './markdown'

/** A node in the vault file tree handed to the renderer. `rel` is '' for root. */
export interface VaultNode {
  name: string
  rel: string
  isDir: boolean
  children?: VaultNode[]
}

/** One derived row per `.md` note. */
export interface IndexedFile {
  rel: string
  title: string
  frontmatter: string // JSON
  mtime: number
  size: number
}

/** One derived `[[link]]` edge. `dstRel` is null when the target isn't resolved. */
export interface IndexedLink {
  srcRel: string
  dstTitle: string
  dstRel: string | null
}

export interface VaultIndex {
  files: IndexedFile[]
  links: IndexedLink[]
}

/** Recursively build the display tree (all files + dirs, ignored names skipped). */
export function buildTree(root: string): VaultNode {
  return { name: basename(root) || root, rel: '', isDir: true, children: walk(root, '') }
}

function walk(root: string, dirRel: string): VaultNode[] {
  let entries: Dirent[]
  try {
    entries = readdirSync(join(root, dirRel), { withFileTypes: true })
  } catch {
    return []
  }
  const nodes: VaultNode[] = []
  for (const e of entries) {
    if (isIgnored(e.name)) continue
    const rel = dirRel ? `${dirRel}/${e.name}` : e.name
    if (e.isDirectory()) nodes.push({ name: e.name, rel, isDir: true, children: walk(root, rel) })
    else if (e.isFile()) nodes.push({ name: e.name, rel, isDir: false })
  }
  // Directories first, then files, each alphabetical — Finder/Obsidian ordering.
  return nodes.sort((a, b) => Number(b.isDir) - Number(a.isDir) || a.name.localeCompare(b.name))
}

/** Collect every `.md` file's relative path under `root`, recursively. */
function collectMd(root: string, dirRel: string, out: string[]): void {
  let entries: Dirent[]
  try {
    entries = readdirSync(join(root, dirRel), { withFileTypes: true })
  } catch {
    return
  }
  for (const e of entries) {
    if (isIgnored(e.name)) continue
    const rel = dirRel ? `${dirRel}/${e.name}` : e.name
    if (e.isDirectory()) collectMd(root, rel, out)
    else if (e.isFile() && e.name.toLowerCase().endsWith('.md')) out.push(rel)
  }
}

/**
 * Scan a vault folder and derive its index: one row per note plus resolved
 * `[[wikilink]]` edges. Reads the disk (the source of truth) but writes nothing
 * — the caller persists the result. Pure relative to the filesystem, so it's
 * unit-testable against a fixture directory.
 */
export function indexVault(root: string): VaultIndex {
  const relPaths: string[] = []
  collectMd(root, '', relPaths)

  const files: IndexedFile[] = []
  const parsed: { rel: string; links: string[] }[] = []
  // Title/filename → rel, so `[[Some Note]]` resolves to its file.
  const titleToRel = new Map<string, string>()

  for (const rel of relPaths) {
    const abs = join(root, rel)
    let raw: string
    let st: Stats
    try {
      raw = readFileSync(abs, 'utf8')
      st = statSync(abs)
    } catch {
      continue // file vanished mid-scan — skip it
    }
    const fallback = basename(rel).replace(/\.md$/i, '')
    const p = parseMarkdown(raw, fallback)
    files.push({
      rel,
      title: p.title,
      frontmatter: JSON.stringify(p.frontmatter),
      mtime: Math.floor(st.mtimeMs),
      size: st.size
    })
    parsed.push({ rel, links: p.links })
    titleToRel.set(p.title.toLowerCase(), rel)
    titleToRel.set(fallback.toLowerCase(), rel)
  }

  const links: IndexedLink[] = []
  for (const f of parsed) {
    for (const dst of f.links) {
      links.push({
        srcRel: f.rel,
        dstTitle: dst,
        dstRel: titleToRel.get(dst.toLowerCase()) ?? null
      })
    }
  }
  return { files, links }
}
