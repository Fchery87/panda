import { analyzeCommand, type CommandAnalysis, type CommandRiskTier } from './command-analysis'
import type { PermissionRequest } from './harness/types'

export type PermissionRiskTier = CommandRiskTier

export interface PermissionPresentation {
  title: string
  summary: string
  detail?: string
  riskTier: PermissionRiskTier
  riskLabel: string
}

const RISK_LABELS: Record<PermissionRiskTier, string> = {
  low: 'Low Risk',
  medium: 'Needs Review',
  high: 'High Risk',
}

function getMetadataArgs(request: PermissionRequest): Record<string, unknown> | undefined {
  const metadata = request.metadata
  if (!metadata || typeof metadata !== 'object' || !('args' in metadata)) return undefined
  const args = metadata.args
  return args && typeof args === 'object' ? (args as Record<string, unknown>) : undefined
}

function formatCommandSummary(analysis: CommandAnalysis): string {
  switch (analysis.kind) {
    case 'redirect':
      return 'This command writes output to a file.'
    case 'chain':
      return 'This command chains multiple operations.'
    case 'pipeline':
      return analysis.requiresApproval
        ? 'This pipeline includes steps beyond read-only inspection.'
        : 'This is a read-only inspection pipeline.'
    case 'single':
    default:
      return analysis.requiresApproval
        ? 'This command needs approval before it runs.'
        : 'This is a single command.'
  }
}

export function getCommandApprovalReason(analysis: CommandAnalysis): string {
  switch (analysis.kind) {
    case 'redirect':
      return 'Output redirection can create or overwrite files in the workspace.'
    case 'chain':
      return 'Command chaining hides multiple operations behind one approval in the web executor.'
    case 'pipeline':
      return analysis.requiresApproval
        ? 'Only read-only pipelines can run automatically in the web executor.'
        : 'This is a read-only pipeline.'
    case 'single':
    default:
      return analysis.requiresApproval
        ? 'This command requires review before execution.'
        : 'This command is safe to run without extra approval.'
  }
}

export function describePermissionRequest(request: PermissionRequest): PermissionPresentation {
  const args = getMetadataArgs(request)

  if (request.tool === 'run_command') {
    const command = String(args?.command ?? request.pattern ?? '').trim()
    const analysis = analyzeCommand(command)
    return {
      title: 'Command Execution',
      summary: formatCommandSummary(analysis),
      detail: getCommandApprovalReason(analysis),
      riskTier: analysis.riskTier,
      riskLabel: RISK_LABELS[analysis.riskTier],
    }
  }

  if (request.tool === 'write_files' || request.tool === 'apply_patch') {
    return {
      title: 'File Edit',
      summary: 'This request can change files in the project workspace.',
      detail:
        request.pattern && request.pattern.trim()
          ? `Target: ${request.pattern}`
          : 'One or more project files will be changed.',
      riskTier: 'high',
      riskLabel: RISK_LABELS.high,
    }
  }

  if (request.tool === 'task') {
    return {
      title: 'Subagent Task',
      summary: 'This request delegates work to another agent.',
      detail: 'Subagents can perform follow-up tool calls within their granted permissions.',
      riskTier: 'high',
      riskLabel: RISK_LABELS.high,
    }
  }

  if (request.tool === 'update_memory_bank') {
    return {
      title: 'Memory Update',
      summary: 'This request changes persistent project memory used in future runs.',
      riskTier: 'medium',
      riskLabel: RISK_LABELS.medium,
    }
  }

  if (
    request.tool.startsWith('search_') ||
    request.tool === 'read_files' ||
    request.tool === 'list_directory'
  ) {
    return {
      title: 'Workspace Read',
      summary: 'This request only inspects project files or structure.',
      detail: request.pattern && request.pattern.trim() ? `Target: ${request.pattern}` : undefined,
      riskTier: 'low',
      riskLabel: RISK_LABELS.low,
    }
  }

  return {
    title: request.tool,
    summary: 'This request needs review before continuing.',
    detail: request.pattern && request.pattern.trim() ? `Target: ${request.pattern}` : undefined,
    riskTier: 'medium',
    riskLabel: RISK_LABELS.medium,
  }
}
