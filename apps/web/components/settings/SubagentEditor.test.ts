import { describe, expect, test } from 'bun:test'
import fs from 'node:fs'
import path from 'node:path'

describe('SubagentEditor', () => {
  test('uses capability presets and attached skills instead of raw permission UX', () => {
    const componentPath = path.resolve(import.meta.dir, 'SubagentEditor.tsx')
    const content = fs.readFileSync(componentPath, 'utf-8')

    expect(content).toContain('Capability Preset')
    expect(content).toContain('Default attached skills')
    expect(content).toContain('Allow task-specific skill auto-matching')
    expect(content).toContain('Research - Read and search only')
    expect(content).not.toContain('Read Only - Can only read files')
  })
})
