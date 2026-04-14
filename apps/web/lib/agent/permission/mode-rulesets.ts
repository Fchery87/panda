import type { ChatMode } from '@/lib/agent/chat-modes'
import type { PermissionRule } from '@/lib/agent/harness/permission/types'
import type { ForgePhase } from '@/lib/forge/types'

/**
 * Default permission rules for each chat mode.
 * Rules are evaluated in order with last-rule-wins semantics.
 * A wildcard capability rule ('*') acts as a catch-all.
 */
const DEFAULT_RULES: Record<ChatMode, PermissionRule[]> = {
  ask: [
    { capability: '*',       decision: 'deny',  source: 'mode', reason: 'ask mode is read-only' },
    { capability: 'read',    decision: 'allow', source: 'mode' },
    { capability: 'search',  decision: 'allow', source: 'mode' },
  ],
  architect: [
    { capability: '*',         decision: 'deny',  source: 'mode', reason: 'architect mode is read-only' },
    { capability: 'read',      decision: 'allow', source: 'mode' },
    { capability: 'search',    decision: 'allow', source: 'mode' },
    { capability: 'memory',    decision: 'allow', source: 'mode' },
    { capability: 'plan_exit', decision: 'ask',   source: 'mode', reason: 'plan exit requires user confirmation' },
  ],
  code: [
    { capability: 'read',    decision: 'allow', source: 'mode' },
    { capability: 'search',  decision: 'allow', source: 'mode' },
    { capability: 'memory',  decision: 'allow', source: 'mode' },
    { capability: 'edit',    decision: 'ask',   source: 'mode', reason: 'file writes require approval in code mode' },
    { capability: 'exec',    decision: 'ask',   source: 'mode', reason: 'commands require approval in code mode' },
  ],
  build: [
    { capability: '*',    decision: 'allow', source: 'mode' },
    // Dangerous commands still require approval even in build mode
    { capability: 'exec', decision: 'ask',   source: 'mode', pattern: 'rm *',       reason: 'rm commands require approval' },
    { capability: 'exec', decision: 'ask',   source: 'mode', pattern: 'rm -rf *',   reason: 'rm -rf commands require approval' },
    { capability: 'exec', decision: 'ask',   source: 'mode', pattern: 'git push*',  reason: 'git push requires approval' },
  ],
}

/**
 * Returns the ordered permission rules for the given chat mode.
 * Rules should be evaluated with last-rule-wins semantics via evaluate().
 */
export function rulesForMode(mode: ChatMode): PermissionRule[] {
  return DEFAULT_RULES[mode]
}

/**
 * Returns base mode rules plus Forge phase-aware overrides.
 * During review, qa, and ship phases, edit and destructive exec
 * commands are denied to prevent uncontrolled writes.
 */
export function resolveRulesForPhase(
  mode: ChatMode,
  context: { forgePhase?: ForgePhase }
): PermissionRule[] {
  const base = rulesForMode(mode)
  if (!context.forgePhase) return base

  const readonlyPhases: ForgePhase[] = ['review', 'qa', 'ship']
  if (!readonlyPhases.includes(context.forgePhase)) return base

  return [
    {
      capability: 'edit',
      decision: 'deny',
      source: `forge-phase:${context.forgePhase}` as PermissionRule['source'],
      reason: `file writes denied during ${context.forgePhase} phase`,
    },
    {
      capability: 'exec',
      pattern: 'rm *',
      decision: 'deny',
      source: `forge-phase:${context.forgePhase}` as PermissionRule['source'],
      reason: `destructive commands denied during ${context.forgePhase} phase`,
    },
    {
      capability: 'exec',
      pattern: 'rm -rf *',
      decision: 'deny',
      source: `forge-phase:${context.forgePhase}` as PermissionRule['source'],
      reason: `destructive commands denied during ${context.forgePhase} phase`,
    },
    ...base,
  ]
}

export { DEFAULT_RULES }
