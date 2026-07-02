import { ipcMain, dialog, shell, app, BrowserWindow, clipboard, nativeImage } from 'electron'
import { readdirSync, writeFileSync, unlinkSync, readFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

interface Rect {
  x: number
  y: number
  width: number
  height: number
}
import {
  listConversations,
  listArchived,
  searchConversations,
  createConversation,
  deleteConversation,
  renameConversation,
  setArchived,
  setPinned,
  moveToProject,
  setConversationModel,
  getConversationModel,
  getConversationTitle,
  getMessages,
  addMessage
} from '../db/conversations'
import {
  listWorkspaces,
  createWorkspace,
  renameWorkspace,
  setWorkspaceRoot,
  deleteWorkspace
} from '../db/workspaces'
import {
  listProjects,
  listArchivedProjects,
  createProject,
  renameProject,
  setProjectDir,
  setProjectArchived,
  reorderProjects,
  deleteProject
} from '../db/projects'
import { listTasks, createTask, deleteTask, toggleTask, type NewTask } from '../db/scheduledTasks'
import {
  listNotes,
  createNote,
  deleteNote,
  updateNote,
  getOrCreateDailyNote,
  type Note
} from '../db/notes'
import {
  listSkills,
  createSkill,
  toggleSkill,
  deleteSkill,
  parseSkillMd,
  syncInstalledSkills,
  syncBuiltinSkills,
  buildInvokedSkillsPrompt,
  listSkillNames,
  type NewSkill
} from '../db/skills'
import { scanBuiltinSkills } from '../db/builtin-skills'
import { scanInstalledSkills } from '../agent/installed-skills'
import { formatConversationMarkdown, safeFileName } from '../agent/export-conversation'
import {
  listMaterials,
  searchMaterials,
  listMaterialPlatforms,
  createMaterial,
  updateMaterial,
  toggleMaterialContext,
  setMaterialStatus,
  deleteMaterial,
  saveImageFile,
  imageDataUrl,
  type NewMaterial
} from '../db/materials'
import { extractReadable } from '../db/materials-extract'
import { searchAll } from '../db/search'
import { getBacklinks, resolveTitle, listLinkTitles, type LinkKind } from '../db/links'
import { tagGroups, itemsByTag } from '../db/tags'
import { buildKnowledgeGraph } from '../db/graph'
import {
  listPublications,
  createPublication,
  updatePublication,
  deletePublication,
  type NewPublication
} from '../db/publications'
import { runSuggestTopics } from '../agent/suggest-topics'
import { runSaveTemplate } from '../agent/extract-template'
import { seedSample } from '../db/seed'
import { safeFetch } from '../net/url-guard'
import { runRewrite } from '../agent/rewrite'
import {
  listAtoms,
  searchAtoms,
  listAtomTypes,
  createAtom,
  createAtoms,
  updateAtom,
  toggleAtomContext,
  deleteAtom,
  type NewAtom
} from '../db/atoms'
import { extractAtoms } from '../agent/extract-atoms'
import { getMaterial } from '../db/materials'
import {
  listPersonas,
  getPersona,
  createPersona,
  updatePersona,
  deletePersona,
  setDefaultPersona
} from '../db/personas'
import { personaToJson, parsePersonaJson, type PersonaData } from '../db/persona-util'
import { runDiagnose, runDeAI } from '../agent/diagnose'
import {
  listTopics,
  createTopic,
  updateTopic,
  setTopicStatus,
  deleteTopic,
  type NewTopic,
  type TopicStatus
} from '../db/topics'
import { runAssembly } from '../agent/assembly'
import {
  getPublicSettings,
  setSetting,
  getSetting,
  resolveTranscriptionKey,
  DEFAULT_TRANSCRIBE_URL,
  DEFAULT_TRANSCRIBE_MODEL
} from '../db/settings'
import { runChat, runOnce, type RunHandle } from '../agent/run'
import {
  listCreations,
  getCreation,
  createCreation,
  renameCreation,
  setCreationPersona,
  deleteCreation
} from '../db/creations'
import { runPhase, cancelPhase } from '../agent/pipeline'
import type { CreationFormat } from '../agent/pipeline-util'
import { decideBrowserAction, type PageElement } from '../agent/browser'
import { runCodingAgent, cancelCoding } from '../agent/coding'
import {
  isModelReady,
  downloadModel,
  transcribePcm,
  broadcastModelProgress
} from '../voice/offline'
import { runTaskById } from '../scheduler'
import { PROVIDERS } from '../agent/providers'
import { vaultRoot } from '../db/vault'
import { setScope } from '../db/scope'
import {
  listContextRefs,
  addContextRef,
  removeContextRef,
  buildContextPreamble,
  purgeContextRefs
} from '../db/context'
import {
  scanVault,
  vaultTree,
  readVaultFile,
  writeVaultFile,
  createEntry,
  renameEntry,
  removeEntry,
  fileMtime,
  readDataUrl,
  vaultAbsPath,
  watchVault,
  stopWatch,
  forgetVault
} from '../vault'

/** In-flight streaming runs, keyed by conversation id, so we can cancel. */
const activeRuns = new Map<string, RunHandle>()

/** A bare conversation id (randomUUID) pasted as a message → context import. */
const SESSION_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Generate a concise title from the first exchange and rename the conversation
 * — but only if it's still the default '新对话' (so a manual rename always wins).
 * Fired once, after the first assistant reply; failures are silent.
 */
async function autoTitle(
  conversationId: string,
  userText: string,
  assistantText: string,
  wc: Electron.WebContents
): Promise<void> {
  if (getConversationTitle(conversationId) !== '新对话') return
  const prompt =
    '为下面这段对话起一个简短中文标题：6-16 字，概括主题；只输出标题本身，不要引号、标点或解释。\n\n' +
    `用户：${userText.slice(0, 600)}\n\n助手：${assistantText.slice(0, 600)}`
  const raw = await runOnce(
    [
      { id: 'title', conversation_id: conversationId, role: 'user', content: prompt, created_at: 0 }
    ],
    getConversationModel(conversationId)
  )
  const title = raw
    .trim()
    .split('\n')[0]
    .replace(/^["'「『《]+|["'」』》]+$/g, '')
    .slice(0, 24)
    .trim()
  // Skip empties and the runOnce error sentinel; re-check it wasn't renamed meanwhile.
  if (!title || title.startsWith('[错误]')) return
  if (getConversationTitle(conversationId) !== '新对话') return
  renameConversation(conversationId, title)
  if (!wc.isDestroyed()) wc.send('data:changed')
}

/** "每日回顾 · 2026-06-17 10:30" style title. */
function dateTitle(prefix: string): string {
  const d = new Date()
  const p = (n: number): string => String(n).padStart(2, '0')
  return `${prefix} · ${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

/**
 * Where the bundled creator skills live on disk.
 *   - dev: `<project root>/resources/builtin-skills` (getAppPath = project root)
 *   - packaged: `resources/**` is asarUnpacked (electron-builder.yml), so the
 *     files sit next to the asar under `app.asar.unpacked/resources/…`.
 */
function builtinSkillsRoot(): string {
  const appPath = app.isPackaged
    ? app.getAppPath().replace('app.asar', 'app.asar.unpacked')
    : app.getAppPath()
  return join(appPath, 'resources', 'builtin-skills')
}

/** Seed/refresh bundled builtin skills into the DB. Idempotent, best-effort. */
function seedBuiltinSkills(): void {
  try {
    syncBuiltinSkills(scanBuiltinSkills(builtinSkillsRoot()))
  } catch {
    /* a missing/corrupt bundle must never break startup */
  }
}

export function registerIpc(): void {
  // Seed the app-bundled creator skills (11× SKILL.md under
  // resources/builtin-skills) and surface locally installed skills
  // (~/.claude/skills + plugins) on startup so the 技能 view shows them
  // without a manual import. Bounded + best-effort.
  setImmediate(() => {
    seedBuiltinSkills()
    try {
      syncInstalledSkills(scanInstalledSkills())
      for (const win of BrowserWindow.getAllWindows()) {
        if (!win.webContents.isDestroyed()) win.webContents.send('data:changed')
      }
    } catch {
      /* a missing/unreadable skills dir shouldn't break startup */
    }
  })

  // ---- settings: -------------------------------------------------------
  ipcMain.handle('settings:get', () => getPublicSettings())
  ipcMain.handle('settings:getProviders', () =>
    Object.values(PROVIDERS).map((p) => ({ id: p.id, label: p.label, models: p.models }))
  )
  ipcMain.handle('settings:set', (_e, patch: Record<string, string>) => {
    if (typeof patch.provider === 'string') setSetting('provider', patch.provider)
    if (typeof patch.model === 'string') setSetting('model', patch.model)
    if (typeof patch.activeWorkspace === 'string')
      setSetting('activeWorkspace', patch.activeWorkspace)
    if (typeof patch.theme === 'string') setSetting('theme', patch.theme)
    if (typeof patch.transcriptionEngine === 'string')
      setSetting('transcriptionEngine', patch.transcriptionEngine)
    if (typeof patch.transcriptionBaseUrl === 'string')
      setSetting('transcriptionBaseUrl', patch.transcriptionBaseUrl)
    if (typeof patch.transcriptionModel === 'string')
      setSetting('transcriptionModel', patch.transcriptionModel)
    if (typeof patch.shortcuts === 'string') setSetting('shortcuts', patch.shortcuts)
    if (typeof patch.onboarded === 'string') setSetting('onboarded', patch.onboarded)
    if (typeof patch.favorites === 'string') setSetting('favorites', patch.favorites)
    if (typeof patch.lastSeenVersion === 'string')
      setSetting('lastSeenVersion', patch.lastSeenVersion)
    // Secrets → encrypted at rest via safeStorage.
    if (typeof patch.apiKey === 'string' && patch.apiKey) setSetting('apiKey', patch.apiKey, true)
    if (typeof patch.transcriptionKey === 'string' && patch.transcriptionKey)
      setSetting('transcriptionKey', patch.transcriptionKey, true)
    return getPublicSettings()
  })

  // ---- workspaces: -----------------------------------------------------
  ipcMain.handle('workspaces:list', () => listWorkspaces())
  ipcMain.handle('workspaces:create', (_e, name: string) => createWorkspace(name))
  ipcMain.handle('workspaces:rename', (_e, id: string, name: string) => renameWorkspace(id, name))
  ipcMain.handle('workspaces:setRoot', (_e, id: string, path: string | null) =>
    setWorkspaceRoot(id, path)
  )
  ipcMain.handle('workspaces:delete', (_e, id: string) => deleteWorkspace(id))

  // ---- scope: active project for asset views (素材/原子/标签/图谱/选题/发布) ----
  ipcMain.handle('scope:set', (_e, scope: string) => setScope(scope))

  // ---- projects: -------------------------------------------------------
  ipcMain.handle('projects:list', (_e, workspaceId: string) => listProjects(workspaceId))
  ipcMain.handle('projects:create', (_e, workspaceId: string, name: string) =>
    createProject(workspaceId, name)
  )
  ipcMain.handle('projects:listArchived', (_e, workspaceId: string) =>
    listArchivedProjects(workspaceId)
  )
  ipcMain.handle('projects:rename', (_e, id: string, name: string) => renameProject(id, name))
  ipcMain.handle('projects:archive', (_e, id: string, archived: boolean) => {
    if (archived) forgetVault(id) // stop watching an archived project's vault
    setProjectArchived(id, archived)
  })
  ipcMain.handle('projects:reorder', (_e, orderedIds: string[]) => reorderProjects(orderedIds))
  ipcMain.handle('projects:setDir', (_e, id: string, dir: string | null) => {
    // Rebinding (or unbinding) the folder invalidates the old vault index/watcher.
    forgetVault(id)
    setProjectDir(id, dir)
  })
  ipcMain.handle('projects:delete', (_e, id: string) => {
    forgetVault(id)
    deleteProject(id)
  })

  // ---- conversations: --------------------------------------------------
  ipcMain.handle('conversations:list', (_e, workspaceId: string) => listConversations(workspaceId))
  ipcMain.handle('conversations:listArchived', (_e, workspaceId: string) =>
    listArchived(workspaceId)
  )
  ipcMain.handle('conversations:search', (_e, workspaceId: string, query: string) =>
    searchConversations(workspaceId, query)
  )
  ipcMain.handle('conversations:create', (_e, workspaceId: string, projectId: string | null) =>
    createConversation(workspaceId, projectId ?? null)
  )
  ipcMain.handle('conversations:move', (_e, id: string, projectId: string | null) =>
    moveToProject(id, projectId)
  )
  ipcMain.handle('conversations:delete', (_e, id: string) => {
    activeRuns.get(id)?.cancel()
    activeRuns.delete(id)
    purgeContextRefs(id)
    deleteConversation(id)
  })
  // ---- context migration (贴 Session ID 引用其历史作为上下文) ----
  ipcMain.handle('conversations:contextRefs', (_e, id: string) => listContextRefs(id))
  ipcMain.handle('conversations:addContextRef', (_e, id: string, refId: string) =>
    addContextRef(id, refId)
  )
  ipcMain.handle('conversations:removeContextRef', (_e, id: string, refId: string) =>
    removeContextRef(id, refId)
  )
  // Idle recap: a 3-line brief of the conversation + its copyable Session ID.
  ipcMain.handle('conversations:recap', async (_e, id: string) => {
    const msgs = getMessages(id)
    if (msgs.length === 0) return { brief: '', sessionId: id }
    const transcript = msgs
      .map((m) => `${m.role === 'user' ? '用户' : '助手'}：${m.content}`)
      .join('\n\n')
    const prompt =
      '用三行以内中文简要回顾下面这段对话：第一行——在做什么；第二行——已产出/已确立的关键结论；' +
      '第三行——建议的下一步。只输出这三行正文，不要加标题或解释。\n\n' +
      transcript.slice(-12000)
    const brief = await runOnce(
      [{ id: 'recap', conversation_id: id, role: 'user', content: prompt, created_at: 0 }],
      getConversationModel(id)
    )
    return { brief: brief.trim(), sessionId: id }
  })
  ipcMain.handle('conversations:rename', (_e, id: string, title: string) =>
    renameConversation(id, title)
  )
  ipcMain.handle('conversations:archive', (_e, id: string, archived: boolean) => {
    activeRuns.get(id)?.cancel()
    activeRuns.delete(id)
    setArchived(id, archived)
  })
  ipcMain.handle('conversations:setModel', (_e, id: string, model: string | null) =>
    setConversationModel(id, model)
  )
  ipcMain.handle('conversations:setPinned', (_e, id: string, pinned: boolean) =>
    setPinned(id, pinned)
  )
  ipcMain.handle('conversations:messages', (_e, id: string) => getMessages(id))
  // Export a conversation as a Markdown note into the project's vault (对话/).
  ipcMain.handle('conversations:exportToVault', (_e, convId: string, projectId: string) => {
    const root = vaultRoot(projectId)
    if (!root) throw new Error('该项目未绑定知识库文件夹')
    const title = getConversationTitle(convId) || '对话'
    const d = new Date()
    const p = (n: number): string => String(n).padStart(2, '0')
    const dateStr = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
    const md = formatConversationMarkdown(title, getMessages(convId), dateStr)
    const base = safeFileName(title)
    let rel = `对话/${base}.md`
    for (let i = 2; fileMtime(root, rel) !== null; i++) rel = `对话/${base}-${i}.md`
    writeVaultFile(root, rel, md)
    scanVault(projectId, root) // index the new note immediately
    return rel
  })

  // ---- agent: ----------------------------------------------------------
  // Send a user message and stream the assistant reply back via 'agent:chunk'.
  ipcMain.handle('agent:query', (e, conversationId: string, text: string, web?: boolean) => {
    const wc = e.sender
    const trimmed = text.trim()

    // (A) Session-ID import: a message that is *just* a conversation id pulls in
    // that conversation's full history as context — no model call. This is the
    // "paste a Session ID to sync context" flow the user expects.
    if (SESSION_ID_RE.test(trimmed) && trimmed !== conversationId) {
      const ref = addContextRef(conversationId, trimmed)
      if (ref) {
        addMessage(conversationId, 'user', text)
        const note =
          `✅ 已引入对话「${ref.title}」的 ${ref.messageCount} 条消息作为上下文。` +
          `接下来直接提问即可，我会参考它的完整历史来回答。`
        addMessage(conversationId, 'assistant', note)
        wc.send('agent:chunk', conversationId, { type: 'text', text: note })
        wc.send('agent:chunk', conversationId, { type: 'done' })
        wc.send('context:changed', conversationId) // refresh the composer chips
        return
      }
      // Unknown/invalid id → fall through and let the model respond normally.
    }

    // (B) Normal turn. Title stays 新对话 until the first reply, then auto-titled
    // from content (below) — not from the raw first message.
    addMessage(conversationId, 'user', text)
    const history = getMessages(conversationId)
    const firstExchange = history.length === 1

    let assistant = ''
    const model = getConversationModel(conversationId)
    // System prefix = /slug-invoked skills (this turn) + referenced-conversation
    // context (上下文迁移). Always-on enabled skills are added inside runChat.
    const prefix = [buildInvokedSkillsPrompt(trimmed), buildContextPreamble(conversationId)]
      .filter(Boolean)
      .join('\n\n')
    const handle = runChat(
      history,
      (chunk) => {
        if (wc.isDestroyed()) return
        wc.send('agent:chunk', conversationId, chunk)
        if (chunk.type === 'text') assistant += chunk.text
        if (chunk.type === 'done') {
          if (assistant.trim()) addMessage(conversationId, 'assistant', assistant)
          activeRuns.delete(conversationId)
          if (firstExchange && assistant.trim()) void autoTitle(conversationId, text, assistant, wc)
        }
        if (chunk.type === 'error') activeRuns.delete(conversationId)
      },
      model,
      undefined, // no system override for normal chat
      web, // 联网搜索 toggle
      prefix || undefined
    )
    activeRuns.set(conversationId, handle)
  })

  ipcMain.handle('agent:cancel', (_e, conversationId: string) => {
    activeRuns.get(conversationId)?.cancel()
    activeRuns.delete(conversationId)
  })

  // ---- app/dialog: -----------------------------------------------------
  ipcMain.handle('app:version', () => app.getVersion())
  ipcMain.handle('app:getDefaultWorkspace', () => app.getPath('home'))
  ipcMain.handle('dialog:openFolder', async () => {
    const win = BrowserWindow.getFocusedWindow()
    const res = win
      ? await dialog.showOpenDialog(win, { properties: ['openDirectory'] })
      : await dialog.showOpenDialog({ properties: ['openDirectory'] })
    return res.canceled ? null : res.filePaths[0]
  })
  ipcMain.handle('app:openExternal', (_e, url: string) => shell.openExternal(url))

  // ---- scheduledTasks: (定时任务) -------------------------------------
  ipcMain.handle('scheduledTasks:list', (_e, ws: string) => listTasks(ws))
  ipcMain.handle('scheduledTasks:create', (_e, ws: string, t: NewTask) => createTask(ws, t))
  ipcMain.handle('scheduledTasks:delete', (_e, id: string) => deleteTask(id))
  ipcMain.handle('scheduledTasks:toggle', (_e, id: string, enabled: boolean) =>
    toggleTask(id, enabled)
  )
  ipcMain.handle('scheduledTasks:runNow', (_e, id: string) => runTaskById(id))

  // ---- notes: (每日回顾 / 会议纪要) -----------------------------------
  ipcMain.handle('notes:list', (_e, ws: string, type: Note['type']) => listNotes(ws, type))
  ipcMain.handle('notes:delete', (_e, id: string) => deleteNote(id))
  ipcMain.handle('notes:update', (_e, id: string, content: string) => updateNote(id, content))
  // 每日笔记 — open (or lazily create) today's daily capture note.
  ipcMain.handle('notes:daily', (_e, ws: string) => {
    const d = new Date()
    const p = (n: number): string => String(n).padStart(2, '0')
    const week = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][d.getDay()]
    const title = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${week}`
    return getOrCreateDailyNote(ws, title)
  })

  // 每日回顾 — summarize today's conversations into a review note.
  ipcMain.handle('review:generate', async (_e, ws: string) => {
    const startOfToday = new Date(new Date().setHours(0, 0, 0, 0)).getTime()
    const today = listConversations(ws).filter((c) => c.updated_at >= startOfToday)
    if (today.length === 0) {
      return createNote(ws, 'review', dateTitle('每日回顾'), '今天还没有对话记录。')
    }
    let digest = ''
    for (const c of today.slice(0, 20)) {
      digest += `\n## ${c.title}\n`
      for (const m of getMessages(c.id).slice(0, 12)) {
        digest += `${m.role === 'user' ? '我' : 'AI'}：${m.content.slice(0, 400)}\n`
      }
    }
    const prompt =
      '以下是我今天的对话记录。请生成一份「每日回顾」，用 markdown 输出：\n' +
      '1) 今天主要做了什么（要点）\n2) 关键决策/结论\n3) 待办与下一步\n4) 值得记住的点\n' +
      '简洁、结构化。\n\n' +
      digest
    const content = await runOnce([
      { id: 't', conversation_id: 't', role: 'user', content: prompt, created_at: Date.now() }
    ])
    // Don't persist a failed generation as a note — reject so the UI shows an error.
    if (content.trimStart().startsWith('[错误]')) throw new Error(content.trim())
    return createNote(ws, 'review', dateTitle('每日回顾'), content)
  })

  // 会议纪要 — turn a pasted transcript / notes into structured minutes.
  ipcMain.handle('minutes:generate', async (_e, ws: string, transcript: string) => {
    const prompt =
      '以下是一段会议记录/转写。请整理成「会议纪要」，用 markdown 输出：\n' +
      '1) 一句话摘要\n2) 讨论要点\n3) 形成的决策\n4) 行动项（负责人/时间，如能识别）\n\n会议记录：\n' +
      transcript
    const content = await runOnce([
      { id: 't', conversation_id: 't', role: 'user', content: prompt, created_at: Date.now() }
    ])
    if (content.trimStart().startsWith('[错误]')) throw new Error(content.trim())
    return createNote(ws, 'minutes', dateTitle('会议纪要'), content)
  })

  // ---- materials: (素材库) --------------------------------------------
  ipcMain.handle('materials:list', (_e, platform?: string) => listMaterials(platform))
  ipcMain.handle('materials:search', (_e, q: string) => searchMaterials(q))
  ipcMain.handle('materials:platforms', () => listMaterialPlatforms())
  ipcMain.handle('materials:create', (_e, m: NewMaterial) => createMaterial(m))
  ipcMain.handle('materials:update', (_e, id: string, m: NewMaterial) => updateMaterial(id, m))
  ipcMain.handle('materials:toggleContext', (_e, id: string, on: boolean) =>
    toggleMaterialContext(id, on)
  )
  ipcMain.handle('materials:setStatus', (_e, id: string, status: 'inbox' | '已整理') =>
    setMaterialStatus(id, status)
  )
  ipcMain.handle('materials:delete', (_e, id: string) => deleteMaterial(id))
  // Fetch a URL and reduce it to title + readable text for a pre-filled material.
  // safeFetch enforces http(s), blocks private/loopback targets (SSRF), and
  // re-validates every redirect hop.
  ipcMain.handle('materials:fetchUrl', async (_e, url: string) => {
    const html = await safeFetch(url)
    return { ...extractReadable(html), url }
  })
  // Pick an image from disk, copy it into the material store, return the path.
  ipcMain.handle('materials:importImage', async () => {
    const r = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [{ name: '图片', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp'] }]
    })
    if (r.canceled || !r.filePaths[0]) return null
    return saveImageFile(r.filePaths[0])
  })
  ipcMain.handle('materials:imageData', (_e, path: string) => imageDataUrl(path))

  // ---- personas: (人设五维档案) ----------------------------------------
  ipcMain.handle('personas:list', () => listPersonas())
  ipcMain.handle('personas:create', (_e, d: PersonaData) => createPersona(d))
  ipcMain.handle('personas:update', (_e, id: string, d: PersonaData) => updatePersona(id, d))
  ipcMain.handle('personas:delete', (_e, id: string) => deletePersona(id))
  ipcMain.handle('personas:setDefault', (_e, id: string, on: boolean) => setDefaultPersona(id, on))
  // Export one persona as a portable JSON file (schema shared with lingxi so
  // the same profile can be imported on the cloud side and vice versa).
  ipcMain.handle('personas:export', async (_e, id: string) => {
    const p = getPersona(id)
    if (!p) return null
    const win = BrowserWindow.getFocusedWindow()
    const opts = {
      defaultPath: join(app.getPath('downloads'), `${safeFileName(p.name)}.persona.json`),
      filters: [{ name: 'Persona JSON', extensions: ['json'] }]
    }
    const res = win ? await dialog.showSaveDialog(win, opts) : await dialog.showSaveDialog(opts)
    if (res.canceled || !res.filePath) return null
    writeFileSync(res.filePath, personaToJson(p), 'utf8')
    return res.filePath
  })
  // Import a persona JSON file (defensive parse — a malformed file returns
  // null instead of throwing across the IPC boundary).
  ipcMain.handle('personas:import', async () => {
    const win = BrowserWindow.getFocusedWindow()
    const opts = {
      properties: ['openFile' as const],
      filters: [{ name: 'Persona JSON', extensions: ['json'] }]
    }
    const res = win ? await dialog.showOpenDialog(win, opts) : await dialog.showOpenDialog(opts)
    if (res.canceled || !res.filePaths[0]) return null
    try {
      const data = parsePersonaJson(readFileSync(res.filePaths[0], 'utf8'))
      return data ? createPersona(data) : null
    } catch {
      return null
    }
  })

  // ---- creations: (创作流水线 — 7 阶段引导式创作) ----------------------
  ipcMain.handle('creations:list', () => listCreations())
  ipcMain.handle('creations:get', (_e, id: string) => getCreation(id))
  ipcMain.handle(
    'creations:create',
    (_e, title: string, format: CreationFormat, personaId: string | null) =>
      createCreation(title, format, personaId)
  )
  ipcMain.handle('creations:rename', (_e, id: string, title: string) => renameCreation(id, title))
  ipcMain.handle('creations:setPersona', (_e, id: string, personaId: string | null) =>
    setCreationPersona(id, personaId)
  )
  ipcMain.handle('creations:delete', (_e, id: string) => {
    cancelPhase(id) // stop any in-flight phase run before the row disappears
    deleteCreation(id)
  })
  // Run one phase; stream chunks back as 'pipeline:chunk' (creationId, phaseId, chunk).
  ipcMain.handle('pipeline:runPhase', (e, creationId: string, phaseId: number, input: string) => {
    const wc = e.sender
    runPhase(creationId, phaseId, input, (chunk) => {
      if (!wc.isDestroyed()) wc.send('pipeline:chunk', creationId, phaseId, chunk)
    })
  })
  ipcMain.handle('pipeline:cancel', (_e, creationId: string) => cancelPhase(creationId))

  // ---- rewrite: (一键多平台改写) --------------------------------------
  ipcMain.handle('rewrite:run', (_e, source: string, platforms: string[]) =>
    runRewrite(source, platforms)
  )

  // ---- topics: (选题库 + 选题装配) ------------------------------------
  ipcMain.handle('topics:list', (_e, workspaceId: string) => listTopics(workspaceId))
  ipcMain.handle('topics:create', (_e, workspaceId: string, t: NewTopic) =>
    createTopic(workspaceId, t)
  )
  ipcMain.handle('topics:update', (_e, id: string, t: NewTopic) => updateTopic(id, t))
  ipcMain.handle('topics:setStatus', (_e, id: string, status: TopicStatus) =>
    setTopicStatus(id, status)
  )
  ipcMain.handle('topics:delete', (_e, id: string) => deleteTopic(id))
  ipcMain.handle('topics:assemble', (_e, id: string) => runAssembly(id))

  // ---- search: (全局快速切换) -----------------------------------------
  ipcMain.handle('search:all', (_e, workspaceId: string | null, query: string) =>
    searchAll(workspaceId, query)
  )

  // ---- links: (双链 / 反链) -------------------------------------------
  ipcMain.handle('links:backlinks', (_e, kind: LinkKind, id: string) => getBacklinks(kind, id))
  ipcMain.handle('links:resolve', (_e, title: string) => resolveTitle(title))
  ipcMain.handle('links:titles', () => listLinkTitles())

  // ---- tags: (层级标签浏览) -------------------------------------------
  ipcMain.handle('tags:groups', () => tagGroups())
  ipcMain.handle('tags:byTag', (_e, tag: string) => itemsByTag(tag))

  // ---- graph: (知识图谱) ----------------------------------------------
  ipcMain.handle('graph:build', (_e, workspaceId: string) => buildKnowledgeGraph(workspaceId))

  // ---- publications: (发布记录 + 数据驱动选题) ------------------------
  ipcMain.handle('publications:list', (_e, ws: string) => listPublications(ws))
  ipcMain.handle('publications:create', (_e, ws: string, p: NewPublication) =>
    createPublication(ws, p)
  )
  ipcMain.handle('publications:update', (_e, id: string, p: NewPublication) =>
    updatePublication(id, p)
  )
  ipcMain.handle('publications:delete', (_e, id: string) => deletePublication(id))
  ipcMain.handle('publications:suggestTopics', (_e, ws: string) => runSuggestTopics(ws))
  ipcMain.handle('publications:saveTemplate', (_e, id: string) => runSaveTemplate(id))

  // ---- app: sample data (first-run onboarding) -----------------------
  ipcMain.handle('app:seedSample', (_e, ws: string) => seedSample(ws))

  // ---- diagnose: (五维内容诊断 / 去 AI 味) ----------------------------
  ipcMain.handle('diagnose:run', (_e, draft: string) => runDiagnose(draft))
  ipcMain.handle('diagnose:deai', (_e, draft: string) => runDeAI(draft))

  // ---- atoms: (知识原子 / 内容单元) -----------------------------------
  ipcMain.handle('atoms:list', (_e, type?: string) => listAtoms(type))
  ipcMain.handle('atoms:search', (_e, q: string) => searchAtoms(q))
  ipcMain.handle('atoms:types', () => listAtomTypes())
  ipcMain.handle('atoms:create', (_e, a: NewAtom) => createAtom(a))
  ipcMain.handle('atoms:update', (_e, id: string, a: NewAtom) => updateAtom(id, a))
  ipcMain.handle('atoms:toggleContext', (_e, id: string, on: boolean) => toggleAtomContext(id, on))
  ipcMain.handle('atoms:delete', (_e, id: string) => deleteAtom(id))
  // Split a material into atoms via the model, persist them, return the new rows.
  ipcMain.handle('atoms:extractFromMaterial', async (_e, materialId: string) => {
    const m = getMaterial(materialId)
    if (!m) throw new Error('素材不存在')
    const extracted = await extractAtoms(m.content)
    return createAtoms(extracted, { kind: 'material', id: materialId })
  })
  // Split arbitrary text (e.g. an AI reply) into atoms and persist them.
  ipcMain.handle(
    'atoms:extractFromText',
    async (_e, text: string, sourceKind?: string, sourceId?: string) => {
      const extracted = await extractAtoms(text)
      return createAtoms(extracted, { kind: sourceKind ?? 'conversation', id: sourceId ?? null })
    }
  )

  // ---- coding: (真·编程 agent — Claude Code engine) -------------------
  ipcMain.handle('coding:run', (e, runId: string, task: string, cwd: string) => {
    const wc = e.sender
    runCodingAgent(runId, task, cwd, (ev) => {
      if (!wc.isDestroyed()) wc.send('coding:event', runId, ev)
    })
  })
  ipcMain.handle('coding:cancel', (_e, runId: string) => cancelCoding(runId))

  // ---- skills: (技能市场) ---------------------------------------------
  ipcMain.handle('skills:list', () => listSkills())
  ipcMain.handle('skills:names', () => listSkillNames())
  ipcMain.handle('skills:create', (_e, s: NewSkill) => createSkill(s))
  ipcMain.handle('skills:toggle', (_e, id: string, enabled: boolean) => toggleSkill(id, enabled))
  ipcMain.handle('skills:delete', (_e, id: string) => deleteSkill(id))
  // Re-scan locally installed skills (~/.claude/skills + plugins) into the
  // list, and re-seed the bundled builtin skills (both idempotent).
  ipcMain.handle('skills:rescan', () => {
    seedBuiltinSkills()
    try {
      syncInstalledSkills(scanInstalledSkills())
    } catch {
      /* best-effort: a missing/unreadable skills dir shouldn't break the view */
    }
    return listSkills()
  })
  ipcMain.handle('skills:import', async () => {
    const win = BrowserWindow.getFocusedWindow()
    const opts = {
      properties: ['openFile' as const],
      filters: [{ name: 'Skill / Markdown', extensions: ['md', 'markdown', 'txt'] }]
    }
    const res = win ? await dialog.showOpenDialog(win, opts) : await dialog.showOpenDialog(opts)
    if (res.canceled || !res.filePaths[0]) return null
    try {
      return createSkill(parseSkillMd(readFileSync(res.filePaths[0], 'utf8')))
    } catch {
      return null
    }
  })

  // ---- browser: (浏览器自动化 agent decision) -------------------------
  ipcMain.handle(
    'browser:decide',
    (
      _e,
      task: string,
      history: string[],
      screenshotB64: string,
      url: string,
      elements: PageElement[]
    ) => decideBrowserAction(task, history, screenshotB64, url, elements)
  )

  // ---- voice (offline): sherpa-onnx SenseVoice (牛马AI 同款,离线无 key) --
  ipcMain.handle('voice:localStatus', () => ({ ready: isModelReady() }))
  ipcMain.handle('voice:downloadModel', async () => {
    try {
      await downloadModel((pct) => broadcastModelProgress(pct))
      return { ok: true }
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) }
    }
  })
  ipcMain.handle('voice:transcribeLocal', async (_e, samples: number[], sampleRate: number) => {
    try {
      const text = await transcribePcm(Float32Array.from(samples), sampleRate)
      return { text }
    } catch (e) {
      return { error: e instanceof Error ? e.message : String(e) }
    }
  })

  // ---- transcribe: (语音输入/转写 — OpenAI-compatible Whisper) ---------
  ipcMain.handle('transcribe:audio', async (_e, base64: string, mime: string) => {
    const key = resolveTranscriptionKey()
    if (!key) {
      return {
        error: '未配置转写 key。在设置里填，或在 ~/.env 设置 OPENAI_API_KEY。'
      }
    }
    const baseUrl = getSetting('transcriptionBaseUrl') ?? DEFAULT_TRANSCRIBE_URL
    const model = getSetting('transcriptionModel') ?? DEFAULT_TRANSCRIBE_MODEL
    const ext = mime.includes('webm')
      ? 'webm'
      : mime.includes('wav')
        ? 'wav'
        : mime.includes('mp4') || mime.includes('m4a')
          ? 'm4a'
          : 'ogg'
    try {
      // Build the multipart body manually as a Buffer. Electron main's fetch
      // (undici) can fail on FormData/Blob from a different realm — a raw Buffer
      // body with an explicit boundary avoids that.
      const boundary = `----claudedesk${Date.now().toString(16)}`
      const audio = Buffer.from(base64, 'base64')
      const head = Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="audio.${ext}"\r\n` +
          `Content-Type: ${mime}\r\n\r\n`
      )
      const tail = Buffer.from(
        `\r\n--${boundary}\r\nContent-Disposition: form-data; name="model"\r\n\r\n${model}\r\n` +
          `--${boundary}--\r\n`
      )
      const body = Buffer.concat([head, audio, tail])
      const res = await fetch(`${baseUrl.replace(/\/$/, '')}/audio/transcriptions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${key}`,
          'Content-Type': `multipart/form-data; boundary=${boundary}`
        },
        body
      })
      if (!res.ok) {
        return { error: `转写失败 ${res.status}: ${(await res.text()).slice(0, 200)}` }
      }
      const data = (await res.json()) as { text?: string }
      return { text: data.text ?? '' }
    } catch (e) {
      const err = e as { message?: string; cause?: { message?: string } }
      return {
        error: `转写出错：${err.message ?? String(e)}${err.cause?.message ? ' (' + err.cause.message + ')' : ''}`
      }
    }
  })

  // ---- export: (card preview → PNG / PDF / clipboard) -----------------
  // Native region capture — no external deps; the renderer passes the card's
  // bounding rect (CSS px) and we capture it at the display's scale factor.
  ipcMain.handle('export:capture', async (e, rect: Rect) => {
    const wc = e.sender
    const r = {
      x: Math.round(rect.x),
      y: Math.round(rect.y),
      width: Math.round(rect.width),
      height: Math.round(rect.height)
    }
    const img = await wc.capturePage(r)
    return img.toDataURL()
  })

  // PNG → single-page PDF via an offscreen window with a CSS-sized @page.
  ipcMain.handle('export:pdfFromImage', async (_e, dataUrl: string, w: number, h: number) => {
    const base64 = dataUrl.split(',')[1]
    const stamp = Date.now()
    const pngPath = join(tmpdir(), `card-${stamp}.png`)
    const htmlPath = join(tmpdir(), `card-${stamp}.html`)
    writeFileSync(pngPath, Buffer.from(base64, 'base64'))
    writeFileSync(
      htmlPath,
      `<!doctype html><html><head><style>@page{size:${w}px ${h}px;margin:0}html,body{margin:0;padding:0}img{display:block;width:${w}px;height:${h}px}</style></head><body><img src="file://${pngPath}"></body></html>`
    )
    const win = new BrowserWindow({ show: false, width: w, height: h })
    try {
      await win.loadFile(htmlPath)
      await new Promise((r) => setTimeout(r, 120)) // let the image decode
      const pdf = await win.webContents.printToPDF({
        printBackground: true,
        preferCSSPageSize: true
      })
      return pdf.toString('base64')
    } finally {
      win.destroy()
      try {
        unlinkSync(pngPath)
        unlinkSync(htmlPath)
      } catch {
        /* ignore */
      }
    }
  })

  ipcMain.handle('export:saveBinary', async (_e, defaultName: string, base64: string) => {
    const win = BrowserWindow.getFocusedWindow()
    const opts = { defaultPath: join(app.getPath('downloads'), defaultName) }
    const res = win ? await dialog.showSaveDialog(win, opts) : await dialog.showSaveDialog(opts)
    if (res.canceled || !res.filePath) return null
    writeFileSync(res.filePath, Buffer.from(base64, 'base64'))
    return res.filePath
  })
  ipcMain.handle('export:copyImage', (_e, dataUrl: string) => {
    clipboard.writeImage(nativeImage.createFromDataURL(dataUrl))
    return true
  })

  // ---- files: (project / workspace folder listing for the 文件 panel) ---
  ipcMain.handle('files:listDir', (_e, dir: string) => {
    try {
      return readdirSync(dir, { withFileTypes: true })
        .filter((d) => !d.name.startsWith('.'))
        .map((d) => ({ name: d.name, path: join(dir, d.name), isDir: d.isDirectory() }))
        .sort((a, b) => Number(b.isDir) - Number(a.isDir) || a.name.localeCompare(b.name))
    } catch {
      return []
    }
  })

  // ---- vault: (Obsidian-style knowledge base; disk .md = source of truth) ---
  // Every handler resolves the project's bound folder, then delegates to the
  // path-guarded VaultService. A missing binding returns null/throws clearly.
  ipcMain.handle('vault:tree', (_e, projectId: string) => {
    const root = vaultRoot(projectId)
    return root ? vaultTree(root) : null
  })
  ipcMain.handle('vault:read', (_e, projectId: string, rel: string) => {
    const root = vaultRoot(projectId)
    if (!root) throw new Error('当前项目未绑定知识库文件夹')
    return readVaultFile(root, rel)
  })
  ipcMain.handle('vault:write', (_e, projectId: string, rel: string, content: string) => {
    const root = vaultRoot(projectId)
    if (!root) throw new Error('当前项目未绑定知识库文件夹')
    writeVaultFile(root, rel, content)
    scanVault(projectId, root) // keep the index in step with the edit
  })
  ipcMain.handle('vault:create', (_e, projectId: string, rel: string, kind: 'file' | 'dir') => {
    const root = vaultRoot(projectId)
    if (!root) throw new Error('当前项目未绑定知识库文件夹')
    createEntry(root, rel, kind)
    scanVault(projectId, root)
  })
  ipcMain.handle('vault:rename', (_e, projectId: string, from: string, to: string) => {
    const root = vaultRoot(projectId)
    if (!root) throw new Error('当前项目未绑定知识库文件夹')
    renameEntry(root, from, to)
    scanVault(projectId, root)
  })
  ipcMain.handle('vault:remove', (_e, projectId: string, rel: string) => {
    const root = vaultRoot(projectId)
    if (!root) throw new Error('当前项目未绑定知识库文件夹')
    removeEntry(root, rel)
    scanVault(projectId, root)
  })
  ipcMain.handle('vault:reindex', (_e, projectId: string) => {
    const root = vaultRoot(projectId)
    return root ? scanVault(projectId, root) : { files: 0, links: 0 }
  })
  ipcMain.handle('vault:mtime', (_e, projectId: string, rel: string) => {
    const root = vaultRoot(projectId)
    return root ? fileMtime(root, rel) : null
  })
  // Binary preview (images / PDF) as a data URL.
  ipcMain.handle('vault:readDataUrl', (_e, projectId: string, rel: string) => {
    const root = vaultRoot(projectId)
    if (!root) throw new Error('当前项目未绑定知识库文件夹')
    return readDataUrl(root, rel)
  })
  // Hand a file to the OS — system default app (Quick Look territory) / Finder.
  ipcMain.handle('vault:openExternal', (_e, projectId: string, rel: string) => {
    const root = vaultRoot(projectId)
    if (!root) return
    return shell.openPath(vaultAbsPath(root, rel))
  })
  ipcMain.handle('vault:reveal', (_e, projectId: string, rel: string) => {
    const root = vaultRoot(projectId)
    if (!root) return
    shell.showItemInFolder(vaultAbsPath(root, rel))
  })
  ipcMain.handle('vault:watch', async (_e, projectId: string) => {
    const root = vaultRoot(projectId)
    if (!root) return
    await watchVault(projectId, root)
    scanVault(projectId, root) // initial index so the UI has data immediately
  })
  ipcMain.handle('vault:unwatch', (_e, projectId: string) => stopWatch(projectId))
}
