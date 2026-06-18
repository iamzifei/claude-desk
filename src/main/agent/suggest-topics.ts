import { runOnce } from './run'
import { listPublications } from '../db/publications'
import { createTopic, type Topic } from '../db/topics'
import {
  formatPublicationsSummary,
  buildSuggestPrompt,
  parseTopicSuggestions
} from './suggest-presets'

/**
 * Read the workspace's publication metrics and let the model propose the next
 * round of topics, written straight back into the 选题库 (status 灵感).
 */
export async function runSuggestTopics(workspaceId: string): Promise<Topic[]> {
  const pubs = listPublications(workspaceId)
  if (pubs.length === 0) return []
  const summary = formatPublicationsSummary(pubs)
  const { system, prompt } = buildSuggestPrompt(summary)
  const raw = await runOnce(
    [{ id: 's', conversation_id: 's', role: 'user', content: prompt, created_at: Date.now() }],
    undefined,
    system
  )
  const suggestions = parseTopicSuggestions(raw)
  return suggestions.map((s) => createTopic(workspaceId, { title: s.title, angle: s.angle ?? null }))
}
