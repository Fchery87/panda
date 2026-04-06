import { describe, expect, it } from 'bun:test'
import {
  attachTaskEvidence,
  createDeliveryTaskRecord,
  transitionDeliveryTaskRecord,
  type DeliveryTaskRecord,
} from './deliveryTasks'

function makeTask(overrides: Partial<DeliveryTaskRecord> = {}): DeliveryTaskRecord {
  return createDeliveryTaskRecord({
    deliveryStateId: 'delivery_state_1',
    taskKey: 'T-101',
    title: 'Add canonical task state',
    description: 'Introduce tracked delivery tasks',
    rationale: 'Need explicit task lifecycle',
    ownerRole: 'manager',
    now: 100,
    ...overrides,
  })
}

describe('deliveryTasks helpers', () => {
  it('creates a draft task record with empty evidence and requirements', () => {
    const task = makeTask()

    expect(task.status).toBe('draft')
    expect(task.evidence).toEqual([])
    expect(task.acceptanceCriteria).toEqual([])
    expect(task.testRequirements).toEqual([])
    expect(task.reviewRequirements).toEqual([])
    expect(task.qaRequirements).toEqual([])
    expect(task.createdAt).toBe(100)
    expect(task.updatedAt).toBe(100)
  })

  it('attaches evidence immutably and updates timestamps', () => {
    const task = makeTask()
    const updated = attachTaskEvidence(task, {
      evidence: [{ type: 'agent_run', id: 'run_1', label: 'Initial build run' }],
      now: 200,
    })

    expect(task.evidence).toEqual([])
    expect(updated.evidence).toEqual([
      { type: 'agent_run', id: 'run_1', label: 'Initial build run' },
    ])
    expect(updated.updatedAt).toBe(200)
  })

  it('rejects invalid transitions', () => {
    const task = makeTask({ status: 'ready' })

    expect(() => transitionDeliveryTaskRecord(task, { to: 'done', now: 200 })).toThrow(
      'Invalid delivery task transition'
    )
  })

  it('requires evidence before entering review', () => {
    const task = makeTask({ status: 'in_progress' })

    expect(() => transitionDeliveryTaskRecord(task, { to: 'in_review', now: 200 })).toThrow(
      'Cannot enter review without evidence'
    )
  })

  it('allows entering review after evidence is attached', () => {
    const task = attachTaskEvidence(makeTask({ status: 'in_progress' }), {
      evidence: [{ type: 'agent_run', id: 'run_1', label: 'Build run' }],
      now: 150,
    })

    const updated = transitionDeliveryTaskRecord(task, { to: 'in_review', now: 200 })

    expect(updated.status).toBe('in_review')
    expect(updated.updatedAt).toBe(200)
  })
})
