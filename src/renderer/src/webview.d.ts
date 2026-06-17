import type { DetailedHTMLProps, HTMLAttributes } from 'react'

/** Electron's NativeImage (subset we use). */
export interface NativeImageLike {
  toDataURL: () => string
}

/** The Electron <webview> element's runtime methods we call. */
export interface WebviewEl extends HTMLElement {
  src: string
  loadURL: (url: string) => Promise<void>
  getURL: () => string
  getTitle: () => string
  goBack: () => void
  goForward: () => void
  canGoBack: () => boolean
  reload: () => void
  stop: () => void
  capturePage: () => Promise<NativeImageLike>
  executeJavaScript: (code: string, userGesture?: boolean) => Promise<unknown>
}

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      webview: DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement> & {
        src?: string
        partition?: string
        allowpopups?: string
        useragent?: string
      }
    }
  }
}
