import { describe, expect, it } from 'bun:test'
import fs from 'node:fs'
import path from 'node:path'

describe('subagents authz and policy', () => {
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

  it('enforces admin preset and custom subagent limit policy in write paths', () => {
    const source = fs.readFileSync(path.resolve(import.meta.dir, 'subagents.ts'), 'utf8')

    expect(source).toContain('assertCapabilityPresetAllowed')
    expect(source).toContain('allowedSubagentCapabilityPresets')
    expect(source).toContain('assertCustomSubagentLimit')
    expect(source).toContain('maxCustomSubagentsPerUser')
    expect(source).toContain('Custom subagent limit reached')
  })

  it('normalizes names and checks duplicate names on add and update', () => {
    const source = fs.readFileSync(path.resolve(import.meta.dir, 'subagents.ts'), 'utf8')

    expect(source).toContain('function normalizeSubagentName')
    expect(source).toContain('const normalizedName = normalizeSubagentName(args.name)')
    expect(source).toContain("throw new Error('Subagent name must contain letters or numbers')")
    expect(source).toContain("throw new Error('Subagent with this name already exists')")
  })
})
