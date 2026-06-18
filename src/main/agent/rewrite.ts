import { runOnce } from './run'
import { buildMaterialsSystemPrompt } from '../db/materials'
import { platformById, buildRewritePrompt } from './platform-presets'

export interface RewriteResult {
  platform: string // platform id
  text: string
}

/**
 * 一键多平台改写 — rewrite one source into several platforms at once.
 * Each platform runs as an independent one-shot completion (in parallel) using
 * its own channel-native system prompt. In-context materials are folded in as
 * extra context so the brand voice carries across all versions.
 */
export async function runRewrite(
  source: string,
  platformIds: string[],
  modelOverride?: string | null
): Promise<RewriteResult[]> {
  const materialContext = buildMaterialsSystemPrompt() || undefined
  const jobs = platformIds
    .map((id) => platformById(id))
    .filter((p): p is NonNullable<typeof p> => Boolean(p))
    .map(async (p) => {
      const { system, prompt } = buildRewritePrompt(p, source, materialContext)
      const text = await runOnce(
        [{ id: 'r', conversation_id: 'r', role: 'user', content: prompt, created_at: Date.now() }],
        modelOverride,
        system
      )
      return { platform: p.id, text }
    })
  return Promise.all(jobs)
}
