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
  conversations: {
    list: () => ipcRenderer.invoke('conversations:list'),
    create: () => ipcRenderer.invoke('conversations:create'),
    delete: (id: string) => ipcRenderer.invoke('conversations:delete', id),
    rename: (id: string, title: string) => ipcRenderer.invoke('conversations:rename', id, title),
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
