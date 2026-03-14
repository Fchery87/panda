export type CommandAnalysisKind = 'single' | 'pipeline' | 'chain' | 'redirect'
export type CommandRiskTier = 'low' | 'medium' | 'high'

export interface CommandAnalysis {
  command: string
  kind: CommandAnalysisKind
  segments: string[]
  operators: string[]
  riskTier: CommandRiskTier
  requiresApproval: boolean
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
    }
  }

  return {
    command: trimmed,
    kind: 'single',
    segments: [trimmed],
    operators,
    riskTier: 'low',
    requiresApproval: false,
  }
}

export function isCommandPipelineSafe(analysis: CommandAnalysis): boolean {
  return analysis.kind === 'pipeline' && analysis.riskTier === 'low'
}
