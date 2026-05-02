import { describe, expect, test } from 'bun:test'
import fs from 'node:fs'
import path from 'node:path'

describe('applied skill runtime visibility', () => {
  test('maps applied skill events to compact progress steps and persists summaries', () => {
    const runtimeSource = fs.readFileSync(path.resolve(import.meta.dir, 'runtime.ts'), 'utf-8')
    const applierSource = fs.readFileSync(
      path.resolve(import.meta.dir, '../../hooks/useAgent-event-applier.ts'),
      'utf-8'
    )
    const schemaSource = fs.readFileSync(path.resolve(import.meta.dir, '../../../../convex/schema.ts'), 'utf-8')

    expect(runtimeSource).toContain("case 'applied_skills'")
    expect(runtimeSource).toContain('Applied skills:')
    expect(runtimeSource).toContain("case 'strict_skill_preflight'")
    expect(runtimeSource).toContain('Strict skill preflight:')
    expect(applierSource).toContain('appliedSkills: event.appliedSkills')
    expect(schemaSource).toContain('appliedSkills: v.optional(v.array(AppliedSkillSummary))')
  })
})
