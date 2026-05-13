import { describe, expect, test } from 'bun:test'
import fs from 'node:fs'
import path from 'node:path'

describe('permission audit log', () => {
  test('persists policy decisions and exposes bounded audit queries', () => {
    const source = fs.readFileSync(path.resolve(import.meta.dir, 'permissionAuditLog.ts'), 'utf8')
    const schemaSource = fs.readFileSync(path.resolve(import.meta.dir, 'schema.ts'), 'utf8')

    expect(source).toContain('export const log = mutation({')
    expect(source).toContain('metadata: v.optional(v.any())')
    expect(source).toContain("projectId: v.optional(v.id('projects'))")
    expect(source).toContain('export const logHarnessDecision = mutation({')
    expect(source).toContain('HarnessPermissionDecisionArgs')
    expect(source).toContain('requireAgentRunOwner(ctx, args.runId)')
    expect(source).not.toContain("userId: v.id('users')")
    expect(source).toContain('export const listBySession = query({')
    expect(source).toContain('limit: v.optional(v.number())')
    expect(source).toContain('.take(limit)')
    expect(source).toContain('export const listByProject = query({')
    expect(source).toContain("withIndex('by_project_timestamp'")
    expect(source).toContain('export const listByRun = query({')
    expect(source).toContain("withIndex('by_run_created'")
    expect(source).toContain('export const listHarnessDecisionsByProject = query({')
    expect(source).toContain("withIndex('by_project_created'")
    expect(source).not.toContain('.collect()')

    expect(schemaSource).toContain('export const HarnessPermissionDecision = v.union(')
    expect(schemaSource).toContain('export const HarnessCommandFamily = v.union(')
    expect(schemaSource).toContain('export const PermissionAuditTarget = v.object({')
    expect(schemaSource).toContain('version: v.optional(v.number())')
    expect(schemaSource).toContain("runId: v.optional(v.id('agentRuns'))")
    expect(schemaSource).toContain("chatId: v.optional(v.id('chats'))")
    expect(schemaSource).toContain("userId: v.optional(v.id('users'))")
    expect(schemaSource).toContain('target: v.optional(PermissionAuditTarget)')
    expect(schemaSource).toContain(".index('by_project_timestamp', ['projectId', 'timestamp'])")
    expect(schemaSource).toContain(".index('by_run_created', ['runId', 'createdAt'])")
    expect(schemaSource).toContain(".index('by_project_created', ['projectId', 'createdAt'])")
    expect(schemaSource).toContain(".index('by_user_created', ['userId', 'createdAt'])")
  })
})
