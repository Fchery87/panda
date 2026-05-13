import type { ChatMode } from '@/lib/agent/chat-modes'
import { resolveRulesForPhase } from '@/lib/agent/permission/mode-rulesets'

import { evaluate } from './evaluate'
import { legacyPermissionsToRules } from './legacy-adapter'
import type { Decision, PermissionContext, PermissionRule, PermissionRuleSource } from './types'
import type { Permission as LegacyPermission } from '../types'

export type HarnessPolicySource = PermissionRuleSource
export type HarnessPolicyDecision = Decision
export type HarnessPolicyRule = PermissionRule & { id: string }

export interface ResolvedHarnessPolicy {
  version: 1
  mode: ChatMode
  runId?: string
  rules: PermissionRule[]
  unattendedDefaultDecision: Extract<Decision, 'allow' | 'deny'>
  createdAt: number
}

export interface ResolveHarnessPolicyInput {
  mode: ChatMode
  runId?: string
  adminRules?: PermissionRule[]
  userRules?: PermissionRule[]
  executionContractRules?: PermissionRule[]
  sessionRules?: PermissionRule[]
  legacySessionPermissions?: LegacyPermission
  unattendedDefaultDecision?: Extract<Decision, 'allow' | 'deny'>
  createdAt?: number
}

function rulesBySource(
  rules: readonly PermissionRule[],
  source: PermissionRuleSource
): PermissionRule[] {
  return rules.filter((rule) => rule.source === source)
}

function isSessionAllow(result: ReturnType<typeof evaluate>): boolean {
  return result.decision === 'allow' && result.rule?.source === 'session'
}

function isStricterThanAllow(decision: Decision): boolean {
  return decision === 'ask' || decision === 'deny'
}

/**
 * Resolve the immutable run-scoped Harness Policy snapshot.
 *
 * This composes policy layers but does not apply admin-ceiling semantics by
 * itself. Use evaluateHarnessPolicy() for enforcement-aware evaluation.
 */
export function resolveHarnessPolicy(input: ResolveHarnessPolicyInput): ResolvedHarnessPolicy {
  const modeRules = resolveRulesForPhase(input.mode)
  const legacySessionRules = input.legacySessionPermissions
    ? legacyPermissionsToRules(input.legacySessionPermissions, 'session')
    : []

  return {
    version: 1,
    mode: input.mode,
    ...(input.runId ? { runId: input.runId } : {}),
    rules: [
      ...modeRules,
      ...(input.adminRules ?? []),
      ...(input.userRules ?? []),
      ...(input.executionContractRules ?? []),
      ...legacySessionRules,
      ...(input.sessionRules ?? []),
    ],
    unattendedDefaultDecision: input.unattendedDefaultDecision ?? 'deny',
    createdAt: input.createdAt ?? Date.now(),
  }
}

/**
 * Evaluate a resolved Harness Policy while preserving the admin ceiling.
 *
 * The generic evaluator is intentionally last-rule-wins for compatibility.
 * Harness Policy needs an additional invariant: user/session/execution rules may
 * make behavior stricter, but they may not weaken an admin deny. An admin ask can
 * only be satisfied by a concrete session approval, not by a persistent user
 * allow.
 */
export function evaluateHarnessPolicy(
  policy: ResolvedHarnessPolicy,
  ctx: PermissionContext
): ReturnType<typeof evaluate> {
  const adminResult = evaluate(rulesBySource(policy.rules, 'admin'), ctx)
  const hasAdminMatch = adminResult.rule !== null

  if (!hasAdminMatch) {
    return evaluate(policy.rules, ctx)
  }

  if (adminResult.decision === 'deny') {
    return adminResult
  }

  const nonAdminRules = policy.rules.filter((rule) => rule.source !== 'admin')
  const nonAdminResult = evaluate(nonAdminRules, ctx)
  const hasNonAdminMatch = nonAdminResult.rule !== null

  if (adminResult.decision === 'ask') {
    if (isSessionAllow(nonAdminResult)) {
      return nonAdminResult
    }

    if (hasNonAdminMatch && nonAdminResult.decision === 'deny') {
      return nonAdminResult
    }

    return adminResult
  }

  if (adminResult.decision === 'allow') {
    if (hasNonAdminMatch && isStricterThanAllow(nonAdminResult.decision)) {
      return nonAdminResult
    }

    if (hasNonAdminMatch && nonAdminResult.decision === 'allow') {
      return nonAdminResult
    }
  }

  return adminResult
}
