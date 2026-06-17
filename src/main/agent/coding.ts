import { resolve, dirname, basename, join, sep } from 'path'
import { realpathSync } from 'fs'
import { resolveApiKey, getSetting } from '../db/settings'
import { getProvider, DEFAULT_MODEL } from './providers'

type PermResult =
  | { behavior: 'allow'; updatedInput: Record<string, unknown> }
  | { behavior: 'deny'; message: string }

// Tools that only read or are harness-internal — always safe.
const READONLY = new Set(['Read', 'Glob', 'Grep', 'LS', 'TodoWrite', 'WebSearch', 'WebFetch', 'Task'])
const FILE_WRITE = new Set(['Write', 'Edit', 'MultiEdit', 'NotebookEdit'])
// Obviously-destructive bash patterns we refuse even inside the project dir.
const BASH_DENY = [
  /\bsudo\b/,
  /\brm\s+-[a-z]*r[a-z]*f|\brm\s+-[a-z]*f[a-z]*r/, // rm -rf / -fr
  /\bmkfs\b|\bdd\s+if=|\b:\(\)\s*\{|\bshutdown\b|\breboot\b/,
  /\bchmod\s+-R\s+0?777\s+\//
]

/** Resolve a tool's target path and require it to stay under realpath(cwd). */
function underCwd(filePath: unknown, realCwd: string): boolean {
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

/** Permission gate: confine file writes to cwd; block destructive bash. */
function makeCanUseTool(cwd: string) {
  let realCwd = cwd
  try {
    realCwd = realpathSync(cwd)
  } catch {
    /* use as-is */
  }
  return async (toolName: string, input: Record<string, unknown>): Promise<PermResult> => {
    const allow = { behavior: 'allow' as const, updatedInput: input }
    if (READONLY.has(toolName)) return allow
    if (FILE_WRITE.has(toolName)) {
      const p = input.file_path ?? input.notebook_path ?? input.path
      return underCwd(p, realCwd)
        ? allow
        : { behavior: 'deny', message: `已拒绝：只能在工作目录内修改文件（${realCwd}）。` }
    }
    if (toolName === 'Bash') {
      const cmd = String(input.command ?? '')
      if (BASH_DENY.some((re) => re.test(cmd)))
        return { behavior: 'deny', message: '已拒绝：该命令被安全策略阻止（sudo / rm -rf / 磁盘操作等）。' }
      return allow
    }
    return allow
  }
}

export type CodingEvent =
  | { type: 'text'; text: string }
  | { type: 'tool'; name: string; summary: string }
  | { type: 'result'; text: string }
  | { type: 'error'; message: string }
  | { type: 'done' }

interface Interruptible {
  interrupt: () => Promise<void>
}
const active = new Map<string, Interruptible>()

/** One-line summary of a tool call for the action log. */
function summarize(name: string, input: Record<string, unknown>): string {
  const base = (p?: unknown): string => (typeof p === 'string' ? p.split('/').slice(-2).join('/') : '')
  switch (name) {
    case 'Bash':
      return String(input.command ?? '').slice(0, 100)
    case 'Read':
    case 'Write':
    case 'Edit':
    case 'MultiEdit':
      return base(input.file_path)
    case 'Glob':
    case 'Grep':
      return String(input.pattern ?? input.query ?? '')
    default:
      return JSON.stringify(input).slice(0, 80)
  }
}

/**
 * Run the real coding agent (Claude Code engine) in `cwd`, streaming events.
 * Scoped to the user-chosen directory; permissions are bypassed within it.
 */
export async function runCodingAgent(
  runId: string,
  task: string,
  cwd: string,
  onEvent: (e: CodingEvent) => void
): Promise<void> {
  const apiKey = resolveApiKey()
  if (!apiKey) {
    onEvent({ type: 'error', message: '缺少 API key，请先在设置里配置。' })
    onEvent({ type: 'done' })
    return
  }
  const provider = getProvider(getSetting('provider') ?? 'anthropic')
  const model = getSetting('model') ?? DEFAULT_MODEL

  // Pass only a minimal env to the subprocess — never forward arbitrary
  // process.env (which may hold other API keys/tokens) into the agent's shell.
  const env: Record<string, string> = {}
  for (const k of [
    'PATH',
    'HOME',
    'USER',
    'LOGNAME',
    'SHELL',
    'LANG',
    'LC_ALL',
    'TERM',
    'TMPDIR',
    'SSL_CERT_FILE',
    'NODE_EXTRA_CA_CERTS'
  ]) {
    const v = process.env[k]
    if (v) env[k] = v
  }
  env.ANTHROPIC_API_KEY = apiKey
  // PWD overrides the `cwd` option for the Claude Code subprocess.
  env.PWD = cwd
  if (provider.id !== 'anthropic') env.ANTHROPIC_BASE_URL = provider.baseURL

  try {
    const { query } = await import('@anthropic-ai/claude-agent-sdk')
    // Keep the agent inside the chosen directory (it occasionally reaches for an
    // absolute home path otherwise). Relative paths resolve against cwd.
    const guardedTask =
      `请只在当前工作目录内操作，使用相对路径，不要在该目录之外创建或修改文件。\n\n任务：${task}`
    const q = query({
      prompt: guardedTask,
      options: {
        cwd,
        model,
        // Programmatic permissions instead of a blanket bypass: confine file
        // writes to cwd and block destructive bash (see makeCanUseTool).
        permissionMode: 'default',
        canUseTool: makeCanUseTool(cwd),
        env,
        stderr: () => {}
      }
    })
    active.set(runId, q)
    for await (const m of q) {
      if (m.type === 'assistant') {
        for (const b of m.message.content) {
          if (b.type === 'text' && b.text.trim()) onEvent({ type: 'text', text: b.text })
          else if (b.type === 'tool_use')
            onEvent({ type: 'tool', name: b.name, summary: summarize(b.name, b.input as Record<string, unknown>) })
        }
      } else if (m.type === 'result') {
        onEvent({ type: 'result', text: 'result' in m ? m.result : '' })
      }
    }
  } catch (e) {
    onEvent({ type: 'error', message: e instanceof Error ? e.message : String(e) })
  } finally {
    active.delete(runId)
    onEvent({ type: 'done' })
  }
}

export function cancelCoding(runId: string): void {
  active.get(runId)?.interrupt()
}
