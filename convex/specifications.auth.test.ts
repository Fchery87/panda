import { describe, expect, it } from 'bun:test'
import fs from 'node:fs'
import path from 'node:path'

describe('specifications authz', () => {
  it('guards specification access with project, chat, and run ownership checks', () => {
    const source = fs.readFileSync(path.resolve(import.meta.dir, 'specifications.ts'), 'utf8')

    expect(source).toContain('requireProjectOwner')
    expect(source).toContain('requireChatOwner')
    expect(source).toContain('requireAgentRunOwner')
    expect(source).toContain('await requireProjectOwner(ctx, args.projectId)')
    expect(source).toContain('await requireChatOwner(ctx, args.chatId)')
    expect(source).toContain('await requireAgentRunOwner(ctx, args.runId)')
  })
})
