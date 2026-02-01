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

export function resolveEffectiveAgentPolicy(args: {
  projectPolicy: AgentPolicy | null | undefined
  userDefaults: AgentPolicy | null | undefined
}): AgentPolicy {
  const defaults: AgentPolicy = {
    autoApplyFiles: false,
    autoRunCommands: false,
    allowedCommandPrefixes: [],
  }

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
    payload: any
  }
): boolean {
  if (artifact.type === 'file_write') return policy.autoApplyFiles
  if (!policy.autoRunCommands) return false
  return isCommandAllowedByPrefix(
    String(artifact.payload?.command ?? ''),
    policy.allowedCommandPrefixes
  )
}
