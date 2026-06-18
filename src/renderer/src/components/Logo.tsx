import { JSX } from 'react'

/**
 * 墨栖 InkNest mark — an ink drop settling into a cradling nest (墨 + 栖).
 * Uses currentColor so callers control the fill (white on the gradient chip,
 * primary elsewhere).
 */
export function Logo({ className }: { className?: string }): JSX.Element {
  return (
    <svg viewBox="0 0 100 100" fill="none" className={className} aria-hidden="true">
      <path d="M28 58 Q50 78 72 58" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
      <path d="M50 26 C60 41 62 51 50 61 C38 51 40 41 50 26 Z" fill="currentColor" />
    </svg>
  )
}
