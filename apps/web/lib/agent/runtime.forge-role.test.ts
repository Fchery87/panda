import { describe, expect, test } from 'bun:test'

import { resolveHarnessAgentName } from './runtime'

describe('resolveHarnessAgentName', () => {
  test('maps chat modes to Forge role agents by default', () => {
    expect(resolveHarnessAgentName({ chatMode: 'architect' })).toBe('executive')
    expect(resolveHarnessAgentName({ chatMode: 'code' })).toBe('manager')
    expect(resolveHarnessAgentName({ chatMode: 'build' })).toBe('builder')
    expect(resolveHarnessAgentName({ chatMode: 'ask' })).toBe('manager')
  })

  test('respects explicit harness agent overrides', () => {
    expect(resolveHarnessAgentName({ chatMode: 'code', harnessAgentName: 'build' })).toBe('build')
  })
})
