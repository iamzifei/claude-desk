import { randomUUID } from 'crypto'
import { getDb } from './index'

export interface Publication {
  id: string
  workspace_id: string | null
  topic_id: string | null
  title: string
  platform: string | null
  url: string | null
  published_at: number | null
  views: number
  likes: number
  comments: number
  saves: number
  created_at: number
}

export interface NewPublication {
  title: string
  platform?: string | null
  url?: string | null
  topic_id?: string | null
  published_at?: number | null
  views?: number
  likes?: number
  comments?: number
  saves?: number
}

export function getPublication(id: string): Publication | undefined {
  return getDb().prepare('SELECT * FROM publications WHERE id = ?').get(id) as Publication | undefined
}

export function listPublications(workspaceId: string): Publication[] {
  return getDb()
    .prepare('SELECT * FROM publications WHERE workspace_id = ? ORDER BY created_at DESC')
    .all(workspaceId) as Publication[]
}

export function createPublication(workspaceId: string, p: NewPublication): Publication {
  const pub: Publication = {
    id: randomUUID(),
    workspace_id: workspaceId,
    topic_id: p.topic_id ?? null,
    title: p.title.trim() || '未命名发布',
    platform: p.platform?.trim() || null,
    url: p.url?.trim() || null,
    published_at: p.published_at ?? null,
    views: p.views ?? 0,
    likes: p.likes ?? 0,
    comments: p.comments ?? 0,
    saves: p.saves ?? 0,
    created_at: Date.now()
  }
  getDb()
    .prepare(
      `INSERT INTO publications
        (id, workspace_id, topic_id, title, platform, url, published_at, views, likes, comments, saves, created_at)
       VALUES (@id, @workspace_id, @topic_id, @title, @platform, @url, @published_at, @views, @likes, @comments, @saves, @created_at)`
    )
    .run(pub)
  return pub
}

export function updatePublication(id: string, p: NewPublication): void {
  getDb()
    .prepare(
      `UPDATE publications SET title=?, platform=?, url=?, views=?, likes=?, comments=?, saves=? WHERE id=?`
    )
    .run(
      p.title.trim() || '未命名发布',
      p.platform?.trim() || null,
      p.url?.trim() || null,
      p.views ?? 0,
      p.likes ?? 0,
      p.comments ?? 0,
      p.saves ?? 0,
      id
    )
}

export function deletePublication(id: string): void {
  getDb().prepare('DELETE FROM publications WHERE id = ?').run(id)
}
