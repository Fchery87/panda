import type { AgentConfig, Identifier, Message, SubtaskPart } from './types'
import type { FormalSpecification } from '../spec/types'

export interface RuntimeCheckpointPendingSubtask {
  part: SubtaskPart
  parentAgent: AgentConfig
  description: string
  toolCallId?: string
  input?: Record<string, unknown>
  startedAt?: number
}

export interface RuntimeCheckpointToolCallFrequencyEntry {
  key: string
  count: number
}

export type RuntimeCheckpointLegacyToolCallFrequencyEntry = [string, number]

export interface RuntimeCheckpointState {
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
  toolCallHistory?: string[]
  toolCallFrequency?: Array<
    RuntimeCheckpointToolCallFrequencyEntry | RuntimeCheckpointLegacyToolCallFrequencyEntry
  >
  cyclicPatternDetected?: boolean
  lastInterventionStep?: number
  consecutiveCompactionFailures?: number
  consecutiveNarrationTurns?: number
  activeSpec?: FormalSpecification
}

export type RuntimeCheckpointReason = 'step' | 'complete' | 'error'

export interface RuntimeCheckpoint {
  version: 1
  sessionID: Identifier
  agentName: string
  reason: RuntimeCheckpointReason
  savedAt: number
  state: RuntimeCheckpointState
}

export interface CheckpointStore {
  save(checkpoint: RuntimeCheckpoint): Promise<void> | void
  load(sessionID: Identifier): Promise<RuntimeCheckpoint | null> | RuntimeCheckpoint | null
}

function cloneCheckpoint<T>(value: T): T {
  return structuredClone(value)
}

export class InMemoryCheckpointStore implements CheckpointStore {
  private checkpoints = new Map<Identifier, RuntimeCheckpoint[]>()

  save(checkpoint: RuntimeCheckpoint): void {
    const history = this.checkpoints.get(checkpoint.sessionID) ?? []
    history.push(cloneCheckpoint(checkpoint))
    this.checkpoints.set(checkpoint.sessionID, history)
  }

  load(sessionID: Identifier): RuntimeCheckpoint | null {
    const history = this.checkpoints.get(sessionID)
    if (!history || history.length === 0) {
      return null
    }
    return cloneCheckpoint(history[history.length - 1])
  }

  list(sessionID: Identifier): RuntimeCheckpoint[] {
    return (this.checkpoints.get(sessionID) ?? []).map((checkpoint) => cloneCheckpoint(checkpoint))
  }
}
