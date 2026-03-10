import { describe, expect, it } from 'bun:test'
import fs from 'node:fs'
import path from 'node:path'

describe('subagents authz', () => {
  it('validates ownership when fetching a subagent by id', () => {
    const source = fs.readFileSync(path.resolve(import.meta.dir, 'subagents.ts'), 'utf8')
    const getStart = source.indexOf('export const get = query({')
    const getEnd = source.indexOf('export const add = mutation({')
    const getBlock = source.slice(getStart, getEnd)

    expect(getBlock).toContain('const userId = await requireAuth(ctx)')
    expect(getBlock).toContain('const subagent = await ctx.db.get(args.id)')
    expect(getBlock).toContain("throw new Error('Unauthorized')")
    expect(getBlock).toContain('if (subagent.userId !== userIdAsId)')
  })
})
