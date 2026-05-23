import { describe, expect, test } from 'bun:test'
import fs from 'node:fs'
import path from 'node:path'

describe('useAgent custom subagents wiring', () => {
  test('queries Convex custom subagents and passes them into runtime options', () => {
    const source = fs.readFileSync(path.resolve(import.meta.dir, 'useAgent.ts'), 'utf8')

    expect(source).toContain('const customSubagents = useQuery(api.subagents.list)')
    expect(source).toContain('harnessCustomSubagents: customSubagents')
  })
})
