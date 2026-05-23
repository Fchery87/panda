import { agents } from '../harness/agents'
import type { AgentConfig } from '../harness/types'
import {
  capabilitiesForPreset,
  normalizeSubagentName,
  permissionForPreset,
  SUBAGENT_CAPABILITY_PRESETS,
} from './presets'
import type {
  CustomSubagentRecord,
  ResolvedSubagentDefinition,
  SubagentCapabilityPreset,
  SubagentRegistryOptions,
} from './types'

const DEFAULT_CONTEXT_BY_AGENT: Record<string, 'fresh' | 'fork'> = {
  scout: 'fresh',
  researcher: 'fresh',
  reviewer: 'fresh',
  planner: 'fork',
  worker: 'fork',
  oracle: 'fork',
  delegate: 'fresh',
}

function inferPreset(agent: AgentConfig): SubagentCapabilityPreset {
  const caps = new Set(agent.maxCapabilities ?? [])
  if (caps.has('edit') || caps.has('exec')) return 'builder'
  if (caps.has('search')) return 'research'
  return 'assistant'
}

function toResolvedBuiltIn(agent: AgentConfig): ResolvedSubagentDefinition {
  const capabilityPreset = inferPreset(agent)
  return {
    ...agent,
    source: 'built-in',
    capabilityPreset,
    defaultContextMode: DEFAULT_CONTEXT_BY_AGENT[agent.name] ?? 'fresh',
  }
}

function toResolvedCustom(record: CustomSubagentRecord): ResolvedSubagentDefinition | null {
  const name = normalizeSubagentName(record.name)
  if (!name) return null
  const capabilityPreset = record.capabilityPreset ?? 'assistant'
  return {
    name,
    description: record.description,
    prompt: record.prompt,
    model: record.model,
    temperature: record.temperature,
    steps: record.maxSteps,
    mode: 'subagent',
    hidden: false,
    permission: permissionForPreset(capabilityPreset),
    maxCapabilities: capabilitiesForPreset(capabilityPreset),
    defaultSkillIds: record.defaultSkillIds,
    skillAutoMatchingEnabled: record.skillAutoMatchingEnabled,
    source: 'custom',
    customSubagentId: String(record._id),
    capabilityPreset,
    defaultContextMode: 'fresh',
  }
}

export function resolveSubagentRegistry(
  options: SubagentRegistryOptions = {}
): ResolvedSubagentDefinition[] {
  const allowed = new Set(options.allowedCapabilityPresets ?? SUBAGENT_CAPABILITY_PRESETS)
  const registry = new Map<string, ResolvedSubagentDefinition>()

  for (const agent of agents.listSubagents()) {
    registry.set(agent.name, toResolvedBuiltIn(agent))
  }

  for (const record of options.customSubagents ?? []) {
    const resolved = toResolvedCustom(record)
    if (!resolved) continue
    if (!allowed.has(resolved.capabilityPreset)) continue
    registry.set(resolved.name, resolved)
  }

  return [...registry.values()].sort((a, b) => a.name.localeCompare(b.name))
}

export function getResolvedSubagent(
  name: string,
  options: SubagentRegistryOptions = {}
): ResolvedSubagentDefinition | undefined {
  const normalized = normalizeSubagentName(name)
  return resolveSubagentRegistry(options).find((agent) => agent.name === normalized)
}
