import type { ChatMode } from '@/lib/agent/chat-modes'
import type { PermissionRule } from '@/lib/agent/harness/permission/types'

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

export { DEFAULT_RULES }
