import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'

import type { CheckpointStore, RuntimeCheckpoint } from './checkpoint-store'

type SaveRuntimeCheckpointArgs = {
  checkpoint: RuntimeCheckpoint
  runId?: Id<'agentRuns'>
  chatId?: Id<'chats'>
}

type LoadRuntimeCheckpointArgs = {
  sessionID: string
  runId?: Id<'agentRuns'>
  chatId?: Id<'chats'>
  projectId?: Id<'projects'>
}

type ConvexClientLike = {
  query: (func: unknown, args: LoadRuntimeCheckpointArgs) => Promise<unknown>
  mutation: (func: unknown, args: SaveRuntimeCheckpointArgs) => Promise<unknown>
}

type AgentRunsRuntimeCheckpointApiRef = {
  agentRuns: {
    saveRuntimeCheckpoint: unknown
    getLatestRuntimeCheckpoint: unknown
  }
}

const typedHarnessApi = api as typeof api & AgentRunsRuntimeCheckpointApiRef

export interface ConvexCheckpointStoreScope {
  runId?: Id<'agentRuns'>
  chatId?: Id<'chats'>
  projectId?: Id<'projects'>
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isRuntimeCheckpoint(value: unknown): value is RuntimeCheckpoint {
  if (!isRecord(value)) return false
  if (value.version !== 1) return false
  if (typeof value.sessionID !== 'string') return false
  if (typeof value.agentName !== 'string') return false
  if (value.reason !== 'step' && value.reason !== 'complete' && value.reason !== 'error')
    return false
  if (typeof value.savedAt !== 'number') return false
  if (!isRecord(value.state)) return false
  return typeof value.state.sessionID === 'string'
}

export class ConvexCheckpointStore implements CheckpointStore {
  constructor(
    private readonly convex: ConvexClientLike,
    private readonly scope: ConvexCheckpointStoreScope
  ) {}

  async save(checkpoint: RuntimeCheckpoint): Promise<void> {
    if (!this.scope.runId && !this.scope.chatId) {
      throw new Error('ConvexCheckpointStore.save requires scope.runId or scope.chatId')
    }

    const args: SaveRuntimeCheckpointArgs = {
      checkpoint,
      ...(this.scope.runId ? { runId: this.scope.runId } : {}),
      ...(this.scope.chatId ? { chatId: this.scope.chatId } : {}),
    }

    await this.convex.mutation(typedHarnessApi.agentRuns.saveRuntimeCheckpoint, args)
  }

  async load(sessionID: string): Promise<RuntimeCheckpoint | null> {
    const args: LoadRuntimeCheckpointArgs = {
      sessionID,
      ...(this.scope.runId ? { runId: this.scope.runId } : {}),
      ...(this.scope.chatId ? { chatId: this.scope.chatId } : {}),
      ...(this.scope.projectId ? { projectId: this.scope.projectId } : {}),
    }

    const result = await this.convex.query(
      typedHarnessApi.agentRuns.getLatestRuntimeCheckpoint,
      args
    )
    if (result == null) return null
    if (!isRuntimeCheckpoint(result)) {
      throw new Error('Invalid runtime checkpoint payload returned from Convex')
    }
    return result
  }
}
