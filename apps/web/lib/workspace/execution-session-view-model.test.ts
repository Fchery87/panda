import { describe, expect, test } from 'bun:test'

import type { RuntimeAvailability } from './runtime-availability'
import { buildExecutionSessionViewModel } from './execution-session-view-model'

const serverRuntime: RuntimeAvailability = {
  phase: 'unsupported',
  label: 'Server',
  canUseBrowserRuntime: false,
  canUseServerFallback: true,
  providerStatus: 'unsupported',
}

const browserRuntime: RuntimeAvailability = {
  phase: 'ready',
  label: 'Ready',
  canUseBrowserRuntime: true,
  canUseServerFallback: true,
  providerStatus: 'ready',
}

describe('buildExecutionSessionViewModel', () => {
  test('returns null when no execution session state needs focus', () => {
    expect(
      buildExecutionSessionViewModel({
        chatTitle: null,
        latestUserPrompt: null,
        planningQuestion: null,
        generatedPlan: null,
        canApprovePlan: false,
        canBuildPlan: false,
        isExecuting: false,
        changedFilesCount: 0,
        runtimeAvailability: serverRuntime,
      })
    ).toBeNull()
  })

  test('models planning intake as the next session action', () => {
    const model = buildExecutionSessionViewModel({
      chatTitle: 'Add billing settings',
      latestUserPrompt: null,
      planningQuestion: { prompt: 'Which billing provider should Panda integrate?' },
      generatedPlan: null,
      canApprovePlan: false,
      canBuildPlan: false,
      isExecuting: false,
      changedFilesCount: 0,
      runtimeAvailability: serverRuntime,
    })

    expect(model?.phase).toBe('planning')
    expect(model?.title).toBe('Add billing settings')
    expect(model?.primaryAction).toEqual({ id: 'continue_planning', label: 'Continue Planning' })
  })

  test('models plan review before execution', () => {
    const model = buildExecutionSessionViewModel({
      chatTitle: 'Improve onboarding',
      latestUserPrompt: null,
      planningQuestion: null,
      generatedPlan: { title: 'Onboarding plan' },
      canApprovePlan: true,
      canBuildPlan: false,
      isExecuting: false,
      changedFilesCount: 0,
      runtimeAvailability: serverRuntime,
    })

    expect(model?.phase).toBe('approval')
    expect(model?.statusLabel).toBe('Plan ready')
    expect(model?.primaryAction?.id).toBe('review_plan')
  })

  test('models approved plans as ready to build', () => {
    const model = buildExecutionSessionViewModel({
      chatTitle: null,
      latestUserPrompt: null,
      planningQuestion: null,
      generatedPlan: { title: 'Approved refactor' },
      canApprovePlan: false,
      canBuildPlan: true,
      isExecuting: false,
      changedFilesCount: 0,
      runtimeAvailability: serverRuntime,
    })

    expect(model?.phase).toBe('ready_to_build')
    expect(model?.primaryAction).toEqual({ id: 'build_from_plan', label: 'Build from Plan' })
    expect(model?.secondaryAction).toEqual({ id: 'review_plan', label: 'Open Plan' })
  })

  test('models active execution with proof and browser preview readiness', () => {
    const model = buildExecutionSessionViewModel({
      chatTitle: 'Active work',
      latestUserPrompt: 'Build a session rail',
      planningQuestion: null,
      generatedPlan: null,
      canApprovePlan: false,
      canBuildPlan: false,
      isExecuting: true,
      latestRunStep: 'Editing workspace shell',
      changedFilesCount: 1,
      runtimeAvailability: browserRuntime,
      parallelBranches: [{ status: 'running' }, { status: 'complete' }, { status: 'blocked' }],
    })

    expect(model?.phase).toBe('executing')
    expect(model?.title).toBe('Build a session rail')
    expect(model?.proof).toEqual({
      label: 'Run active',
      detail: 'Editing workspace shell',
      hasActiveRun: true,
    })
    expect(model?.preview.available).toBe(true)
    expect(model?.branches).toEqual({
      running: 1,
      blocked: 1,
      complete: 1,
      label: '1 running, 1 blocked, 1 complete.',
      outcomes: [
        { label: 'Branch 1', status: 'running', outcome: 'Branch still running.' },
        { label: 'Branch 2', status: 'complete', outcome: 'Branch completed.' },
        { label: 'Branch 3', status: 'blocked', outcome: 'Branch needs attention.' },
      ],
    })
  })

  test('models changed work as review-ready session state', () => {
    const model = buildExecutionSessionViewModel({
      chatTitle: 'Fix auth copy',
      latestUserPrompt: null,
      planningQuestion: null,
      generatedPlan: null,
      canApprovePlan: false,
      canBuildPlan: false,
      isExecuting: false,
      changedFilesCount: 3,
      runtimeAvailability: serverRuntime,
    })

    expect(model?.phase).toBe('review')
    expect(model?.changedWork).toEqual({
      count: 3,
      label: '3 changed files ready for review.',
      needsReview: true,
    })
    expect(model?.primaryAction).toEqual({ id: 'review_changes', label: 'Inspect Changes' })
  })

  test('summarizes parallel agent branches as session outcomes', () => {
    const model = buildExecutionSessionViewModel({
      chatTitle: 'Parallel cleanup',
      latestUserPrompt: null,
      planningQuestion: null,
      generatedPlan: null,
      canApprovePlan: false,
      canBuildPlan: false,
      isExecuting: false,
      changedFilesCount: 1,
      runtimeAvailability: serverRuntime,
      parallelBranches: [
        { label: 'Docs branch', status: 'complete', outcome: 'Updated contract docs' },
        { label: 'UI branch', status: 'running' },
        { label: 'Test branch', status: 'failed', outcome: 'Needs test harness repair' },
      ],
    })

    expect(model?.branches.label).toBe('1 running, 1 blocked, 1 complete.')
    expect(model?.branches.outcomes).toEqual([
      { label: 'Docs branch', status: 'complete', outcome: 'Updated contract docs' },
      { label: 'UI branch', status: 'running', outcome: 'Branch still running.' },
      { label: 'Test branch', status: 'failed', outcome: 'Needs test harness repair' },
    ])
  })
})
