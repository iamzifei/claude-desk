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
  MainView,
  SplitTarget
} from './types'
import {
  DEFAULT_SHORTCUTS,
  mergeShortcuts,
  type ShortcutAction
} from './shortcuts'

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
  renameWorkspace: (id: string, name: string) => Promise<void>
  removeWorkspace: (id: string) => Promise<void>
  closeWorkspace: () => Promise<void>

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
  togglePin: (id: string, pinned: boolean) => Promise<void>

  // split-screen: a secondary pane beside the primary — a second conversation
  // or a reference view.
  split: SplitTarget | null
  setSplit: (t: SplitTarget | null) => void
  openSplitChat: (conversationId: string) => void
  closeSplit: () => void
  toggleSplit: () => void

  // ⌘K quick switcher
  quickOpen: boolean
  setQuickOpen: (v: boolean) => void

  // ⌘⇧I quick capture → drop a snippet into the materials Inbox
  quickCaptureOpen: boolean
  setQuickCaptureOpen: (v: boolean) => void

  // hand a draft from 选题装配 over to the 改写工坊
  rewriteSeed: string | null
  sendToRewrite: (text: string) => void

  // jump to a wikilink / backlink / search target; focusId tells the target
  // view which item to scroll to + highlight (consumed once).
  jumpTo: (target: { kind: string; id: string }) => void
  focusId: string | null

  setSearch: (q: string) => void
  setRightPanel: (p: AppState['rightPanel']) => void

  send: (text: string, web?: boolean) => Promise<void>
  cancel: () => void
  setActiveModel: (model: string) => Promise<void>

  // keyboard shortcuts (configurable)
  shortcuts: Record<ShortcutAction, string>
  setShortcut: (action: ShortcutAction, accelerator: string) => Promise<void>
  resetShortcuts: () => Promise<void>

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
  shortcuts: DEFAULT_SHORTCUTS,
  split: null,

  quickOpen: false,
  setQuickOpen: (v) => set({ quickOpen: v }),

  quickCaptureOpen: false,
  setQuickCaptureOpen: (v) => set({ quickCaptureOpen: v }),

  rewriteSeed: null,
  sendToRewrite: (text) => set({ rewriteSeed: text, view: 'rewrite', split: null }),

  focusId: null,
  jumpTo: (target) => {
    const viewByKind: Record<string, MainView> = {
      material: 'materials',
      atom: 'atoms',
      topic: 'topics',
      note: 'review'
    }
    if (target.kind === 'conversation') get().openConversation(target.id)
    else set({ view: viewByKind[target.kind] ?? 'chat', focusId: target.id, split: null })
  },

  setView: (v) => set({ view: v }),
  setSplit: (t) => set({ split: t }),
  openSplitChat: (id) => set({ split: { kind: 'chat', id } }),
  closeSplit: () => set({ split: null }),
  // Toggle the split. When opening, prefer a SECOND open conversation tab (so
  // ⌘D instantly splits two chats); fall back to a 素材库 reference pane.
  toggleSplit: () =>
    set((s) => {
      if (s.split) return { split: null }
      const other = s.openTabs.find((t) => t !== s.activeId)
      return { split: other ? { kind: 'chat', id: other } : { kind: 'view', view: 'materials' } }
    }),

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
    let storedShortcuts: Record<string, string> | null = null
    try {
      storedShortcuts = settings.shortcuts ? JSON.parse(settings.shortcuts) : null
    } catch {
      storedShortcuts = null
    }
    set({
      hasApiKey: settings.hasApiKey,
      providers,
      globalModel: settings.model,
      theme: settings.theme,
      shortcuts: mergeShortcuts(storedShortcuts),
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

  // Instant create with a default name (no blocking prompt) → switch to it.
  // Rename happens inline afterwards (double-click the workspace tab).
  newWorkspace: async () => {
    const ws = await window.api.workspaces.create('新工作区')
    set({ workspaces: await window.api.workspaces.list() })
    await get().switchWorkspace(ws.id)
  },

  renameWorkspace: async (id, name) => {
    const trimmed = name.trim()
    if (!trimmed) return
    await window.api.workspaces.rename(id, trimmed)
    set({ workspaces: await window.api.workspaces.list() })
  },

  // Delete a workspace (and its conversations). Never delete the last one;
  // switch to a sibling if the deleted one was active.
  removeWorkspace: async (id) => {
    const { workspaces, activeWorkspaceId } = get()
    if (workspaces.length <= 1) return
    await window.api.workspaces.delete(id)
    const next = await window.api.workspaces.list()
    set({ workspaces: next })
    if (activeWorkspaceId === id) await get().switchWorkspace(next[0].id)
  },

  closeWorkspace: async () => {
    const id = get().activeWorkspaceId
    if (id) await get().removeWorkspace(id)
  },

  newProject: async () => {
    const ws = get().activeWorkspaceId
    if (!ws) return
    await window.api.projects.create(ws, '新项目')
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
    // If a split was showing the closed conversation, drop the split too.
    const sp = get().split
    if (sp?.kind === 'chat' && sp.id === id) set({ split: null })
    const next = get().activeId
    if (next) get().openConversation(next)
    // Closing the last tab → show the empty greeting (a new conversation is
    // created lazily on first send), instead of spawning an empty 新对话.
    else set({ messages: [], streaming: null, view: 'chat' })
  },

  newConversation: async (projectId = null) => {
    const ws = get().activeWorkspaceId
    if (!ws) return
    const conv = await window.api.conversations.create(ws, projectId)
    // Open the tab immediately for a snappy feel; refresh the list in the
    // background so the sidebar catches up without blocking the UI.
    set((s) => ({
      activeId: conv.id,
      messages: [],
      streaming: null,
      view: 'chat',
      openTabs: [...s.openTabs, conv.id]
    }))
    get().refreshConversations()
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

  togglePin: async (id, pinned) => {
    await window.api.conversations.setPinned(id, pinned)
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
    if (get().streaming) return
    // Lazily create a conversation if none is active (e.g. after closing the
    // last tab) — so empty 新对话 entries never pile up in the list.
    let id = get().activeId
    if (!id) {
      await get().newConversation()
      id = get().activeId
    }
    if (!id) return
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

  setShortcut: async (action, accelerator) => {
    const shortcuts = { ...get().shortcuts, [action]: accelerator }
    set({ shortcuts })
    await window.api.settings.set({ shortcuts: JSON.stringify(shortcuts) })
  },

  resetShortcuts: async () => {
    set({ shortcuts: { ...DEFAULT_SHORTCUTS } })
    await window.api.settings.set({ shortcuts: JSON.stringify(DEFAULT_SHORTCUTS) })
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
