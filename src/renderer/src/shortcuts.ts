/**
 * Configurable keyboard shortcuts. Accelerators are stored as canonical strings
 * like "Mod+Shift+N" ("Mod" = ⌘ on macOS, Ctrl elsewhere). This module is pure
 * (no React / no DOM globals beyond the passed event) so the parse/match/format
 * logic is unit-tested.
 */
export type ShortcutAction =
  | 'quick-switch'
  | 'quick-capture'
  | 'new-chat'
  | 'close-tab'
  | 'new-tab'
  | 'new-workspace'
  | 'close-workspace'
  | 'new-split'
  | 'close-split'

export const SHORTCUT_ACTIONS: ShortcutAction[] = [
  'quick-switch',
  'quick-capture',
  'new-chat',
  'new-tab',
  'close-tab',
  'new-workspace',
  'close-workspace',
  'new-split',
  'close-split'
]

export const ACTION_LABELS: Record<ShortcutAction, string> = {
  'quick-switch': '快速搜索 / 跳转',
  'quick-capture': '快速采集到收件箱',
  'new-chat': '新建对话',
  'new-tab': '新建标签页',
  'close-tab': '关闭对话 / 标签页',
  'new-workspace': '新建工作区',
  'close-workspace': '关闭工作区',
  'new-split': '新建分屏',
  'close-split': '关闭分屏'
}

export const DEFAULT_SHORTCUTS: Record<ShortcutAction, string> = {
  'quick-switch': 'Mod+K',
  'quick-capture': 'Mod+Shift+I',
  'new-chat': 'Mod+N',
  'new-tab': 'Mod+T',
  'close-tab': 'Mod+W',
  'new-workspace': 'Mod+Shift+N',
  'close-workspace': 'Mod+Shift+W',
  'new-split': 'Mod+D',
  'close-split': 'Mod+Shift+D'
}

export const isMac =
  typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || '')

interface KeyLike {
  metaKey: boolean
  ctrlKey: boolean
  altKey: boolean
  shiftKey: boolean
  key: string
  code: string
}

/** Normalize a physical key to a stable, shift-independent token (N, 1, Enter…). */
function keyToken(e: KeyLike): string {
  if (/^Key[A-Z]$/.test(e.code)) return e.code.slice(3) // KeyN → N
  if (/^Digit\d$/.test(e.code)) return e.code.slice(5) // Digit1 → 1
  if (e.key === ' ' || e.code === 'Space') return 'Space'
  // Function keys, arrows, Enter, etc.
  if (e.key.length > 1) return e.key
  return e.key.toUpperCase()
}

/** Build the canonical accelerator string for a keyboard event (modifiers + key). */
export function eventToAccelerator(e: KeyLike): string {
  const parts: string[] = []
  if (e.metaKey || e.ctrlKey) parts.push('Mod')
  if (e.altKey) parts.push('Alt')
  if (e.shiftKey) parts.push('Shift')
  parts.push(keyToken(e))
  return parts.join('+')
}

/** True if this event matches the given accelerator. A bare modifier never matches. */
export function matchShortcut(e: KeyLike, accelerator: string): boolean {
  if (!accelerator) return false
  const token = keyToken(e)
  if (['Mod', 'Alt', 'Shift', 'Control', 'Meta'].includes(token)) return false
  return eventToAccelerator(e) === accelerator
}

/** Human-readable accelerator for display (⌘⇧N on mac, Ctrl+Shift+N elsewhere). */
export function formatAccelerator(accelerator: string): string {
  if (!accelerator) return '—'
  const map: Record<string, string> = isMac
    ? { Mod: '⌘', Alt: '⌥', Shift: '⇧', Ctrl: '⌃' }
    : { Mod: 'Ctrl', Alt: 'Alt', Shift: 'Shift', Ctrl: 'Ctrl' }
  const parts = accelerator.split('+').map((p) => map[p] ?? p)
  return isMac ? parts.join('') : parts.join('+')
}

/** Merge stored overrides onto defaults, dropping unknown/empty entries. */
export function mergeShortcuts(stored: Partial<Record<string, string>> | null): Record<ShortcutAction, string> {
  const out = { ...DEFAULT_SHORTCUTS }
  if (stored) {
    for (const a of SHORTCUT_ACTIONS) {
      if (typeof stored[a] === 'string' && stored[a]) out[a] = stored[a] as string
    }
  }
  return out
}
