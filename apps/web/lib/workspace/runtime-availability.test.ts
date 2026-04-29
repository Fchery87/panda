import { describe, expect, test } from 'bun:test'

import { resolveRuntimeAvailability } from './runtime-availability'

describe('resolveRuntimeAvailability', () => {
  test('maps provider status into a small workspace runtime availability interface', () => {
    expect(resolveRuntimeAvailability({ status: 'idle', error: null })).toEqual({
      phase: 'idle',
      label: 'Idle',
      canUseBrowserRuntime: false,
      canUseServerFallback: true,
      providerStatus: 'idle',
    })

    expect(resolveRuntimeAvailability({ status: 'ready', error: null })).toEqual({
      phase: 'ready',
      label: 'Ready',
      canUseBrowserRuntime: true,
      canUseServerFallback: true,
      providerStatus: 'ready',
    })

    expect(resolveRuntimeAvailability({ status: 'error', error: 'Boot failed' })).toEqual({
      phase: 'error',
      label: 'Fallback',
      detail: 'Boot failed',
      canUseBrowserRuntime: false,
      canUseServerFallback: true,
      providerStatus: 'error',
    })
  })
})
