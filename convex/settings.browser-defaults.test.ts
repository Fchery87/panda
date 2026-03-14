import { describe, expect, test } from 'bun:test'
import fs from 'node:fs'
import path from 'node:path'

describe('settings browser defaults', () => {
  test('returns and updates agentDefaults without exposing legacy permissions config', () => {
    const source = fs.readFileSync(path.resolve(import.meta.dir, 'settings.ts'), 'utf8')

    const getEffectiveStart = source.indexOf('export const getEffective = query({')
    const getAdminDefaultsStart = source.indexOf('export const getAdminDefaults = query({')
    const getEffectiveBlock = source.slice(getEffectiveStart, getAdminDefaultsStart)

    expect(getEffectiveBlock).toContain('agentDefaults: userSettings?.agentDefaults')
    expect(getEffectiveBlock).not.toContain('permissions: userSettings?.permissions')

    const updateStart = source.indexOf('export const update = mutation({')
    const handlerStart = source.indexOf('  handler: async (ctx, args) => {', updateStart)
    const argsBlock = source.slice(updateStart, handlerStart)
    expect(argsBlock).toContain('agentDefaults: v.optional(')
    expect(argsBlock).not.toContain('permissions: v.optional(')

    const updateBlock = source.slice(updateStart)
    expect(updateBlock).toContain(
      'if (args.agentDefaults !== undefined) updates.agentDefaults = args.agentDefaults'
    )
    expect(updateBlock).not.toContain('updates.permissions')
    expect(updateBlock).not.toContain('permissions: args.permissions')
  })
})
