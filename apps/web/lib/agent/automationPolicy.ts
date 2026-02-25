import type { ChatMode } from './prompt-library'

export type AgentPolicy = {
  autoApplyFiles: boolean
  autoRunCommands: boolean
  allowedCommandPrefixes: string[]
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
  }
}

export function shouldAutoApplyArtifact(
  policy: AgentPolicy,
  artifact: {
    type: 'file_write' | 'command_run'
    payload: Record<string, unknown>
  }
): boolean {
  if (artifact.type === 'file_write') return policy.autoApplyFiles
  if (!policy.autoRunCommands) return false
  return isCommandAllowedByPrefix(
    String(artifact.payload?.command ?? ''),
    policy.allowedCommandPrefixes
  )
}
