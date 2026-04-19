import type { FormalSpecification } from '../spec/types'
import type { Identifier, Message, RuntimeConfig } from './types'
import type {
  RuntimeCheckpointPendingSubtask,
  RuntimeCheckpointState,
  RuntimeCheckpointLegacyToolCallFrequencyEntry,
} from './checkpoint-store'

export interface RuntimeCheckpointSerializableState {
  sessionID: Identifier
  messages: Message[]
  step: number
  isComplete: boolean
  isLastStep: boolean
  pendingSubtasks: RuntimeCheckpointPendingSubtask[]
  cost: number
  tokens: {
    input: number
    output: number
    reasoning: number
    cacheRead?: number
    cacheWrite?: number
  }
  lastToolLoopSignature: string | null
  toolLoopStreak: number
  toolCallHistory: string[]
  toolCallFrequency: Map<string, number>
  cyclicPatternDetected: boolean
  lastInterventionStep: number
  checkpointMessageSnapshot: Message[] | null
  messagesDirtySinceCheckpoint: boolean
  consecutiveCompactionFailures: number
  consecutiveNarrationTurns: number
  activeSpec?: FormalSpecification
}

export function normalizeCheckpointToolCallFrequency(
  entries: RuntimeCheckpointState['toolCallFrequency']
): Array<{ key: string; count: number }> {
  return (entries ?? []).flatMap((entry) => {
    if (Array.isArray(entry)) {
      const [key, count] = entry as RuntimeCheckpointLegacyToolCallFrequencyEntry
      return typeof key === 'string' && typeof count === 'number' ? [{ key, count }] : []
    }

    return typeof entry?.key === 'string' && typeof entry.count === 'number' ? [entry] : []
  })
}

export function serializeRuntimeCheckpointState(
  state: RuntimeCheckpointSerializableState
): RuntimeCheckpointState {
  const messages =
    state.messagesDirtySinceCheckpoint || !state.checkpointMessageSnapshot
      ? structuredClone(state.messages)
      : state.checkpointMessageSnapshot

  return {
    sessionID: state.sessionID,
    messages,
    step: state.step,
    isComplete: state.isComplete,
    isLastStep: state.isLastStep,
    pendingSubtasks: structuredClone(state.pendingSubtasks),
    cost: state.cost,
    tokens: { ...state.tokens },
    lastToolLoopSignature: state.lastToolLoopSignature,
    toolLoopStreak: state.toolLoopStreak,
    toolCallHistory: state.toolCallHistory,
    toolCallFrequency: Array.from(state.toolCallFrequency.entries()).map(([key, count]) => ({
      key,
      count,
    })),
    cyclicPatternDetected: state.cyclicPatternDetected,
    lastInterventionStep: state.lastInterventionStep,
    consecutiveCompactionFailures: state.consecutiveCompactionFailures,
    consecutiveNarrationTurns: state.consecutiveNarrationTurns,
    activeSpec: state.activeSpec ? structuredClone(state.activeSpec) : undefined,
  }
}

export function restoreRuntimeCheckpointState(args: {
  checkpointState: RuntimeCheckpointState
  config: Partial<RuntimeConfig>
}): Omit<RuntimeCheckpointSerializableState, 'messagesDirtySinceCheckpoint'> & {
  messagesDirtySinceCheckpoint: false
} {
  const { checkpointState } = args

  return {
    sessionID: checkpointState.sessionID,
    messages: structuredClone(checkpointState.messages),
    step: checkpointState.step,
    isComplete: checkpointState.isComplete,
    isLastStep: checkpointState.isLastStep,
    pendingSubtasks: structuredClone(checkpointState.pendingSubtasks),
    cost: checkpointState.cost,
    tokens: { ...checkpointState.tokens },
    lastToolLoopSignature: checkpointState.lastToolLoopSignature,
    toolLoopStreak: checkpointState.toolLoopStreak,
    toolCallHistory: checkpointState.toolCallHistory ?? [],
    toolCallFrequency: new Map(
      normalizeCheckpointToolCallFrequency(checkpointState.toolCallFrequency).map(
        ({ key, count }) => [key, count]
      )
    ),
    cyclicPatternDetected: checkpointState.cyclicPatternDetected ?? false,
    lastInterventionStep: checkpointState.lastInterventionStep ?? -1,
    checkpointMessageSnapshot: structuredClone(checkpointState.messages),
    messagesDirtySinceCheckpoint: false,
    consecutiveCompactionFailures: checkpointState.consecutiveCompactionFailures ?? 0,
    consecutiveNarrationTurns: checkpointState.consecutiveNarrationTurns ?? 0,
    activeSpec: checkpointState.activeSpec
      ? structuredClone(checkpointState.activeSpec)
      : undefined,
  }
}
