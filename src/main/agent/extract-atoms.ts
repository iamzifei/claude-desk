import { runOnce } from './run'
import { buildAtomExtractPrompt, parseAtoms, type ExtractedAtom } from '../db/atom-extract'

/** Run the model to split a piece of text into reusable knowledge atoms. */
export async function extractAtoms(source: string): Promise<ExtractedAtom[]> {
  const trimmed = source.trim()
  if (!trimmed) return []
  const { system, prompt } = buildAtomExtractPrompt(trimmed)
  const raw = await runOnce(
    [{ id: 'a', conversation_id: 'a', role: 'user', content: prompt, created_at: Date.now() }],
    undefined,
    system
  )
  return parseAtoms(raw)
}
