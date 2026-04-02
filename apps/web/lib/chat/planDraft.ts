import { extractBrainstormPhase, stripBrainstormPhaseMarker } from './brainstorming'
import type { ChatMode } from '../agent/prompt-library'
import {
  isGeneratedPlanArtifact,
  serializeGeneratedPlanArtifact,
  type GeneratedPlanArtifact,
} from '../planning/types'

export type AgentStatus =
  | 'idle'
  | 'thinking'
  | 'streaming'
  | 'executing_tools'
  | 'complete'
  | 'error'

export type PlanStatus =
  | 'idle'
  | 'drafting'
  | 'awaiting_review'
  | 'approved'
  | 'stale'
  | 'executing'
  | 'partial'
  | 'completed'
  | 'failed'

type PlanDraftSource = string | GeneratedPlanArtifact | null | undefined

function normalizePlanDraft(value: PlanDraftSource): string {
  if (typeof value === 'string') {
    return value.trim()
  }

  if (isGeneratedPlanArtifact(value)) {
    return serializeGeneratedPlanArtifact(value).trim()
  }

  return ''
}

export function buildMessageWithPlanDraft(
  planDraft: PlanDraftSource,
  userContent: string,
  previousMessages?: Array<{ role: string; content: string }>
): string {
  const plan = normalizePlanDraft(planDraft)
  if (!plan) return userContent

  // Avoid re-prefixing if we already included a plan block.
  if (userContent.startsWith('Plan draft:\n')) return userContent
  if (userContent.includes('\nPlan draft:\n') || userContent.startsWith('Plan draft:'))
    return userContent

  // Avoid appending if the exact same plan draft was already sent in history
  if (previousMessages && previousMessages.length > 0) {
    const planTextSnippet = `Plan draft:\n${plan}`
    for (const msg of previousMessages) {
      if (msg.role === 'user' && msg.content.includes(planTextSnippet)) {
        return userContent
      }
    }
  }

  return `Plan draft:\n${plan}\n\nUser request:\n${userContent}`
}

export function buildApprovedPlanExecutionMessage(
  planDraft: PlanDraftSource,
  originalRequest = 'Execute the approved plan.'
): string {
  const normalizedPlan = normalizePlanDraft(planDraft)
  if (!normalizedPlan) return originalRequest

  return `We are switching from Architect (Plan Mode) to Build (Execute Mode).

Approved plan:
${normalizedPlan}

Execution contract:
- Treat the approved plan as the primary execution contract.
- Execute it step-by-step.
- Use the active specification as a secondary constraint if present.
- Report progress against the plan while implementing.

Original request:
${originalRequest}`
}

export function pickLatestArchitectAssistantPlan(
  messages: Array<{ role: 'user' | 'assistant'; mode: ChatMode; content: string }>
): string | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i]
    if (m.role === 'assistant' && m.mode === 'architect' && m.content.trim()) {
      return m.content
    }
  }
  return null
}

export function deriveNextPlanDraft({
  mode,
  agentStatus,
  currentPlanDraft,
  messages,
  requireValidatedBrainstorm = false,
}: {
  mode: ChatMode
  agentStatus: AgentStatus
  currentPlanDraft: string | null | undefined
  messages: Array<{ role: 'user' | 'assistant'; mode: ChatMode; content: string }>
  requireValidatedBrainstorm?: boolean
}): string | null {
  if (mode !== 'architect') return null
  if (agentStatus !== 'complete') return null

  const latest = pickLatestArchitectAssistantPlan(messages)
  if (!latest) return null
  if (requireValidatedBrainstorm && extractBrainstormPhase(latest) !== 'validated_plan') {
    return null
  }

  const normalizedLatest = stripBrainstormPhaseMarker(latest).trim()
  if (!normalizedLatest) return null

  const current = currentPlanDraft?.trim() ?? ''
  if (current && current === normalizedLatest) return null

  return normalizedLatest
}

export function getNextPlanStatusAfterDraftChange(args: {
  previousDraft: PlanDraftSource
  nextDraft: PlanDraftSource
  currentStatus: PlanStatus | null | undefined
}): PlanStatus {
  const previousDraft = normalizePlanDraft(args.previousDraft)
  const nextDraft = normalizePlanDraft(args.nextDraft)
  const currentStatus = args.currentStatus ?? 'idle'

  if (previousDraft === nextDraft) {
    return currentStatus
  }

  if (
    currentStatus === 'approved' ||
    currentStatus === 'executing' ||
    currentStatus === 'partial' ||
    currentStatus === 'completed' ||
    currentStatus === 'failed'
  ) {
    return 'stale'
  }

  return nextDraft ? 'drafting' : 'idle'
}

export function getNextPlanStatusAfterGeneration(args: {
  previousDraft: PlanDraftSource
  nextDraft: PlanDraftSource
  currentStatus: PlanStatus | null | undefined
}): PlanStatus | null {
  const previousDraft = normalizePlanDraft(args.previousDraft)
  const nextDraft = normalizePlanDraft(args.nextDraft)
  void args.currentStatus

  if (!nextDraft) return null
  if (previousDraft === nextDraft) return null
  return 'awaiting_review'
}

export function canApprovePlan(
  status: PlanStatus | null | undefined,
  planDraft: PlanDraftSource
): boolean {
  const normalizedDraft = normalizePlanDraft(planDraft)
  if (!normalizedDraft) return false
  return status === 'awaiting_review' || status === 'stale'
}

export function canBuildFromPlan(
  status: PlanStatus | null | undefined,
  planDraft: PlanDraftSource
): boolean {
  const normalizedDraft = normalizePlanDraft(planDraft)
  if (!normalizedDraft) return false
  return (
    status === 'approved' || status === 'executing' || status === 'partial' || status === 'failed'
  )
}
