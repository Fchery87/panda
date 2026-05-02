import { describe, expect, it } from 'bun:test'
import fs from 'node:fs'
import path from 'node:path'

describe('customSkills authz', () => {
  const source = fs.readFileSync(path.resolve(import.meta.dir, 'customSkills.ts'), 'utf8')

  it('validates ownership when fetching a custom skill by id', () => {
    const getStart = source.indexOf('export const get = query({')
    const getEnd = source.indexOf('export const add = mutation({')
    const getBlock = source.slice(getStart, getEnd)

    expect(getBlock).toContain('const userIdAsId = await resolveUserId(ctx)')
    expect(getBlock).toContain('const customSkill = await ctx.db.get(args.id)')
    expect(getBlock).toContain("throw new Error('Unauthorized')")
    expect(getBlock).toContain('if (customSkill.userId !== userIdAsId)')
  })

  it('gates custom skill writes behind admin policy', () => {
    const addStart = source.indexOf('export const add = mutation({')
    const addEnd = source.indexOf('export const update = mutation({')
    const addBlock = source.slice(addStart, addEnd)

    const updateStart = source.indexOf('export const update = mutation({')
    const updateEnd = source.indexOf('export const remove = mutation({')
    const updateBlock = source.slice(updateStart, updateEnd)

    expect(addBlock).toContain('await assertCustomSkillsEnabled(ctx)')
    expect(updateBlock).toContain('await assertCustomSkillsEnabled(ctx)')
  })
})
