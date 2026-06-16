import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  // Main + preload run in Node. externalizeDepsPlugin keeps `dependencies`
  // (better-sqlite3 native binding, the Anthropic SDKs, etc.) out of the
  // bundle so they're required from node_modules at runtime instead of being
  // (incorrectly) bundled by Vite.
  main: {
    plugins: [externalizeDepsPlugin()]
  },
  preload: {
    plugins: [externalizeDepsPlugin()]
  },
  renderer: {
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src')
      }
    },
    plugins: [react(), tailwindcss()]
  }
})
