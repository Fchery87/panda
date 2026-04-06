import { describe, expect, test } from 'bun:test'
import { buildBrowserQaArtifactRecord } from './artifacts'

describe('browser QA artifacts helper', () => {
  test('builds a stable artifact record from browser QA outputs', () => {
    const artifact = buildBrowserQaArtifactRecord({
      browserSessionKey: 'browser-session::project_1::chat_1::task_1',
      taskId: 'task_1',
      runId: 'run_1',
      screenshotPath: '/tmp/browser-session-project_1-chat_1-task_1.png',
      urlsTested: ['/projects/project_1', '/projects/project_1/review'],
    })

    expect(artifact.artifactKey).toBe('browser-session::project_1::chat_1::task_1::run_1')
    expect(artifact.label).toBe('Browser QA artifact for run run_1')
    expect(artifact.href).toBe('/tmp/browser-session-project_1-chat_1-task_1.png')
    expect(artifact.metadata.urlsTested).toEqual([
      '/projects/project_1',
      '/projects/project_1/review',
    ])
    expect(artifact.metadata.taskId).toBe('task_1')
    expect(artifact.metadata.runId).toBe('run_1')
  })
})
