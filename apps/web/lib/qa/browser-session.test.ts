import { describe, expect, test } from 'bun:test'
import {
  createBrowserSessionKey,
  deriveQaReportFingerprint,
  shouldCreateFreshQaArtifacts,
} from './browser-session'

describe('browser session QA helpers', () => {
  test('creates a stable browser session key per chat and delivery task', () => {
    const key = createBrowserSessionKey({
      projectId: 'project_1',
      chatId: 'chat_1',
      taskId: 'task_1',
    })

    expect(key).toContain('project_1')
    expect(key).toContain('chat_1')
    expect(key).toContain('task_1')
  })

  test('derives a deterministic QA report fingerprint', () => {
    const fingerprint = deriveQaReportFingerprint({
      taskId: 'task_1',
      runId: 'run_1',
      flowNames: ['task-panel-review-loop'],
      urlsTested: ['/projects/example'],
    })

    expect(fingerprint).toContain('task_1')
    expect(fingerprint).toContain('run_1')
  })

  test('skips creating fresh QA artifacts when the latest fingerprint matches', () => {
    expect(
      shouldCreateFreshQaArtifacts({
        latestFingerprint: 'task_1::run_1::task-panel-review-loop::/projects/example',
        nextFingerprint: 'task_1::run_1::task-panel-review-loop::/projects/example',
      })
    ).toBe(false)
  })
})
