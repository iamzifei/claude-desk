import { ipcMain, dialog, shell, app, BrowserWindow } from 'electron'
import {
  listConversations,
  listArchived,
  searchConversations,
  createConversation,
  deleteConversation,
  renameConversation,
  setArchived,
  setConversationModel,
  getConversationModel,
  getMessages,
  addMessage
} from '../db/conversations'
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
    // API key is a secret → encrypted at rest via safeStorage.
    if (typeof patch.apiKey === 'string' && patch.apiKey) setSetting('apiKey', patch.apiKey, true)
    return getPublicSettings()
  })

  // ---- conversations: --------------------------------------------------
  ipcMain.handle('conversations:list', () => listConversations())
  ipcMain.handle('conversations:listArchived', () => listArchived())
  ipcMain.handle('conversations:search', (_e, query: string) => searchConversations(query))
  ipcMain.handle('conversations:create', () => createConversation())
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
}
