export type TerminalAgentStatus = 'complete' | 'error'

export function reduceTerminalAgentEvent(
  state: {
    runFinalized: boolean
    terminalStatus: TerminalAgentStatus | null
  },
  eventType: TerminalAgentStatus
): {
  shouldProcess: boolean
  runFinalized: boolean
  terminalStatus: TerminalAgentStatus | null
} {
  if (state.runFinalized) {
    return {
      shouldProcess: false,
      runFinalized: true,
      terminalStatus: state.terminalStatus,
    }
  }

  return {
    shouldProcess: true,
    runFinalized: true,
    terminalStatus: eventType,
  }
}
