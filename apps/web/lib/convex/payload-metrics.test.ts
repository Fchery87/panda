import { describe, expect, test } from 'bun:test'

import { estimateJsonBytes } from './payload-metrics'

describe('payload metrics', () => {
  test('estimates JSON payload byte size', () => {
    expect(estimateJsonBytes({ ok: true })).toBe(new TextEncoder().encode('{"ok":true}').length)
  })

  test('returns zero for non-serializable values', () => {
    const value: { self?: unknown } = {}
    value.self = value

    expect(estimateJsonBytes(value)).toBe(0)
  })

  test('returns zero for values without JSON representation', () => {
    expect(estimateJsonBytes(undefined)).toBe(0)
    expect(estimateJsonBytes(() => null)).toBe(0)
  })
})
