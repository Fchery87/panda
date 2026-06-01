import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const source = readFileSync(join(import.meta.dir, 'useAgent.ts'), 'utf8')
const applierSource = readFileSync(join(import.meta.dir, 'useAgent-event-applier.ts'), 'utf8')

describe('useAgent subagent child run persistence bridge', () => {
  test('persists subagent summaries into first-class child agentRuns', () => {
    expect(source).toContain('useMutation(api.agentRuns.createChild)')
    expect(source).toContain('useMutation(api.agentRuns.touchActivity)')
    expect(source).toContain('childRunIdsRef')
    expect(source).toContain('activeChildRunIdsRef')
    expect(source).toContain('childRunSequencesRef')
    expect(source).toContain('terminalChildRunIdsRef')
    expect(source).toContain('const ensureChildRun')
    expect(source).toContain('const persistSubagentSummary')
    expect(source).toContain('parentRunId,')
    expect(source).toContain('subagentName: summary.name')
    expect(source).toContain('delegatedTaskSummary: summary.delegatedTaskSummary')
    expect(source).toContain("contextMode: 'fresh'")
    expect(source).toContain("isolationMode: 'shared-readonly'")
    expect(source).toContain('await appendRunEvents({')
    expect(source).toContain("type: 'subagent_summary'")
    expect(source).toContain('sequence: nextSequence')
    expect(source).toContain('if (terminalChildRunIdsRef.current.has(terminalKey)) return')
    expect(source).toContain('terminalChildRunIdsRef.current.add(terminalKey)')
    expect(source).toContain('await completeRun({')
    expect(source).toContain('await failRun({')
    expect(source).toContain('await touchRunActivity({ runId: childRunId, artifactCount })')
  })

  test('guards child terminal persistence against complete/stop races', () => {
    expect(source).toContain('const terminalKey = String(childRunId)')
    expect(source).toContain('if (terminalChildRunIdsRef.current.has(terminalKey)) return')
    expect(source).toContain('terminalChildRunIdsRef.current.add(terminalKey)')
    expect(source).toContain('activeChildRunIdsRef.current.delete(summary.subagentId)')
    expect(source).toContain('activeChildRunIdsRef.current.delete(subagentId)')
  })

  test('propagates parent stop to active non-terminal child runs', () => {
    expect(source).toContain('const activeChildRuns = [...activeChildRunIdsRef.current.entries()]')
    expect(source).toContain(
      'activeChildRunIdsRef.current.set(summary.subagentId, childRunPromise)'
    )
    expect(source).toContain('if (terminalChildRunIdsRef.current.has(terminalKey)) return')
    expect(source).toContain('activeChildRunIdsRef.current.delete(subagentId)')
    expect(source).toContain(
      "await stopRun({ runId: childRunId, terminationReason: { kind: 'user-abort' } })"
    )
    expect(source).toContain('activeChildRunIdsRef.current.delete(summary.subagentId)')
  })

  test('event applier calls the subagent persistence hook after trace persistence', () => {
    expect(applierSource).toContain('onSubagentSummary?:')
    expect(applierSource).toContain('void onSubagentSummary?.(event.subagentSummary)')
    expect(source).toContain('onSubagentSummary: persistSubagentSummary')
  })
})
