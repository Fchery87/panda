import { wildcardMatch } from './wildcard'
import type { PermissionRule, PermissionContext, EvaluationResult, Capability } from './types'

/**
 * Evaluate a ruleset against a permission context using last-rule-wins semantics.
 * Rules are evaluated in order; the final matching rule wins.
 * If no rule matches, the default decision is 'ask'.
 */
export function evaluate(rules: PermissionRule[], ctx: PermissionContext): EvaluationResult {
  let match: PermissionRule | null = null

  for (const rule of rules) {
    // Capability match
    if (rule.capability !== '*' && rule.capability !== ctx.capability) continue

    // Pattern match (only applies when both rule.pattern and ctx.target are present)
    if (rule.pattern && ctx.target) {
      if (!wildcardMatch(rule.pattern, ctx.target)) continue
    } else if (rule.pattern && !ctx.target) {
      // Rule requires a target but context has none — skip
      continue
    }

    match = rule // last match wins — keep iterating
  }

  if (!match) {
    return { decision: 'ask', rule: null, reason: 'no matching rule — defaulting to ask' }
  }

  return {
    decision: match.decision,
    rule: match,
    reason: match.reason ?? `matched ${match.source} rule for ${match.capability}`,
  }
}

/**
 * Narrow a parent ruleset for a subagent by intersecting with the subagent's
 * declared capability ceiling. Subagents can never inherit more than their
 * maxCapabilities — prevents privilege escalation across agent boundaries.
 *
 * If maxCapabilities is undefined the parent rules are returned unchanged
 * (legacy agents without an explicit ceiling keep current behavior).
 */
export function narrowRulesForSubagent(
  parentRules: PermissionRule[],
  maxCapabilities: Capability[] | undefined
): PermissionRule[] {
  if (!maxCapabilities || maxCapabilities.length === 0) return parentRules

  const allowed = new Set<Capability>(maxCapabilities)

  // Keep rules that are either wildcard or within the allowed ceiling
  const narrowed = parentRules.filter(
    (r) => r.capability === '*' || allowed.has(r.capability as Capability)
  )

  // Append explicit deny rules for any capability NOT in the ceiling
  const allCapabilities: Capability[] = [
    'read',
    'search',
    'edit',
    'exec',
    'plan_exit',
    'memory',
    'mcp',
  ]
  const extraDenies: PermissionRule[] = allCapabilities
    .filter((cap) => !allowed.has(cap))
    .map((cap) => ({
      capability: cap,
      decision: 'deny' as const,
      source: 'session' as const,
      reason: `capability ${cap} exceeds subagent ceiling`,
    }))

  return [...narrowed, ...extraDenies]
}
