import { describe, expect, test } from 'bun:test'
import { autopilotCheckpointRunEvent, evaluateAutopilotCheckpoint } from './autopilot-checkpoint'

describe('autopilot checkpoint', () => {
  test('requires advisor when autopilot checkpoint is policy-gated', () => {
    const result = evaluateAutopilotCheckpoint({
      enabled: true,
      policy: { enabled: true, requiredFor: ['autopilot_checkpoint'], reasoningEffort: 'high' },
    })
    expect(result.allowed).toBe(false)
    expect(result.preflight.gates).toContain('autopilot_checkpoint')
    expect(autopilotCheckpointRunEvent(result)).toMatchObject({
      type: 'autopilot_checkpoint',
      status: 'needs_advisor',
    })
  })

  test('allows guided checkpoints when no policy gate applies', () => {
    const result = evaluateAutopilotCheckpoint({
      enabled: false,
      policy: { enabled: true, requiredFor: ['autopilot_checkpoint'], reasoningEffort: 'high' },
    })
    expect(result.allowed).toBe(true)
  })
})
