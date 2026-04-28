import { describe, expect, test } from 'bun:test'
import { buildModeTransitionRitual, CHAT_MODE_CONFIGS } from './chat-modes'

describe('ModeContract', () => {
  test('each mode declares requiresToolCalls', () => {
    for (const [id, cfg] of Object.entries(CHAT_MODE_CONFIGS)) {
      expect(typeof cfg.requiresToolCalls === 'boolean').toBe(true)
      void `${id} missing requiresToolCalls`
    }
  })

  test('ask and plan do not require tool calls', () => {
    expect(CHAT_MODE_CONFIGS.ask.requiresToolCalls).toBe(false)
    expect(CHAT_MODE_CONFIGS.plan.requiresToolCalls).toBe(false)
  })

  test('code and build require tool calls', () => {
    expect(CHAT_MODE_CONFIGS.code.requiresToolCalls).toBe(true)
    expect(CHAT_MODE_CONFIGS.build.requiresToolCalls).toBe(true)
  })

  test('each mode declares outputFormat', () => {
    const valid = new Set(['conversational', 'action-log'])
    for (const [id, cfg] of Object.entries(CHAT_MODE_CONFIGS)) {
      expect(valid.has(cfg.outputFormat)).toBe(true)
      void `${id} has invalid outputFormat`
    }
  })

  test('build mode has a handoff ritual', () => {
    expect(CHAT_MODE_CONFIGS.code.handoffRitual).toBeDefined()
    expect(CHAT_MODE_CONFIGS.build.handoffRitual).toBeDefined()
  })

  test('builds a typed transition ritual with mode and context boundaries', () => {
    const ritual = buildModeTransitionRitual({
      fromMode: 'plan',
      toMode: 'build',
      approvedPlanId: 'plan-123',
      activeSpecId: 'spec-456',
    })

    expect(ritual.fromMode).toBe('plan')
    expect(ritual.toMode).toBe('build')
    expect(ritual.approvedPlanId).toBe('plan-123')
    expect(ritual.activeSpecId).toBe('spec-456')
    expect(ritual.systemMessage).toContain('Previous mode: plan')
    expect(ritual.systemMessage).toContain('Current mode: build')
    expect(ritual.systemMessage).toContain('Approved plan: plan-123')
    expect(ritual.systemMessage).toContain('Active spec: spec-456')
    expect(ritual.firstAction).toContain('call')
  })
})
