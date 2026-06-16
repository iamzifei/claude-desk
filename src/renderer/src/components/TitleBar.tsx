import { JSX } from 'react'

/** Thin frameless title bar — a drag region; traffic lights overlay its left. */
export function TitleBar(): JSX.Element {
  return <header className="drag-region h-10 shrink-0 bg-sidebar" />
}
