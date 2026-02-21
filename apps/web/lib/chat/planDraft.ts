import { extractBrainstormPhase, stripBrainstormPhaseMarker } from './brainstorming'
import type { ChatMode } from '../agent/prompt-library'

export type AgentStatus =
  | 'idle'
  | 'thinking'
  | 'streaming'
  | 'executing_tools'
  | 'complete'
  | 'error'

export function buildMessageWithPlanDraft(
  planDraft: string | null | undefined,
  userContent: string
): string {
  const plan = planDraft?.trim()
  if (!plan) return userContent

  // Avoid re-prefixing if we already included a plan block.
  if (userContent.startsWith('Plan draft:\n')) return userContent
  if (userContent.includes('\nPlan draft:\n') || userContent.startsWith('Plan draft:'))
    return userContent

  return `Plan draft:\n${plan}\n\nUser request:\n${userContent}`
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
