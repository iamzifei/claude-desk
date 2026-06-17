import { ElectronAPI } from '@electron-toolkit/preload'

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

export type NewScheduledTask = Pick<
  ScheduledTask,
  'name' | 'prompt' | 'schedule_kind' | 'interval_min' | 'at_hour' | 'at_minute'
>

export interface Note {
  id: string
  workspace_id: string | null
  type: 'review' | 'minutes'
  title: string
  content: string
  created_at: number
}

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
  workspaces: {
    list: () => Promise<Workspace[]>
    create: (name: string) => Promise<Workspace>
    rename: (id: string, name: string) => Promise<void>
    setRoot: (id: string, path: string | null) => Promise<void>
    delete: (id: string) => Promise<void>
  }
  projects: {
    list: (workspaceId: string) => Promise<Project[]>
    create: (workspaceId: string, name: string) => Promise<Project>
    rename: (id: string, name: string) => Promise<void>
    setDir: (id: string, dir: string | null) => Promise<void>
    delete: (id: string) => Promise<void>
  }
  conversations: {
    list: (workspaceId: string) => Promise<Conversation[]>
    listArchived: (workspaceId: string) => Promise<Conversation[]>
    search: (workspaceId: string, query: string) => Promise<Conversation[]>
    create: (workspaceId: string, projectId: string | null) => Promise<Conversation>
    move: (id: string, projectId: string | null) => Promise<void>
    delete: (id: string) => Promise<void>
    rename: (id: string, title: string) => Promise<void>
    archive: (id: string, archived: boolean) => Promise<void>
    setModel: (id: string, model: string | null) => Promise<void>
    messages: (id: string) => Promise<Message[]>
  }
  settings: {
    get: () => Promise<PublicSettings>
    getProviders: () => Promise<ProviderInfo[]>
    set: (
      patch: Partial<{
        provider: string
        model: string
        apiKey: string
        activeWorkspace: string
        theme: string
      }>
    ) => Promise<PublicSettings>
  }
  scheduledTasks: {
    list: (ws: string) => Promise<ScheduledTask[]>
    create: (ws: string, t: NewScheduledTask) => Promise<ScheduledTask>
    delete: (id: string) => Promise<void>
    toggle: (id: string, enabled: boolean) => Promise<void>
    runNow: (id: string) => Promise<string | null>
  }
  notes: {
    list: (ws: string, type: Note['type']) => Promise<Note[]>
    delete: (id: string) => Promise<void>
    generateReview: (ws: string) => Promise<Note>
    generateMinutes: (ws: string, transcript: string) => Promise<Note>
  }
  app: {
    getDefaultWorkspace: () => Promise<string>
    openFolder: () => Promise<string | null>
    openExternal: (url: string) => Promise<void>
    onDataChanged: (cb: () => void) => () => void
  }
  files: {
    listDir: (dir: string) => Promise<FileEntry[]>
  }
  exporter: {
    capture: (rect: { x: number; y: number; width: number; height: number }) => Promise<string>
    pdfFromImage: (dataUrl: string, w: number, h: number) => Promise<string>
    saveBinary: (defaultName: string, base64: string) => Promise<string | null>
    copyImage: (dataUrl: string) => Promise<boolean>
  }
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: Api
  }
}
