/**
 * Provider registry. Every entry is Anthropic-/Messages-API-compatible, so a
 * single `@anthropic-ai/sdk` client works against all of them — only the
 * `baseURL` and the available model IDs change. This is the "multi-provider
 * router" pattern: official Anthropic plus Anthropic-compatible gateways.
 *
 * The default model for the official provider is `claude-opus-4-8` (Anthropic's
 * most capable Opus-tier model). Other providers expose their own model IDs.
 */
export interface Provider {
  id: string
  label: string
  baseURL: string
  /** Suggested model IDs for the settings UI. Users can type any string. */
  models: string[]
}

export const PROVIDERS: Record<string, Provider> = {
  anthropic: {
    id: 'anthropic',
    label: 'Anthropic (official)',
    baseURL: 'https://api.anthropic.com',
    models: ['claude-opus-4-8', 'claude-sonnet-4-6', 'claude-haiku-4-5']
  },
  deepseek: {
    id: 'deepseek',
    label: 'DeepSeek',
    baseURL: 'https://api.deepseek.com/anthropic',
    models: ['deepseek-chat', 'deepseek-reasoner']
  },
  zhipu: {
    id: 'zhipu',
    label: '智谱 GLM',
    baseURL: 'https://open.bigmodel.cn/api/anthropic',
    models: ['glm-4.6', 'glm-4.5']
  },
  moonshot: {
    id: 'moonshot',
    label: 'Moonshot / Kimi',
    baseURL: 'https://api.moonshot.cn/anthropic',
    models: ['kimi-k2-0905-preview']
  }
}

export const DEFAULT_PROVIDER = 'anthropic'
export const DEFAULT_MODEL = 'claude-opus-4-8'

export function getProvider(id: string): Provider {
  return PROVIDERS[id] ?? PROVIDERS[DEFAULT_PROVIDER]
}
