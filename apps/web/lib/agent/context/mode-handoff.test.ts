import { describe, expect, test } from 'bun:test'
import {
  detectReferentialRequest,
  findLatestAssistantMessageByMode,
  formatModeHandoffForPrompt,
  resolveModeHandoff,
} from './mode-handoff'
import type { ChatMessage } from './session-summary'

const messages: ChatMessage[] = [
  { role: 'user', mode: 'ask', content: 'Audit Panda context.' },
  { role: 'assistant', mode: 'ask', content: 'Audit finding: context drops plans.' },
  { role: 'user', mode: 'plan', content: 'Plan from that audit.' },
  { role: 'assistant', mode: 'plan', content: '# Context Fix Plan\nPersist handoff packets.' },
]

describe('mode handoff resolver', () => {
  test('detects plan and audit references', () => {
    expect(detectReferentialRequest('save this plan as markdown').refersToPlan).toBe(true)
    expect(detectReferentialRequest('use your audit findings').refersToAudit).toBe(true)
  })

  test('finds latest assistant message by mode', () => {
    expect(findLatestAssistantMessageByMode(messages, 'plan')?.content).toContain(
      'Context Fix Plan'
    )
  })

  test('resolves latest plan for Agent Guided runtime', () => {
    const resolved = resolveModeHandoff({
      targetMode: 'code',
      userContent: 'save this plan as a .md file',
      messages,
    })
    expect(resolved.unresolved).toBe(false)
    if (!resolved.unresolved) {
      expect(resolved.packet?.kind).toBe('latest_plan')
      expect(resolved.packet?.content).toContain('Persist handoff packets')
      expect(formatModeHandoffForPrompt(resolved.packet!)).toContain('## Mode Handoff Context')
    }
  })

  test('resolves latest plan for Agent Autopilot runtime', () => {
    const resolved = resolveModeHandoff({
      targetMode: 'build',
      userContent: 'implement the plan',
      messages,
    })
    expect(resolved.unresolved).toBe(false)
    if (!resolved.unresolved) expect(resolved.packet?.toMode).toBe('build')
  })

  test('resolves latest Ask audit for Agent runtimes', () => {
    const resolved = resolveModeHandoff({
      targetMode: 'code',
      userContent: 'use your audit findings',
      messages,
    })
    expect(resolved.unresolved).toBe(false)
    if (!resolved.unresolved) {
      expect(resolved.packet?.kind).toBe('latest_audit')
      expect(resolved.packet?.content).toContain('context drops plans')
    }
  })

  test('approved structured plan takes precedence', () => {
    const resolved = resolveModeHandoff({
      targetMode: 'build',
      userContent: 'save this plan',
      messages,
      approvedPlanExecutionContext: {
        sessionId: 'approved-1',
        plan: {
          chatId: 'chat-1',
          sessionId: 'approved-1',
          title: 'Approved structured plan',
          summary: 'Use the approved artifact.',
          markdown: '# Approved structured plan',
          sections: [],
          acceptanceChecks: [],
          status: 'accepted',
          generatedAt: 1,
          acceptedAt: 2,
        } as never,
      },
    })
    expect(resolved.unresolved).toBe(false)
    if (!resolved.unresolved) expect(resolved.packet?.kind).toBe('approved_plan')
  })

  test('returns unresolved for missing plan referent', () => {
    const resolved = resolveModeHandoff({
      targetMode: 'code',
      userContent: 'save this plan',
      messages: [{ role: 'user', mode: 'ask', content: 'hello' }],
    })
    expect(resolved.unresolved).toBe(true)
    if (resolved.unresolved) expect(resolved.referent).toBe('plan')
  })
})
