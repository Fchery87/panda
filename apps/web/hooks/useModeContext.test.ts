import { describe, expect, test } from 'bun:test'
import { useModeContextRef, type ModeContext } from './useModeContext'

describe('useModeContextRef', () => {
  const base: ModeContext = {
    mode: 'architect',
    approvedPlanId: null,
    activeSpecId: null,
    depth: 'standard',
  }

  test('hook exports a function', () => {
    expect(typeof useModeContextRef).toBe('function')
  })

  test('ModeContext type accepts all chat modes', () => {
    const modes: ModeContext[] = [
      { ...base, mode: 'ask' },
      { ...base, mode: 'architect' },
      { ...base, mode: 'code' },
      { ...base, mode: 'build' },
    ]
    expect(modes).toHaveLength(4)
  })

  test('ModeContext accepts plan and spec IDs', () => {
    const ctx: ModeContext = {
      ...base,
      approvedPlanId: 'plan-123',
      activeSpecId: 'spec-456',
      depth: 'deep',
    }
    expect(ctx.approvedPlanId).toBe('plan-123')
    expect(ctx.activeSpecId).toBe('spec-456')
    expect(ctx.depth).toBe('deep')
  })
})
