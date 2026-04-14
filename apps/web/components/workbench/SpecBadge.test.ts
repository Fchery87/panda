import { describe, expect, it } from 'bun:test'
import { buildSpecBadgeLabel } from './SpecBadge'

describe('SpecBadge label', () => {
  it('shows tier label when tier is provided', () => {
    const label = buildSpecBadgeLabel('executing', 'explicit')
    expect(label).toContain('explicit')
    expect(label).toContain('executing')
  })

  it('omits tier when not provided', () => {
    const label = buildSpecBadgeLabel('verified')
    expect(label).toBe('Spec-verified')
  })

  it('shows ambient tier', () => {
    const label = buildSpecBadgeLabel('executing', 'ambient')
    expect(label).toContain('ambient')
  })
})
