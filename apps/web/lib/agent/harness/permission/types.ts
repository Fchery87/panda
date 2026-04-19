import type { ChatMode } from '@/lib/agent/chat-modes'

export type Decision = 'allow' | 'ask' | 'deny'
export type Capability = 'read' | 'search' | 'edit' | 'exec' | 'plan_exit' | 'memory' | 'mcp'

export const ALL_CAPABILITIES: readonly Capability[] = [
  'read',
  'search',
  'edit',
  'exec',
  'plan_exit',
  'memory',
  'mcp',
] as const

export interface PermissionRule {
  capability: Capability | '*'
  /** file glob for edit capability, command prefix for exec capability */
  pattern?: string
  decision: Decision
  /** surfaced in denial/approval messages */
  reason?: string
  source: 'mode' | 'spec' | 'user' | 'project' | 'session'
}

export interface PermissionContext {
  capability: Capability
  /** file path for edit, command string for exec */
  target?: string
  mode: ChatMode
  specId?: string
  agentId: string
}

/** Result returned by evaluate() — distinct from harness/types.ts PermissionDecision string enum */
export interface EvaluationResult {
  decision: Decision
  rule: PermissionRule | null
  reason: string
}
