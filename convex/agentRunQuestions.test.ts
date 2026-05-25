import { describe, expect, test } from 'bun:test'
import fs from 'node:fs'
import path from 'node:path'

describe('agent run questions convex contract', () => {
  test('persists pending and answered ask_user runtime decisions', () => {
    const schema = fs.readFileSync(path.resolve(import.meta.dir, 'schema.ts'), 'utf8')
    const source = fs.readFileSync(path.resolve(import.meta.dir, 'agentRunQuestions.ts'), 'utf8')

    expect(schema).toContain('agentRunQuestions: defineTable')
    expect(schema).toContain('AgentRunQuestionStatus')
    expect(schema).toContain(".index('by_run_status_created'")
    expect(source).toContain('export const createPending = mutation')
    expect(source).toContain('export const answer = mutation')
    expect(source).toContain("type: 'ask_user_pending'")
    expect(source).toContain("type: 'ask_user_answered'")
  })
})
