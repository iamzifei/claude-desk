import { randomUUID } from 'crypto'
import { getDb } from './index'
import { scopeClause, scopeProjectId } from './scope'
import {
  initPhaseOutputs,
  parsePhaseOutputs,
  currentPhase,
  type CreationFormat,
  type PhaseOutputs
} from '../agent/pipeline-util'

/**
 * 创作 (creations) — persistence for the 7-phase creation pipeline. Each row is
 * one piece of content moving through 选题→…→复盘. All state-machine logic
 * lives in agent/pipeline-util (pure, unit-tested); this module only maps rows
 * to/from SQLite following the same conventions as personas/materials
 * (project scoping via scopeClause / scopeProjectId).
 */

export interface CreationRow {
  id: string
  title: string
  format: string
  persona_id: string | null
  current_phase: number
  phase_outputs: string
  project_id: string | null
  created_at: number
  updated_at: number
}

export interface Creation {
  id: string
  title: string
  format: CreationFormat
  persona_id: string | null
  current_phase: number
  phases: PhaseOutputs
  project_id: string | null
  created_at: number
  updated_at: number
}

function rowToCreation(r: CreationRow): Creation {
  return {
    id: r.id,
    title: r.title,
    format: r.format === 'script' ? 'script' : 'article',
    persona_id: r.persona_id,
    current_phase: r.current_phase,
    phases: parsePhaseOutputs(r.phase_outputs),
    project_id: r.project_id,
    created_at: r.created_at,
    updated_at: r.updated_at
  }
}

export function getCreation(id: string): Creation | undefined {
  const row = getDb().prepare('SELECT * FROM creations WHERE id = ?').get(id) as
    | CreationRow
    | undefined
  return row ? rowToCreation(row) : undefined
}

/** All creations under the active project scope, most recently touched first. */
export function listCreations(): Creation[] {
  const conds: string[] = []
  const params: unknown[] = []
  const sc = scopeClause()
  if (sc.sql) {
    conds.push(sc.sql)
    params.push(...sc.params)
  }
  const where = conds.length ? `WHERE ${conds.join(' AND ')}` : ''
  const rows = getDb()
    .prepare(`SELECT * FROM creations ${where} ORDER BY updated_at DESC`)
    .all(...params) as CreationRow[]
  return rows.map(rowToCreation)
}

export function createCreation(
  title: string,
  format: CreationFormat,
  personaId: string | null
): Creation {
  const id = randomUUID()
  const now = Date.now()
  const phases = initPhaseOutputs(format)
  getDb()
    .prepare(
      `INSERT INTO creations (id, title, format, persona_id, current_phase, phase_outputs,
         project_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      id,
      title.trim() || '未命名创作',
      format,
      personaId,
      currentPhase(phases),
      JSON.stringify(phases),
      scopeProjectId(),
      now,
      now
    )
  return getCreation(id)!
}

/** Persist a new phase map (after start/done/error transitions). */
export function saveCreationPhases(id: string, phases: PhaseOutputs): void {
  getDb()
    .prepare(
      'UPDATE creations SET phase_outputs = ?, current_phase = ?, updated_at = ? WHERE id = ?'
    )
    .run(JSON.stringify(phases), currentPhase(phases), Date.now(), id)
}

export function renameCreation(id: string, title: string): void {
  getDb()
    .prepare('UPDATE creations SET title = ?, updated_at = ? WHERE id = ?')
    .run(title.trim() || '未命名创作', Date.now(), id)
}

export function setCreationPersona(id: string, personaId: string | null): void {
  getDb()
    .prepare('UPDATE creations SET persona_id = ?, updated_at = ? WHERE id = ?')
    .run(personaId, Date.now(), id)
}

export function deleteCreation(id: string): void {
  getDb().prepare('DELETE FROM creations WHERE id = ?').run(id)
}
