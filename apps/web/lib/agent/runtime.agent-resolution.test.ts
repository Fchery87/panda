import { describe, expect, test } from 'bun:test'

import { resolveHarnessAgentName } from './runtime'

describe('resolveHarnessAgentName', () => {
  test('maps chat modes to Panda-native agents by default', () => {
    expect(resolveHarnessAgentName({ chatMode: 'plan' })).toBe('plan')
    expect(resolveHarnessAgentName({ chatMode: 'code' })).toBe('code')
    expect(resolveHarnessAgentName({ chatMode: 'build' })).toBe('build')
    expect(resolveHarnessAgentName({ chatMode: 'ask' })).toBe('ask')
  })

  test('respects explicit harness agent overrides', () => {
    expect(resolveHarnessAgentName({ chatMode: 'code', harnessAgentName: 'build' })).toBe('build')
  })
})
