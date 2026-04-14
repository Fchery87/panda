import { describe, it, expect } from 'bun:test'
import { resolveAgentPolicy } from './agentPolicy'

describe('resolveAgentPolicy', () => {
  it('review + code → interactive spec approval, show review', () => {
    const p = resolveAgentPolicy({ chatMode: 'code', oversightLevel: 'review' })
    expect(p.specApprovalMode).toBe('interactive')
    expect(p.showSpecReview).toBe(true)
  })

  it('autopilot + code → auto_approve, show review', () => {
    const p = resolveAgentPolicy({ chatMode: 'code', oversightLevel: 'autopilot' })
    expect(p.specApprovalMode).toBe('auto_approve')
    expect(p.showSpecReview).toBe(true)
  })

  it('review + architect → spec review hidden (spec engine off)', () => {
    const p = resolveAgentPolicy({ chatMode: 'architect', oversightLevel: 'review' })
    expect(p.showSpecReview).toBe(false)
  })

  it('autopilot + architect → spec review hidden, plan review shown', () => {
    const p = resolveAgentPolicy({ chatMode: 'architect', oversightLevel: 'autopilot' })
    expect(p.showSpecReview).toBe(false)
    expect(p.showPlanReview).toBe(true)
  })

  it('review → auto open inspector on execution start', () => {
    const p = resolveAgentPolicy({ chatMode: 'code', oversightLevel: 'review' })
    expect(p.autoOpenInspectorOnExecutionStart).toBe(true)
  })

  it('autopilot → no auto open inspector', () => {
    const p = resolveAgentPolicy({ chatMode: 'code', oversightLevel: 'autopilot' })
    expect(p.autoOpenInspectorOnExecutionStart).toBe(false)
  })
})
