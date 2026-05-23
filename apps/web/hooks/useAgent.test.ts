import { describe, expect, it } from 'bun:test'
import {
  buildAutoModeSwitchDecision,
  buildFailedRunEvent,
  buildPublicSendMessageOptions,
  buildResolvedRoutingDecision,
  buildSendMessageContent,
  buildSpecCancelledRunEvent,
} from './useAgent'

describe('buildPublicSendMessageOptions', () => {
  it('forwards attachmentsOnly through the public sendMessage wrapper options', () => {
    expect(
      buildPublicSendMessageOptions({
        approvedPlanExecution: true,
        attachmentsOnly: true,
        attachments: [],
      })
    ).toEqual({
      clearInput: true,
      approvedPlanExecution: true,
      attachmentsOnly: true,
      attachments: [],
    })
  })

  it('forwards structured approved plan execution context through the public sendMessage wrapper', () => {
    const plan = {
      chatId: 'chat_1',
      sessionId: 'planning_1',
      title: 'Ship planning execution',
      summary: 'Implement the approved work',
      markdown: '',
      sections: [],
      acceptanceChecks: [],
      status: 'accepted' as const,
      generatedAt: 1,
    }

    expect(
      buildPublicSendMessageOptions({
        approvedPlanExecution: true,
        approvedPlanExecutionContext: {
          sessionId: 'planning_1',
          plan,
        },
      })
    ).toEqual({
      clearInput: true,
      approvedPlanExecution: true,
      approvedPlanExecutionContext: {
        sessionId: 'planning_1',
        plan,
      },
      attachments: undefined,
      attachmentsOnly: undefined,
    })
  })
})

describe('buildSendMessageContent', () => {
  it('returns the attachment placeholder when attachments are submitted without text', () => {
    expect(
      buildSendMessageContent('   ', {
        attachmentsOnly: true,
        attachments: [
          {
            storageId: 'storage_1' as never,
            kind: 'file',
            filename: 'notes.txt',
          },
        ],
        includeEditorContext: false,
      })
    ).toBe('[User attached files for review.]')
  })
})

describe('useAgent run event builders', () => {
  it('builds a stable spec-cancelled run event payload', () => {
    expect(buildSpecCancelledRunEvent()).toEqual({
      type: 'spec_cancelled',
      content: 'Specification approval cancelled',
      status: 'stopped',
    })
  })

  it('builds a stable failed run event payload', () => {
    expect(buildFailedRunEvent('boom')).toEqual({
      type: 'error',
      error: 'boom',
      status: 'failed',
    })
  })
})

describe('buildAutoModeSwitchDecision', () => {
  it('requests an automatic mode switch when deterministic routing changes modes', () => {
    const routingDecision = buildResolvedRoutingDecision({
      content: 'fix the failing login test',
      requestedMode: 'ask',
      oversightLevel: 'review',
    })

    expect(buildAutoModeSwitchDecision({ routingDecision })).toMatchObject({
      action: 'switch',
      fromMode: 'ask',
      toMode: 'code',
      boundary: 'write-capable',
    })
  })

  it('does not auto-switch when the user explicitly locks the mode', () => {
    const routingDecision = buildResolvedRoutingDecision({
      content: 'fix the failing login test',
      requestedMode: 'ask',
      oversightLevel: 'review',
      manualOverride: true,
    })

    expect(buildAutoModeSwitchDecision({ routingDecision })).toEqual({
      action: 'stay',
      reason: 'Manual mode override is active.',
    })
  })

  it('suggests instead of switching when preference requires confirmation', () => {
    const routingDecision = buildResolvedRoutingDecision({
      content: 'fix the failing login test',
      requestedMode: 'ask',
      oversightLevel: 'review',
    })

    expect(buildAutoModeSwitchDecision({ routingDecision, policy: 'suggest' })).toMatchObject({
      action: 'suggest',
      fromMode: 'ask',
      toMode: 'code',
    })
  })
})

describe('buildResolvedRoutingDecision', () => {
  it('uses deterministic routing for automatic sends', () => {
    const decision = buildResolvedRoutingDecision({
      content: 'fix the failing login test',
      requestedMode: 'ask',
      oversightLevel: 'review',
    })

    expect(decision.requestedMode).toBe('ask')
    expect(decision.resolvedMode).toBe('code')
    expect(decision.source).toBe('deterministic_rules')
    expect(decision.suggestedSkills).toContain('debug')
  })

  it('routes natural-language planning requests out of Ask mode', () => {
    const decision = buildResolvedRoutingDecision({
      content: 'Create a comprehensive implementation pla of your findings',
      requestedMode: 'ask',
      oversightLevel: 'review',
    })

    expect(decision.requestedMode).toBe('ask')
    expect(decision.resolvedMode).toBe('plan')
    expect(decision.confidence).toBe('high')
  })

  it('preserves explicitly selected modes as manual overrides', () => {
    const decision = buildResolvedRoutingDecision({
      content: 'fix the failing login test',
      requestedMode: 'ask',
      oversightLevel: 'review',
      manualOverride: true,
    })

    expect(decision.requestedMode).toBe('ask')
    expect(decision.resolvedMode).toBe('ask')
    expect(decision.source).toBe('manual_override')
    expect(decision.webcontainerRequired).toBe(false)
  })
})
