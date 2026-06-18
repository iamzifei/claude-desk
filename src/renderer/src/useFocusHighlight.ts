import { useEffect, useRef, useState } from 'react'
import { useStore } from './store'

/**
 * When the store's focusId matches `id` (set by a wikilink/backlink/⌘K jump),
 * scroll the element into view and flash a highlight. Consumes the focus once.
 */
export function useFocusHighlight(id: string): {
  ref: React.RefObject<HTMLDivElement | null>
  focused: boolean
} {
  const focusId = useStore((s) => s.focusId)
  const ref = useRef<HTMLDivElement>(null)
  const [focused, setFocused] = useState(false)

  useEffect(() => {
    if (focusId !== id) return
    ref.current?.scrollIntoView({ block: 'center', behavior: 'smooth' })
    setFocused(true)
    useStore.setState({ focusId: null })
    const t = setTimeout(() => setFocused(false), 2200)
    return () => clearTimeout(t)
  }, [focusId, id])

  return { ref, focused }
}
