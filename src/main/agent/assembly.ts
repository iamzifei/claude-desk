import { runOnce } from './run'
import { getTopic } from '../db/topics'
import { searchAll, type SearchHit } from '../db/search'
import { getMaterial, buildMaterialsSystemPrompt } from '../db/materials'
import { getAtom, buildAtomsSystemPrompt } from '../db/atoms'
import { buildAssemblyPrompt, formatAssemblyContext, type AssemblyItem } from './assembly-presets'
import { buildRetrievalTerms, rankByTermMatches } from './assembly-retrieval'

export interface AssemblyResult {
  draft: string
  used: number // how many assets were assembled in
}

/**
 * 选题装配 — retrieve the creator's relevant assets for a topic and assemble a
 * draft from them. Retrieval is by the topic title (via the unified search);
 * in-context materials/atoms ride along as fixed brand background.
 */
export async function runAssembly(topicId: string): Promise<AssemblyResult> {
  const topic = getTopic(topicId)
  if (!topic) throw new Error('选题不存在')

  // Retrieve the creator's relevant assets. A whole-title LIKE finds nothing in
  // Chinese (no word boundaries), so expand the title+angle into overlapping
  // terms, search each, and keep the assets that match the most distinct terms.
  const terms = buildRetrievalTerms(topic.title, topic.angle)
  const keyOf = (h: SearchHit): string => `${h.kind}:${h.id}`
  const hitByKey = new Map<string, SearchHit>()
  const hitsPerTerm = terms.map((t) => {
    const hits = searchAll(topic.workspace_id, t, 8).filter(
      (h) => h.kind === 'material' || h.kind === 'atom'
    )
    for (const h of hits) hitByKey.set(keyOf(h), h)
    return hits
  })
  const ranked = rankByTermMatches(hitsPerTerm, keyOf).slice(0, 6)

  const items: AssemblyItem[] = []
  for (const { key } of ranked) {
    const h = hitByKey.get(key)
    if (!h) continue
    if (h.kind === 'material') {
      const m = getMaterial(h.id)
      if (m) items.push({ kind: '素材', title: m.title, content: m.content })
    } else {
      const a = getAtom(h.id)
      if (a) items.push({ kind: '原子', title: '', content: a.content })
    }
  }

  const ctx = formatAssemblyContext(items)
  const { system, prompt } = buildAssemblyPrompt(
    { title: topic.title, angle: topic.angle, platform: topic.platform },
    ctx
  )
  // In-context assets (the creator's pinned brand voice) ride along as background.
  const voice = [buildMaterialsSystemPrompt(), buildAtomsSystemPrompt()].filter(Boolean).join('\n\n')
  const fullSystem = voice ? `${system}\n\n创作者固定上下文(可一并参考):\n${voice}` : system

  const draft = await runOnce(
    [{ id: 'as', conversation_id: 'as', role: 'user', content: prompt, created_at: Date.now() }],
    undefined,
    fullSystem
  )
  return { draft, used: items.length }
}
