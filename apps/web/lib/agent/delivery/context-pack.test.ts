import { describe, expect, test } from 'bun:test'
import { buildDeliveryContextPack } from './context-pack'

describe('delivery context pack', () => {
  test('builds a compact delivery summary payload', () => {
    const pack = buildDeliveryContextPack({
      deliveryState: {
        currentPhase: 'review',
        summary: {
          goal: 'Finish Forge delivery closure',
          nextStepBrief: 'Resolve remaining QA follow-ups',
        },
      },
      activeTask: {
        title: 'Implement delivery closure',
        status: 'in_review',
      },
      latestReview: {
        decision: 'pass',
        summary: 'Implementation is ready for QA.',
      },
      latestQa: {
        decision: 'pass',
        summary: 'QA passed from the persistent browser session.',
      },
    })

    expect(pack.currentPhase).toBe('review')
    expect(pack.activeTaskTitle).toBe('Implement delivery closure')
    expect(pack.activeTaskStatus).toBe('in_review')
    expect(pack.latestReviewDecision).toBe('pass')
    expect(pack.latestQaDecision).toBe('pass')
    expect(pack.nextStepBrief).toBe('Resolve remaining QA follow-ups')
  })
})
