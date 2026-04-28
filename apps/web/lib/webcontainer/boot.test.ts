import { describe, expect, it } from 'bun:test'
import { bootWebcontainerWithTimeout, buildWebcontainerBootTelemetry } from './boot'

describe('bootWebcontainerWithTimeout', () => {
  it('rejects when WebContainer boot does not settle before the timeout', async () => {
    await expect(
      bootWebcontainerWithTimeout({
        boot: () => new Promise(() => {}),
        timeoutMs: 1,
      })
    ).rejects.toThrow('WebContainer boot timed out after 1ms')
  })
})

describe('buildWebcontainerBootTelemetry', () => {
  it('classifies boot outcome without preserving raw error text', () => {
    const telemetry = buildWebcontainerBootTelemetry({
      status: 'error',
      startedAt: 100,
      endedAt: 425,
      error: new Error('Secret token abc123 failed during boot'),
    })

    expect(telemetry).toEqual({
      status: 'error',
      executionPath: 'server-fallback',
      durationMs: 325,
      reasonCategory: 'boot-error',
    })
  })
})
