import { resolve, dirname, basename, join, sep } from 'path'
import { realpathSync } from 'fs'

// Obviously-destructive bash patterns we refuse even inside the project dir.
export const BASH_DENY = [
  /\bsudo\b/,
  /\brm\s+-[a-z]*r[a-z]*f|\brm\s+-[a-z]*f[a-z]*r/, // rm -rf / -fr
  /\bmkfs|\bdd\s+if=|:\(\)\s*\{|\bshutdown\b|\breboot\b/,
  /\bchmod\s+-R\s+0?777\s+\//
]

/** True if a bash command passes the destructive-pattern denylist. */
export function bashAllowed(cmd: string): boolean {
  return !BASH_DENY.some((re) => re.test(cmd))
}

/**
 * Resolve a tool's target path and require it to stay under realpath(cwd).
 * Pure aside from realpath resolution of existing ancestors.
 */
export function underCwd(filePath: unknown, realCwd: string): boolean {
  if (typeof filePath !== 'string') return false
  const abs = resolve(realCwd, filePath)
  let real = abs
  try {
    real = realpathSync(abs)
  } catch {
    try {
      real = join(realpathSync(dirname(abs)), basename(abs))
    } catch {
      real = abs
    }
  }
  return real === realCwd || real.startsWith(realCwd + sep)
}
