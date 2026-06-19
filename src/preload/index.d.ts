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
  type: 'review' | 'minutes' | 'daily'
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
  pinned: number
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
  shortcuts: string | null
}

export type TranscribeResult = { text: string } | { error: string }

export interface Skill {
  id: string
  name: string
  description: string | null
  content: string
  enabled: number
  source: string
  created_at: number
}

export interface NewSkill {
  name: string
  description?: string
  content: string
  source?: string
}

export type MaterialKind = 'text' | 'image' | 'link'

export type MaterialStatus = 'inbox' | '已整理'

export interface Material {
  id: string
  title: string
  content: string
  url: string | null
  tags: string | null
  kind: MaterialKind
  image_path: string | null
  platform: string | null
  in_context: number
  status: MaterialStatus
  created_at: number
}

export interface NewMaterial {
  title: string
  content: string
  url?: string
  tags?: string
  kind?: MaterialKind
  image_path?: string | null
  platform?: string | null
  status?: MaterialStatus
}

export interface FetchedUrl {
  title: string
  content: string
  url: string
}

export type TopicStatus = '灵感' | '待写' | '进行' | '已发'

export interface Topic {
  id: string
  workspace_id: string | null
  title: string
  angle: string | null
  status: TopicStatus
  platform: string | null
  created_at: number
  updated_at: number
}

export interface NewTopic {
  title: string
  angle?: string | null
  platform?: string | null
  status?: TopicStatus
}

export interface AssemblyResult {
  draft: string
  used: number
}

export type AtomType = '观点' | '金句' | '数据' | '案例' | '钩子' | '方法'

export interface Atom {
  id: string
  content: string
  type: AtomType
  source_kind: string | null
  source_id: string | null
  tags: string | null
  in_context: number
  created_at: number
}

export interface NewAtom {
  content: string
  type?: AtomType
  source_kind?: string | null
  source_id?: string | null
  tags?: string | null
}

export interface RewriteResult {
  platform: string
  text: string
}

export interface TagCount {
  tag: string
  count: number
}
export interface TagGroup {
  prefix: string
  tags: TagCount[]
}
export interface TaggedItem {
  kind: 'material' | 'atom'
  id: string
  title: string
  tags: string | null
}

export interface Publication {
  id: string
  workspace_id: string | null
  topic_id: string | null
  title: string
  platform: string | null
  url: string | null
  published_at: number | null
  views: number
  likes: number
  comments: number
  saves: number
  created_at: number
}
export interface NewPublication {
  title: string
  platform?: string | null
  url?: string | null
  topic_id?: string | null
  published_at?: number | null
  views?: number
  likes?: number
  comments?: number
  saves?: number
}

export interface GraphNode {
  id: string
  kind: string
  label: string
}
export interface GraphEdge {
  source: string
  target: string
  type: 'link' | 'tag'
}

export type LinkKind = 'material' | 'atom' | 'note' | 'topic' | 'conversation'

export interface Backlink {
  from_kind: LinkKind
  from_id: string
  title: string
}

export interface ResolvedTarget {
  kind: LinkKind
  id: string
}

export type SearchKind = 'conversation' | 'material' | 'atom' | 'note'

export interface SearchHit {
  kind: SearchKind
  id: string
  title: string
  snippet: string
  meta: string | null
  noteType?: 'review' | 'minutes' | 'daily'
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

export type CodingEvent =
  | { type: 'text'; text: string }
  | { type: 'tool'; name: string; summary: string }
  | { type: 'result'; text: string }
  | { type: 'error'; message: string }
  | { type: 'done' }

export interface ProviderInfo {
  id: string
  label: string
  models: string[]
}

export interface Api {
  agent: {
    query: (conversationId: string, text: string, web?: boolean) => Promise<void>
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
    setPinned: (id: string, pinned: boolean) => Promise<void>
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
        transcriptionEngine: string
        transcriptionBaseUrl: string
        transcriptionModel: string
        transcriptionKey: string
        shortcuts: string
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
    update: (id: string, content: string) => Promise<void>
    daily: (ws: string) => Promise<Note>
    generateReview: (ws: string) => Promise<Note>
    generateMinutes: (ws: string, transcript: string) => Promise<Note>
  }
  app: {
    getDefaultWorkspace: () => Promise<string>
    openFolder: () => Promise<string | null>
    openExternal: (url: string) => Promise<void>
    seedSample: (ws: string) => Promise<{ materials: number; atoms: number; topics: number; publications: number }>
    onDataChanged: (cb: () => void) => () => void
  }
  files: {
    listDir: (dir: string) => Promise<FileEntry[]>
  }
  voice: {
    transcribe: (base64: string, mime: string) => Promise<TranscribeResult>
    localStatus: () => Promise<{ ready: boolean }>
    downloadModel: () => Promise<{ ok: boolean; error?: string }>
    transcribeLocal: (
      samples: number[],
      sampleRate: number
    ) => Promise<{ text: string } | { error: string }>
    onModelProgress: (cb: (pct: number) => void) => () => void
  }
  skills: {
    list: () => Promise<Skill[]>
    create: (s: NewSkill) => Promise<Skill>
    toggle: (id: string, enabled: boolean) => Promise<void>
    delete: (id: string) => Promise<void>
    import: () => Promise<Skill | null>
  }
  materials: {
    list: (platform?: string) => Promise<Material[]>
    search: (q: string) => Promise<Material[]>
    platforms: () => Promise<string[]>
    create: (m: NewMaterial) => Promise<Material>
    update: (id: string, m: NewMaterial) => Promise<void>
    toggleContext: (id: string, on: boolean) => Promise<void>
    setStatus: (id: string, status: MaterialStatus) => Promise<void>
    delete: (id: string) => Promise<void>
    fetchUrl: (url: string) => Promise<FetchedUrl>
    importImage: () => Promise<string | null>
    imageData: (path: string) => Promise<string | null>
  }
  rewrite: {
    run: (source: string, platforms: string[]) => Promise<RewriteResult[]>
  }
  search: {
    all: (workspaceId: string | null, query: string) => Promise<SearchHit[]>
  }
  links: {
    backlinks: (kind: LinkKind, id: string) => Promise<Backlink[]>
    resolve: (title: string) => Promise<ResolvedTarget | null>
    titles: () => Promise<{ title: string; kind: LinkKind }[]>
  }
  tags: {
    groups: () => Promise<TagGroup[]>
    byTag: (tag: string) => Promise<TaggedItem[]>
  }
  graph: {
    build: (workspaceId: string) => Promise<{ nodes: GraphNode[]; edges: GraphEdge[] }>
  }
  publications: {
    list: (ws: string) => Promise<Publication[]>
    create: (ws: string, p: NewPublication) => Promise<Publication>
    update: (id: string, p: NewPublication) => Promise<void>
    delete: (id: string) => Promise<void>
    suggestTopics: (ws: string) => Promise<Topic[]>
    saveTemplate: (id: string) => Promise<Skill>
  }
  topics: {
    list: (workspaceId: string) => Promise<Topic[]>
    create: (workspaceId: string, t: NewTopic) => Promise<Topic>
    update: (id: string, t: NewTopic) => Promise<void>
    setStatus: (id: string, status: TopicStatus) => Promise<void>
    delete: (id: string) => Promise<void>
    assemble: (id: string) => Promise<AssemblyResult>
  }
  diagnose: {
    run: (draft: string) => Promise<string>
    deai: (draft: string) => Promise<string>
  }
  atoms: {
    list: (type?: string) => Promise<Atom[]>
    search: (q: string) => Promise<Atom[]>
    types: () => Promise<string[]>
    create: (a: NewAtom) => Promise<Atom>
    update: (id: string, a: NewAtom) => Promise<void>
    toggleContext: (id: string, on: boolean) => Promise<void>
    delete: (id: string) => Promise<void>
    extractFromMaterial: (materialId: string) => Promise<Atom[]>
    extractFromText: (text: string, sourceKind?: string, sourceId?: string) => Promise<Atom[]>
  }
  browser: {
    decide: (
      task: string,
      history: string[],
      screenshotB64: string,
      url: string,
      elements: PageElement[]
    ) => Promise<BrowserAction>
  }
  coding: {
    run: (runId: string, task: string, cwd: string) => Promise<void>
    cancel: (runId: string) => Promise<void>
    onEvent: (cb: (runId: string, ev: CodingEvent) => void) => () => void
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
