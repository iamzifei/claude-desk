import { BrowserWindow } from 'electron'
import { dueTasks, markRun, getTaskById } from './db/scheduledTasks'
import { createConversation, addMessage, getMessages } from './db/conversations'
import { runOnce } from './agent/run'

let timer: ReturnType<typeof setInterval> | null = null
const running = new Set<string>() // guard against overlapping runs of the same task

/** Start the background scheduler: every 30s, run any due tasks. */
export function startScheduler(): void {
  if (timer) return
  timer = setInterval(tick, 30_000)
  setTimeout(tick, 5_000) // also check shortly after boot
}

async function tick(): Promise<void> {
  const now = Date.now()
  for (const t of dueTasks(now)) {
    if (running.has(t.id) || !t.workspace_id) {
      if (!t.workspace_id) markRun(t.id, now) // skip orphaned tasks but advance their schedule
      continue
    }
    running.add(t.id)
    try {
      // A scheduled run lands as a new conversation, so results show up in the list.
      const conv = createConversation(t.workspace_id, null, `[定时] ${t.name}`)
      addMessage(conv.id, 'user', t.prompt)
      const reply = await runOnce(getMessages(conv.id))
      addMessage(conv.id, 'assistant', reply)
    } catch {
      // swallow — still advance the schedule below
    } finally {
      markRun(t.id, now)
      running.delete(t.id)
      broadcast()
    }
  }
}

/** Run a single task immediately (used by the "立即运行" button). */
export async function runTaskById(id: string): Promise<string | null> {
  const t = getTaskById(id)
  if (!t || !t.workspace_id || running.has(id)) return null
  running.add(id)
  try {
    const conv = createConversation(t.workspace_id, null, `[定时] ${t.name}`)
    addMessage(conv.id, 'user', t.prompt)
    const reply = await runOnce(getMessages(conv.id))
    addMessage(conv.id, 'assistant', reply)
    markRun(t.id, Date.now())
    return conv.id
  } finally {
    running.delete(id)
    broadcast()
  }
}

/** Notify renderers that DB-backed lists (conversations / tasks) changed. */
export function broadcast(): void {
  BrowserWindow.getAllWindows().forEach((w) => {
    if (!w.webContents.isDestroyed()) w.webContents.send('data:changed')
  })
}
