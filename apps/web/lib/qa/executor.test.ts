import { describe, expect, test } from 'bun:test'
import { buildBrowserQaRunInput, normalizeBrowserQaResult, resolveQaBaseUrl } from './executor'

describe('browser QA executor helpers', () => {
  test('builds a deterministic browser QA run input from delivery context', () => {
    const input = buildBrowserQaRunInput({
      projectId: 'project_1',
      chatId: 'chat_1',
      taskId: 'task_1',
      urlsTested: ['/projects/example'],
      flowNames: ['task-panel-review-loop'],
    })

    expect(input.browserSessionKey).toContain('project_1')
    expect(input.browserSessionKey).toContain('chat_1')
    expect(input.browserSessionKey).toContain('task_1')
    expect(input.urlsTested).toEqual(['/projects/example'])
  })

  test('normalizes browser QA result into qaReport-friendly payload', () => {
    const result = normalizeBrowserQaResult({
      browserSessionKey: 'session-1',
      urlsTested: ['/projects/example'],
      flowNames: ['task-panel-review-loop'],
      assertions: [{ label: 'Task panel rendered', status: 'passed' }],
      consoleErrors: [],
      networkFailures: [],
      screenshotPath: '/tmp/task-panel.png',
    })

    expect(result.decision).toBe('pass')
    expect(result.summary).toContain('QA passed')
    expect(result.evidence.screenshotPath).toBe('/tmp/task-panel.png')
  })

  test('maps failed assertions to concerns with explicit defects and preserves screenshot path', () => {
    const result = normalizeBrowserQaResult({
      browserSessionKey: 'session-1',
      urlsTested: ['/projects/example'],
      flowNames: ['task-panel-review-loop'],
      assertions: [{ label: 'Task panel rendered', status: 'failed' }],
      consoleErrors: [],
      networkFailures: [],
      screenshotPath: '/tmp/assertion-failure.png',
    })

    expect(result.decision).toBe('concerns')
    expect(result.summary).toContain('Assertion failures')
    expect(result.evidence.screenshotPath).toBe('/tmp/assertion-failure.png')
    expect(result.defects).toEqual([
      {
        severity: 'high',
        title: 'Browser QA assertion failed',
        detail: 'Task panel rendered',
        route: '/projects/example',
      },
    ])
  })

  test('maps console and network issues into deterministic defects', () => {
    const result = normalizeBrowserQaResult({
      browserSessionKey: 'session-1',
      urlsTested: ['/projects/example'],
      flowNames: ['task-panel-review-loop'],
      assertions: [{ label: 'Task panel rendered', status: 'passed' }],
      consoleErrors: ['ReferenceError: x is not defined'],
      networkFailures: ['GET https://example.com/api/tasks'],
      screenshotPath: '/tmp/with-issues.png',
    })

    expect(result.decision).toBe('concerns')
    expect(result.summary).toContain('browser session surfaced issues')
    expect(result.defects).toEqual([
      {
        severity: 'medium',
        title: 'Browser console errors detected',
        detail: 'ReferenceError: x is not defined',
        route: '/projects/example',
      },
      {
        severity: 'medium',
        title: 'Browser network failures detected',
        detail: 'GET https://example.com/api/tasks',
        route: '/projects/example',
      },
    ])
  })

  test('resolves a QA base URL from the environment with localhost fallback', () => {
    expect(resolveQaBaseUrl(undefined)).toBe('http://localhost:3000')
    expect(resolveQaBaseUrl('https://example.com')).toBe('https://example.com')
  })
})
