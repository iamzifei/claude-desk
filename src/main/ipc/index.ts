import { ipcMain, dialog, shell, app, BrowserWindow, clipboard, nativeImage } from 'electron'
import { readdirSync, writeFileSync, unlinkSync } from 'fs'
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
import { getPublicSettings, setSetting } from '../db/settings'
import { runChat, type RunHandle } from '../agent/run'
import { PROVIDERS } from '../agent/providers'

/** In-flight streaming runs, keyed by conversation id, so we can cancel. */
const activeRuns = new Map<string, RunHandle>()

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
    // API key is a secret → encrypted at rest via safeStorage.
    if (typeof patch.apiKey === 'string' && patch.apiKey) setSetting('apiKey', patch.apiKey, true)
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
