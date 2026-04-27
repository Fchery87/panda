import { describe, expect, test } from 'bun:test'

import {
  createInitialRoutingInput,
  getDefaultThreadState,
  type ThreadState,
  type WebContainerStatus,
} from './types'
import { decideRouting } from './rules'
import type { ChatMode } from '@/lib/agent/chat-modes'

function input(
  message: string,
  requestedMode: ChatMode = 'ask',
  options: { manualOverride?: boolean; webcontainerStatus?: WebContainerStatus } = {}
) {
  const baseThreadState = getDefaultThreadState()
  const threadState: ThreadState = {
    ...baseThreadState,
    webcontainerStatus: options.webcontainerStatus ?? baseThreadState.webcontainerStatus,
  }

  return createInitialRoutingInput({
    message,
    requestedMode,
    threadState,
    oversightLevel: 'review',
    manualOverride: options.manualOverride,
  })
}

describe('deterministic routing rules', () => {
  const expectedRoutes: Array<readonly [string, ChatMode]> = [
    ['explain how the auth flow works', 'ask'],
    ['design a plan for adding billing', 'plan'],
    ['fix the failing login test', 'code'],
    ['run the full implementation and verify it', 'build'],
  ]

  for (const [message, expectedMode] of expectedRoutes) {
    test(`routes "${message}" to ${expectedMode} without an LLM fallback`, () => {
      const decision = decideRouting(input(message))

      expect(decision.source).toBe('deterministic_rules')
      expect(decision.resolvedMode).toBe(expectedMode)
      expect(decision.rationale.length).toBeGreaterThan(0)
    })
  }

  test('manual override keeps the requested mode instead of applying rules', () => {
    const decision = decideRouting(
      input('fix the failing login test', 'ask', { manualOverride: true })
    )

    expect(decision.source).toBe('manual_override')
    expect(decision.requestedMode).toBe('ask')
    expect(decision.resolvedMode).toBe('ask')
    expect(decision.confidence).toBe('high')
  })

  test('ambiguous prompts stay in the requested mode with low confidence', () => {
    const decision = decideRouting(input('maybe later', 'plan'))

    expect(decision.resolvedMode).toBe('plan')
    expect(decision.confidence).toBe('low')
    expect(decision.requiresApproval).toBe(true)
  })

  for (const phase of ['unavailable', 'unsupported', 'error'] as const) {
    test(`does not globally require WebContainer when status is ${phase}`, () => {
      const decision = decideRouting(
        input('fix the failing login test', 'code', {
          webcontainerStatus: {
            phase,
            ...(phase === 'error' ? { lastError: 'Boot failed' } : {}),
          },
        })
      )

      expect(decision.resolvedMode).toBe('code')
      expect(decision.webcontainerRequired).toBe(false)
    })
  }

  for (const phase of ['ready', 'booting'] as const) {
    test(`keeps deterministic code routing stable when WebContainer status is ${phase}`, () => {
      const decision = decideRouting(
        input('fix the failing login test', 'ask', {
          webcontainerStatus: { phase },
        })
      )

      expect(decision.source).toBe('deterministic_rules')
      expect(decision.requestedMode).toBe('ask')
      expect(decision.resolvedMode).toBe('code')
      expect(decision.webcontainerRequired).toBe(false)
    })
  }
})
