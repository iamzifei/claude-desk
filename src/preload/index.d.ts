import { ElectronAPI } from '@electron-toolkit/preload'

export interface Conversation {
  id: string
  title: string
  workspace: string | null
  model: string | null
  archived: number
  created_at: number
  updated_at: number
}

export interface Message {
  id: string
  conversation_id: string
  role: 'user' | 'assistant'
  content: string
  created_at: number
}

export type Chunk =
  | { type: 'text'; text: string }
  | { type: 'thinking'; text: string }
  | { type: 'done' }
  | { type: 'error'; message: string }

export interface PublicSettings {
  provider: string
  model: string
  hasApiKey: boolean
}

export interface ProviderInfo {
  id: string
  label: string
  models: string[]
}

export interface Api {
  agent: {
    query: (conversationId: string, text: string) => Promise<void>
    cancel: (conversationId: string) => Promise<void>
    onChunk: (cb: (conversationId: string, chunk: Chunk) => void) => () => void
  }
  conversations: {
    list: () => Promise<Conversation[]>
    listArchived: () => Promise<Conversation[]>
    search: (query: string) => Promise<Conversation[]>
    create: () => Promise<Conversation>
    delete: (id: string) => Promise<void>
    rename: (id: string, title: string) => Promise<void>
    archive: (id: string, archived: boolean) => Promise<void>
    setModel: (id: string, model: string | null) => Promise<void>
    messages: (id: string) => Promise<Message[]>
  }
  settings: {
    get: () => Promise<PublicSettings>
    getProviders: () => Promise<ProviderInfo[]>
    set: (patch: Partial<{ provider: string; model: string; apiKey: string }>) => Promise<PublicSettings>
  }
  app: {
    getDefaultWorkspace: () => Promise<string>
    openFolder: () => Promise<string | null>
    openExternal: (url: string) => Promise<void>
  }
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: Api
  }
}
