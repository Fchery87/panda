import { describe, expect, test } from 'bun:test'
import fs from 'node:fs'
import path from 'node:path'

describe('admin system policy controls', () => {
  test('surfaces backend policy fields for skills, subagents, MCP, and user ceilings', () => {
    const source = fs.readFileSync(path.resolve(import.meta.dir, 'page.tsx'), 'utf8')

    for (const field of [
      'allowUserSkills',
      'allowSkillAutoActivation',
      'allowStrictUserSkills',
      'allowSkillImportExport',
      'allowedSubagentCapabilityPresets',
      'maxCustomSubagentsPerUser',
      'maxCustomSkillsPerUser',
    ]) {
      expect(source).toContain(field)
    }

    expect(source).toContain('Skills')
    expect(source).toContain('Strict Skill Workflows')
    expect(source).toContain('Skill Import / Export')
    expect(source).toContain('Allowed Subagent Presets')
    expect(source).toContain('Max Custom Subagents Per User')
    expect(source).toContain('Max Custom Skills Per User')
  })
})
