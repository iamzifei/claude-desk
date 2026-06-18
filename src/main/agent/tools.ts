import type Anthropic from '@anthropic-ai/sdk'

/**
 * Anthropic's hosted web-search server tool. The model decides when to search,
 * results are fetched server-side, and the answer (with citations) streams back
 * in the same response — no client-side loop needed. Only the official
 * Anthropic API serves it; the compatible gateways don't, so we gate on
 * provider before attaching it.
 */
const WEB_SEARCH_TOOL = {
  type: 'web_search_20250305',
  name: 'web_search',
  max_uses: 5
} as const

export interface ToolOptions {
  webSearch?: boolean
  providerId?: string
}

/**
 * Build the `tools` array for a chat request, or undefined when none apply.
 * Pure & unit-tested so the gating logic is verifiable without the SDK.
 */
export function buildRequestTools(opts: ToolOptions): Anthropic.Messages.ToolUnion[] | undefined {
  const tools: Anthropic.Messages.ToolUnion[] = []
  if (opts.webSearch && (opts.providerId ?? 'anthropic') === 'anthropic') {
    tools.push(WEB_SEARCH_TOOL as unknown as Anthropic.Messages.ToolUnion)
  }
  return tools.length ? tools : undefined
}
