import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

/**
 * The IPC surface exposed to the renderer as `window.api`, organized by
 * namespace (agent / conversations / settings / app) — the same shape the
 * reference app uses, just trimmed to the MVP channels.
 */
const api = {
  agent: {
    query: (conversationId: string, text: string) =>
      ipcRenderer.invoke('agent:query', conversationId, text),
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
    messages: (id: string) => ipcRenderer.invoke('conversations:messages', id)
  },
  settings: {
    get: () => ipcRenderer.invoke('settings:get'),
    getProviders: () => ipcRenderer.invoke('settings:getProviders'),
    set: (patch: Record<string, string>) => ipcRenderer.invoke('settings:set', patch)
  },
  app: {
    getDefaultWorkspace: () => ipcRenderer.invoke('app:getDefaultWorkspace'),
    openFolder: () => ipcRenderer.invoke('dialog:openFolder'),
    openExternal: (url: string) => ipcRenderer.invoke('app:openExternal', url)
  },
  files: {
    listDir: (dir: string) => ipcRenderer.invoke('files:listDir', dir)
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
