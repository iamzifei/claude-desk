import { create } from 'zustand'
import type { Conversation, Message, Chunk, StreamingState, ProviderInfo } from './types'

// Module-level guard so init() runs only once even under StrictMode.
let booted = false

interface AppState {
  conversations: Conversation[]
  openTabs: string[] // conversation ids currently open as tabs (main area)
  activeId: string | null
  messages: Message[]
  streaming: StreamingState | null // non-null while the assistant is replying
  hasApiKey: boolean
  search: string
  providers: ProviderInfo[]
  globalModel: string
  rightPanel: 'card' | 'files' | 'browser' | null // dockable right panel (stubs)

  // bootstrap
  init: () => Promise<void>
  refreshConversations: () => Promise<void>

  // navigation / tabs
  openConversation: (id: string) => Promise<void>
  closeTab: (id: string) => void
  newConversation: () => Promise<void>
  deleteConversation: (id: string) => Promise<void>
  archiveConversation: (id: string) => Promise<void>
  renameConversation: (id: string, title: string) => Promise<void>
  setSearch: (q: string) => void
  setRightPanel: (p: AppState['rightPanel']) => void

  // chat
  send: (text: string) => Promise<void>
  cancel: () => void
  setActiveModel: (model: string) => Promise<void>

  // internal
  _onChunk: (conversationId: string, chunk: Chunk) => void
}

export const useStore = create<AppState>((set, get) => ({
  conversations: [],
  openTabs: [],
  activeId: null,
  messages: [],
  streaming: null,
  hasApiKey: false,
  search: '',
  providers: [],
  globalModel: 'claude-opus-4-8',
  rightPanel: null,

  init: async () => {
    if (booted) return
    booted = true
    const [settings, providers] = await Promise.all([
      window.api.settings.get(),
      window.api.settings.getProviders()
    ])
    set({ hasApiKey: settings.hasApiKey, providers, globalModel: settings.model })
    await get().refreshConversations()
    const { conversations } = get()
    if (conversations.length > 0) await get().openConversation(conversations[0].id)
    else await get().newConversation()
  },

  refreshConversations: async () => {
    set({ conversations: await window.api.conversations.list() })
  },

  openConversation: async (id) => {
    set((s) => ({
      activeId: id,
      streaming: null,
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

  newConversation: async () => {
    const conv = await window.api.conversations.create()
    await get().refreshConversations()
    set((s) => ({
      activeId: conv.id,
      messages: [],
      streaming: null,
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
  setRightPanel: (p) => set((s) => ({ rightPanel: s.rightPanel === p ? null : p })),

  send: async (text) => {
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
    await window.api.agent.query(id, text)
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

// Wire the IPC stream into the store exactly once.
window.api.agent.onChunk((conversationId, chunk) => {
  useStore.getState()._onChunk(conversationId, chunk)
})
