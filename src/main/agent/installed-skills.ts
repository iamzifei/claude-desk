import { homedir } from 'os'
import { join, basename, dirname } from 'path'
import { readdirSync, readFileSync, existsSync, type Dirent } from 'fs'
import { parseSkillMd } from '../db/skill-parse'

/**
 * Discover skills actually *installed* on this machine:
 *   1. personal skills under `~/.claude/skills/<name>/SKILL.md`
 *   2. skills bundled by the plugins listed in `installed_plugins.json`
 *      (each plugin's `installPath/skills/`)
 *
 * Deliberately does NOT walk `~/.claude/plugins/marketplaces/**` — that's the
 * full catalog (agent-variant duplicates), not what the user has installed.
 * Read-only scan; the DB keeps enable/disable state (db/skills.syncInstalledSkills).
 */

export interface ScannedSkill {
  id: string // stable across re-scans: 'inst:' + absolute path
  name: string
  description: string | null
  content: string
  path: string
  plugin: string | null
}

const PERSONAL_ROOT = join(homedir(), '.claude', 'skills')
const INSTALLED_PLUGINS = join(homedir(), '.claude', 'plugins', 'installed_plugins.json')
const MAX_DEPTH = 4
const MAX_FILES = 2000
const SKIP_DIRS = new Set(['node_modules', '.git'])

interface Found {
  path: string
  plugin: string | null
}

/** Collect SKILL.md paths under `root`, tagging each with `plugin`. Bounded. */
function findSkillFiles(root: string, plugin: string | null, depth: number, out: Found[]): void {
  if (depth < 0 || out.length >= MAX_FILES || !existsSync(root)) return
  let entries: Dirent[]
  try {
    entries = readdirSync(root, { withFileTypes: true })
  } catch {
    return
  }
  for (const e of entries) {
    if (out.length >= MAX_FILES) return
    if (SKIP_DIRS.has(e.name)) continue
    const p = join(root, e.name)
    if (e.isDirectory()) findSkillFiles(p, plugin, depth - 1, out)
    else if (e.isFile() && e.name === 'SKILL.md') out.push({ path: p, plugin })
  }
}

/** `installPath/skills` for every installed plugin, tagged with the plugin name. */
function pluginSkillRoots(): { root: string; plugin: string }[] {
  let json: { plugins?: Record<string, { installPath?: string }[]> }
  try {
    json = JSON.parse(readFileSync(INSTALLED_PLUGINS, 'utf8'))
  } catch {
    return []
  }
  const roots: { root: string; plugin: string }[] = []
  for (const [key, installs] of Object.entries(json.plugins ?? {})) {
    const plugin = key.split('@')[0] // "pr-review-toolkit@market" → "pr-review-toolkit"
    for (const inst of installs ?? []) {
      if (inst?.installPath) roots.push({ root: join(inst.installPath, 'skills'), plugin })
    }
  }
  return roots
}

export function scanInstalledSkills(): ScannedSkill[] {
  const found: Found[] = []
  findSkillFiles(PERSONAL_ROOT, null, MAX_DEPTH, found)
  for (const { root, plugin } of pluginSkillRoots()) findSkillFiles(root, plugin, 2, found)

  const out: ScannedSkill[] = []
  const seen = new Set<string>()
  for (const { path, plugin } of found) {
    if (seen.has(path)) continue
    seen.add(path)
    let text: string
    try {
      text = readFileSync(path, 'utf8')
    } catch {
      continue
    }
    const parsed = parseSkillMd(text)
    const fallback = basename(dirname(path)) // the skill's folder name
    const name = parsed.name && parsed.name !== '导入的技能' ? parsed.name : fallback
    out.push({
      id: `inst:${path}`,
      name,
      description: parsed.description ?? null,
      content: parsed.content,
      path,
      plugin
    })
  }
  return out
}
