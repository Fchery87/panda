import { describe, expect, it } from 'bun:test'

import { legacyPermissionsToRules } from './legacy-adapter'
import { evaluateHarnessPolicy, resolveHarnessPolicy } from './policy'
import type { PermissionContext } from './types'

function context(overrides: Partial<PermissionContext>): PermissionContext {
  return {
    capability: 'read',
    mode: 'code',
    agentId: 'agent-code',
    ...overrides,
  }
}

describe('Harness Policy resolver', () => {
  it('includes mode rules as the base policy layer', () => {
    const policy = resolveHarnessPolicy({ mode: 'ask', createdAt: 123 })

    expect(policy.version).toBe(1)
    expect(policy.mode).toBe('ask')
    expect(policy.rules.some((rule) => rule.source === 'mode' && rule.capability === 'read')).toBe(
      true
    )

    expect(
      evaluateHarnessPolicy(policy, context({ mode: 'ask', capability: 'read' })).decision
    ).toBe('allow')
    expect(
      evaluateHarnessPolicy(policy, context({ mode: 'ask', capability: 'edit' })).decision
    ).toBe('deny')
  })

  it('preserves admin deny as a ceiling over user and session allows', () => {
    const policy = resolveHarnessPolicy({
      mode: 'build',
      createdAt: 123,
      adminRules: [
        {
          id: 'admin-deny-exec',
          source: 'admin',
          capability: 'exec',
          decision: 'deny',
          reason: 'exec disabled by admin policy',
        },
      ],
      userRules: [
        {
          id: 'user-allow-exec',
          source: 'user',
          capability: 'exec',
          decision: 'allow',
          reason: 'user prefers exec',
        },
      ],
      sessionRules: [
        {
          id: 'session-allow-exec',
          source: 'session',
          capability: 'exec',
          decision: 'allow',
          reason: 'session approval',
        },
      ],
    })

    const result = evaluateHarnessPolicy(
      policy,
      context({ capability: 'exec', target: 'bun test' })
    )

    expect(result.decision).toBe('deny')
    expect(result.rule?.id).toBe('admin-deny-exec')
    expect(result.reason).toBe('exec disabled by admin policy')
  })

  it('allows user policy to make an admin allow stricter', () => {
    const policy = resolveHarnessPolicy({
      mode: 'build',
      createdAt: 123,
      adminRules: [
        {
          id: 'admin-allow-exec',
          source: 'admin',
          capability: 'exec',
          decision: 'allow',
          reason: 'exec allowed by admin ceiling',
        },
      ],
      userRules: [
        {
          id: 'user-ask-bun',
          source: 'user',
          capability: 'exec',
          pattern: 'bun *',
          decision: 'ask',
          reason: 'user wants package/script confirmation',
        },
      ],
    })

    const result = evaluateHarnessPolicy(
      policy,
      context({ capability: 'exec', target: 'bun test' })
    )

    expect(result.decision).toBe('ask')
    expect(result.rule?.id).toBe('user-ask-bun')
  })

  it('allows a session approval to satisfy an admin ask but not an admin deny', () => {
    const policy = resolveHarnessPolicy({
      mode: 'build',
      createdAt: 123,
      adminRules: [
        {
          id: 'admin-ask-network',
          source: 'admin',
          capability: 'exec',
          commandFamily: 'network',
          decision: 'ask',
          reason: 'network commands require approval',
        },
      ],
      sessionRules: [
        {
          id: 'session-allow-curl',
          source: 'session',
          capability: 'exec',
          pattern: 'curl **',
          decision: 'allow',
          reason: 'approved this run',
        },
      ],
    })

    const result = evaluateHarnessPolicy(
      policy,
      context({ capability: 'exec', target: 'curl https://example.com', commandFamily: 'network' })
    )

    expect(result.decision).toBe('allow')
    expect(result.rule?.id).toBe('session-allow-curl')
  })

  it('matches command-family rules only when the context family matches', () => {
    const policy = resolveHarnessPolicy({
      mode: 'build',
      createdAt: 123,
      adminRules: [
        {
          id: 'admin-ask-network',
          source: 'admin',
          capability: 'exec',
          commandFamily: 'network',
          decision: 'ask',
          reason: 'network commands require approval',
        },
      ],
    })

    expect(
      evaluateHarnessPolicy(
        policy,
        context({
          capability: 'exec',
          target: 'curl https://example.com',
          commandFamily: 'network',
        })
      ).decision
    ).toBe('ask')
    expect(
      evaluateHarnessPolicy(
        policy,
        context({ capability: 'exec', target: 'bun test', commandFamily: 'package-manager' })
      ).decision
    ).toBe('allow')
  })

  it('adapts legacy task permissions to the task capability', () => {
    const rules = legacyPermissionsToRules({ task: 'allow' }, 'session')

    expect(rules).toEqual([
      {
        capability: 'task',
        decision: 'allow',
        source: 'session',
      },
    ])
  })
})
