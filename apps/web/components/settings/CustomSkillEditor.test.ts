import { describe, expect, test } from 'bun:test'
import fs from 'node:fs'
import path from 'node:path'

describe('CustomSkillEditor', () => {
  test('renders custom skill workflow controls', () => {
    const componentPath = path.resolve(import.meta.dir, 'CustomSkillEditor.tsx')
    const content = fs.readFileSync(componentPath, 'utf-8')

    expect(content).toContain('Custom Skills')
    expect(content).toContain('Trigger phrases')
    expect(content).toContain('Applicable modes')
    expect(content).toContain('Strict workflow')
    expect(content).toContain('Auto-activate when trigger language matches')
  })
})
