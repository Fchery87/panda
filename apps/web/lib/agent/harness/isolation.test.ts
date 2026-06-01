import { describe, expect, test } from 'bun:test'
import type { AgentConfig } from './types'
import {
  canRunMutatingSubagentsConcurrently,
  createSubagentIsolationSession,
  isSubagentMutating,
  resolveMutatingSubagentConcurrency,
  selectSubagentIsolationMode,
} from './isolation'

const mutatingAgent: AgentConfig = {
  name: 'builder-child',
  mode: 'subagent',
  permission: { write_files: 'allow', run_command: 'allow' },
}

const readonlyAgent: AgentConfig = {
  name: 'research-child',
  mode: 'subagent',
  permission: { read_files: 'allow', search_code: 'allow' },
}

describe('subagent isolation strategy boundary', () => {
  test('falls back to shared-readonly when requested isolation is unavailable', () => {
    expect(
      selectSubagentIsolationMode({
        agent: { ...mutatingAgent, defaultIsolationMode: 'worktree' },
        config: { availableSubagentIsolationModes: ['shared-readonly'] },
      })
    ).toBe('shared-readonly')
  })

  test('uses patch-proposal for mutating agents when available and no stronger requested mode is available', () => {
    expect(
      selectSubagentIsolationMode({
        agent: { ...mutatingAgent, defaultIsolationMode: 'patch-proposal' },
        config: { availableSubagentIsolationModes: ['shared-readonly', 'patch-proposal'] },
      })
    ).toBe('patch-proposal')
  })

  test('keeps readonly agents in shared-readonly by default', () => {
    expect(
      selectSubagentIsolationMode({
        agent: readonlyAgent,
        config: { availableSubagentIsolationModes: ['shared-readonly', 'patch-proposal'] },
      })
    ).toBe('shared-readonly')
    expect(isSubagentMutating(readonlyAgent)).toBe(false)
    expect(isSubagentMutating(mutatingAgent)).toBe(true)
  })

  test('serializes mutating subagents until all selected modes are isolated', () => {
    expect(
      resolveMutatingSubagentConcurrency({
        isolationModes: ['shared-readonly', 'patch-proposal'],
        requestedConcurrency: 4,
      })
    ).toBe(1)
    expect(
      resolveMutatingSubagentConcurrency({
        isolationModes: ['snapshot', 'worktree'],
        requestedConcurrency: 4,
      })
    ).toBe(4)
    expect(canRunMutatingSubagentsConcurrently(['patch-proposal'])).toBe(true)
  })

  test('runs snapshot scopes with complete on success and restore on failure', async () => {
    const calls: string[] = []
    const adapter = {
      createSnapshotScope: async () => ({
        id: 'snapshot-1',
        mode: 'snapshot' as const,
        complete: async () => {
          calls.push('complete')
        },
        restore: async () => {
          calls.push('restore')
        },
        cleanup: async () => {
          calls.push('cleanup')
        },
      }),
    }

    const success = await createSubagentIsolationSession({
      mode: 'snapshot',
      adapter,
      parentSessionID: 'session_parent',
      childSessionID: 'session_child',
      agentName: 'builder-child',
    })
    await expect(success.run(async () => 'ok')).resolves.toBe('ok')
    expect(calls).toEqual(['complete', 'cleanup'])

    calls.length = 0
    const failure = await createSubagentIsolationSession({
      mode: 'snapshot',
      adapter,
      parentSessionID: 'session_parent',
      childSessionID: 'session_child_2',
      agentName: 'builder-child',
    })
    await expect(
      failure.run(async () => {
        throw new Error('boom')
      })
    ).rejects.toThrow('boom')
    expect(calls).toEqual(['restore', 'cleanup'])
  })

  test('fails closed when snapshot/worktree isolation is selected without an adapter', async () => {
    await expect(
      createSubagentIsolationSession({
        mode: 'snapshot',
        parentSessionID: 'session_parent',
        childSessionID: 'session_child',
        agentName: 'builder-child',
      })
    ).rejects.toThrow('Snapshot subagent isolation requested')
  })
})
