// Domain types mirrored for renderer use. Canonical defs in src/preload/index.d.ts.
export interface Workspace {
  id: string
  name: string
  root_path: string | null
  sort: number
  created_at: number
}

export interface Project {
  id: string
  workspace_id: string
  name: string
  dir_path: string | null
  sort: number
  created_at: number
}

export interface FileEntry {
  name: string
  path: string
  isDir: boolean
}

export interface ScheduledTask {
  id: string
  workspace_id: string | null
  name: string
  prompt: string
  schedule_kind: 'interval' | 'daily'
  interval_min: number | null
  at_hour: number | null
  at_minute: number | null
  enabled: number
  last_run: number | null
  next_run: number | null
  created_at: number
}

export interface NewScheduledTask {
  name: string
  prompt: string
  schedule_kind: 'interval' | 'daily'
  interval_min: number | null
  at_hour: number | null
  at_minute: number | null
}

export interface Note {
  id: string
  workspace_id: string | null
  type: 'review' | 'minutes'
  title: string
  content: string
  created_at: number
}

export type MainView = 'chat' | 'scheduled' | 'review' | 'minutes'

export interface Conversation {
  id: string
  title: string
  workspace: string | null
  workspace_id: string | null
  project_id: string | null
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
  activeWorkspace: string | null
  theme: string
  transcriptionBaseUrl: string
  transcriptionModel: string
  hasTranscriptionKey: boolean
}

export interface ProviderInfo {
  id: string
  label: string
  models: string[]
}

export interface StreamingState {
  text: string
  thinking: string
  error: string | null
}
