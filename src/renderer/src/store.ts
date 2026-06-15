import { create } from 'zustand'
import type { Conversation, Message, Chunk, StreamingState } from './types'

// Module-level guard so init() runs only once even under StrictMode.
let booted = false

interface AppState {
  conversations: Conversation[]
  activeId: string | null
  messages: Message[]
  streaming: StreamingState | null // non-null while the assistant is replying
  hasApiKey: boolean

  // bootstrap
  init: () => Promise<void>
  refreshConversations: () => Promise<void>

  // navigation
  selectConversation: (id: string) => Promise<void>
  newConversation: () => Promise<void>
  deleteConversation: (id: string) => Promise<void>

  // chat
  send: (text: string) => Promise<void>
  cancel: () => void

  // internal: handle a streamed chunk
  _onChunk: (conversationId: string, chunk: Chunk) => void
}

export const useStore = create<AppState>((set, get) => ({
  conversations: [],
  activeId: null,
  messages: [],
  streaming: null,
  hasApiKey: false,

  init: async () => {
    // Guard against React StrictMode's double-effect (dev) creating two chats.
    if (booted) return
    booted = true
    const settings = await window.api.settings.get()
    set({ hasApiKey: settings.hasApiKey })
    await get().refreshConversations()
    // Auto-select the most recent conversation, or create one.
    const { conversations } = get()
    if (conversations.length > 0) await get().selectConversation(conversations[0].id)
    else await get().newConversation()
  },

  refreshConversations: async () => {
    set({ conversations: await window.api.conversations.list() })
  },

  selectConversation: async (id) => {
    set({ activeId: id, streaming: null })
    set({ messages: await window.api.conversations.messages(id) })
  },

  newConversation: async () => {
    const conv = await window.api.conversations.create()
    await get().refreshConversations()
    set({ activeId: conv.id, messages: [], streaming: null })
  },

  deleteConversation: async (id) => {
    await window.api.conversations.delete(id)
    await get().refreshConversations()
    const { conversations, activeId } = get()
    if (activeId === id) {
      if (conversations.length > 0) await get().selectConversation(conversations[0].id)
      else await get().newConversation()
    }
  },

  send: async (text) => {
    const id = get().activeId
    if (!id || get().streaming) return
    // Optimistically render the user's message; the main process persists it.
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
      // Reload persisted messages (the assistant turn is now saved) and clear stream.
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
