import { describe, it, expect, beforeEach } from 'vitest'
import { setScope, getScope, scopeClause, scopeProjectId } from '../src/main/db/scope'

describe('asset project scope', () => {
  beforeEach(() => setScope('all'))

  it("defaults to 'all' with no filter", () => {
    expect(getScope()).toBe('all')
    expect(scopeClause()).toEqual({ sql: '', params: [] })
    expect(scopeProjectId()).toBeNull()
  })

  it("'unfiled' filters to NULL project and stamps nothing", () => {
    setScope('unfiled')
    expect(scopeClause()).toEqual({ sql: 'project_id IS NULL', params: [] })
    expect(scopeProjectId()).toBeNull()
  })

  it('a project id filters and stamps that project', () => {
    setScope('proj-123')
    expect(scopeClause()).toEqual({ sql: 'project_id = ?', params: ['proj-123'] })
    expect(scopeProjectId()).toBe('proj-123')
  })

  it('honors a custom column name', () => {
    setScope('proj-9')
    expect(scopeClause('m.project_id')).toEqual({ sql: 'm.project_id = ?', params: ['proj-9'] })
  })

  it('empty/falsey scope resets to all', () => {
    setScope('')
    expect(getScope()).toBe('all')
    expect(scopeClause().sql).toBe('')
  })
})
