import type { ChatMode } from '../chat-modes'
import type { GeneratedPlanArtifact } from '../../planning/types'
import type { ChatMessage } from './session-summary'

export type HandoffKind =
  | 'latest_plan'
  | 'approved_plan'
  | 'latest_audit'
  | 'latest_assistant_output'
  | 'session_summary'

export type HandoffConfidence = 'high' | 'medium' | 'low'

export interface ModeHandoffPacket {
  fromMode: ChatMode | null
  toMode: ChatMode
  kind: HandoffKind
  title: string
  content: string
  sourceMessageId?: string
  planningSessionId?: string
  confidence: HandoffConfidence
  reason: string
}

export interface UnresolvedModeHandoff {
  unresolved: true
  reason: string
  referent: 'plan' | 'audit' | 'context'
}

export type ModeHandoffResolution =
  | { unresolved: false; packet?: ModeHandoffPacket }
  | UnresolvedModeHandoff

export interface ReferentialRequest {
  refersToPlan: boolean
  refersToAudit: boolean
  refersToPriorContext: boolean
}

const PLAN_RE =
  /\b(this|the|that|above|latest|previous|approved)\s+(plan|proposal|implementation plan|markdown)|\b(plan)\s+(above|we created|you created)|\bimplement\s+(it|this|the plan)|\bsave\s+(this|the|that)\s+plan/i
const AUDIT_RE =
  /\b(this|the|that|your|latest|previous)\s+(audit|review|findings|recommendations|analysis)|\b(use|based on|from)\s+(your\s+)?(audit|review|findings|recommendations)/i
const PRIOR_RE = /\b(this|that|it|above|previous|earlier|what you just|as discussed)\b/i

export function detectReferentialRequest(content: string): ReferentialRequest {
  const text = content ?? ''
  const refersToPlan = PLAN_RE.test(text)
  const refersToAudit = AUDIT_RE.test(text)
  return {
    refersToPlan,
    refersToAudit,
    refersToPriorContext: refersToPlan || refersToAudit || PRIOR_RE.test(text),
  }
}

export function findLatestAssistantMessageByMode(
  messages: ChatMessage[],
  mode: ChatMode | ChatMode[]
): ChatMessage | undefined {
  const modes = Array.isArray(mode) ? mode : [mode]
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index]
    const messageMode = message?.mode
    if (
      message?.role === 'assistant' &&
      (messageMode === 'ask' ||
        messageMode === 'plan' ||
        messageMode === 'code' ||
        messageMode === 'build') &&
      modes.includes(messageMode) &&
      message.content?.trim()
    ) {
      return message
    }
  }
  return undefined
}

function formatApprovedPlan(plan: GeneratedPlanArtifact): string {
  const sections = [...(plan.sections ?? [])]
    .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id))
    .map((section) => `## ${section.title}\n${section.content}`)
    .join('\n\n')
  return [
    `# ${plan.title}`,
    plan.summary,
    sections,
    plan.acceptanceChecks?.length
      ? `## Acceptance Checks\n${plan.acceptanceChecks.map((check) => `- ${check}`).join('\n')}`
      : '',
  ]
    .filter((part) => part?.trim())
    .join('\n\n')
}

function trimHandoffContent(content: string, max = 12000): string {
  const normalized = content.trim()
  if (normalized.length <= max) return normalized
  return `${normalized.slice(0, max)}\n\n[Handoff content truncated to ${max} characters.]`
}

export function resolveModeHandoff(args: {
  targetMode: ChatMode
  userContent: string
  messages: ChatMessage[]
  approvedPlanExecutionContext?: { sessionId: string; plan: GeneratedPlanArtifact }
}): ModeHandoffResolution {
  const targetIsAgentRuntime = args.targetMode === 'code' || args.targetMode === 'build'
  if (!targetIsAgentRuntime) return { unresolved: false }

  const refs = detectReferentialRequest(args.userContent)

  if (args.approvedPlanExecutionContext) {
    return {
      unresolved: false,
      packet: {
        fromMode: 'plan',
        toMode: args.targetMode,
        kind: 'approved_plan',
        title: args.approvedPlanExecutionContext.plan.title || 'Approved plan',
        content: trimHandoffContent(formatApprovedPlan(args.approvedPlanExecutionContext.plan)),
        planningSessionId: args.approvedPlanExecutionContext.sessionId,
        confidence: 'high',
        reason:
          'An approved structured plan is available and takes precedence over inferred chat context.',
      },
    }
  }

  if (refs.refersToPlan) {
    const latestPlan = findLatestAssistantMessageByMode(args.messages, 'plan')
    if (!latestPlan) {
      return {
        unresolved: true,
        referent: 'plan',
        reason: 'The request refers to a plan, but no prior Plan-mode assistant output was found.',
      }
    }
    return {
      unresolved: false,
      packet: {
        fromMode: 'plan',
        toMode: args.targetMode,
        kind: 'latest_plan',
        title: 'Latest Plan-mode response',
        content: trimHandoffContent(latestPlan.content),
        confidence: 'high',
        reason: 'User referred to the current/latest plan.',
      },
    }
  }

  if (refs.refersToAudit) {
    const latestAudit = findLatestAssistantMessageByMode(args.messages, 'ask')
    if (!latestAudit) {
      return {
        unresolved: true,
        referent: 'audit',
        reason:
          'The request refers to an audit/review/findings, but no prior Ask-mode assistant output was found.',
      }
    }
    return {
      unresolved: false,
      packet: {
        fromMode: 'ask',
        toMode: args.targetMode,
        kind: 'latest_audit',
        title: 'Latest Ask-mode audit/findings',
        content: trimHandoffContent(latestAudit.content),
        confidence: 'high',
        reason: 'User referred to previous audit/findings/recommendations.',
      },
    }
  }

  return { unresolved: false }
}

export function formatModeHandoffForPrompt(packet: ModeHandoffPacket): string {
  return [
    '## Mode Handoff Context',
    `Previous mode: ${packet.fromMode ?? 'unknown'}`,
    `Current runtime mode: ${packet.toMode}`,
    `Handoff kind: ${packet.kind}`,
    `Confidence: ${packet.confidence}`,
    `Reason: ${packet.reason}`,
    packet.planningSessionId ? `Planning session: ${packet.planningSessionId}` : '',
    '',
    '### Handoff Content',
    packet.content,
  ]
    .filter((line) => line !== '')
    .join('\n')
}
