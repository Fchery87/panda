import { describe, expect, test } from 'bun:test'
import fs from 'node:fs'
import path from 'node:path'

describe('spec plan run provenance', () => {
  test('exposes a bounded provenance summary for proof surfaces', () => {
    const specificationsSource = fs.readFileSync(
      path.resolve(import.meta.dir, 'specifications.ts'),
      'utf8'
    )

    expect(specificationsSource).toContain('export const getProvenanceSummaryByChat = query({')
    expect(specificationsSource).toContain("withIndex('by_chat'")
    expect(specificationsSource).toContain('.take(1)')
    expect(specificationsSource).toContain("query('planningSessions')")
    expect(specificationsSource).toContain("withIndex('by_planningSession'")
    expect(specificationsSource).toContain(
      'const run = spec?.runId ? await ctx.db.get(spec.runId) : null'
    )
    expect(specificationsSource).toContain('receipt: run?.receipt ?? null')
    expect(specificationsSource).not.toContain('.collect()')
  })
})
