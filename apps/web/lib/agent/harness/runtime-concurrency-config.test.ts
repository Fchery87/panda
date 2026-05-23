import { describe, expect, test } from 'bun:test'
import { DEFAULT_RUNTIME_CONFIG } from './runtime-config'

describe('subagent concurrency runtime config', () => {
  test('defaults to bounded read-only concurrency and serialized mutating concurrency', () => {
    expect(DEFAULT_RUNTIME_CONFIG.maxConcurrentSubagents).toBe(4)
    expect(DEFAULT_RUNTIME_CONFIG.maxConcurrentMutatingSubagents).toBe(1)
    expect(DEFAULT_RUNTIME_CONFIG.defaultSubagentIsolationMode).toBe('shared-readonly')
    expect(DEFAULT_RUNTIME_CONFIG.availableSubagentIsolationModes).toEqual(['shared-readonly'])
  })
})
