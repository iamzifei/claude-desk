import Database from 'better-sqlite3'
import { app } from 'electron'
import { join } from 'path'

/**
 * Local-first storage. Everything the app produces (conversations, messages,
 * settings) lives in a single SQLite file under Electron's userData dir —
 * the same approach the reference app (newmax.db) uses. No server required.
 */
let db: Database.Database

export function initDb(): Database.Database {
  const file = join(app.getPath('userData'), 'claude-desk.db')
  db = new Database(file)
  db.pragma('journal_mode = WAL') // better concurrency + crash safety
  db.pragma('foreign_keys = ON')
  migrate(db)
  return db
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
