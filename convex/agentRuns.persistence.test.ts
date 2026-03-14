import { describe, expect, test } from 'bun:test'
import fs from 'node:fs'
import path from 'node:path'

describe('agentRuns persistence', () => {
  test('uses explicit persistence schemas and normalizes event ingestion order', () => {
    const schemaSource = fs.readFileSync(path.resolve(import.meta.dir, 'schema.ts'), 'utf8')
    const agentRunsSource = fs.readFileSync(path.resolve(import.meta.dir, 'agentRuns.ts'), 'utf8')

    expect(schemaSource).not.toContain('usage: v.optional(v.record(v.string(), v.any()))')
    expect(schemaSource).not.toContain('checkpoint: v.any()')
    expect(schemaSource).toContain('key: v.string()')
    expect(schemaSource).toContain('count: v.number()')
    expect(schemaSource).toContain('v.union(')
    expect(schemaSource).toContain('v.array(v.union(v.string(), v.number()))')

    expect(agentRunsSource).toContain('const normalizedEvents = [...args.events].sort')
    expect(agentRunsSource).toContain('return normalizedEvents.length')
  })
})
