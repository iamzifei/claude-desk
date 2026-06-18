import { randomUUID } from 'crypto'
import { getDb } from './index'
import { resolvePending, purgeLinks } from './links'

export type TopicStatus = '灵感' | '待写' | '进行' | '已发'
export const TOPIC_STATUSES: TopicStatus[] = ['灵感', '待写', '进行', '已发']

export interface Topic {
  id: string
  workspace_id: string | null
  title: string
  angle: string | null
  status: TopicStatus
  platform: string | null
  created_at: number
  updated_at: number
}

export interface NewTopic {
  title: string
  angle?: string | null
  platform?: string | null
  status?: TopicStatus
}

export function listTopics(workspaceId: string): Topic[] {
  return getDb()
    .prepare('SELECT * FROM topics WHERE workspace_id = ? ORDER BY updated_at DESC')
    .all(workspaceId) as Topic[]
}

export function getTopic(id: string): Topic | undefined {
  return getDb().prepare('SELECT * FROM topics WHERE id = ?').get(id) as Topic | undefined
}

export function createTopic(workspaceId: string, t: NewTopic): Topic {
  const now = Date.now()
  const topic: Topic = {
    id: randomUUID(),
    workspace_id: workspaceId,
    title: t.title.trim() || '未命名选题',
    angle: t.angle?.trim() || null,
    status: t.status ?? '灵感',
    platform: t.platform?.trim() || null,
    created_at: now,
    updated_at: now
  }
  getDb()
    .prepare(
      `INSERT INTO topics (id, workspace_id, title, angle, status, platform, created_at, updated_at)
       VALUES (@id, @workspace_id, @title, @angle, @status, @platform, @created_at, @updated_at)`
    )
    .run(topic)
  resolvePending(topic.title, 'topic', topic.id)
  return topic
}

export function updateTopic(id: string, t: NewTopic): void {
  getDb()
    .prepare(
      'UPDATE topics SET title = ?, angle = ?, platform = ?, updated_at = ? WHERE id = ?'
    )
    .run(t.title.trim() || '未命名选题', t.angle?.trim() || null, t.platform?.trim() || null, Date.now(), id)
}

export function setTopicStatus(id: string, status: TopicStatus): void {
  getDb().prepare('UPDATE topics SET status = ?, updated_at = ? WHERE id = ?').run(status, Date.now(), id)
}

export function deleteTopic(id: string): void {
  getDb().prepare('DELETE FROM topics WHERE id = ?').run(id)
  purgeLinks('topic', id)
}
