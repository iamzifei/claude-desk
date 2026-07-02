import { app } from 'electron'
import { join } from 'path'
import { readdirSync, readFileSync } from 'fs'
import { runChat, type Chunk, type RunHandle } from './run'
import {
  assemblePhaseSystem,
  applyPhaseStart,
  applyPhaseDone,
  applyPhaseError,
  buildPreviousOutputs,
  canRunPhase,
  phaseMeta
} from './pipeline-util'
import { getCreation, saveCreationPhases } from '../db/creations'
import { getPersona, getDefaultPersona } from '../db/personas'
import { buildPersonaSystemPrompt } from '../db/persona-util'

/**
 * Pipeline execution engine — runs one phase of a creation as a single
 * streaming conversation turn.
 *
 *   system  = shared phase prompt (resources/pipeline/phase-<id>-<key>.md,
 *             synced from ~/Dev/creator-skills/pipeline) with {persona} /
 *             {previous_outputs} / {format} injected
 *   user    = the phase input (topic direction, retro data, …) or "继续"
 *
 * Streaming reuses runChat (same provider/key/model plumbing as normal chat,
 * `systemOverride` bypasses the global skills/materials prompt so a phase run
 * is fully deterministic from its template + creation state). On 'done' the
 * full output is persisted into `phase_outputs` and downstream done-phases
 * flip to 'stale' (see pipeline-util.applyPhaseDone).
 */

/** Where the bundled phase prompts live (same resolution as builtin skills). */
function pipelineRoot(): string {
  const appPath = app.isPackaged
    ? app.getAppPath().replace('app.asar', 'app.asar.unpacked')
    : app.getAppPath()
  return join(appPath, 'resources', 'pipeline')
}

/**
 * Load the prompt template for a phase. Files are named `phase-<id>-<key>.md`;
 * we match on the `phase-<id>-` prefix so a renamed key in the shared repo
 * doesn't silently break the app.
 */
export function loadPhasePrompt(phaseId: number, root = pipelineRoot()): string {
  const prefix = `phase-${phaseId}-`
  let files: string[]
  try {
    files = readdirSync(root)
  } catch {
    throw new Error(`阶段提示词目录缺失：${root}`)
  }
  const file = files.find((f) => f.startsWith(prefix) && f.endsWith('.md'))
  if (!file) throw new Error(`未找到阶段 ${phaseId} 的提示词（${prefix}*.md）`)
  return readFileSync(join(root, file), 'utf8')
}

/** In-flight phase runs, keyed by creation id (one run per creation at a time). */
const activePhaseRuns = new Map<string, RunHandle>()
/** Creations whose current run was manually stopped (abort surfaces as 'done'). */
const cancelledRuns = new Set<string>()

export function cancelPhase(creationId: string): void {
  const handle = activePhaseRuns.get(creationId)
  if (handle) {
    cancelledRuns.add(creationId)
    handle.cancel()
  }
  activePhaseRuns.delete(creationId)
}

/**
 * Run (or rerun) one phase. Persists the running/done/error transitions and
 * forwards every stream chunk to `onChunk` — the IPC layer relays these to the
 * renderer as `pipeline:chunk` events.
 */
export function runPhase(
  creationId: string,
  phaseId: number,
  input: string,
  onChunk: (c: Chunk) => void
): void {
  const creation = getCreation(creationId)
  const meta = phaseMeta(phaseId)
  if (!creation || !meta) {
    onChunk({ type: 'error', message: '创作不存在或阶段无效' })
    return
  }
  if (!canRunPhase(creation.phases, phaseId)) {
    onChunk({ type: 'error', message: '上游阶段还没有完成，无法运行该阶段' })
    return
  }
  if (activePhaseRuns.has(creationId)) {
    onChunk({ type: 'error', message: '该创作已有阶段在运行中' })
    return
  }

  // ---- assemble the system prompt -------------------------------------
  let template: string
  try {
    template = loadPhasePrompt(phaseId)
  } catch (e) {
    onChunk({ type: 'error', message: e instanceof Error ? e.message : String(e) })
    return
  }
  // The creation's bound persona wins; else fall back to the global default
  // persona (same one normal chat injects), else run persona-less.
  const persona =
    (creation.persona_id ? getPersona(creation.persona_id) : undefined) ?? getDefaultPersona()
  const system = assemblePhaseSystem(template, {
    persona: persona ? buildPersonaSystemPrompt(persona) : '',
    previousOutputs: buildPreviousOutputs(creation.phases, phaseId),
    format: creation.format
  })

  // ---- persist 'running' + downstream-stale-on-completion --------------
  let phases = applyPhaseStart(creation.phases, phaseId, input)
  saveCreationPhases(creationId, phases)

  const userTurn =
    `【创作标题】${creation.title}\n` +
    `【本阶段输入】${input.trim() || '（无补充输入）请按当前阶段的要求直接产出。'}`

  let output = ''
  const handle = runChat(
    [
      {
        id: `pipeline-${creationId}-${phaseId}`,
        conversation_id: creationId,
        role: 'user',
        content: userTurn,
        created_at: Date.now()
      }
    ],
    (chunk) => {
      if (chunk.type === 'text') output += chunk.text
      if (chunk.type === 'done') {
        activePhaseRuns.delete(creationId)
        // A manual stop aborts the stream, which surfaces as 'done' — treat it
        // as an error state so the phase stays rerunnable instead of looking
        // finished with a half-written output.
        const wasCancelled = cancelledRuns.delete(creationId)
        if (wasCancelled) {
          phases = applyPhaseError(phases, phaseId, '已手动停止，请重新运行')
        } else if (output.trim()) {
          phases = applyPhaseDone(phases, phaseId, output)
        } else {
          phases = applyPhaseError(phases, phaseId, '本次运行没有产出，请重试')
        }
        saveCreationPhases(creationId, phases)
      }
      if (chunk.type === 'error') {
        activePhaseRuns.delete(creationId)
        cancelledRuns.delete(creationId)
        phases = applyPhaseError(phases, phaseId, chunk.message)
        saveCreationPhases(creationId, phases)
      }
      onChunk(chunk)
    },
    null, // pipeline runs use the global default model
    system
  )
  activePhaseRuns.set(creationId, handle)
}
