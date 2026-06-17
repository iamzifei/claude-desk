import { resolveApiKey, getSetting } from '../db/settings'
import { getProvider, DEFAULT_MODEL } from './providers'

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
  const env: Record<string, string> = { ...process.env, ANTHROPIC_API_KEY: apiKey } as Record<
    string,
    string
  >
  // PWD overrides the `cwd` option for the Claude Code subprocess; the Electron
  // process's PWD (home/root) would otherwise scope the agent to the wrong dir.
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
        permissionMode: 'bypassPermissions',
        allowDangerouslySkipPermissions: true,
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
