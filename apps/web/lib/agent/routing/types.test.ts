import { describe, expect, test } from 'bun:test'

import {
  buildManualRoutingDecision,
  createInitialRoutingInput,
  getDefaultThreadState,
  normalizeWebContainerStatus,
  type RoutingInput,
} from './types'

describe('routing domain types', () => {
  test('creates routing input with separate requested and resolved mode fields', () => {
    const input: RoutingInput = createInitialRoutingInput({
      message: 'Fix the broken build',
      requestedMode: 'plan',
      threadState: getDefaultThreadState(),
      oversightLevel: 'review',
    })

    expect(input.requestedMode).toBe('plan')
    expect(input.resolvedMode).toBe('plan')
    expect(input.manualOverride).toBe(false)
    expect(input.webcontainerStatus.phase).toBe('unavailable')
  })

  test('normalizes existing WebContainer provider status into routing status', () => {
    expect(normalizeWebContainerStatus({ status: 'idle', error: null })).toEqual({
      phase: 'unavailable',
    })
    expect(normalizeWebContainerStatus({ status: 'unsupported', error: null })).toEqual({
      phase: 'unsupported',
    })
    expect(normalizeWebContainerStatus({ status: 'error', error: 'Boot failed' })).toEqual({
      phase: 'error',
      lastError: 'Boot failed',
    })
  })

  test('builds a high-confidence manual override decision without requiring WebContainer', () => {
    const decision = buildManualRoutingDecision(
      createInitialRoutingInput({
        message: 'Explain this component',
        requestedMode: 'ask',
        threadState: getDefaultThreadState(),
        oversightLevel: 'autopilot',
        manualOverride: true,
      })
    )

    expect(decision.source).toBe('manual_override')
    expect(decision.requestedMode).toBe('ask')
    expect(decision.resolvedMode).toBe('ask')
    expect(decision.confidence).toBe('high')
    expect(decision.requiresApproval).toBe(false)
    expect(decision.webcontainerRequired).toBe(false)
  })
})
