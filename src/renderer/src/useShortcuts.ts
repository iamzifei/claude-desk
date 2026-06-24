import { useEffect } from 'react'
import { useStore } from './store'
import { matchShortcut, SHORTCUT_ACTIONS, type ShortcutAction } from './shortcuts'

// When the user is recording a new binding in Settings, suspend dispatch so the
// captured keystroke doesn't also fire the action it's being bound to.
let suspended = false
export function suspendShortcuts(v: boolean): void {
  suspended = v
}

/** Global keyboard-shortcut dispatcher. Mount once at the app root. */
export function useShortcuts(): void {
  const shortcuts = useStore((s) => s.shortcuts)

  useEffect(() => {
    const dispatch = (action: ShortcutAction): void => {
      const s = useStore.getState()
      switch (action) {
        case 'quick-switch':
          s.setQuickOpen(true)
          break
        case 'quick-capture':
          s.setQuickCaptureOpen(true)
          break
        case 'new-chat':
        case 'new-tab':
          s.newConversation(null)
          break
        case 'close-tab':
          if (s.activeId) s.closeTab(s.activeId)
          break
        case 'new-workspace':
          s.newWorkspace()
          break
        case 'close-workspace':
          s.closeWorkspace()
          break
        case 'new-split':
          if (s.panes.length === 0) s.toggleSplit() // opens a 2nd conversation, or a reference pane
          break
        case 'close-split':
          s.closeSplit()
          break
      }
    }
    const onKey = (e: KeyboardEvent): void => {
      if (suspended) return
      for (const action of SHORTCUT_ACTIONS) {
        if (matchShortcut(e, shortcuts[action])) {
          e.preventDefault()
          dispatch(action)
          return
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [shortcuts])
}
