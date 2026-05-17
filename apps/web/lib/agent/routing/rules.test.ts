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
    ['research the current auth flow and summarize findings', 'ask'],
    ['design a plan for adding billing', 'plan'],
    ['Create a comprehensive implementation pla of your findings', 'plan'],
    ['turn these findings into an implementation plan', 'plan'],
    ['fix the failing login test', 'code'],
    ['update the login form copy', 'code'],
    ['run the full implementation and verify it', 'build'],
    ['implement the approved plan and keep going until CI is green', 'build'],
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

  test('planning intent wins over code-ish verbs when the user asks to write a plan', () => {
    const decision = decideRouting(
      input('write a detailed implementation plan for the auth fixes', 'ask')
    )

    expect(decision.resolvedMode).toBe('plan')
    expect(decision.confidence).toBe('high')
  })

  test('routes advice phrased with code verbs to plan instead of editing immediately', () => {
    for (const message of [
      'what should I update to fix the auth bug?',
      'how would you fix the auth bug?',
      'what is the best way to refactor the router?',
    ]) {
      const decision = decideRouting(input(message, 'ask'))

      expect(decision.resolvedMode).toBe('plan')
      expect(decision.confidence).toBe('high')
    }
  })

  test('keeps review-and-report requests read-only even when they mention changes', () => {
    const decision = decideRouting(
      input('can you review the login component and tell me what to change?', 'ask')
    )

    expect(decision.resolvedMode).toBe('ask')
    expect(decision.confidence).toBe('high')
  })

  test('routes review-and-fix requests to code because the user asked for edits', () => {
    const decision = decideRouting(
      input('review the login component and fix any bugs you find', 'ask')
    )

    expect(decision.resolvedMode).toBe('code')
    expect(decision.confidence).toBe('high')
  })

  test('explicit mode requests switch modes without treating them as manual overrides', () => {
    const decision = decideRouting(input('switch to plan mode and scope the payment work', 'ask'))

    expect(decision.source).toBe('deterministic_rules')
    expect(decision.requestedMode).toBe('ask')
    expect(decision.resolvedMode).toBe('plan')
    expect(decision.confidence).toBe('high')
  })

  test('plan execution intent routes to build with high confidence', () => {
    const decision = decideRouting(input('implement the plan', 'ask'))

    expect(decision.resolvedMode).toBe('build')
    expect(decision.confidence).toBe('high')
  })

  test('approved-plan context routes execution language to build', () => {
    const base = input('start implementing it', 'ask')
    const decision = decideRouting({
      ...base,
      threadState: {
        ...base.threadState,
        hasApprovedPlan: true,
      },
    })

    expect(decision.resolvedMode).toBe('build')
    expect(decision.confidence).toBe('high')
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
