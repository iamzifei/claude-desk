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

export interface PageElement {
  index: number
  tag: string
  text: string
}

export interface BrowserAction {
  thought: string
  action: 'click' | 'type' | 'navigate' | 'scroll' | 'done'
  index?: number
  text?: string
  url?: string
  answer?: string
}

export interface Skill {
  id: string
  name: string
  description: string | null
  content: string
  enabled: number
  source: string
  created_at: number
}

export type CodingEvent =
  | { type: 'text'; text: string }
  | { type: 'tool'; name: string; summary: string }
  | { type: 'result'; text: string }
  | { type: 'error'; message: string }
  | { type: 'done' }

export interface Material {
  id: string
  title: string
  content: string
  url: string | null
  tags: string | null
  in_context: number
  created_at: number
}

export type MainView =
  | 'chat'
  | 'scheduled'
  | 'review'
  | 'minutes'
  | 'browser'
  | 'skills'
  | 'coding'
  | 'materials'

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
  transcriptionEngine: string
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
