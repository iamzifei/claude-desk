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
    `,
    // 0004 — scheduled tasks + notes (定时任务 / 每日回顾 / 会议纪要)
    `
    CREATE TABLE scheduled_tasks (
      id            TEXT PRIMARY KEY,
      workspace_id  TEXT,
      name          TEXT NOT NULL,
      prompt        TEXT NOT NULL,
      schedule_kind TEXT NOT NULL,        -- 'interval' | 'daily'
      interval_min  INTEGER,              -- for 'interval'
      at_hour       INTEGER,              -- for 'daily'
      at_minute     INTEGER,              -- for 'daily'
      enabled       INTEGER NOT NULL DEFAULT 1,
      last_run      INTEGER,
      next_run      INTEGER,
      created_at    INTEGER NOT NULL
    );
    CREATE TABLE notes (
      id            TEXT PRIMARY KEY,
      workspace_id  TEXT,
      type          TEXT NOT NULL,        -- 'review' | 'minutes'
      title         TEXT NOT NULL,
      content       TEXT NOT NULL,
      created_at    INTEGER NOT NULL
    );
    CREATE INDEX idx_notes_ws_type ON notes(workspace_id, type, created_at);
    `,
    // 0005 — skills (技能市场). Global; enabled skills inject into the system prompt.
    `
    CREATE TABLE skills (
      id          TEXT PRIMARY KEY,
      name        TEXT NOT NULL,
      description TEXT,
      content     TEXT NOT NULL,
      enabled     INTEGER NOT NULL DEFAULT 1,
      source      TEXT NOT NULL DEFAULT 'custom',
      created_at  INTEGER NOT NULL
    );
    `,
    // 0006 — 素材库 Material Library (creator differentiator). Items toggled
    // "in_context" are injected into the creation system prompt.
    `
    CREATE TABLE materials (
      id          TEXT PRIMARY KEY,
      title       TEXT NOT NULL,
      content     TEXT NOT NULL,
      url         TEXT,
      tags        TEXT,
      in_context  INTEGER NOT NULL DEFAULT 0,
      created_at  INTEGER NOT NULL
    );
    CREATE INDEX idx_materials_created ON materials(created_at);
    `,
    // 0007 — material kinds (text / image / link) + platform grouping.
    // image_path points at a file copied into userData/materials/.
    `
    ALTER TABLE materials ADD COLUMN kind TEXT NOT NULL DEFAULT 'text';
    ALTER TABLE materials ADD COLUMN image_path TEXT;
    ALTER TABLE materials ADD COLUMN platform TEXT;
    CREATE INDEX idx_materials_platform ON materials(platform, created_at);
    `,
    // 0008 — 知识原子 (atoms / content units). Reusable units extracted from
    // materials or conversations — the "复用货币" for topic assembly & creation.
    // in_context=1 atoms inject into the creation system prompt like materials.
    `
    CREATE TABLE atoms (
      id          TEXT PRIMARY KEY,
      content     TEXT NOT NULL,
      type        TEXT NOT NULL DEFAULT '观点',  -- 观点/金句/数据/案例/钩子/方法
      source_kind TEXT,                          -- 'material' | 'conversation' | 'manual'
      source_id   TEXT,
      tags        TEXT,
      in_context  INTEGER NOT NULL DEFAULT 0,
      created_at  INTEGER NOT NULL
    );
    CREATE INDEX idx_atoms_created ON atoms(created_at);
    CREATE INDEX idx_atoms_type ON atoms(type, created_at);
    `,
    // 0009 — pin conversations to the top of the sidebar (Arc-style pinned tabs).
    `
    ALTER TABLE conversations ADD COLUMN pinned INTEGER NOT NULL DEFAULT 0;
    `,
    // 0010 — 选题库 (topics). The dontbesilent pipeline: 选题 → 装配 → 成稿.
    `
    CREATE TABLE topics (
      id           TEXT PRIMARY KEY,
      workspace_id TEXT,
      title        TEXT NOT NULL,
      angle        TEXT,                       -- 切入角度
      status       TEXT NOT NULL DEFAULT '灵感', -- 灵感 / 待写 / 进行 / 已发
      platform     TEXT,
      created_at   INTEGER NOT NULL,
      updated_at   INTEGER NOT NULL
    );
    CREATE INDEX idx_topics_ws ON topics(workspace_id, status, updated_at);
    `,
    // 0011 — 双链 (wikilinks). [[标题]] in any entity's content resolves to a
    // target entity; backlinks are the reverse lookup (Obsidian-style).
    `
    CREATE TABLE links (
      id         TEXT PRIMARY KEY,
      from_kind  TEXT NOT NULL,   -- 'material' | 'atom' | 'note' | 'topic'
      from_id    TEXT NOT NULL,
      to_title   TEXT NOT NULL,   -- the raw [[title]] text
      to_kind    TEXT,            -- resolved target kind (null if unresolved)
      to_id      TEXT,            -- resolved target id (null if unresolved)
      created_at INTEGER NOT NULL
    );
    CREATE INDEX idx_links_from ON links(from_kind, from_id);
    CREATE INDEX idx_links_to ON links(to_kind, to_id);
    `,
    // 0012 — 发布记录 (publications). The data-feedback half of the flywheel:
    // record what shipped + its metrics, then let data drive the next 选题.
    `
    CREATE TABLE publications (
      id           TEXT PRIMARY KEY,
      workspace_id TEXT,
      topic_id     TEXT,
      title        TEXT NOT NULL,
      platform     TEXT,
      url          TEXT,
      published_at INTEGER,
      views        INTEGER NOT NULL DEFAULT 0,
      likes        INTEGER NOT NULL DEFAULT 0,
      comments     INTEGER NOT NULL DEFAULT 0,
      saves        INTEGER NOT NULL DEFAULT 0,
      created_at   INTEGER NOT NULL
    );
    CREATE INDEX idx_pub_ws ON publications(workspace_id, created_at);
    `,
    // 0013 — 采集/Inbox: quick-captured snippets land as 'inbox' to be processed
    // later (拆原子/打标签/链接), curated ones are '已整理'. Existing materials are
    // all already curated, so backfill them to '已整理'.
    `
    ALTER TABLE materials ADD COLUMN status TEXT NOT NULL DEFAULT 'inbox';
    UPDATE materials SET status = '已整理';
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
