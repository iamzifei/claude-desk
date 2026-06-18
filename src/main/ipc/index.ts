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
  moveToProject,
  setConversationModel,
  getConversationModel,
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
  createProject,
  renameProject,
  setProjectDir,
  deleteProject
} from '../db/projects'
import {
  listTasks,
  createTask,
  deleteTask,
  toggleTask,
  type NewTask
} from '../db/scheduledTasks'
import { listNotes, createNote, deleteNote, type Note } from '../db/notes'
import {
  listSkills,
  createSkill,
  toggleSkill,
  deleteSkill,
  parseSkillMd,
  type NewSkill
} from '../db/skills'
import {
  listMaterials,
  searchMaterials,
  listMaterialPlatforms,
  createMaterial,
  updateMaterial,
  toggleMaterialContext,
  deleteMaterial,
  saveImageFile,
  imageDataUrl,
  type NewMaterial
} from '../db/materials'
import { extractReadable } from '../db/materials-extract'
import { safeFetch } from '../net/url-guard'
import { runRewrite } from '../agent/rewrite'
import {
  getPublicSettings,
  setSetting,
  getSetting,
  resolveTranscriptionKey,
  DEFAULT_TRANSCRIBE_URL,
  DEFAULT_TRANSCRIBE_MODEL
} from '../db/settings'
import { runChat, runOnce, type RunHandle } from '../agent/run'
import { decideBrowserAction, type PageElement } from '../agent/browser'
import { runCodingAgent, cancelCoding } from '../agent/coding'
import { isModelReady, downloadModel, transcribePcm, broadcastModelProgress } from '../voice/offline'
import { runTaskById } from '../scheduler'
import { PROVIDERS } from '../agent/providers'

/** In-flight streaming runs, keyed by conversation id, so we can cancel. */
const activeRuns = new Map<string, RunHandle>()

/** "每日回顾 · 2026-06-17 10:30" style title. */
function dateTitle(prefix: string): string {
  const d = new Date()
  const p = (n: number): string => String(n).padStart(2, '0')
  return `${prefix} · ${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

export function registerIpc(): void {
  // ---- settings: -------------------------------------------------------
  ipcMain.handle('settings:get', () => getPublicSettings())
  ipcMain.handle('settings:getProviders', () =>
    Object.values(PROVIDERS).map((p) => ({ id: p.id, label: p.label, models: p.models }))
  )
  ipcMain.handle('settings:set', (_e, patch: Record<string, string>) => {
    if (typeof patch.provider === 'string') setSetting('provider', patch.provider)
    if (typeof patch.model === 'string') setSetting('model', patch.model)
    if (typeof patch.activeWorkspace === 'string') setSetting('activeWorkspace', patch.activeWorkspace)
    if (typeof patch.theme === 'string') setSetting('theme', patch.theme)
    if (typeof patch.transcriptionEngine === 'string')
      setSetting('transcriptionEngine', patch.transcriptionEngine)
    if (typeof patch.transcriptionBaseUrl === 'string')
      setSetting('transcriptionBaseUrl', patch.transcriptionBaseUrl)
    if (typeof patch.transcriptionModel === 'string')
      setSetting('transcriptionModel', patch.transcriptionModel)
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

  // ---- projects: -------------------------------------------------------
  ipcMain.handle('projects:list', (_e, workspaceId: string) => listProjects(workspaceId))
  ipcMain.handle('projects:create', (_e, workspaceId: string, name: string) =>
    createProject(workspaceId, name)
  )
  ipcMain.handle('projects:rename', (_e, id: string, name: string) => renameProject(id, name))
  ipcMain.handle('projects:setDir', (_e, id: string, dir: string | null) => setProjectDir(id, dir))
  ipcMain.handle('projects:delete', (_e, id: string) => deleteProject(id))

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
    deleteConversation(id)
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
  ipcMain.handle('conversations:messages', (_e, id: string) => getMessages(id))

  // ---- agent: ----------------------------------------------------------
  // Send a user message and stream the assistant reply back via 'agent:chunk'.
  ipcMain.handle('agent:query', (e, conversationId: string, text: string) => {
    const wc = e.sender
    // Persist the user's turn, then auto-title the conversation on first message.
    addMessage(conversationId, 'user', text)
    const history = getMessages(conversationId)
    if (history.length === 1) {
      renameConversation(conversationId, text.slice(0, 40).trim() || 'New chat')
    }

    let assistant = ''
    const model = getConversationModel(conversationId)
    const handle = runChat(
      history,
      (chunk) => {
        if (wc.isDestroyed()) return
        wc.send('agent:chunk', conversationId, chunk)
        if (chunk.type === 'text') assistant += chunk.text
        if (chunk.type === 'done') {
          if (assistant.trim()) addMessage(conversationId, 'assistant', assistant)
          activeRuns.delete(conversationId)
        }
        if (chunk.type === 'error') activeRuns.delete(conversationId)
      },
      model
    )
    activeRuns.set(conversationId, handle)
  })

  ipcMain.handle('agent:cancel', (_e, conversationId: string) => {
    activeRuns.get(conversationId)?.cancel()
    activeRuns.delete(conversationId)
  })

  // ---- app/dialog: -----------------------------------------------------
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

  // ---- rewrite: (一键多平台改写) --------------------------------------
  ipcMain.handle('rewrite:run', (_e, source: string, platforms: string[]) =>
    runRewrite(source, platforms)
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
  ipcMain.handle('skills:create', (_e, s: NewSkill) => createSkill(s))
  ipcMain.handle('skills:toggle', (_e, id: string, enabled: boolean) => toggleSkill(id, enabled))
  ipcMain.handle('skills:delete', (_e, id: string) => deleteSkill(id))
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
      return { error: `转写出错：${err.message ?? String(e)}${err.cause?.message ? ' (' + err.cause.message + ')' : ''}` }
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
      const pdf = await win.webContents.printToPDF({ printBackground: true, preferCSSPageSize: true })
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
    const res = win
      ? await dialog.showSaveDialog(win, opts)
      : await dialog.showSaveDialog(opts)
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
}
