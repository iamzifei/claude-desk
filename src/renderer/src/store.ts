import { create } from 'zustand'
import type {
  Workspace,
  Project,
  Conversation,
  Message,
  Chunk,
  StreamingState,
  ProviderInfo,
  FileEntry,
  MainView
} from './types'

let booted = false

function applyTheme(theme: string): void {
  document.documentElement.classList.toggle('dark', theme === 'dark')
}

interface AppState {
  // hierarchy
  workspaces: Workspace[]
  activeWorkspaceId: string | null
  projects: Project[]
  conversations: Conversation[] // active (non-archived) in current workspace
  archived: Conversation[]

  // chat session
  openTabs: string[]
  activeId: string | null
  messages: Message[]
  streaming: StreamingState | null

  // ui / settings
  hasApiKey: boolean
  search: string
  providers: ProviderInfo[]
  globalModel: string
  rightPanel: 'card' | 'files' | null
  files: FileEntry[]
  theme: string
  view: MainView

  init: () => Promise<void>
  setTheme: (theme: string) => Promise<void>
  setView: (v: MainView) => void
  refreshAll: () => Promise<void>
  refreshConversations: () => Promise<void>

  // workspace
  switchWorkspace: (id: string) => Promise<void>
  newWorkspace: () => Promise<void>

  // project
  newProject: () => Promise<void>
  renameProject: (id: string, name: string) => Promise<void>
  deleteProject: (id: string) => Promise<void>
  bindProjectDir: (id: string) => Promise<void>

  // conversation / tabs
  openConversation: (id: string) => Promise<void>
  closeTab: (id: string) => void
  newConversation: (projectId?: string | null) => Promise<void>
  deleteConversation: (id: string) => Promise<void>
  archiveConversation: (id: string) => Promise<void>
  renameConversation: (id: string, title: string) => Promise<void>

  setSearch: (q: string) => void
  setRightPanel: (p: AppState['rightPanel']) => void

  send: (text: string, web?: boolean) => Promise<void>
  cancel: () => void
  setActiveModel: (model: string) => Promise<void>

  _onChunk: (conversationId: string, chunk: Chunk) => void
}

export const useStore = create<AppState>((set, get) => ({
  workspaces: [],
  activeWorkspaceId: null,
  projects: [],
  conversations: [],
  archived: [],
  openTabs: [],
  activeId: null,
  messages: [],
  streaming: null,
  hasApiKey: false,
  search: '',
  providers: [],
  globalModel: 'claude-opus-4-8',
  rightPanel: null,
  files: [],
  theme: 'light',
  view: 'chat',

  setView: (v) => set({ view: v }),

  setTheme: async (theme) => {
    applyTheme(theme)
    set({ theme })
    await window.api.settings.set({ theme })
  },

  init: async () => {
    if (booted) return
    booted = true
    const [settings, providers, workspaces] = await Promise.all([
      window.api.settings.get(),
      window.api.settings.getProviders(),
      window.api.workspaces.list()
    ])
    applyTheme(settings.theme)
    const activeWorkspaceId =
      (settings.activeWorkspace && workspaces.some((w) => w.id === settings.activeWorkspace)
        ? settings.activeWorkspace
        : workspaces[0]?.id) ?? null
    set({
      hasApiKey: settings.hasApiKey,
      providers,
      globalModel: settings.model,
      theme: settings.theme,
      workspaces,
      activeWorkspaceId
    })
    await get().refreshAll()
    const { conversations } = get()
    if (conversations.length > 0) await get().openConversation(conversations[0].id)
    else await get().newConversation()
  },

  refreshAll: async () => {
    const ws = get().activeWorkspaceId
    if (!ws) return
    const [projects] = await Promise.all([window.api.projects.list(ws)])
    set({ projects })
    await get().refreshConversations()
  },

  refreshConversations: async () => {
    const ws = get().activeWorkspaceId
    if (!ws) return
    const [conversations, archived] = await Promise.all([
      window.api.conversations.list(ws),
      window.api.conversations.listArchived(ws)
    ])
    set({ conversations, archived })
  },

  switchWorkspace: async (id) => {
    set({ activeWorkspaceId: id, openTabs: [], activeId: null, messages: [], streaming: null })
    await window.api.settings.set({ activeWorkspace: id })
    await get().refreshAll()
    const { conversations } = get()
    if (conversations.length > 0) await get().openConversation(conversations[0].id)
    else await get().newConversation()
  },

  newWorkspace: async () => {
    const name = window.prompt('新工作区名称', '新工作区')
    if (!name) return
    const ws = await window.api.workspaces.create(name)
    set({ workspaces: await window.api.workspaces.list() })
    await get().switchWorkspace(ws.id)
  },

  newProject: async () => {
    const ws = get().activeWorkspaceId
    if (!ws) return
    const name = window.prompt('新项目名称', '新项目')
    if (!name) return
    await window.api.projects.create(ws, name)
    await get().refreshAll()
  },

  renameProject: async (id, name) => {
    await window.api.projects.rename(id, name)
    await get().refreshAll()
  },

  deleteProject: async (id) => {
    await window.api.projects.delete(id)
    await get().refreshAll()
  },

  bindProjectDir: async (id) => {
    const dir = await window.api.app.openFolder()
    if (dir) {
      await window.api.projects.setDir(id, dir)
      await get().refreshAll()
    }
  },

  openConversation: async (id) => {
    set((s) => ({
      activeId: id,
      streaming: null,
      view: 'chat',
      openTabs: s.openTabs.includes(id) ? s.openTabs : [...s.openTabs, id]
    }))
    set({ messages: await window.api.conversations.messages(id) })
  },

  closeTab: (id) => {
    set((s) => {
      const openTabs = s.openTabs.filter((t) => t !== id)
      let activeId = s.activeId
      if (s.activeId === id) activeId = openTabs[openTabs.length - 1] ?? null
      return { openTabs, activeId }
    })
    const next = get().activeId
    if (next) get().openConversation(next)
    else get().newConversation()
  },

  newConversation: async (projectId = null) => {
    const ws = get().activeWorkspaceId
    if (!ws) return
    const conv = await window.api.conversations.create(ws, projectId)
    await get().refreshConversations()
    set((s) => ({
      activeId: conv.id,
      messages: [],
      streaming: null,
      view: 'chat',
      openTabs: [...s.openTabs, conv.id]
    }))
  },

  deleteConversation: async (id) => {
    await window.api.conversations.delete(id)
    await get().refreshConversations()
    get().closeTab(id)
  },

  archiveConversation: async (id) => {
    await window.api.conversations.archive(id, true)
    await get().refreshConversations()
    get().closeTab(id)
  },

  renameConversation: async (id, title) => {
    await window.api.conversations.rename(id, title)
    await get().refreshConversations()
  },

  setSearch: (q) => set({ search: q }),

  setRightPanel: (p) => {
    set((s) => ({ rightPanel: s.rightPanel === p ? null : p }))
    // When opening the files panel, load the active conversation's project dir.
    if (get().rightPanel === 'files') {
      const conv = get().conversations.find((c) => c.id === get().activeId)
      const proj = get().projects.find((pr) => pr.id === conv?.project_id)
      if (proj?.dir_path) window.api.files.listDir(proj.dir_path).then((files) => set({ files }))
      else set({ files: [] })
    }
  },

  send: async (text, web) => {
    const id = get().activeId
    if (!id || get().streaming) return
    const optimistic: Message = {
      id: `tmp-${Date.now()}`,
      conversation_id: id,
      role: 'user',
      content: text,
      created_at: Date.now()
    }
    set((s) => ({
      messages: [...s.messages, optimistic],
      streaming: { text: '', thinking: '', error: null }
    }))
    await window.api.agent.query(id, text, web)
  },

  cancel: () => {
    const id = get().activeId
    if (id) window.api.agent.cancel(id)
  },

  setActiveModel: async (model) => {
    const id = get().activeId
    if (!id) return
    await window.api.conversations.setModel(id, model)
    await get().refreshConversations()
  },

  _onChunk: (conversationId, chunk) => {
    if (conversationId !== get().activeId) return
    const s = get().streaming
    if (!s) return
    if (chunk.type === 'text') {
      set({ streaming: { ...s, text: s.text + chunk.text } })
    } else if (chunk.type === 'thinking') {
      set({ streaming: { ...s, thinking: s.thinking + chunk.text } })
    } else if (chunk.type === 'error') {
      set({ streaming: { ...s, error: chunk.message } })
    } else if (chunk.type === 'done') {
      window.api.conversations.messages(conversationId).then((messages) => {
        set({ messages, streaming: null })
      })
      get().refreshConversations()
    }
  }
}))

window.api.agent.onChunk((conversationId, chunk) => {
  useStore.getState()._onChunk(conversationId, chunk)
})

// Background features (e.g. a scheduled task firing) signal a data change —
// refresh the conversation list so new results appear without a manual reload.
window.api.app.onDataChanged(() => {
  useStore.getState().refreshConversations()
})
