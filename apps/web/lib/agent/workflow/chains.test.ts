import { describe, expect, test } from 'bun:test'
import { buildWorkflowChainPrompt, getNextWorkflowChainStep, getWorkflowChainTemplate } from './chains'

describe('workflow chains', () => {
  test('defines the research-to-plan chain in mode-safe stages', () => {
    const template = getWorkflowChainTemplate('research-to-plan')
    expect(template?.steps.map((step) => step.stage)).toEqual(['research', 'design', 'plan'])
    expect(template?.steps.map((step) => step.mode)).toEqual(['ask', 'plan', 'plan'])
    expect(template?.steps.at(-1)?.requiresApproval).toBe(true)
  })

  test('returns the next incomplete chain step', () => {
    expect(
      getNextWorkflowChainStep({ chainId: 'full-feature-build', completedStepIds: ['clarify', 'research'] })?.id
    ).toBe('design')
    expect(
      getNextWorkflowChainStep({
        chainId: 'bug-investigation',
        completedStepIds: ['clarify', 'research', 'validate'],
      })
    ).toBeNull()
  })

  test('builds a compact step prompt', () => {
    const prompt = buildWorkflowChainPrompt({
      chainId: 'research-to-plan',
      stepId: 'design',
      userGoal: 'Improve file tree reliability',
    })
    expect(prompt).toContain('Workflow: Research to Plan')
    expect(prompt).toContain('Current step: Design')
    expect(prompt).toContain('Improve file tree reliability')
  })
})
