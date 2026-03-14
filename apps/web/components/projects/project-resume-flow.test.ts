import { describe, expect, test } from 'bun:test'
import fs from 'node:fs'
import path from 'node:path'

describe('project resume flow', () => {
  test('surfaces recoverable runtime checkpoints directly in the chat pane', () => {
    const panelPath = path.resolve(import.meta.dir, 'ProjectChatPanel.tsx')
    const panelSource = fs.readFileSync(panelPath, 'utf8')
    const hookPath = path.resolve(import.meta.dir, '../../hooks/useAgent.ts')
    const hookSource = fs.readFileSync(hookPath, 'utf8')

    expect(panelSource).toContain('api.agentRuns.listRuntimeCheckpoints')
    expect(panelSource).toContain('Resume Available')
    expect(panelSource).toContain('Recover Run')
    expect(panelSource).toContain('onResumeRuntimeSession(latestRecoverableCheckpoint.sessionID!)')

    expect(hookSource).toContain("toast.info('Resuming previous run'")
    expect(hookSource).toContain('harnessSessionID: sessionID')
  })
})
