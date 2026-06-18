import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

/**
 * The IPC surface exposed to the renderer as `window.api`, organized by
 * namespace (agent / conversations / settings / app) — the same shape the
 * reference app uses, just trimmed to the MVP channels.
 */
const api = {
  agent: {
    query: (conversationId: string, text: string, web?: boolean) =>
      ipcRenderer.invoke('agent:query', conversationId, text, web),
    cancel: (conversationId: string) => ipcRenderer.invoke('agent:cancel', conversationId),
    // Subscribe to streamed chunks. Returns an unsubscribe function.
    onChunk: (cb: (conversationId: string, chunk: unknown) => void) => {
      const listener = (_e: unknown, conversationId: string, chunk: unknown): void =>
        cb(conversationId, chunk)
      ipcRenderer.on('agent:chunk', listener)
      return () => ipcRenderer.removeListener('agent:chunk', listener)
    }
  },
  workspaces: {
    list: () => ipcRenderer.invoke('workspaces:list'),
    create: (name: string) => ipcRenderer.invoke('workspaces:create', name),
    rename: (id: string, name: string) => ipcRenderer.invoke('workspaces:rename', id, name),
    setRoot: (id: string, path: string | null) =>
      ipcRenderer.invoke('workspaces:setRoot', id, path),
    delete: (id: string) => ipcRenderer.invoke('workspaces:delete', id)
  },
  projects: {
    list: (workspaceId: string) => ipcRenderer.invoke('projects:list', workspaceId),
    create: (workspaceId: string, name: string) =>
      ipcRenderer.invoke('projects:create', workspaceId, name),
    rename: (id: string, name: string) => ipcRenderer.invoke('projects:rename', id, name),
    setDir: (id: string, dir: string | null) => ipcRenderer.invoke('projects:setDir', id, dir),
    delete: (id: string) => ipcRenderer.invoke('projects:delete', id)
  },
  conversations: {
    list: (workspaceId: string) => ipcRenderer.invoke('conversations:list', workspaceId),
    listArchived: (workspaceId: string) =>
      ipcRenderer.invoke('conversations:listArchived', workspaceId),
    search: (workspaceId: string, query: string) =>
      ipcRenderer.invoke('conversations:search', workspaceId, query),
    create: (workspaceId: string, projectId: string | null) =>
      ipcRenderer.invoke('conversations:create', workspaceId, projectId),
    move: (id: string, projectId: string | null) =>
      ipcRenderer.invoke('conversations:move', id, projectId),
    delete: (id: string) => ipcRenderer.invoke('conversations:delete', id),
    rename: (id: string, title: string) => ipcRenderer.invoke('conversations:rename', id, title),
    archive: (id: string, archived: boolean) =>
      ipcRenderer.invoke('conversations:archive', id, archived),
    setModel: (id: string, model: string | null) =>
      ipcRenderer.invoke('conversations:setModel', id, model),
    setPinned: (id: string, pinned: boolean) =>
      ipcRenderer.invoke('conversations:setPinned', id, pinned),
    messages: (id: string) => ipcRenderer.invoke('conversations:messages', id)
  },
  settings: {
    get: () => ipcRenderer.invoke('settings:get'),
    getProviders: () => ipcRenderer.invoke('settings:getProviders'),
    set: (patch: Record<string, string>) => ipcRenderer.invoke('settings:set', patch)
  },
  scheduledTasks: {
    list: (ws: string) => ipcRenderer.invoke('scheduledTasks:list', ws),
    create: (ws: string, t: unknown) => ipcRenderer.invoke('scheduledTasks:create', ws, t),
    delete: (id: string) => ipcRenderer.invoke('scheduledTasks:delete', id),
    toggle: (id: string, enabled: boolean) =>
      ipcRenderer.invoke('scheduledTasks:toggle', id, enabled),
    runNow: (id: string) => ipcRenderer.invoke('scheduledTasks:runNow', id)
  },
  notes: {
    list: (ws: string, type: string) => ipcRenderer.invoke('notes:list', ws, type),
    delete: (id: string) => ipcRenderer.invoke('notes:delete', id),
    generateReview: (ws: string) => ipcRenderer.invoke('review:generate', ws),
    generateMinutes: (ws: string, transcript: string) =>
      ipcRenderer.invoke('minutes:generate', ws, transcript)
  },
  app: {
    getDefaultWorkspace: () => ipcRenderer.invoke('app:getDefaultWorkspace'),
    openFolder: () => ipcRenderer.invoke('dialog:openFolder'),
    openExternal: (url: string) => ipcRenderer.invoke('app:openExternal', url),
    onDataChanged: (cb: () => void) => {
      const listener = (): void => cb()
      ipcRenderer.on('data:changed', listener)
      return () => ipcRenderer.removeListener('data:changed', listener)
    }
  },
  files: {
    listDir: (dir: string) => ipcRenderer.invoke('files:listDir', dir)
  },
  voice: {
    transcribe: (base64: string, mime: string) =>
      ipcRenderer.invoke('transcribe:audio', base64, mime),
    localStatus: () => ipcRenderer.invoke('voice:localStatus'),
    downloadModel: () => ipcRenderer.invoke('voice:downloadModel'),
    transcribeLocal: (samples: number[], sampleRate: number) =>
      ipcRenderer.invoke('voice:transcribeLocal', samples, sampleRate),
    onModelProgress: (cb: (pct: number) => void) => {
      const listener = (_e: unknown, pct: number): void => cb(pct)
      ipcRenderer.on('voice:modelProgress', listener)
      return () => ipcRenderer.removeListener('voice:modelProgress', listener)
    }
  },
  skills: {
    list: () => ipcRenderer.invoke('skills:list'),
    create: (s: unknown) => ipcRenderer.invoke('skills:create', s),
    toggle: (id: string, enabled: boolean) => ipcRenderer.invoke('skills:toggle', id, enabled),
    delete: (id: string) => ipcRenderer.invoke('skills:delete', id),
    import: () => ipcRenderer.invoke('skills:import')
  },
  materials: {
    list: (platform?: string) => ipcRenderer.invoke('materials:list', platform),
    search: (q: string) => ipcRenderer.invoke('materials:search', q),
    platforms: () => ipcRenderer.invoke('materials:platforms'),
    create: (m: unknown) => ipcRenderer.invoke('materials:create', m),
    update: (id: string, m: unknown) => ipcRenderer.invoke('materials:update', id, m),
    toggleContext: (id: string, on: boolean) =>
      ipcRenderer.invoke('materials:toggleContext', id, on),
    delete: (id: string) => ipcRenderer.invoke('materials:delete', id),
    fetchUrl: (url: string) => ipcRenderer.invoke('materials:fetchUrl', url),
    importImage: () => ipcRenderer.invoke('materials:importImage'),
    imageData: (path: string) => ipcRenderer.invoke('materials:imageData', path)
  },
  rewrite: {
    run: (source: string, platforms: string[]) =>
      ipcRenderer.invoke('rewrite:run', source, platforms)
  },
  search: {
    all: (workspaceId: string | null, query: string) =>
      ipcRenderer.invoke('search:all', workspaceId, query)
  },
  links: {
    backlinks: (kind: string, id: string) => ipcRenderer.invoke('links:backlinks', kind, id),
    resolve: (title: string) => ipcRenderer.invoke('links:resolve', title),
    titles: () => ipcRenderer.invoke('links:titles')
  },
  tags: {
    groups: () => ipcRenderer.invoke('tags:groups'),
    byTag: (tag: string) => ipcRenderer.invoke('tags:byTag', tag)
  },
  graph: {
    build: (workspaceId: string) => ipcRenderer.invoke('graph:build', workspaceId)
  },
  publications: {
    list: (ws: string) => ipcRenderer.invoke('publications:list', ws),
    create: (ws: string, p: unknown) => ipcRenderer.invoke('publications:create', ws, p),
    update: (id: string, p: unknown) => ipcRenderer.invoke('publications:update', id, p),
    delete: (id: string) => ipcRenderer.invoke('publications:delete', id),
    suggestTopics: (ws: string) => ipcRenderer.invoke('publications:suggestTopics', ws),
    saveTemplate: (id: string) => ipcRenderer.invoke('publications:saveTemplate', id)
  },
  topics: {
    list: (workspaceId: string) => ipcRenderer.invoke('topics:list', workspaceId),
    create: (workspaceId: string, t: unknown) => ipcRenderer.invoke('topics:create', workspaceId, t),
    update: (id: string, t: unknown) => ipcRenderer.invoke('topics:update', id, t),
    setStatus: (id: string, status: string) => ipcRenderer.invoke('topics:setStatus', id, status),
    delete: (id: string) => ipcRenderer.invoke('topics:delete', id),
    assemble: (id: string) => ipcRenderer.invoke('topics:assemble', id)
  },
  diagnose: {
    run: (draft: string) => ipcRenderer.invoke('diagnose:run', draft),
    deai: (draft: string) => ipcRenderer.invoke('diagnose:deai', draft)
  },
  atoms: {
    list: (type?: string) => ipcRenderer.invoke('atoms:list', type),
    search: (q: string) => ipcRenderer.invoke('atoms:search', q),
    types: () => ipcRenderer.invoke('atoms:types'),
    create: (a: unknown) => ipcRenderer.invoke('atoms:create', a),
    update: (id: string, a: unknown) => ipcRenderer.invoke('atoms:update', id, a),
    toggleContext: (id: string, on: boolean) => ipcRenderer.invoke('atoms:toggleContext', id, on),
    delete: (id: string) => ipcRenderer.invoke('atoms:delete', id),
    extractFromMaterial: (materialId: string) =>
      ipcRenderer.invoke('atoms:extractFromMaterial', materialId),
    extractFromText: (text: string, sourceKind?: string, sourceId?: string) =>
      ipcRenderer.invoke('atoms:extractFromText', text, sourceKind, sourceId)
  },
  browser: {
    decide: (
      task: string,
      history: string[],
      screenshotB64: string,
      url: string,
      elements: unknown[]
    ) => ipcRenderer.invoke('browser:decide', task, history, screenshotB64, url, elements)
  },
  coding: {
    run: (runId: string, task: string, cwd: string) =>
      ipcRenderer.invoke('coding:run', runId, task, cwd),
    cancel: (runId: string) => ipcRenderer.invoke('coding:cancel', runId),
    onEvent: (cb: (runId: string, ev: unknown) => void) => {
      const listener = (_e: unknown, runId: string, ev: unknown): void => cb(runId, ev)
      ipcRenderer.on('coding:event', listener)
      return () => ipcRenderer.removeListener('coding:event', listener)
    }
  },
  exporter: {
    capture: (rect: { x: number; y: number; width: number; height: number }) =>
      ipcRenderer.invoke('export:capture', rect),
    pdfFromImage: (dataUrl: string, w: number, h: number) =>
      ipcRenderer.invoke('export:pdfFromImage', dataUrl, w, h),
    saveBinary: (defaultName: string, base64: string) =>
      ipcRenderer.invoke('export:saveBinary', defaultName, base64),
    copyImage: (dataUrl: string) => ipcRenderer.invoke('export:copyImage', dataUrl)
  }
}

export type Api = typeof api

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
