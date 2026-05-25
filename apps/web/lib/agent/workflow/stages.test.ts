import { describe, expect, test } from 'bun:test'
import { artifactKindForStage } from './artifacts'
import { isStageAllowedForMode, resolveWorkflowStage } from './stages'

describe('workflow stages', () => {
  test('keeps workflow stages subordinate to current Panda modes', () => {
    expect(isStageAllowedForMode('ask', 'research')).toBe(true)
    expect(isStageAllowedForMode('ask', 'implement')).toBe(false)
    expect(isStageAllowedForMode('plan', 'design')).toBe(true)
    expect(isStageAllowedForMode('code', 'implement')).toBe(true)
    expect(isStageAllowedForMode('build', 'handoff')).toBe(true)
  })

  test('falls back to the mode default when a requested stage is invalid', () => {
    expect(resolveWorkflowStage({ mode: 'ask', requestedStage: 'implement' })).toBe('research')
    expect(resolveWorkflowStage({ mode: 'plan', requestedStage: 'design' })).toBe('design')
  })

  test('maps artifact-producing stages to workflow artifact kinds', () => {
    expect(artifactKindForStage('clarify')).toBe('requirements')
    expect(artifactKindForStage('research')).toBe('research')
    expect(artifactKindForStage('plan')).toBe('implementation_plan')
    expect(artifactKindForStage('implement')).toBeNull()
    expect(artifactKindForStage('review')).toBe('review_report')
  })
})
