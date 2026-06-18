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
  const newConversation = useStore((s) => s.newConversation)
  const newWorkspace = useStore((s) => s.newWorkspace)

  useEffect(() => {
    const dispatch = (action: ShortcutAction): void => {
      if (action === 'new-workspace') newWorkspace()
      else newConversation(null) // new-chat & new-tab both open a fresh chat tab
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
  }, [shortcuts, newConversation, newWorkspace])
}
