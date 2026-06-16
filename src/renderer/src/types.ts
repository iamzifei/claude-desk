// Domain types mirrored for renderer use. The canonical definitions live in
// src/preload/index.d.ts (which also types `window.api`).
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

/** A message being actively streamed (not yet persisted). */
export interface StreamingState {
  text: string
  thinking: string
  error: string | null
}
