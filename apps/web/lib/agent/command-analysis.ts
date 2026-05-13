import { hashString } from './utils/hash'
import type { CommandFamily } from './harness/permission/types'

export type CommandAnalysisKind = 'single' | 'pipeline' | 'chain' | 'redirect'
export type CommandRiskTier = 'low' | 'medium' | 'high'

export interface CommandAnalysis {
  command: string
  kind: CommandAnalysisKind
  segments: string[]
  operators: string[]
  riskTier: CommandRiskTier
  requiresApproval: boolean
  reason: string
}

export interface CommandFamilyClassification {
  family: CommandFamily
  executable: string
}

export interface CommandAuditTarget {
  kind: 'command_hash'
  value: string
}

const PIPE_OPERATOR = '|'
const CHAIN_OPERATOR_PATTERN = /\s+(?:&&|\|\|)\s+/u
const REDIRECT_OPERATORS = ['>>', '>'] as const
const CHAIN_OPERATORS = ['&&', '||'] as const
const READ_ONLY_PIPE_COMMANDS = new Set([
  'cat',
  'cut',
  'grep',
  'head',
  'jq',
  'sed',
  'sort',
  'tail',
  'uniq',
  'wc',
])

const COMMAND_WRAPPERS = new Set(['command', 'env', 'sudo', 'time'])
const PACKAGE_MANAGER_COMMANDS = new Set(['npm', 'pnpm', 'yarn', 'bun', 'bunx', 'npx'])
const NETWORK_COMMANDS = new Set(['curl', 'wget'])
const DESTRUCTIVE_COMMANDS = new Set(['rm', 'mv', 'chmod', 'chown'])
const REMOTE_EXEC_COMMANDS = new Set(['ssh', 'scp', 'rsync'])
const FILESYSTEM_WRITE_COMMANDS = new Set(['cp', 'mkdir', 'tee', 'touch'])

export function splitCommandByPipe(command: string): string[] {
  return command
    .split(/\s+\|\s+/u)
    .map((segment) => segment.trim())
    .filter(Boolean)
}

function getLeadingCommand(segment: string): string {
  const [command = ''] = segment.trim().split(/\s+/u)
  return command.toLowerCase()
}

function isEnvironmentAssignment(token: string): boolean {
  return /^[A-Za-z_][A-Za-z0-9_]*=.*/u.test(token)
}

function getGovernedExecutable(command: string): string {
  const tokens = command.trim().split(/\s+/u).filter(Boolean)
  let index = 0

  while (index < tokens.length) {
    const token = tokens[index].toLowerCase()

    if (isEnvironmentAssignment(tokens[index])) {
      index++
      continue
    }

    if (COMMAND_WRAPPERS.has(token)) {
      index++
      continue
    }

    return token
  }

  return ''
}

export function classifyCommandFamily(command: string): CommandFamilyClassification {
  const executable = getGovernedExecutable(command)

  if (PACKAGE_MANAGER_COMMANDS.has(executable)) {
    return { family: 'package-manager', executable }
  }

  if (NETWORK_COMMANDS.has(executable)) {
    return { family: 'network', executable }
  }

  if (executable === 'git') {
    return { family: 'git', executable }
  }

  if (DESTRUCTIVE_COMMANDS.has(executable)) {
    return { family: 'destructive', executable }
  }

  if (REMOTE_EXEC_COMMANDS.has(executable)) {
    return { family: 'remote-exec', executable }
  }

  if (FILESYSTEM_WRITE_COMMANDS.has(executable)) {
    return { family: 'filesystem-write', executable }
  }

  return { family: 'unknown', executable }
}

export function createCommandAuditTarget(command: string): CommandAuditTarget {
  const { family, executable } = classifyCommandFamily(command)
  return {
    kind: 'command_hash',
    value: `${family}:${executable}:${hashString(command)}`,
  }
}

export function analyzeCommand(command: string): CommandAnalysis {
  const trimmed = command.trim()
  const operators = [
    ...REDIRECT_OPERATORS.filter((operator) => trimmed.includes(operator)),
    ...CHAIN_OPERATORS.filter((operator) => trimmed.includes(operator)),
    ...(trimmed.includes(PIPE_OPERATOR) ? [PIPE_OPERATOR] : []),
  ]

  if (REDIRECT_OPERATORS.some((operator) => trimmed.includes(operator))) {
    return {
      command: trimmed,
      kind: 'redirect',
      segments: [trimmed],
      operators,
      riskTier: 'high',
      requiresApproval: true,
      reason: 'Output redirection can create or overwrite files.',
    }
  }

  if (CHAIN_OPERATORS.some((operator) => trimmed.includes(operator))) {
    return {
      command: trimmed,
      kind: 'chain',
      segments: trimmed.split(CHAIN_OPERATOR_PATTERN).filter(Boolean),
      operators,
      riskTier: 'medium',
      requiresApproval: true,
      reason: 'Command chaining runs multiple operations in one request.',
    }
  }

  if (trimmed.includes(PIPE_OPERATOR)) {
    const segments = splitCommandByPipe(trimmed)
    const safePipeline =
      segments.length > 1 &&
      segments.slice(1).every((segment) => READ_ONLY_PIPE_COMMANDS.has(getLeadingCommand(segment)))

    return {
      command: trimmed,
      kind: 'pipeline',
      segments,
      operators,
      riskTier: safePipeline ? 'low' : 'medium',
      requiresApproval: !safePipeline,
      reason: safePipeline
        ? 'Read-only pipeline.'
        : 'Only read-only pipelines can run automatically.',
    }
  }

  return {
    command: trimmed,
    kind: 'single',
    segments: [trimmed],
    operators,
    riskTier: 'low',
    requiresApproval: false,
    reason: 'Single command.',
  }
}

export function isCommandPipelineSafe(analysis: CommandAnalysis): boolean {
  return analysis.kind === 'pipeline' && analysis.riskTier === 'low'
}
