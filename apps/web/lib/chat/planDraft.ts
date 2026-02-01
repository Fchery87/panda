export type ChatMode = 'discuss' | 'build'
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

export function pickLatestDiscussAssistantPlan(
  messages: Array<{ role: 'user' | 'assistant'; mode: ChatMode; content: string }>
): string | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i]
    if (m.role === 'assistant' && m.mode === 'discuss' && m.content.trim()) {
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
}: {
  mode: ChatMode
  agentStatus: AgentStatus
  currentPlanDraft: string | null | undefined
  messages: Array<{ role: 'user' | 'assistant'; mode: ChatMode; content: string }>
}): string | null {
  if (mode !== 'discuss') return null
  if (agentStatus !== 'complete') return null

  const latest = pickLatestDiscussAssistantPlan(messages)
  if (!latest) return null

  const current = currentPlanDraft?.trim() ?? ''
  if (current && current === latest.trim()) return null

  return latest
}
