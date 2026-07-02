import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import obfuscatorPlugin from 'vite-plugin-javascript-obfuscator'

// --- Anti reverse-engineering ----------------------------------------------
// Electron ships JavaScript, so the source can always be extracted from the
// packaged app.asar. We can't make that impossible, only expensive: obfuscating
// our own modules (control-flow flattening + encoded string arrays) makes the
// code hostile to both humans and LLM-assisted analysis. We deliberately:
//   - run ONLY on production builds (`apply: 'build'`); dev stays readable,
//   - skip `node_modules` (no point scrambling React; it'd only slow startup
//     and risk breaking vendor code), the plugin filters by module id,
//   - use a heavy profile for the renderer (UI, perf-tolerant) and a
//     conservative profile for main/preload (touches native sqlite, spawns the
//     agent subprocess, async I/O — control-flow flattening there is risky).
// Set DISABLE_OBFUSCATION=1 to bypass entirely when debugging a packaged build.
const obfuscate = !process.env.DISABLE_OBFUSCATION

// Shared base: string-array encoding + identifier mangling.
// `renameGlobals` stays false everywhere — renaming globals breaks interop with
// externalized deps / the preload contextBridge.
//
// `selfDefending` is deliberately OFF. It injects an anti-tamper check that
// enters an infinite `while(true)` loop when it detects its own code was
// altered — but our pipeline runs esbuild's minify pass AFTER the obfuscator,
// which *does* alter the code, so the check false-positives and hangs the
// process at 100% CPU with no first paint. This was the v1.6.0 "window never
// opens" bug (reproduced 3/3 on fresh installs). The string-array + control-
// flow-flattening layers already make the code hostile to read; self-defending
// bought little and cost a runtime deadlock.
const baseObfuscation = {
  compact: true,
  identifierNamesGenerator: 'hexadecimal',
  renameGlobals: false,
  selfDefending: false,
  simplify: true,
  stringArray: true,
  stringArrayEncoding: ['base64'],
  stringArrayThreshold: 0.75,
  numbersToExpressions: true,
  transformObjectKeys: true,
  unicodeEscapeSequence: false
}

// Renderer profile — the aggressive one. Control-flow flattening + dead-code
// injection are what blow up an LLM's token budget and error rate.
//
// `debugProtection` is deliberately OFF too. Its anti-debugger technique times
// a `debugger` statement and spins in an infinite loop when the delta looks
// like a debugger is attached — but on a cold first launch (slow, under load)
// the timing check false-positives and deadlocks the renderer the same way
// selfDefending did. It was also redundant: the packaged build already blocks
// DevTools entirely (Electron fuses + `devTools: false`), so there is no
// DevTools session for it to defend against. Removed to fix the hang.
const rendererObfuscation = {
  ...baseObfuscation,
  controlFlowFlattening: true,
  controlFlowFlatteningThreshold: 0.75,
  deadCodeInjection: true,
  deadCodeInjectionThreshold: 0.4,
  disableConsoleOutput: true,
  splitStrings: true,
  splitStringsChunkLength: 8,
  stringArrayThreshold: 0.85,
  stringArrayCallsTransform: true,
  stringArrayRotate: true,
  stringArrayShuffle: true,
  stringArrayWrappersType: 'function'
}

// Main/preload profile — conservative. No control-flow flattening or dead-code
// injection (these can break native module loading, dynamic import() of the
// agent SDK, and add latency to hot I/O paths). We still scramble identifiers
// and encode string literals, which hides the valuable logic (prompts,
// permission rules, SDK orchestration) without touching control flow.
const mainObfuscation = {
  ...baseObfuscation,
  controlFlowFlattening: false,
  deadCodeInjection: false,
  debugProtection: false,
  splitStrings: false,
  stringArrayThreshold: 0.6,
  // Never pull module specifiers into the string array — require()/import()
  // resolution must stay statically analyzable for the bundler and Node.
  reservedStrings: ['^better-sqlite3$', '^@anthropic-ai/', '^sherpa-onnx', '^node:', '^electron$']
}

const mkObfuscator = (options: Record<string, unknown>) =>
  obfuscatorPlugin({
    apply: 'build',
    exclude: [/node_modules/],
    options
  })

export default defineConfig({
  // Main + preload run in Node. externalizeDepsPlugin keeps `dependencies`
  // (better-sqlite3 native binding, the Anthropic SDKs, etc.) out of the
  // bundle so they're required from node_modules at runtime instead of being
  // (incorrectly) bundled by Vite.
  main: {
    build: { minify: 'esbuild' },
    plugins: [externalizeDepsPlugin(), ...(obfuscate ? [mkObfuscator(mainObfuscation)] : [])]
  },
  preload: {
    build: { minify: 'esbuild' },
    plugins: [externalizeDepsPlugin(), ...(obfuscate ? [mkObfuscator(mainObfuscation)] : [])]
  },
  renderer: {
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src')
      }
    },
    plugins: [react(), tailwindcss(), ...(obfuscate ? [mkObfuscator(rendererObfuscation)] : [])]
  }
})
