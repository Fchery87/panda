import { describe, expect, test } from 'bun:test'
import fs from 'node:fs'
import path from 'node:path'
import { findLatestRecoverableCheckpoint } from '@/components/chat/runtime-checkpoints'

describe('project resume flow', () => {
  test('surfaces recoverable runtime checkpoints directly in the chat pane', () => {
    const panelPath = path.resolve(import.meta.dir, 'ProjectChatPanel.tsx')
    const panelSource = fs.readFileSync(panelPath, 'utf8')
    const providerPath = path.resolve(import.meta.dir, 'WorkspaceRuntimeProvider.tsx')
    const providerSource = fs.readFileSync(providerPath, 'utf8')
    const hookPath = path.resolve(import.meta.dir, '../../hooks/useAgent.ts')
    const hookSource = fs.readFileSync(hookPath, 'utf8')

    expect(providerSource).toContain('api.agentRuns.listRuntimeCheckpointSummaries')
    expect(providerSource).toContain('latestRuntimeCheckpoint: latestRecoverableCheckpoint')
    expect(panelSource).toContain('Resume Available')
    expect(panelSource).toContain('Recover Run')
    expect(panelSource).toContain('onResumeRuntimeSession(latestRecoverableCheckpoint.sessionID!)')

    expect(hookSource).toContain("toast.info('Resuming previous run'")
    expect(hookSource).toContain('harnessSessionID: sessionID')
  })

  test('does not recover a session whose newest checkpoint is complete', () => {
    expect(
      findLatestRecoverableCheckpoint([
        {
          _id: 'complete-1',
          sessionID: 'session-1',
          reason: 'complete',
          savedAt: 200,
        },
        {
          _id: 'step-1',
          sessionID: 'session-1',
          reason: 'step',
          savedAt: 100,
        },
      ])
    ).toBeNull()
  })
})
