import { JSX } from 'react'

/**
 * Custom frameless title bar. The whole bar is a drag region (-webkit-app-region)
 * except interactive controls. On macOS the native traffic lights sit at the
 * left (inset via trafficLightPosition), so we pad the left side.
 */
export function TitleBar(): JSX.Element {
  return (
    <header className="titlebar">
      <div className="titlebar-brand">牛马AI · Desk</div>
    </header>
  )
}
