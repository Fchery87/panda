import { describe, expect, test } from 'bun:test'
import { mapDeliveryStateToStatusStripProps } from './selectors'

describe('delivery selectors', () => {
  test('maps an active delivery state into status strip props', () => {
    const result = mapDeliveryStateToStatusStripProps({
      currentPhase: 'review',
      activeRole: 'executive',
      reviewGateStatus: 'pending',
      qaGateStatus: 'failed',
      shipGateStatus: 'not_required',
      evidenceMissing: true,
      summary: {
        goal: 'Track reviewed work canonically',
        activeTaskTitle: 'Review canonical delivery model',
      },
    })

    expect(result).toEqual({
      currentPhase: 'review',
      activeRole: 'executive',
      currentTaskTitle: 'Review canonical delivery model',
      reviewGateStatus: 'pending',
      qaGateStatus: 'failed',
      shipGateStatus: 'not_required',
      evidenceMissing: true,
    })
  })

  test('falls back to null task title when the state has no active task', () => {
    const result = mapDeliveryStateToStatusStripProps({
      currentPhase: 'execute',
      activeRole: 'manager',
      reviewGateStatus: 'not_required',
      qaGateStatus: 'not_required',
      shipGateStatus: 'not_required',
      evidenceMissing: false,
      summary: {
        goal: 'Track implementation canonically',
      },
    })

    expect(result.currentTaskTitle).toBeNull()
  })

  test('returns fully empty props when there is no delivery state', () => {
    const result = mapDeliveryStateToStatusStripProps(null)

    expect(result).toEqual({
      currentPhase: null,
      activeRole: null,
      currentTaskTitle: null,
      reviewGateStatus: 'not_required',
      qaGateStatus: 'not_required',
      shipGateStatus: 'not_required',
      evidenceMissing: false,
    })
  })
})
