import type { Id } from '@convex/_generated/dataModel'
import type { AgentConfig } from '../harness/types'

export type SubagentCapabilityPreset = 'research' | 'assistant' | 'builder' | 'restricted'

export type SubagentContextMode = 'fresh' | 'fork'

export type SubagentIsolationMode = 'shared-readonly' | 'snapshot' | 'worktree' | 'patch-proposal'

export interface CustomSubagentRecord {
  _id: Id<'subagents'> | string
  name: string
  description: string
  prompt?: string
  model?: string
  temperature?: number
  maxSteps?: number
  capabilityPreset?: SubagentCapabilityPreset
  defaultSkillIds?: string[]
  skillAutoMatchingEnabled?: boolean
}

export interface ResolvedSubagentDefinition extends AgentConfig {
  source: 'built-in' | 'custom'
  customSubagentId?: string
  capabilityPreset: SubagentCapabilityPreset
  defaultContextMode: SubagentContextMode
  outputKind?: 'summary' | 'artifact' | 'rows'
  mutatesWorkspace?: boolean
}

export interface SubagentRegistryOptions {
  customSubagents?: CustomSubagentRecord[]
  allowedCapabilityPresets?: SubagentCapabilityPreset[]
}
