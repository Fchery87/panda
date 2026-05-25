import { describe, expect, test } from 'bun:test'
import { advisorPreflightRunEvent, buildAdvisorPreflight } from './advisor-preflight'

describe('advisor preflight', () => {
  test('builds a blocking preflight result when policy requires a detected gate', () => {
    const result = buildAdvisorPreflight({
      policy: { enabled: true, requiredFor: ['dependency_change'], reasoningEffort: 'high' },
      changedFiles: ['package.json'],
    })

    expect(result.required).toBe(true)
    expect(result.status).toBe('needs_advisor')
    expect(result.gates).toContain('dependency_change')
    expect(advisorPreflightRunEvent(result)).toMatchObject({
      type: 'advisor_preflight',
      status: 'needs_advisor',
    })
  })

  test('reports clear when policy is disabled', () => {
    const result = buildAdvisorPreflight({
      policy: { enabled: false, requiredFor: ['dependency_change'], reasoningEffort: 'high' },
      changedFiles: ['package.json'],
    })

    expect(result.required).toBe(false)
    expect(result.status).toBe('clear')
    expect(result.gates).toContain('dependency_change')
  })
})
