import Database from 'better-sqlite3'
import { app } from 'electron'
import { join } from 'path'
import { randomUUID } from 'crypto'

/**
 * Local-first storage. Everything the app produces (workspaces, projects,
 * conversations, messages, settings) lives in a single SQLite file under
 * Electron's userData dir — the same approach the reference app (newmax.db)
 * uses. No server required.
 *
 * Hierarchy (aligned with 牛马AI): Workspace → Project → Conversation.
 */
let db: Database.Database

export function initDb(): Database.Database {
  const file = join(app.getPath('userData'), 'claude-desk.db')
  db = new Database(file)
  db.pragma('journal_mode = WAL') // better concurrency + crash safety
  db.pragma('foreign_keys = ON')
  migrate(db)
  ensureDefaults(db)
  return db
}

/**
 * Guarantee at least one workspace exists, and that every conversation belongs
 * to a workspace. Runs every boot — cheap and idempotent.
 */
function ensureDefaults(d: Database.Database): void {
  const wsCount = d.prepare('SELECT COUNT(*) AS n FROM workspaces').get() as { n: number }
  let defaultWsId: string
  if (wsCount.n === 0) {
    defaultWsId = randomUUID()
    d.prepare(
      'INSERT INTO workspaces (id, name, root_path, sort, created_at) VALUES (?, ?, NULL, 0, ?)'
    ).run(defaultWsId, '我的工作区', Date.now())
  } else {
    defaultWsId = (
      d.prepare('SELECT id FROM workspaces ORDER BY sort, created_at LIMIT 1').get() as {
        id: string
      }
    ).id
  }
  // Backfill conversations created before the hierarchy existed.
  d.prepare('UPDATE conversations SET workspace_id = ? WHERE workspace_id IS NULL').run(defaultWsId)
}

export function getDb(): Database.Database {
  if (!db) throw new Error('DB not initialized — call initDb() first')
  return db
}

/**
 * Tiny migration runner. Each migration runs once; `user_version` pragma
 * tracks how many have been applied. Append new migrations to the array.
 */
function migrate(d: Database.Database): void {
  const migrations: string[] = [
    // 0001 — base schema
    `
    CREATE TABLE conversations (
      id            TEXT PRIMARY KEY,
      title         TEXT NOT NULL DEFAULT 'New chat',
      workspace     TEXT,
      created_at    INTEGER NOT NULL,
      updated_at    INTEGER NOT NULL
    );
    CREATE TABLE messages (
      id              TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      role            TEXT NOT NULL,            -- user | assistant
      content         TEXT NOT NULL,            -- markdown / text
      created_at      INTEGER NOT NULL
    );
    CREATE INDEX idx_messages_conv ON messages(conversation_id, created_at);
    CREATE TABLE settings (
      key   TEXT PRIMARY KEY,
      value TEXT
    );
    `,
    // 0002 — per-conversation model override + archive flag (align with 牛马AI)
    `
    ALTER TABLE conversations ADD COLUMN model TEXT;
    ALTER TABLE conversations ADD COLUMN archived INTEGER NOT NULL DEFAULT 0;
    `,
    // 0003 — Workspace → Project → Conversation hierarchy (align with 牛马AI)
    `
    CREATE TABLE workspaces (
      id          TEXT PRIMARY KEY,
      name        TEXT NOT NULL,
      root_path   TEXT,
      sort        INTEGER NOT NULL DEFAULT 0,
      created_at  INTEGER NOT NULL
    );
    CREATE TABLE projects (
      id            TEXT PRIMARY KEY,
      workspace_id  TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      name          TEXT NOT NULL,
      dir_path      TEXT,
      sort          INTEGER NOT NULL DEFAULT 0,
      created_at    INTEGER NOT NULL
    );
    ALTER TABLE conversations ADD COLUMN workspace_id TEXT;
    ALTER TABLE conversations ADD COLUMN project_id TEXT;
    CREATE INDEX idx_conv_ws ON conversations(workspace_id, archived, updated_at);
    CREATE INDEX idx_conv_proj ON conversations(project_id);
    CREATE INDEX idx_proj_ws ON projects(workspace_id, sort);
    `
  ]

  const current = d.pragma('user_version', { simple: true }) as number
  for (let v = current; v < migrations.length; v++) {
    const run = d.transaction(() => {
      d.exec(migrations[v])
      d.pragma(`user_version = ${v + 1}`)
    })
    run()
  }
}
