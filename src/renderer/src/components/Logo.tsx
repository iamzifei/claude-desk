import { JSX } from 'react'
import logoUrl from '../assets/logo.png'

/**
 * 灵犀桌面版 (LingXi Desktop) mark — a woven nest cradling a glowing ink
 * droplet, inherited from the original InkNest identity: the creator's content
 * assets accumulate and grow valuable, like eggs nesting.
 * Rendered as the app-icon raster so the in-app mark matches the dock icon.
 */
export function Logo({ className }: { className?: string }): JSX.Element {
  return <img src={logoUrl} alt="LingXi Desktop" className={className} draggable={false} aria-hidden="true" />
}
