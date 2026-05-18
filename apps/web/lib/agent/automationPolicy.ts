import type { Permission } from './harness/types'
import type { ChatMode } from './prompt-library'
import type { ArtifactAction } from '@/lib/artifacts/executeArtifact'

export type AgentPolicy = {
  autoApplyFiles: boolean
  autoRunCommands: boolean
  allowedCommandPrefixes: string[]
  yoloCommandMode?: boolean
}

export function normalizePrefixList(prefixes: string[] | null | undefined): string[] {
  return (prefixes ?? []).map((p) => p.trim()).filter(Boolean)
}

export function isCommandAllowedByPrefix(command: string, allowedPrefixes: string[]): boolean {
  const cmd = command.trim().toLowerCase()
  if (!cmd) return false

  for (const rawPrefix of allowedPrefixes) {
    const prefix = rawPrefix.trim().toLowerCase()
    if (!prefix) continue
    if (cmd === prefix) return true
    if (cmd.startsWith(prefix + ' ')) return true
  }
  return false
}

export function getDefaultPolicyForMode(mode: ChatMode): AgentPolicy {
  const isWriteMode = mode === 'code' || mode === 'build'
  return {
    autoApplyFiles: isWriteMode,
    autoRunCommands: false,
    allowedCommandPrefixes: [],
    // Default ON — commands run inside WebContainer (browser-sandboxed), so
    // blanket approval dialogs are mostly theater. Users who need prompt-per-
    // command can toggle this off in Settings → Agent Defaults.
    yoloCommandMode: true,
  }
}

export function resolveEffectiveAgentPolicy(args: {
  projectPolicy: AgentPolicy | null | undefined
  userDefaults: AgentPolicy | null | undefined
  mode?: ChatMode
}): AgentPolicy {
  const modeDefaults = args.mode
    ? getDefaultPolicyForMode(args.mode)
    : getDefaultPolicyForMode('code')
  const defaults: AgentPolicy = modeDefaults

  const base = args.userDefaults ?? defaults
  const project = args.projectPolicy
  if (!project) return base

  return {
    autoApplyFiles: project.autoApplyFiles,
    autoRunCommands: project.autoRunCommands,
    allowedCommandPrefixes: normalizePrefixList(project.allowedCommandPrefixes),
    yoloCommandMode: project.yoloCommandMode ?? false,
  }
}

export function shouldAutoApplyArtifact(policy: AgentPolicy, artifact: ArtifactAction): boolean {
  if (artifact.type === 'file_write' && policy.yoloCommandMode) return true
  if (artifact.type === 'file_write') return policy.autoApplyFiles
  if (artifact.type === 'command_run' && policy.yoloCommandMode) return true
  if (!policy.autoRunCommands) return false
  return isCommandAllowedByPrefix(artifact.payload.command, policy.allowedCommandPrefixes)
}

export function buildHarnessSessionPermissions(policy: AgentPolicy): Permission {
  const permissions: Permission = {}

  if (policy.yoloCommandMode) {
    permissions['run_command:*'] = 'allow'
    permissions['write_files:*'] = 'allow'
    return permissions
  }

  if (!policy.autoRunCommands) {
    return permissions
  }

  for (const prefix of normalizePrefixList(policy.allowedCommandPrefixes)) {
    permissions[`run_command:${prefix}*`] = 'allow'
  }

  return permissions
}
