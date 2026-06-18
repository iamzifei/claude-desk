import { runOnce } from './run'
import { buildMaterialsSystemPrompt } from '../db/materials'
import { buildAtomsSystemPrompt } from '../db/atoms'
import { buildDiagnosePrompt, buildDeAIPrompt } from './diagnose-presets'

const asUser = (text: string): Parameters<typeof runOnce>[0] => [
  { id: 'd', conversation_id: 'd', role: 'user', content: text, created_at: Date.now() }
]

/** Five-dimensional content diagnosis → markdown report. */
export async function runDiagnose(draft: string): Promise<string> {
  const { system, prompt } = buildDiagnosePrompt(draft)
  return runOnce(asUser(prompt), undefined, system)
}

/** De-AI-flavor rewrite, voiced by in-context materials + atoms (人设/风格). */
export async function runDeAI(draft: string): Promise<string> {
  const voice =
    [buildMaterialsSystemPrompt(), buildAtomsSystemPrompt()].filter(Boolean).join('\n\n') || undefined
  const { system, prompt } = buildDeAIPrompt(draft, voice)
  return runOnce(asUser(prompt), undefined, system)
}
