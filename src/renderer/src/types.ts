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
  archived: number
  created_at: number
}

export interface FileEntry {
  name: string
  path: string
  isDir: boolean
}

/** A node in the Vault (knowledge base) file tree. `rel` is '' for the root. */
export interface VaultNode {
  name: string
  rel: string
  isDir: boolean
  children?: VaultNode[]
}

/** A referenced conversation injected as context (上下文迁移). */
export interface ContextRef {
  id: string
  title: string
  messageCount: number
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
  type: 'review' | 'minutes' | 'daily'
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
  slug: string // `/command`-friendly id for invoking the skill in chat
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
  status: MaterialStatus
  created_at: number
}

export type MaterialStatus = 'inbox' | '已整理'

/** 人设五维 dimension keys — aligned with lingxi / persona-builder skill. */
export type PersonaDimensionKey = 'past' | 'expertise' | 'stance' | 'proof' | 'life'

/** Editable persona payload (基础信息 + 五维素材点). */
export interface NewPersona {
  name: string
  positioning: string
  toneFormality: string // 正式程度: 轻松 / 半正式 / 正式
  toneExpertise: string // 专业程度: 科普向 / 专业易懂 / 深度专业
  tonePerson: string // 人称: 我 / 我们
  targetPlatforms: string[]
  bannedWords: string[]
  dimensions: Record<PersonaDimensionKey, string[]>
  contentCalendar: Record<string, string>
}

export interface Persona extends NewPersona {
  id: string
  is_default: number // 1 → injected into every conversation's system prompt
  project_id: string | null
  created_at: number
  updated_at: number
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

export type SearchKind = 'conversation' | 'material' | 'atom' | 'note' | 'topic' | 'publication'

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

/**
 * What the split (secondary) pane shows: a second conversation, a reference
 * view, or a specific Vault note (`rel` path within `projectId`'s knowledge base).
 */
export type SplitTarget =
  | { kind: 'chat'; id: string }
  | { kind: 'view'; view: MainView }
  | { kind: 'vault-file'; projectId: string; rel: string }

/** iTerm-style tiling presets for the work area (primary + 0–3 secondary panes). */
export type LayoutPreset = 'single' | 'col-2' | 'row-2' | 'col-3' | 'quad'

/**
 * A pinned sidebar shortcut: a pane target (module/chat/file) opened on click,
 * or a skill dragged into a conversation to invoke it. The skill case lets a
 * creator keep frequently-used skills one drag away instead of `/`-searching.
 */
export type Favorite = SplitTarget | { kind: 'skill'; name: string; slug: string }

/** 创作流水线 — one guided creation moving through the 7-phase pipeline. */
export type CreationFormat = 'article' | 'script'

export type PhaseStatus = 'pending' | 'running' | 'done' | 'error' | 'stale' | 'skipped'

export interface PhaseState {
  status: PhaseStatus
  output: string
  input: string
  error?: string
  updated_at: number
}

export interface Creation {
  id: string
  title: string
  format: CreationFormat
  persona_id: string | null
  current_phase: number
  phases: Record<number, PhaseState>
  project_id: string | null
  created_at: number
  updated_at: number
}

export type MainView =
  | 'chat'
  | 'scheduled'
  | 'review'
  | 'minutes'
  | 'daily'
  | 'browser'
  | 'skills'
  | 'coding'
  | 'materials'
  | 'personas'
  | 'atoms'
  | 'topics'
  | 'tags'
  | 'graph'
  | 'publish'
  | 'rewrite'
  | 'files'
  | 'vault'
  | 'creations'

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
