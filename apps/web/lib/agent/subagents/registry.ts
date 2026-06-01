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
  'codebase-locator': 'fresh',
  'codebase-pattern-finder': 'fresh',
  'integration-scanner': 'fresh',
  'claim-verifier': 'fresh',
  'diff-auditor': 'fresh',
  'advisor-reviewer': 'fresh',
}

const RPIV_INSPIRED_BUILT_INS: AgentConfig[] = [
  {
    name: 'codebase-locator',
    description: 'Finds relevant files, directories, and components for a bounded Panda task.',
    mode: 'subagent',
    hidden: true,
    permission: permissionForPreset('research'),
    maxCapabilities: capabilitiesForPreset('research'),
    steps: 8,
    prompt:
      'Locate the smallest relevant codebase surface for the delegated task. Return concise file paths and why each matters. Do not modify files.',
  },
  {
    name: 'codebase-pattern-finder',
    description: 'Finds existing patterns and sibling implementations before Panda edits code.',
    mode: 'subagent',
    hidden: true,
    permission: permissionForPreset('research'),
    maxCapabilities: capabilitiesForPreset('research'),
    steps: 10,
    prompt:
      'Find similar implementations, conventions, and invariants. Return concrete examples and integration notes. Do not modify files.',
  },
  {
    name: 'integration-scanner',
    description:
      'Maps imports, routes, schema, config, events, and side effects for a component or change.',
    mode: 'subagent',
    hidden: true,
    permission: permissionForPreset('research'),
    maxCapabilities: capabilitiesForPreset('research'),
    steps: 10,
    prompt:
      'Scan integration boundaries for the delegated task: imports, exports, routing, schema, config, subscriptions, and side effects. Do not modify files.',
  },
  {
    name: 'claim-verifier',
    description:
      'Verifies file, command, and test claims against Panda receipts and workspace state.',
    mode: 'subagent',
    hidden: true,
    permission: permissionForPreset('restricted'),
    maxCapabilities: capabilitiesForPreset('restricted'),
    steps: 6,
    prompt:
      'Verify the supplied claims against available receipts, file paths, and command evidence. Mark each claim Verified, Attempted, Failed, or Unverified. Do not infer success without evidence.',
  },
  {
    name: 'diff-auditor',
    description: 'Audits changed files against expected touched surfaces and codebase invariants.',
    mode: 'subagent',
    hidden: true,
    permission: permissionForPreset('research'),
    maxCapabilities: capabilitiesForPreset('research'),
    steps: 10,
    prompt:
      'Review the supplied diff or changed-file list. Return concise findings with file references, severity, and recommended fix. Do not modify files.',
  },
  {
    name: 'advisor-reviewer',
    description:
      'Provides escalated review for risky plans, diffs, commands, and Autopilot checkpoints.',
    mode: 'subagent',
    hidden: true,
    permission: permissionForPreset('research'),
    maxCapabilities: capabilitiesForPreset('research'),
    steps: 10,
    prompt:
      'Review risky work before execution or completion. Return status approved, needs_changes, or blocked with concrete risks and recommendations. Do not modify files.',
  },
]

function inferPreset(agent: AgentConfig): SubagentCapabilityPreset {
  const caps = new Set(agent.maxCapabilities ?? [])
  if (caps.has('edit') || caps.has('exec')) return 'builder'
  if (caps.has('search')) return 'research'
  return 'assistant'
}

function toResolvedBuiltIn(agent: AgentConfig): ResolvedSubagentDefinition {
  const capabilityPreset = inferPreset(agent)
  const mutatesWorkspace = capabilityPreset === 'builder'
  return {
    ...agent,
    source: 'built-in',
    capabilityPreset,
    defaultContextMode: DEFAULT_CONTEXT_BY_AGENT[agent.name] ?? 'fresh',
    mutatesWorkspace,
    outputKind:
      agent.name === 'diff-auditor' || agent.name === 'claim-verifier' ? 'rows' : 'summary',
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

  for (const agent of [...agents.listSubagents(), ...RPIV_INSPIRED_BUILT_INS]) {
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
