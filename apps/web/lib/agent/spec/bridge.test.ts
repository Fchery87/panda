import { describe, expect, it } from 'bun:test'
import type { SpecBridge } from './bridge'

describe('SpecBridge', () => {
  it('defines explicit accept/reject and conflict reporting contracts', () => {
    const bridge: SpecBridge = {
      async proposeSpecTransition() {
        return { accepted: false, reason: 'gate mismatch', conflicts: ['qa_review pending'] }
      },
      async syncAcceptanceCriteria() {
        return { synced: true, conflicts: [] }
      },
    }

    expect(bridge).toBeDefined()
  })
})
