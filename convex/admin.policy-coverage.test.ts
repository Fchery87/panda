import { describe, expect, test } from 'bun:test'
import fs from 'node:fs'
import path from 'node:path'

describe('admin policy coverage', () => {
  test('keeps current policy fields in update settings and audit details', () => {
    const source = fs.readFileSync(path.resolve(import.meta.dir, 'admin.ts'), 'utf8')
    const updateStart = source.indexOf('export const updateSettings = mutation({')
    const listUsersStart = source.indexOf('/**\n * List all users with pagination')
    const updateBlock = source.slice(updateStart, listUsersStart)

    for (const field of [
      'allowUserMCP',
      'allowUserSubagents',
      'allowUserSkills',
      'allowSkillAutoActivation',
      'allowStrictUserSkills',
      'allowSkillImportExport',
      'allowedSubagentCapabilityPresets',
      'maxCustomSubagentsPerUser',
      'maxCustomSkillsPerUser',
    ]) {
      expect(updateBlock).toContain(field)
    }

    expect(updateBlock).toContain('const changedKeys = Object.keys(args)')
    expect(updateBlock).toContain("action: 'UPDATE_SETTINGS'")
    expect(updateBlock).toContain('changedKeys')
    expect(updateBlock).toContain('before: previousSettings')
    expect(updateBlock).toContain('after:')
  })
})
