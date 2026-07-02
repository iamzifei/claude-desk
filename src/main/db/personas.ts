import { randomUUID } from 'crypto'
import { getDb } from './index'
import { scopeClause, scopeProjectId } from './scope'
import {
  buildPersonaSystemPrompt,
  personaToColumns,
  rowToPersona,
  type Persona,
  type PersonaData,
  type PersonaRow
} from './persona-util'

/**
 * 人设 (persona) five-dimension profiles — the local counterpart of lingxi's
 * brand personas. CRUD lives here; all pure serialization / prompt-building
 * logic lives in ./persona-util so it stays unit-testable without Electron.
 *
 * The persona marked `is_default` is injected into every conversation's
 * system prompt (see buildDefaultPersonaSystemPrompt + agent/run.ts).
 */

export function getPersona(id: string): Persona | undefined {
  const row = getDb().prepare('SELECT * FROM personas WHERE id = ?').get(id) as
    | PersonaRow
    | undefined
  return row ? rowToPersona(row) : undefined
}

/** All personas under the active project scope, default first, newest next. */
export function listPersonas(): Persona[] {
  const conds: string[] = []
  const params: unknown[] = []
  const sc = scopeClause()
  if (sc.sql) {
    conds.push(sc.sql)
    params.push(...sc.params)
  }
  const where = conds.length ? `WHERE ${conds.join(' AND ')}` : ''
  const rows = getDb()
    .prepare(`SELECT * FROM personas ${where} ORDER BY is_default DESC, created_at DESC`)
    .all(...params) as PersonaRow[]
  return rows.map(rowToPersona)
}

export function createPersona(d: PersonaData): Persona {
  const id = randomUUID()
  const now = Date.now()
  const cols = personaToColumns(d)
  // Stamp the active project scope (null under 全部/未归类 → stays unfiled),
  // same convention as materials/atoms/topics.
  getDb()
    .prepare(
      `INSERT INTO personas (id, name, positioning, tone_formality, tone_expertise, tone_person,
         target_platforms, banned_words, past, expertise, stance, proof, life, content_calendar,
         is_default, project_id, created_at, updated_at)
       VALUES (@id, @name, @positioning, @tone_formality, @tone_expertise, @tone_person,
         @target_platforms, @banned_words, @past, @expertise, @stance, @proof, @life, @content_calendar,
         0, @project_id, @created_at, @updated_at)`
    )
    .run({ id, ...cols, project_id: scopeProjectId(), created_at: now, updated_at: now })
  return getPersona(id)!
}

export function updatePersona(id: string, d: PersonaData): void {
  const cols = personaToColumns(d)
  getDb()
    .prepare(
      `UPDATE personas SET name = @name, positioning = @positioning,
         tone_formality = @tone_formality, tone_expertise = @tone_expertise, tone_person = @tone_person,
         target_platforms = @target_platforms, banned_words = @banned_words,
         past = @past, expertise = @expertise, stance = @stance, proof = @proof, life = @life,
         content_calendar = @content_calendar, updated_at = @updated_at
       WHERE id = @id`
    )
    .run({ id, ...cols, updated_at: Date.now() })
}

export function deletePersona(id: string): void {
  getDb().prepare('DELETE FROM personas WHERE id = ?').run(id)
}

/**
 * Mark one persona as the default (or clear the flag). The default is global —
 * exactly one persona injects into all conversations regardless of the active
 * project scope, so turning it on clears every other flag first.
 */
export function setDefaultPersona(id: string, on: boolean): void {
  const db = getDb()
  db.transaction(() => {
    if (on) db.prepare('UPDATE personas SET is_default = 0 WHERE is_default = 1').run()
    db.prepare('UPDATE personas SET is_default = ? WHERE id = ?').run(on ? 1 : 0, id)
  })()
}

/** The globally-default persona, if any (scope-independent by design). */
export function getDefaultPersona(): Persona | undefined {
  const row = getDb()
    .prepare('SELECT * FROM personas WHERE is_default = 1 ORDER BY updated_at DESC LIMIT 1')
    .get() as PersonaRow | undefined
  return row ? rowToPersona(row) : undefined
}

/**
 * System-prompt fragment for the default persona — empty string when no
 * persona is set as default. Joined into the chat system prompt alongside
 * skills/materials/atoms (see agent/run.ts).
 */
export function buildDefaultPersonaSystemPrompt(): string {
  const p = getDefaultPersona()
  return p ? buildPersonaSystemPrompt(p) : ''
}
