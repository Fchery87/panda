import { describe, expect, it } from 'bun:test'
import {
  createDeliveryStateRecord,
  syncDeliveryStateDerivedCounts,
  transitionDeliveryStatePhase,
  updateDeliveryStateSummary,
  type DeliveryStateRecord,
} from './deliveryStates'

function makeState(overrides: Partial<DeliveryStateRecord> = {}): DeliveryStateRecord {
  return createDeliveryStateRecord({
    projectId: 'project_1',
    chatId: 'chat_1',
    title: 'Introduce Forge delivery state',
    goal: 'Track non-trivial work canonically',
    now: 100,
    ...overrides,
  })
}

describe('deliveryStates helpers', () => {
  it('creates an initiative-scoped delivery state in intake', () => {
    const state = makeState()

    expect(state.currentPhase).toBe('intake')
    expect(state.status).toBe('draft')
    expect(state.activeRole).toBe('manager')
    expect(state.activeTaskIds).toEqual([])
    expect(state.affectedFiles).toEqual([])
    expect(state.affectedRoutes).toEqual([])
    expect(state.advisoryGateMode).toBe(true)
  })

  it('rejects invalid delivery phase transitions', () => {
    const state = makeState({ currentPhase: 'plan', status: 'active' })

    expect(() => transitionDeliveryStatePhase(state, { to: 'qa', now: 200 })).toThrow(
      'Invalid delivery phase transition'
    )
  })

  it('allows valid delivery phase transitions and updates timestamps', () => {
    const state = makeState({ currentPhase: 'plan', status: 'active' })
    const updated = transitionDeliveryStatePhase(state, { to: 'execute', now: 200 })

    expect(updated.currentPhase).toBe('execute')
    expect(updated.updatedAt).toBe(200)
    expect(updated.lastUpdatedByRole).toBe('manager')
  })

  it('updates summary fields immutably', () => {
    const state = makeState()
    const updated = updateDeliveryStateSummary(state, {
      currentPhaseSummary: 'Execution ready',
      nextStepBrief: 'Start the first delivery task',
      activeTaskTitle: 'Introduce canonical delivery state',
      now: 200,
    })

    expect(updated.summary.currentPhaseSummary).toBe('Execution ready')
    expect(updated.summary.nextStepBrief).toBe('Start the first delivery task')
    expect(updated.summary.activeTaskTitle).toBe('Introduce canonical delivery state')
    expect(updated.updatedAt).toBe(200)
  })

  it('syncs derived counts without changing canonical task references', () => {
    const state = makeState({
      activeTaskIds: ['task_1', 'task_2'],
      pendingReviewIds: ['review_1'],
      pendingQaIds: ['qa_1'],
    })
    const updated = syncDeliveryStateDerivedCounts(state, {
      openRiskCount: 2,
      unresolvedDefectCount: 1,
      evidenceMissing: true,
      now: 250,
    })

    expect(updated.activeTaskIds).toEqual(['task_1', 'task_2'])
    expect(updated.pendingReviewIds).toEqual(['review_1'])
    expect(updated.pendingQaIds).toEqual(['qa_1'])
    expect(updated.openRiskCount).toBe(2)
    expect(updated.unresolvedDefectCount).toBe(1)
    expect(updated.evidenceMissing).toBe(true)
  })
})
