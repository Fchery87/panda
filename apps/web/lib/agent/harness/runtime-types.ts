import type {
  AgentConfig,
  FinishReason,
  HarnessSubagentSummary,
  Identifier,
  RuntimeHarnessPolicySnapshot,
  RuntimeSnapshotEvent,
  ToolInterruptRequest,
  ToolInterruptResult,
  ToolRiskTier,
} from './types'
import type { FormalSpecification, SpecTier } from '../spec/types'
import type { ToolCall } from '../../llm/types'
import type { TerminationReason } from './errors'
import type { AppliedSkillSummary } from '../skills/applied-skills'

export interface ToolExecutionContext {
  sessionID: Identifier
  messageID: Identifier
  agent: AgentConfig
  abortSignal: AbortSignal
  metadata: (data: Record<string, unknown>) => void
  ask: (question: string) => Promise<string>
}

export type ToolExecutor = (
  args: Record<string, unknown>,
  ctx: ToolExecutionContext
) => Promise<{ output: string; error?: string; metadata?: Record<string, unknown> }>

export type RuntimeEventType =
  | 'status'
  | 'text'
  | 'reasoning'
  | 'tool_call'
  | 'tool_result'
  | 'subagent_start'
  | 'subagent_complete'
  | 'subagent_summary'
  | 'step_start'
  | 'step_finish'
  | 'compaction'
  | 'permission_request'
  | 'permission_decision'
  | 'interrupt_request'
  | 'interrupt_decision'
  | 'snapshot'
  | 'applied_skills'
  | 'strict_skill_preflight'
  | 'error'
  | 'warning'
  | 'complete'
  | 'spec_pending_approval'
  | 'spec_generated'
  | 'spec_verification'
  | 'drift_detected'

export interface RuntimeEvent {
  type: RuntimeEventType
  content?: string
  compaction?: { phase: 'start' | 'deferred' | 'complete' }
  reasoningContent?: string
  toolCall?: ToolCall
  toolResult?: {
    toolCallId: string
    toolName: string
    args: Record<string, unknown>
    output: string
    error?: string
    durationMs: number
  }
  interrupt?: {
    toolName: string
    riskTier: ToolRiskTier
    decision?: 'approve' | 'reject' | 'edit'
    reason?: string
  }
  snapshot?: RuntimeSnapshotEvent
  appliedSkills?: AppliedSkillSummary[]
  strictSkillPreflight?: { skills: AppliedSkillSummary[] }
  subagent?: {
    agent: string
    sessionID: Identifier
    id?: string
    success?: boolean
    error?: string
  }
  subagentSummary?: HarnessSubagentSummary
  step?: number
  finishReason?: FinishReason
  usage?: { input: number; output: number; reasoning: number }
  cost?: number
  error?: string
  terminationReason?: TerminationReason
  message?: string
  pluginName?: string
  hookType?: string
  spec?: FormalSpecification
  tier?: SpecTier
  reconcile?: { aligned: boolean; reason: string; gate?: string; detail?: string }
  verification?: {
    passed: boolean
    results: Array<{ criterionId: string; passed: boolean; message?: string }>
  }
  drift?: { specId: string; findings: Array<{ filePath: string; description: string }> }
  permission?: {
    tool: string
    capability: string
    target?: string
    decision: 'allow' | 'ask' | 'deny'
    source?: string
    ruleId?: string
    reason: string
    mode: string
    agentId: string
    commandFamily?: string
    targetKind?: string
    unattended?: boolean
    denialReason?: 'unattended_permission_denied'
  }
}

export type RuntimeInterruptRequest = ToolInterruptRequest
export type RuntimeInterruptResult = ToolInterruptResult
export type RuntimePolicySnapshot = RuntimeHarnessPolicySnapshot
