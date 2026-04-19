interface AgentStatusLike {
  error: string | null
  isLoading: boolean
}

interface BuildProjectWorkspaceDerivedStateParams {
  agent: AgentStatusLike
  isAnyJobRunning: boolean
  selectedModel: string
  uiSelectedModel?: string | null
}

export function buildProjectWorkspaceDerivedState({
  agent,
  isAnyJobRunning,
  selectedModel,
  uiSelectedModel,
}: BuildProjectWorkspaceDerivedStateParams) {
  const healthStatus = agent.error
    ? ('error' as const)
    : isAnyJobRunning || agent.isLoading
      ? ('issues' as const)
      : ('ready' as const)

  const healthDetail = agent.error
    ? 'Agent execution encountered an error'
    : agent.isLoading
      ? 'Agent is actively working'
      : isAnyJobRunning
        ? 'Background jobs are running'
        : 'Workspace systems nominal'

  const selectedChatModel = uiSelectedModel || selectedModel

  return {
    healthStatus,
    healthDetail,
    selectedChatModel,
  }
}
