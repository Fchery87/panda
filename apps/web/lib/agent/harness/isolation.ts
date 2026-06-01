import type {
  AgentConfig,
  Identifier,
  RuntimeConfig,
  SubagentIsolationAdapter,
  SubagentIsolationMode,
  SubagentIsolationScope,
} from './types'
import { isMutatingPermissionSet } from '../subagents/presets'

const SHARED_READONLY: SubagentIsolationMode = 'shared-readonly'
const PATCH_PROPOSAL: SubagentIsolationMode = 'patch-proposal'

export interface SubagentIsolationSelectionInput {
  agent?: AgentConfig
  config?: Pick<RuntimeConfig, 'defaultSubagentIsolationMode' | 'availableSubagentIsolationModes'>
}

export function selectSubagentIsolationMode({
  agent,
  config,
}: SubagentIsolationSelectionInput): SubagentIsolationMode {
  const requested =
    agent?.defaultIsolationMode ?? config?.defaultSubagentIsolationMode ?? SHARED_READONLY
  const available = new Set(config?.availableSubagentIsolationModes ?? [SHARED_READONLY])

  if (available.has(requested)) return requested

  if (agent && isMutatingPermissionSet(agent.permission)) {
    return available.has(PATCH_PROPOSAL) ? PATCH_PROPOSAL : SHARED_READONLY
  }

  return SHARED_READONLY
}

export function isSubagentMutating(agent?: AgentConfig): boolean {
  return Boolean(agent && isMutatingPermissionSet(agent.permission))
}

export function canRunMutatingSubagentsConcurrently(modes: SubagentIsolationMode[]): boolean {
  return modes.length > 0 && modes.every((mode) => mode !== SHARED_READONLY)
}

export function resolveMutatingSubagentConcurrency(args: {
  isolationModes: SubagentIsolationMode[]
  requestedConcurrency?: number
}): number {
  const requestedConcurrency = Math.max(1, args.requestedConcurrency ?? 1)
  return canRunMutatingSubagentsConcurrently(args.isolationModes) ? requestedConcurrency : 1
}

export interface SubagentIsolationSession {
  mode: SubagentIsolationMode
  scope?: SubagentIsolationScope
  run<T>(operation: () => Promise<T>): Promise<T>
}

export async function createSubagentIsolationSession(args: {
  mode: SubagentIsolationMode
  adapter?: SubagentIsolationAdapter
  parentSessionID: Identifier
  childSessionID: Identifier
  agentName: string
}): Promise<SubagentIsolationSession> {
  const scope = await createIsolationScope(args)

  return {
    mode: args.mode,
    ...(scope ? { scope } : {}),
    async run<T>(operation: () => Promise<T>): Promise<T> {
      try {
        const result = await operation()
        await scope?.complete?.({ autoMerge: false })
        return result
      } catch (error) {
        await scope?.restore?.()
        throw error
      } finally {
        await scope?.cleanup?.()
      }
    },
  }
}

async function createIsolationScope(args: {
  mode: SubagentIsolationMode
  adapter?: SubagentIsolationAdapter
  parentSessionID: Identifier
  childSessionID: Identifier
  agentName: string
}): Promise<SubagentIsolationScope | undefined> {
  if (args.mode === 'shared-readonly' || args.mode === 'patch-proposal') return undefined

  if (args.mode === 'snapshot') {
    if (!args.adapter?.createSnapshotScope) {
      throw new Error('Snapshot subagent isolation requested but no snapshot adapter is available')
    }
    return args.adapter.createSnapshotScope(args)
  }

  if (args.mode === 'worktree') {
    if (!args.adapter?.createWorktreeScope) {
      throw new Error('Worktree subagent isolation requested but no worktree adapter is available')
    }
    return args.adapter.createWorktreeScope(args)
  }

  return undefined
}
