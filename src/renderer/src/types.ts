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

export type MaterialKind = 'text' | 'image' | 'link'

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

/** What the split (secondary) pane shows: a second conversation, or a reference view. */
export type SplitTarget = { kind: 'chat'; id: string } | { kind: 'view'; view: MainView }

export type MainView =
  | 'chat'
  | 'scheduled'
  | 'review'
  | 'minutes'
  | 'browser'
  | 'skills'
  | 'coding'
  | 'materials'
  | 'atoms'
  | 'topics'
  | 'tags'
  | 'rewrite'

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
