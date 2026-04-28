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
    expect(retentionSource).toContain('.take(limit)')
    expect(retentionSource).not.toContain('.collect()')

    expect(cronsSource).toContain('crons.interval(')
    expect(cronsSource).toContain('internal.retention.cleanupOperationalData')
  })
})
