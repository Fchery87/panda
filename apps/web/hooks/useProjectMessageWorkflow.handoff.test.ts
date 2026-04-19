import { describe, expect, test } from 'bun:test'
import { buildHandoffSystemMessage } from '@/lib/agent/prompt-library'
import type { GeneratedPlanArtifact } from '@/lib/planning/types'

describe('buildHandoffSystemMessage', () => {
  const fakePlan: GeneratedPlanArtifact = {
    chatId: 'chat-1',
    sessionId: 'sess-1',
    title: 'Test Plan',
    summary: 'A test plan',
    markdown: '',
    sections: [
      { id: 's1', title: 'Setup', content: 'do stuff', order: 0 },
      { id: 's2', title: 'Implement', content: 'write code', order: 1 },
    ],
    acceptanceChecks: ['All tests pass'],
    status: 'accepted',
    generatedAt: Date.now(),
  }

  test('returns a string', () => {
    const msg = buildHandoffSystemMessage({ plan: fakePlan })
    expect(typeof msg).toBe('string')
  })

  test('does not contain "switching from Architect"', () => {
    const msg = buildHandoffSystemMessage({ plan: fakePlan })
    expect(msg).not.toContain('switching from Architect')
  })

  test('contains the handoff ritual instruction', () => {
    const msg = buildHandoffSystemMessage({ plan: fakePlan })
    expect(msg).toContain('write_files')
  })

  test('contains plan content', () => {
    const msg = buildHandoffSystemMessage({ plan: fakePlan })
    expect(msg).toContain('Setup')
  })
})
