import type { CommandFamily, Decision } from '@/lib/agent/harness/permission/types'

export type CommandFamilyDecision = Extract<Decision, 'allow' | 'ask' | 'deny'>

export interface CommandFamilyPolicyEntry {
  family: CommandFamily
  decision: CommandFamilyDecision
}

export const COMMAND_FAMILIES: readonly CommandFamily[] = [
  'package-manager',
  'network',
  'git',
  'destructive',
  'remote-exec',
  'filesystem-write',
  'unknown',
] as const

export const COMMAND_FAMILY_DECISIONS: readonly CommandFamilyDecision[] = [
  'allow',
  'ask',
  'deny',
] as const

export const COMMAND_FAMILY_LABELS: Record<CommandFamily, string> = {
  'package-manager': 'Package manager',
  network: 'Network',
  git: 'Git',
  destructive: 'Destructive',
  'remote-exec': 'Remote execution',
  'filesystem-write': 'Filesystem write',
  unknown: 'Unknown command',
}

export const COMMAND_FAMILY_DESCRIPTIONS: Record<CommandFamily, string> = {
  'package-manager':
    'Dependency, script, and package-manager commands such as bun, npm, pnpm, and yarn.',
  network: 'HTTP and download tools such as curl and wget.',
  git: 'Git commands, including status, diff, commit, and push.',
  destructive:
    'Commands that can remove or mutate broad local state, such as rm, chmod, and chown.',
  'remote-exec': 'Remote shell or file-transfer tools such as ssh, scp, and rsync.',
  'filesystem-write': 'Direct local filesystem write helpers such as mkdir, touch, tee, and cp.',
  unknown: 'Commands Panda cannot confidently classify.',
}

export const DEFAULT_COMMAND_FAMILY_POLICY: readonly CommandFamilyPolicyEntry[] = [
  { family: 'package-manager', decision: 'allow' },
  { family: 'network', decision: 'ask' },
  { family: 'git', decision: 'allow' },
  { family: 'destructive', decision: 'ask' },
  { family: 'remote-exec', decision: 'ask' },
  { family: 'filesystem-write', decision: 'ask' },
  { family: 'unknown', decision: 'ask' },
] as const

const DECISION_RANK: Record<CommandFamilyDecision, number> = {
  allow: 0,
  ask: 1,
  deny: 2,
}

export function getCommandFamilyDecisionRank(decision: CommandFamilyDecision): number {
  return DECISION_RANK[decision]
}

function defaultDecisionForFamily(family: CommandFamily): CommandFamilyDecision {
  return DEFAULT_COMMAND_FAMILY_POLICY.find((entry) => entry.family === family)?.decision ?? 'ask'
}

export function normalizeCommandFamilyPolicy(
  entries: readonly CommandFamilyPolicyEntry[] | null | undefined
): CommandFamilyPolicyEntry[] {
  const decisions = new Map<CommandFamily, CommandFamilyDecision>()

  for (const family of COMMAND_FAMILIES) {
    decisions.set(family, defaultDecisionForFamily(family))
  }

  for (const entry of entries ?? []) {
    decisions.set(entry.family, entry.decision)
  }

  return COMMAND_FAMILIES.map((family) => ({
    family,
    decision: decisions.get(family) ?? defaultDecisionForFamily(family),
  }))
}

export function getAllowedUserCommandFamilyDecisions(
  adminDecision: CommandFamilyDecision
): CommandFamilyDecision[] {
  const adminRank = getCommandFamilyDecisionRank(adminDecision)
  return COMMAND_FAMILY_DECISIONS.filter(
    (decision) => getCommandFamilyDecisionRank(decision) >= adminRank
  )
}

export function isCommandFamilyPreferenceWithinAdminCeiling(args: {
  adminDecision: CommandFamilyDecision
  userDecision: CommandFamilyDecision
}): boolean {
  return (
    getCommandFamilyDecisionRank(args.userDecision) >=
    getCommandFamilyDecisionRank(args.adminDecision)
  )
}

export function mergeCommandFamilyPolicy(args: {
  adminPolicy: readonly CommandFamilyPolicyEntry[] | null | undefined
  userPreferences?: readonly CommandFamilyPolicyEntry[] | null | undefined
}): CommandFamilyPolicyEntry[] {
  const adminPolicy = normalizeCommandFamilyPolicy(args.adminPolicy)
  const userByFamily = new Map<CommandFamily, CommandFamilyDecision>()

  for (const entry of args.userPreferences ?? []) {
    userByFamily.set(entry.family, entry.decision)
  }

  return adminPolicy.map((adminEntry) => {
    const userDecision = userByFamily.get(adminEntry.family)
    if (!userDecision) return adminEntry

    return isCommandFamilyPreferenceWithinAdminCeiling({
      adminDecision: adminEntry.decision,
      userDecision,
    })
      ? { family: adminEntry.family, decision: userDecision }
      : adminEntry
  })
}
