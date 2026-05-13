import type { ChatMode } from '@/lib/agent/chat-modes'

export type Decision = 'allow' | 'ask' | 'deny'
export type Capability =
  | 'read'
  | 'search'
  | 'edit'
  | 'exec'
  | 'plan_exit'
  | 'memory'
  | 'mcp'
  | 'task'

export type CommandFamily =
  | 'package-manager'
  | 'network'
  | 'git'
  | 'destructive'
  | 'remote-exec'
  | 'filesystem-write'
  | 'unknown'

export type PermissionRuleSource =
  | 'mode'
  | 'admin'
  | 'user'
  | 'project'
  | 'spec'
  | 'execution_contract'
  | 'session'

export const ALL_CAPABILITIES: readonly Capability[] = [
  'read',
  'search',
  'edit',
  'exec',
  'plan_exit',
  'memory',
  'mcp',
  'task',
] as const

export interface PermissionRule {
  /** Stable policy id for audit/proof when available. */
  id?: string
  capability: Capability | '*'
  /** file glob for edit capability, command prefix for exec capability */
  pattern?: string
  /** command-family governance constraint for exec capability */
  commandFamily?: CommandFamily
  decision: Decision
  /** surfaced in denial/approval messages */
  reason?: string
  source: PermissionRuleSource
}

export interface PermissionContext {
  capability: Capability
  /** file path for edit, command string for exec */
  target?: string
  /** command family for exec governance rules */
  commandFamily?: CommandFamily
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
