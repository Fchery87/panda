import { describe, expect, it } from 'bun:test'
import { deriveSnapshotEntries, deriveSubagentEntries } from './run-insights'

describe('run insights', () => {
  it('derives snapshot entries from persisted snapshot events', () => {
    const snapshots = deriveSnapshotEntries([
      {
        _id: 'snapshot-1',
        type: 'snapshot',
        content: 'Step 2 snapshot created',
        snapshot: {
          hash: 'abc123',
          step: 2,
          files: ['apps/web/lib/agent/runtime.ts', 'apps/web/hooks/useAgent.ts'],
        },
        createdAt: 200,
      },
    ])

    expect(snapshots).toEqual([
      {
        id: 'snapshot-1',
        hash: 'abc123',
        step: 2,
        files: ['apps/web/lib/agent/runtime.ts', 'apps/web/hooks/useAgent.ts'],
        createdAt: 200,
        label: 'Step 2 snapshot created',
      },
    ])
  })

  it('derives subagent entries from task tool calls', () => {
    const entries = deriveSubagentEntries([
      {
        id: 'task-1',
        name: 'task',
        args: {
          subagent_type: 'summary',
          prompt: 'Summarize the run',
        },
        status: 'completed',
        result: {
          output: 'Summary complete',
          durationMs: 1200,
        },
      },
      {
        id: 'read-1',
        name: 'read_files',
        args: { paths: ['README.md'] },
        status: 'completed',
      },
    ])

    expect(entries).toEqual([
      {
        id: 'task-1',
        agent: 'summary',
        prompt: 'Summarize the run',
        status: 'completed',
        output: 'Summary complete',
        durationMs: 1200,
      },
    ])
  })
})
