import { describe, expect, test } from 'bun:test'
import { runPreflight } from './preflight'

describe('runPreflight', () => {
  test('passes for verified model in ask mode', () => {
    const result = runPreflight({
      providerId: 'anthropic',
      modelId: 'claude-sonnet-4-6',
      chatMode: 'ask',
      hasApprovedPlan: false,
    })
    expect(result.ok).toBe(true)
  })

  test('fails for unmanifested model in build mode', () => {
    const result = runPreflight({
      providerId: 'unknown-provider',
      modelId: 'mystery-model',
      chatMode: 'code',
      hasApprovedPlan: true,
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.code).toBe('UNMANIFESTED_MODEL')
  })

  test('fails for experimental model in build mode without opt-in', () => {
    const result = runPreflight({
      providerId: 'openai-compatible',
      modelId: 'kimi-k2.5',
      chatMode: 'code',
      hasApprovedPlan: true,
      allowExperimental: false,
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.code).toBe('UNVERIFIED_MODEL')
  })

  test('passes for experimental model in build mode with opt-in', () => {
    const result = runPreflight({
      providerId: 'openai-compatible',
      modelId: 'kimi-k2.5',
      chatMode: 'code',
      hasApprovedPlan: true,
      allowExperimental: true,
    })
    expect(result.ok).toBe(true)
  })

  test('code mode passes with verified model regardless of plan status', () => {
    // Plan approval is handled at a higher level (workflow), not by preflight.
    const result = runPreflight({
      providerId: 'anthropic',
      modelId: 'claude-sonnet-4-6',
      chatMode: 'code',
      hasApprovedPlan: false,
    })
    expect(result.ok).toBe(true)
  })

  test('ask mode does not require approved plan', () => {
    const result = runPreflight({
      providerId: 'anthropic',
      modelId: 'claude-sonnet-4-6',
      chatMode: 'ask',
      hasApprovedPlan: false,
    })
    expect(result.ok).toBe(true)
  })

  test('build mode requires manifest just like code mode', () => {
    // All tool-calling modes now check for model capabilities.
    const result = runPreflight({
      providerId: 'unknown-provider',
      modelId: 'mystery-model',
      chatMode: 'build',
      hasApprovedPlan: true,
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.code).toBe('UNMANIFESTED_MODEL')
  })
})
