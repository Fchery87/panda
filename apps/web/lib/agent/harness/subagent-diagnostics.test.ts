import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const runtimeSource = readFileSync(join(import.meta.dir, 'runtime.ts'), 'utf8')
const typesSource = readFileSync(join(import.meta.dir, 'types.ts'), 'utf8')
const inspectorSource = readFileSync(
  join(import.meta.dir, '../../../components/chat/inspector/InspectorRunContent.tsx'),
  'utf8'
)
const panelSource = readFileSync(
  join(import.meta.dir, '../../../components/chat/SubagentPanel.tsx'),
  'utf8'
)

describe('subagent structured diagnostics', () => {
  test('defines and emits structured subagent error categories', () => {
    expect(typesSource).toContain('export type HarnessSubagentErrorCategory')
    for (const category of [
      'registry',
      'policy',
      'isolation',
      'runtime',
      'persistence',
      'unknown',
    ]) {
      expect(typesSource).toContain(`'${category}'`)
    }
    expect(typesSource).toContain('errorCategory?: HarnessSubagentErrorCategory')
    expect(runtimeSource).toContain('private classifySubagentError')
    expect(runtimeSource).toContain("return 'registry'")
    expect(runtimeSource).toContain("return 'policy'")
    expect(runtimeSource).toContain("return 'isolation'")
    expect(runtimeSource).toContain("return 'persistence'")
    expect(runtimeSource).toContain("return 'runtime'")
    expect(runtimeSource).toContain('errorCategory: this.classifySubagentError(error)')
  })

  test('surfaces error categories in inspector and subagent panel UI', () => {
    expect(inspectorSource).toContain('errorCategory?:')
    expect(inspectorSource).toContain('errorCategory: child.errorCategory')
    expect(panelSource).toContain('errorCategory?:')
    expect(panelSource).toContain('Failure category: {entry.errorCategory}')
  })
})
