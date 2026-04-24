export type RuntimeCheckpointSummary = {
  _id: string
  runId?: string
  chatId?: string
  sessionID?: string
  reason?: 'step' | 'complete' | 'error'
  savedAt?: number
  agentName?: string
  version?: number
}

function checkpointTime(checkpoint: RuntimeCheckpointSummary): number {
  return typeof checkpoint.savedAt === 'number' ? checkpoint.savedAt : 0
}

export function findLatestRecoverableCheckpoint(
  summaries: readonly RuntimeCheckpointSummary[] | null | undefined
): RuntimeCheckpointSummary | null {
  const latestBySession = new Map<string, RuntimeCheckpointSummary>()

  for (const summary of summaries ?? []) {
    if (!summary.sessionID) continue

    const latest = latestBySession.get(summary.sessionID)
    if (!latest || checkpointTime(summary) > checkpointTime(latest)) {
      latestBySession.set(summary.sessionID, summary)
    }
  }

  let latestRecoverable: RuntimeCheckpointSummary | null = null
  for (const summary of latestBySession.values()) {
    if (summary.reason === 'complete') continue
    if (!latestRecoverable || checkpointTime(summary) > checkpointTime(latestRecoverable)) {
      latestRecoverable = summary
    }
  }

  return latestRecoverable
}
