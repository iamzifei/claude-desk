/**
 * Brand constants — single source of truth for product naming in the UI.
 *
 * The product was renamed from 墨栖/InkNest to 灵犀桌面版 (LingXi Desktop) as
 * part of the unified LingXi branding (desktop = 灵犀桌面版, cloud = 灵犀 at
 * lingxi.show). Note this is UI-facing only: the internal app name in
 * package.json stays "claude-desk" on purpose, because Electron derives the
 * userData directory (where the SQLite DB lives) from it — changing it would
 * silently orphan every existing user's data.
 */
export const BRAND_NAME = '灵犀桌面版'
export const BRAND_NAME_EN = 'LingXi Desktop'

/** Canonical URL of the cloud edition (灵犀云版) — used by cross-promotion links. */
export const LINGXI_CLOUD_URL = 'https://www.lingxi.show'

/**
 * CCAPI (ccapi.ai) — the API relay where users who lack an overseas-model
 * API key can buy Claude (and other) model credits directly.
 *
 * We deep-link to the model-specific landing page (`/models/<slug>`), which is
 * the shortest purchase path for a logged-out user: it carries the marketing
 * pitch, a sign-up flow, and the top-up entry. Valid Claude slugs on ccapi.ai
 * are `claude-opus` / `claude-sonnet` / `claude-haiku` (see orrisapi
 * web/src/models/index.js); anything unrecognized falls back to sonnet, the
 * balanced default.
 *
 * Every generated link carries UTM tags so conversions attribute back to the
 * desktop app; `content` distinguishes the in-app touchpoint (settings /
 * onboarding / …).
 */
export const CCAPI_BASE_URL = 'https://ccapi.ai'

export function ccapiModelUrl(model?: string | null, content?: string): string {
  const m = (model ?? '').toLowerCase()
  const slug = m.includes('opus')
    ? 'claude-opus'
    : m.includes('haiku')
      ? 'claude-haiku'
      : 'claude-sonnet'
  const params = new URLSearchParams({
    utm_source: 'lingxi-desktop',
    utm_medium: 'app',
    utm_campaign: 'api-relay'
  })
  if (content) params.set('utm_content', content)
  return `${CCAPI_BASE_URL}/models/${slug}?${params.toString()}`
}
