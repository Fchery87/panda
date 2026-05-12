import { describe, expect, test } from 'bun:test'
import fs from 'node:fs'
import path from 'node:path'

describe('retention enforcement', () => {
  test('defines bounded cleanup functions and scheduled retention jobs', () => {
    const retentionSource = fs.readFileSync(path.resolve(import.meta.dir, 'retention.ts'), 'utf8')
    const cronsSource = fs.readFileSync(path.resolve(import.meta.dir, 'crons.ts'), 'utf8')

    expect(retentionSource).toContain('internalMutation')
    expect(retentionSource).toContain('agentRunEvents')
    expect(retentionSource).toContain('harnessRuntimeCheckpoints')
    expect(retentionSource).toContain('evalRunResults')
    expect(retentionSource).toContain('fileSnapshots')
    expect(retentionSource).toContain("withIndex('by_created'")
    expect(retentionSource).toContain("withIndex('by_saved'")
    expect(retentionSource).toContain('.lt(')
    expect(retentionSource).toContain('.take(remaining)')
    expect(retentionSource).not.toContain('.collect()')

    expect(retentionSource).toContain('source-of-truth data')

    expect(cronsSource).toContain('crons.interval(')
    expect(cronsSource).toContain('internal.retention.cleanupOperationalData')
  })
})
