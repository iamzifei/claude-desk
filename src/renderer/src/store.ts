import { create } from 'zustand'
import type {
  Workspace,
  Project,
  Conversation,
  Message,
  Chunk,
  StreamingState,
  ProviderInfo,
  MainView,
  SplitTarget,
  LayoutPreset,
  Favorite
} from './types'
import { DEFAULT_SHORTCUTS, mergeShortcuts, type ShortcutAction } from './shortcuts'

let booted = false

function applyTheme(theme: string): void {
  document.documentElement.classList.toggle('dark', theme === 'dark')
}

// ---- tiling-pane helpers ----------------------------------------------------

/** Number of secondary panes each layout preset holds (primary is separate). */
const PANE_SLOTS: Record<LayoutPreset, number> = {
  single: 0,
  'col-2': 1,
  'row-2': 1,
  'col-3': 2,
  quad: 3
}

/** Pick a preset that fits `count` secondary panes, keeping orientation if possible. */
function presetForCount(current: LayoutPreset, count: number): LayoutPreset {
  if (count <= 0) return 'single'
  if (count === 1) return current === 'row-2' ? 'row-2' : 'col-2'
  if (count === 2) return 'col-3'
  return 'quad'
}

/** A sensible content for a freshly-opened pane: another open chat, else 素材库. */
function defaultPaneTarget(
  s: { openTabs: string[]; activeId: string | null },
  existing: SplitTarget[]
): SplitTarget {
  const used = new Set(
    existing.filter((p) => p.kind === 'chat').map((p) => (p as { id: string }).id)
  )
  const other = s.openTabs.find((t) => t !== s.activeId && !used.has(t))
  return other ? { kind: 'chat', id: other } : { kind: 'view', view: 'materials' }
}

interface AppState {
  // hierarchy
  workspaces: Workspace[]
  activeWorkspaceId: string | null
  projects: Project[]
  archivedProjects: Project[]
  conversations: Conversation[] // active (non-archived) in current workspace
  archived: Conversation[]

  // chat session
  openTabs: string[]
  activeId: string | null
  messages: Message[]
  streaming: StreamingState | null

  // ui / settings
  hasApiKey: boolean
  search: string
  providers: ProviderInfo[]
  globalModel: string
  theme: string
  view: MainView

  init: () => Promise<void>
  setTheme: (theme: string) => Promise<void>
  setView: (v: MainView) => void
  refreshAll: () => Promise<void>
  refreshConversations: () => Promise<void>

  // workspace
  switchWorkspace: (id: string) => Promise<void>
  newWorkspace: () => Promise<void>
  renameWorkspace: (id: string, name: string) => Promise<void>
  removeWorkspace: (id: string) => Promise<void>
  closeWorkspace: () => Promise<void>

  // project
  // The project whose knowledge base (Vault) the 知识库 view should show. Set
  // explicitly when opening a project's vault; null → VaultView falls back to
  // the active conversation's project.
  activeProjectId: string | null
  // Active asset scope (top-of-sidebar switcher): 'all' | 'unfiled' | <projectId>.
  // Drives 素材/原子/标签/图谱/选题/发布 filtering. Asset views read this and
  // re-fetch when it changes.
  projectScope: string
  setProjectScope: (scope: string) => Promise<void>
  newProject: () => Promise<void>
  renameProject: (id: string, name: string) => Promise<void>
  deleteProject: (id: string) => Promise<void>
  archiveProject: (id: string) => Promise<void>
  unarchiveProject: (id: string) => Promise<void>
  reorderProjects: (orderedIds: string[]) => Promise<void>
  clearProjectSelection: (id: string) => Promise<void>
  bindProjectDir: (id: string) => Promise<void>
  openProjectVault: (id: string) => void

  // conversation / tabs
  openConversation: (id: string) => Promise<void>
  closeTab: (id: string) => void
  newConversation: (projectId?: string | null) => Promise<void>
  deleteConversation: (id: string) => Promise<void>
  archiveConversation: (id: string) => Promise<void>
  renameConversation: (id: string, title: string) => Promise<void>
  togglePin: (id: string, pinned: boolean) => Promise<void>
  exportConversationToVault: (id: string) => Promise<void>

  // Tiling panes (iTerm-style). The primary work area (follows `view`) is always
  // slot 0; `panes` holds the secondary panes (0–3) and `layout` how they tile.
  panes: SplitTarget[]
  layout: LayoutPreset
  setLayout: (preset: LayoutPreset) => void
  setPane: (index: number, target: SplitTarget) => void
  closePane: (index: number) => void
  swapPanes: (a: number, b: number) => void
  // Pointer-based pane drag (reliable where native HTML5 DnD isn't): reorder the
  // secondary panes by inserting at a position, or drop onto the sidebar favorites.
  paneDragFrom: number | null
  paneDropAt: number | 'fav' | null
  beginPaneReorder: (from: number) => void
  setPaneDropAt: (at: number | 'fav' | null) => void
  endPaneReorder: () => void
  reorderPanes: (from: number, to: number) => void
  // Open a dragged target in the primary work area (view → navigate, chat → open).
  openTargetPrimary: (target: SplitTarget) => void
  // What kind of drag is in progress (gates drop-zone affordances): a pane
  // module/conversation/pane-swap, a skill being dropped into a chat, or none.
  dragKind: 'pane' | 'skill' | null
  setDragKind: (k: 'pane' | 'skill' | null) => void

  // Finder-style pinned shortcuts: drag a pane/module to the sidebar to pin it,
  // drag a favorite back into the work area, or click to open. Persisted.
  favorites: Favorite[]
  addFavorite: (t: Favorite) => void
  removeFavorite: (index: number) => void
  toggleFavorite: (t: Favorite) => void
  // Back-compat helpers (operate on the first secondary pane).
  setSplit: (t: SplitTarget | null) => void
  openSplitChat: (conversationId: string) => void
  closeSplit: () => void
  toggleSplit: () => void

  // First-run guided tour (新手引导)
  tourOpen: boolean
  setTourOpen: (v: boolean) => void
  completeOnboarding: () => Promise<void>

  // ⌘K quick switcher
  quickOpen: boolean
  setQuickOpen: (v: boolean) => void

  // ⌘⇧I quick capture → drop a snippet into the materials Inbox
  quickCaptureOpen: boolean
  setQuickCaptureOpen: (v: boolean) => void

  // 卡片导出 modal — any surface can hand text in to export it as a card image
  cardText: string | null
  openCard: (text: string) => void
  closeCard: () => void

  // hand a draft from 选题装配 over to the 改写工坊
  rewriteSeed: string | null
  sendToRewrite: (text: string) => void

  // jump to a wikilink / backlink / search target; focusId tells the target
  // view which item to scroll to + highlight (consumed once).
  jumpTo: (target: { kind: string; id: string }) => void
  focusId: string | null

  setSearch: (q: string) => void

  send: (text: string, web?: boolean) => Promise<void>
  cancel: () => void
  setActiveModel: (model: string) => Promise<void>

  // keyboard shortcuts (configurable)
  shortcuts: Record<ShortcutAction, string>
  setShortcut: (action: ShortcutAction, accelerator: string) => Promise<void>
  resetShortcuts: () => Promise<void>

  _onChunk: (conversationId: string, chunk: Chunk) => void
}

export const useStore = create<AppState>((set, get) => ({
  workspaces: [],
  activeWorkspaceId: null,
  activeProjectId: null,
  projectScope: 'all',
  projects: [],
  archivedProjects: [],
  conversations: [],
  archived: [],
  openTabs: [],
  activeId: null,
  messages: [],
  streaming: null,
  hasApiKey: false,
  search: '',
  providers: [],
  globalModel: 'claude-opus-4-8',
  theme: 'light',
  view: 'chat',
  shortcuts: DEFAULT_SHORTCUTS,
  panes: [],
  layout: 'single',
  dragKind: null,

  tourOpen: false,
  setTourOpen: (v) => set({ tourOpen: v }),
  completeOnboarding: async () => {
    set({ tourOpen: false })
    await window.api.settings.set({ onboarded: '1' })
  },

  quickOpen: false,
  setQuickOpen: (v) => set({ quickOpen: v }),

  quickCaptureOpen: false,
  setQuickCaptureOpen: (v) => set({ quickCaptureOpen: v }),

  cardText: null,
  openCard: (text) => set({ cardText: text }),
  closeCard: () => set({ cardText: null }),

  rewriteSeed: null,
  sendToRewrite: (text) => set({ rewriteSeed: text, view: 'rewrite', panes: [], layout: 'single' }),

  focusId: null,
  jumpTo: (target) => {
    const viewByKind: Record<string, MainView> = {
      material: 'materials',
      atom: 'atoms',
      topic: 'topics',
      note: 'review'
    }
    if (target.kind === 'conversation') get().openConversation(target.id)
    else if (target.kind === 'vault') {
      // Vault node id is `${projectId}::${relPath}` — open that note in a pane.
      const i = target.id.indexOf('::')
      if (i >= 0) {
        get().setSplit({
          kind: 'vault-file',
          projectId: target.id.slice(0, i),
          rel: target.id.slice(i + 2)
        })
      }
    } else
      set({
        view: viewByKind[target.kind] ?? 'chat',
        focusId: target.id,
        panes: [],
        layout: 'single'
      })
  },

  setView: (v) => set({ view: v }),

  // Resize the pane array to fit a preset (pad with a sensible default, trim extras).
  setLayout: (preset) =>
    set((s) => {
      const want = PANE_SLOTS[preset]
      const panes = s.panes.slice(0, want)
      while (panes.length < want) panes.push(defaultPaneTarget(s, panes))
      return { layout: preset, panes }
    }),
  setPane: (index, target) =>
    set((s) => {
      const panes = s.panes.slice()
      if (index >= 0 && index < panes.length) panes[index] = target
      return { panes }
    }),
  closePane: (index) =>
    set((s) => {
      const panes = s.panes.filter((_, i) => i !== index)
      return { panes, layout: presetForCount(s.layout, panes.length) }
    }),

  swapPanes: (a, b) =>
    set((s) => {
      if (a === b || a < 0 || b < 0 || a >= s.panes.length || b >= s.panes.length) return {}
      const panes = s.panes.slice()
      ;[panes[a], panes[b]] = [panes[b], panes[a]]
      return { panes }
    }),

  paneDragFrom: null,
  paneDropAt: null,
  beginPaneReorder: (from) => set({ paneDragFrom: from, paneDropAt: null }),
  setPaneDropAt: (at) => set({ paneDropAt: at }),
  endPaneReorder: () => set({ paneDragFrom: null, paneDropAt: null }),
  reorderPanes: (from, to) =>
    set((s) => {
      const arr = s.panes.slice()
      if (from < 0 || from >= arr.length) return {}
      const [m] = arr.splice(from, 1)
      let dest = to > from ? to - 1 : to
      dest = Math.max(0, Math.min(dest, arr.length))
      arr.splice(dest, 0, m)
      return { panes: arr }
    }),

  openTargetPrimary: (target) => {
    if (target.kind === 'view') get().setView(target.view)
    else if (target.kind === 'chat') get().openConversation(target.id)
    // vault-file isn't a primary view → route it into a pane instead.
    else get().setSplit(target)
  },

  setDragKind: (k) => set({ dragKind: k }),

  favorites: [],
  addFavorite: (t) => {
    const key = JSON.stringify(t)
    if (get().favorites.some((f) => JSON.stringify(f) === key)) return
    const favorites = [...get().favorites, t]
    set({ favorites })
    void window.api.settings.set({ favorites: JSON.stringify(favorites) })
  },
  removeFavorite: (index) => {
    const favorites = get().favorites.filter((_, i) => i !== index)
    set({ favorites })
    void window.api.settings.set({ favorites: JSON.stringify(favorites) })
  },
  // Add or remove a target by identity — for the per-item「收藏/取消收藏」menus.
  toggleFavorite: (t) => {
    const key = JSON.stringify(t)
    const has = get().favorites.some((f) => JSON.stringify(f) === key)
    const favorites = has
      ? get().favorites.filter((f) => JSON.stringify(f) !== key)
      : [...get().favorites, t]
    set({ favorites })
    void window.api.settings.set({ favorites: JSON.stringify(favorites) })
  },

  // Back-compat: operate on the first secondary pane.
  setSplit: (t) =>
    set((s) => {
      if (!t) return { panes: [], layout: 'single' }
      const panes = s.panes.length ? [t, ...s.panes.slice(1)] : [t]
      return { panes, layout: s.panes.length ? s.layout : 'col-2' }
    }),
  openSplitChat: (id) => get().setSplit({ kind: 'chat', id }),
  closeSplit: () => set({ panes: [], layout: 'single' }),
  // ⌘D: open a second pane (prefer another open chat, else 素材库) or close all.
  toggleSplit: () =>
    set((s) => {
      if (s.panes.length) return { panes: [], layout: 'single' }
      return { panes: [defaultPaneTarget(s, [])], layout: 'col-2' }
    }),

  setTheme: async (theme) => {
    applyTheme(theme)
    set({ theme })
    await window.api.settings.set({ theme })
  },

  init: async () => {
    if (booted) return
    booted = true
    const [settings, providers, workspaces] = await Promise.all([
      window.api.settings.get(),
      window.api.settings.getProviders(),
      window.api.workspaces.list()
    ])
    applyTheme(settings.theme)
    const activeWorkspaceId =
      (settings.activeWorkspace && workspaces.some((w) => w.id === settings.activeWorkspace)
        ? settings.activeWorkspace
        : workspaces[0]?.id) ?? null
    let storedShortcuts: Record<string, string> | null = null
    try {
      storedShortcuts = settings.shortcuts ? JSON.parse(settings.shortcuts) : null
    } catch {
      storedShortcuts = null
    }
    let favorites: Favorite[] = []
    try {
      favorites = settings.favorites ? (JSON.parse(settings.favorites) as Favorite[]) : []
    } catch {
      favorites = []
    }
    set({
      hasApiKey: settings.hasApiKey,
      providers,
      globalModel: settings.model,
      theme: settings.theme,
      shortcuts: mergeShortcuts(storedShortcuts),
      workspaces,
      activeWorkspaceId,
      tourOpen: !settings.onboarded, // first run → show the guided tour
      favorites
    })
    await get().refreshAll()
    const { conversations } = get()
    if (conversations.length > 0) await get().openConversation(conversations[0].id)
    else await get().newConversation()
  },

  refreshAll: async () => {
    const ws = get().activeWorkspaceId
    if (!ws) return
    const [projects, archivedProjects] = await Promise.all([
      window.api.projects.list(ws),
      window.api.projects.listArchived(ws)
    ])
    set({ projects, archivedProjects })
    await get().refreshConversations()
  },

  refreshConversations: async () => {
    const ws = get().activeWorkspaceId
    if (!ws) return
    const [conversations, archived] = await Promise.all([
      window.api.conversations.list(ws),
      window.api.conversations.listArchived(ws)
    ])
    set({ conversations, archived })
  },

  switchWorkspace: async (id) => {
    set({
      activeWorkspaceId: id,
      activeProjectId: null,
      projectScope: 'all',
      openTabs: [],
      activeId: null,
      messages: [],
      streaming: null
    })
    await window.api.scope.set('all') // projects differ per workspace → reset scope
    await window.api.settings.set({ activeWorkspace: id })
    await get().refreshAll()
    const { conversations } = get()
    if (conversations.length > 0) await get().openConversation(conversations[0].id)
    else await get().newConversation()
  },

  // Instant create with a default name (no blocking prompt) → switch to it.
  // Rename happens inline afterwards (double-click the workspace tab).
  newWorkspace: async () => {
    const ws = await window.api.workspaces.create('新工作区')
    set({ workspaces: await window.api.workspaces.list() })
    await get().switchWorkspace(ws.id)
  },

  renameWorkspace: async (id, name) => {
    const trimmed = name.trim()
    if (!trimmed) return
    await window.api.workspaces.rename(id, trimmed)
    set({ workspaces: await window.api.workspaces.list() })
  },

  // Delete a workspace (and its conversations). Never delete the last one;
  // switch to a sibling if the deleted one was active.
  removeWorkspace: async (id) => {
    const { workspaces, activeWorkspaceId } = get()
    if (workspaces.length <= 1) return
    await window.api.workspaces.delete(id)
    const next = await window.api.workspaces.list()
    set({ workspaces: next })
    if (activeWorkspaceId === id) await get().switchWorkspace(next[0].id)
  },

  closeWorkspace: async () => {
    const id = get().activeWorkspaceId
    if (id) await get().removeWorkspace(id)
  },

  newProject: async () => {
    const ws = get().activeWorkspaceId
    if (!ws) return
    const proj = await window.api.projects.create(ws, '新项目')
    // Select it so the 知识库 view lands on the new project (ready to bind a
    // folder); the sidebar's inline rename then lets the user name it.
    set({ activeProjectId: proj.id })
    await get().refreshAll()
  },

  renameProject: async (id, name) => {
    await window.api.projects.rename(id, name)
    await get().refreshAll()
  },

  deleteProject: async (id) => {
    await window.api.projects.delete(id)
    await get().clearProjectSelection(id)
    await get().refreshAll()
  },

  archiveProject: async (id) => {
    await window.api.projects.archive(id, true)
    await get().clearProjectSelection(id)
    await get().refreshAll()
  },

  unarchiveProject: async (id) => {
    await window.api.projects.archive(id, false)
    await get().refreshAll()
  },

  reorderProjects: async (orderedIds) => {
    await window.api.projects.reorder(orderedIds)
    await get().refreshAll()
  },

  // When a project leaves the active set (deleted/archived), drop it from the
  // vault selection + asset scope so views don't point at a gone project.
  clearProjectSelection: async (id) => {
    const s = get()
    if (s.activeProjectId === id) set({ activeProjectId: null })
    if (s.projectScope === id) {
      await window.api.scope.set('all')
      set({ projectScope: 'all' })
    }
  },

  bindProjectDir: async (id) => {
    const dir = await window.api.app.openFolder()
    if (dir) {
      await window.api.projects.setDir(id, dir)
      await get().refreshAll()
      // Land the user in the freshly-bound knowledge base, scoped to it.
      await window.api.scope.set(id)
      set({ activeProjectId: id, projectScope: id, view: 'vault', panes: [], layout: 'single' })
    }
  },

  // Switch the asset scope (top-of-sidebar switcher). A real project also
  // becomes the Vault's active project so 知识库 follows the selection.
  setProjectScope: async (scope) => {
    await window.api.scope.set(scope)
    const isProject = scope !== 'all' && scope !== 'unfiled'
    set({ projectScope: scope, ...(isProject ? { activeProjectId: scope } : {}) })
  },

  // Open a specific project's knowledge base in the 知识库 view, scoping assets
  // to it as well.
  openProjectVault: (id) => {
    window.api.scope.set(id)
    set({ activeProjectId: id, projectScope: id, view: 'vault', panes: [], layout: 'single' })
  },

  openConversation: async (id) => {
    set((s) => ({
      activeId: id,
      streaming: null,
      view: 'chat',
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
    // Drop any pane that was showing the closed conversation.
    const panes = get().panes.filter((p) => !(p.kind === 'chat' && p.id === id))
    if (panes.length !== get().panes.length) {
      set({ panes, layout: presetForCount(get().layout, panes.length) })
    }
    const next = get().activeId
    if (next) get().openConversation(next)
    // Closing the last tab → show the empty greeting (a new conversation is
    // created lazily on first send), instead of spawning an empty 新对话.
    else set({ messages: [], streaming: null, view: 'chat' })
  },

  newConversation: async (projectId = null) => {
    const ws = get().activeWorkspaceId
    if (!ws) return
    const conv = await window.api.conversations.create(ws, projectId)
    // Open the tab immediately for a snappy feel; refresh the list in the
    // background so the sidebar catches up without blocking the UI.
    set((s) => ({
      activeId: conv.id,
      messages: [],
      streaming: null,
      view: 'chat',
      openTabs: [...s.openTabs, conv.id]
    }))
    get().refreshConversations()
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

  togglePin: async (id, pinned) => {
    await window.api.conversations.setPinned(id, pinned)
    await get().refreshConversations()
  },

  // Write a conversation into a project's knowledge base as a .md note, then
  // open it. Picks the conversation's own project, else the active one, else any
  // project with a bound folder.
  exportConversationToVault: async (id) => {
    const s = get()
    const conv = s.conversations.find((c) => c.id === id) ?? s.archived.find((c) => c.id === id)
    const bound = (pid?: string | null): Project | undefined =>
      s.projects.find((p) => p.id === pid && p.dir_path)
    const project =
      bound(conv?.project_id) ?? bound(s.activeProjectId) ?? s.projects.find((p) => p.dir_path)
    if (!project) {
      window.alert('请先为某个项目「绑定知识库文件夹」，才能把对话导出到知识库。')
      return
    }
    const rel = await window.api.conversations.exportToVault(id, project.id)
    // Scope to that project and show the new note in a split pane.
    await window.api.scope.set(project.id)
    set({ activeProjectId: project.id, projectScope: project.id })
    get().setSplit({ kind: 'vault-file', projectId: project.id, rel })
  },

  setSearch: (q) => set({ search: q }),

  send: async (text, web) => {
    if (get().streaming) return
    // Lazily create a conversation if none is active (e.g. after closing the
    // last tab) — so empty 新对话 entries never pile up in the list.
    let id = get().activeId
    if (!id) {
      await get().newConversation()
      id = get().activeId
    }
    if (!id) return
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
    await window.api.agent.query(id, text, web)
  },

  cancel: () => {
    const id = get().activeId
    if (id) window.api.agent.cancel(id)
  },

  setShortcut: async (action, accelerator) => {
    const shortcuts = { ...get().shortcuts, [action]: accelerator }
    set({ shortcuts })
    await window.api.settings.set({ shortcuts: JSON.stringify(shortcuts) })
  },

  resetShortcuts: async () => {
    set({ shortcuts: { ...DEFAULT_SHORTCUTS } })
    await window.api.settings.set({ shortcuts: JSON.stringify(DEFAULT_SHORTCUTS) })
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

window.api.agent.onChunk((conversationId, chunk) => {
  useStore.getState()._onChunk(conversationId, chunk)
})

// Background features (e.g. a scheduled task firing) signal a data change —
// refresh the conversation list so new results appear without a manual reload.
window.api.app.onDataChanged(() => {
  useStore.getState().refreshConversations()
})
