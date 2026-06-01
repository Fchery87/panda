import { classifyCommandFamily } from '../command-analysis'
import { wildcardMatch } from './permission/wildcard'
import { createPlugin } from './plugins'
import type { CommandFamily } from './permission/types'
import type { HookContext, HookType, Plugin } from './types'

export const USER_HOOKS_FILE_PATH = '.panda/hooks.json'
export const USER_HOOK_DECISION_KEY = '__pandaUserHookDecision'
export const DEFAULT_USER_HOOK_MAX_HOOKS = 50

export type UserHookAction = 'allow' | 'deny' | 'ask' | 'transform'

export interface UserHookMatch {
  toolName?: string
  commandFamily?: CommandFamily
  path?: string
  agent?: string
}

export interface UserHookTransform {
  args?: Record<string, unknown>
}

export interface UserHookDefinition {
  id: string
  hook: HookType
  action: UserHookAction
  match?: UserHookMatch
  reason?: string
  priority?: number
  transform?: UserHookTransform
  /** Browser/WebContainer command only; never a host-shell command. Execution is intentionally not enabled by default. */
  webcontainerCommand?: string
}

export interface UserHooksConfig {
  version: 1
  hooks: UserHookDefinition[]
}

export interface UserHookAdminCeiling {
  enabled?: boolean
  allowedHookTypes?: HookType[]
  allowedActions?: UserHookAction[]
  allowWebContainerCommands?: boolean
  maxHooks?: number
}

export interface UserHookDiagnostic {
  level: 'warning' | 'error'
  code:
    | 'invalid-json'
    | 'invalid-config'
    | 'disabled-by-admin'
    | 'too-many-hooks'
    | 'invalid-hook'
    | 'invalid-action'
    | 'webcontainer-command-disabled'
  message: string
  hookId?: string
}

export interface UserHookResolution {
  config: UserHooksConfig
  diagnostics: UserHookDiagnostic[]
}

export interface UserHookDecisionPayload {
  action: Exclude<UserHookAction, 'allow' | 'transform'>
  hookId: string
  reason: string
}

export type UserHookToolBeforeData = {
  toolName: string
  args: Record<string, unknown>
  [USER_HOOK_DECISION_KEY]?: UserHookDecisionPayload
}

const VALID_HOOK_TYPES = new Set<HookType>([
  'session.start',
  'session.end',
  'step.start',
  'step.end',
  'tool.execute.before',
  'tool.execute.after',
  'llm.request',
  'llm.response',
  'compaction.before',
  'compaction.after',
  'permission.ask',
  'permission.decision',
  'spec.classify',
  'spec.generate.before',
  'spec.generate.after',
  'spec.validate',
  'spec.refine',
  'spec.approve',
  'spec.execute.before',
  'spec.execute.after',
  'spec.verify',
  'spec.drift.detected',
  'spec.reconcile',
  'validation.post-write',
])

const VALID_ACTIONS = new Set<UserHookAction>(['allow', 'deny', 'ask', 'transform'])

export const DEFAULT_USER_HOOK_ADMIN_CEILING: Required<UserHookAdminCeiling> = {
  enabled: true,
  allowedHookTypes: Array.from(VALID_HOOK_TYPES),
  allowedActions: ['allow', 'deny', 'ask', 'transform'],
  allowWebContainerCommands: false,
  maxHooks: DEFAULT_USER_HOOK_MAX_HOOKS,
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function normalizeCeiling(ceiling?: UserHookAdminCeiling): Required<UserHookAdminCeiling> {
  return {
    enabled: ceiling?.enabled ?? DEFAULT_USER_HOOK_ADMIN_CEILING.enabled,
    allowedHookTypes: ceiling?.allowedHookTypes ?? DEFAULT_USER_HOOK_ADMIN_CEILING.allowedHookTypes,
    allowedActions: ceiling?.allowedActions ?? DEFAULT_USER_HOOK_ADMIN_CEILING.allowedActions,
    allowWebContainerCommands:
      ceiling?.allowWebContainerCommands ??
      DEFAULT_USER_HOOK_ADMIN_CEILING.allowWebContainerCommands,
    maxHooks: ceiling?.maxHooks ?? DEFAULT_USER_HOOK_ADMIN_CEILING.maxHooks,
  }
}

export function parseUserHooksConfig(
  content: string | null | undefined,
  ceiling?: UserHookAdminCeiling
): UserHookResolution {
  const resolvedCeiling = normalizeCeiling(ceiling)
  const diagnostics: UserHookDiagnostic[] = []

  if (!content?.trim()) {
    return { config: { version: 1, hooks: [] }, diagnostics }
  }

  if (!resolvedCeiling.enabled) {
    diagnostics.push({
      level: 'warning',
      code: 'disabled-by-admin',
      message: 'User hooks are disabled by the admin ceiling.',
    })
    return { config: { version: 1, hooks: [] }, diagnostics }
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(content)
  } catch (error) {
    diagnostics.push({
      level: 'error',
      code: 'invalid-json',
      message: error instanceof Error ? error.message : 'Invalid JSON',
    })
    return { config: { version: 1, hooks: [] }, diagnostics }
  }

  if (!isRecord(parsed) || parsed.version !== 1 || !Array.isArray(parsed.hooks)) {
    diagnostics.push({
      level: 'error',
      code: 'invalid-config',
      message: 'Expected hooks config shape: { "version": 1, "hooks": [...] }.',
    })
    return { config: { version: 1, hooks: [] }, diagnostics }
  }

  const hooks: UserHookDefinition[] = []
  const rawHooks = parsed.hooks.slice(0, resolvedCeiling.maxHooks)
  if (parsed.hooks.length > resolvedCeiling.maxHooks) {
    diagnostics.push({
      level: 'warning',
      code: 'too-many-hooks',
      message: `Only the first ${resolvedCeiling.maxHooks} user hooks are active.`,
    })
  }

  for (const [index, rawHook] of rawHooks.entries()) {
    if (!isRecord(rawHook)) {
      diagnostics.push({
        level: 'error',
        code: 'invalid-hook',
        message: `Hook at index ${index} must be an object.`,
      })
      continue
    }

    const id =
      typeof rawHook.id === 'string' && rawHook.id.trim() ? rawHook.id.trim() : `hook-${index}`
    const hook = rawHook.hook
    const action = rawHook.action

    if (typeof hook !== 'string' || !VALID_HOOK_TYPES.has(hook as HookType)) {
      diagnostics.push({
        level: 'error',
        code: 'invalid-hook',
        hookId: id,
        message: `Hook '${id}' uses an unknown hook type.`,
      })
      continue
    }

    if (!resolvedCeiling.allowedHookTypes.includes(hook as HookType)) {
      diagnostics.push({
        level: 'warning',
        code: 'invalid-hook',
        hookId: id,
        message: `Hook '${id}' is blocked by the admin hook-type ceiling.`,
      })
      continue
    }

    if (typeof action !== 'string' || !VALID_ACTIONS.has(action as UserHookAction)) {
      diagnostics.push({
        level: 'error',
        code: 'invalid-action',
        hookId: id,
        message: `Hook '${id}' uses an unknown action.`,
      })
      continue
    }

    if (!resolvedCeiling.allowedActions.includes(action as UserHookAction)) {
      diagnostics.push({
        level: 'warning',
        code: 'invalid-action',
        hookId: id,
        message: `Hook '${id}' action '${action}' is blocked by the admin action ceiling.`,
      })
      continue
    }

    const webcontainerCommand =
      typeof rawHook.webcontainerCommand === 'string'
        ? rawHook.webcontainerCommand.trim()
        : undefined
    if (webcontainerCommand && !resolvedCeiling.allowWebContainerCommands) {
      diagnostics.push({
        level: 'warning',
        code: 'webcontainer-command-disabled',
        hookId: id,
        message: `Hook '${id}' declares a WebContainer command, but commands are disabled by the admin ceiling.`,
      })
      continue
    }

    const match = isRecord(rawHook.match) ? normalizeMatch(rawHook.match) : undefined
    const transform = isRecord(rawHook.transform)
      ? { args: isRecord(rawHook.transform.args) ? rawHook.transform.args : undefined }
      : undefined

    hooks.push({
      id,
      hook: hook as HookType,
      action: action as UserHookAction,
      ...(match ? { match } : {}),
      ...(typeof rawHook.reason === 'string' ? { reason: rawHook.reason.slice(0, 500) } : {}),
      ...(typeof rawHook.priority === 'number' ? { priority: rawHook.priority } : {}),
      ...(transform ? { transform } : {}),
      ...(webcontainerCommand ? { webcontainerCommand } : {}),
    })
  }

  hooks.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0))
  return { config: { version: 1, hooks }, diagnostics }
}

function normalizeMatch(match: Record<string, unknown>): UserHookMatch {
  return {
    ...(typeof match.toolName === 'string' ? { toolName: match.toolName } : {}),
    ...(typeof match.commandFamily === 'string'
      ? { commandFamily: match.commandFamily as CommandFamily }
      : {}),
    ...(typeof match.path === 'string' ? { path: match.path } : {}),
    ...(typeof match.agent === 'string' ? { agent: match.agent } : {}),
  }
}

function getToolPaths(args: Record<string, unknown>): string[] {
  const paths: string[] = []
  for (const key of ['path', 'filePath', 'file_path']) {
    const value = args[key]
    if (typeof value === 'string') paths.push(value)
  }

  const rawPaths = args.paths
  if (Array.isArray(rawPaths)) {
    for (const value of rawPaths) {
      if (typeof value === 'string') paths.push(value)
    }
  }

  const rawFiles = args.files
  if (Array.isArray(rawFiles)) {
    for (const value of rawFiles) {
      if (isRecord(value) && typeof value.path === 'string') paths.push(value.path)
    }
  }

  return paths
}

function hookMatches(args: {
  hook: UserHookDefinition
  context: HookContext
  toolName?: string
  toolArgs?: Record<string, unknown>
}): boolean {
  const match = args.hook.match
  if (!match) return true

  if (match.agent && !wildcardMatch(match.agent, args.context.agent.name)) return false
  if (match.toolName && args.toolName && !wildcardMatch(match.toolName, args.toolName)) return false
  if (match.toolName && !args.toolName) return false

  if (match.commandFamily) {
    if (args.toolName !== 'run_command') return false
    const command = String(args.toolArgs?.command ?? '')
    if (classifyCommandFamily(command).family !== match.commandFamily) return false
  }

  if (match.path) {
    const paths = getToolPaths(args.toolArgs ?? {})
    if (paths.length === 0 || !paths.some((path) => wildcardMatch(match.path ?? '', path))) {
      return false
    }
  }

  return true
}

export function getUserHookDecision(data: unknown): UserHookDecisionPayload | undefined {
  return isRecord(data) && isRecord(data[USER_HOOK_DECISION_KEY])
    ? (data[USER_HOOK_DECISION_KEY] as unknown as UserHookDecisionPayload)
    : undefined
}

export function createUserHooksPlugin(config: UserHooksConfig, name = 'user-hooks'): Plugin {
  const hooksByType = new Map<HookType, UserHookDefinition[]>()
  for (const hook of config.hooks) {
    const hooks = hooksByType.get(hook.hook) ?? []
    hooks.push(hook)
    hooksByType.set(hook.hook, hooks)
  }

  const handlers: Partial<Record<HookType, (context: HookContext, data: unknown) => unknown>> = {}

  for (const [hookType, hookDefinitions] of hooksByType) {
    handlers[hookType] = async (context, data) => {
      if (hookType !== 'tool.execute.before') {
        return data
      }

      const toolData = isRecord(data)
        ? ({ ...data, args: isRecord(data.args) ? data.args : {} } as UserHookToolBeforeData)
        : ({ toolName: '', args: {} } as UserHookToolBeforeData)

      for (const hook of hookDefinitions) {
        if (!hookMatches({ hook, context, toolName: toolData.toolName, toolArgs: toolData.args })) {
          continue
        }

        if (hook.action === 'allow') {
          continue
        }

        if (hook.action === 'transform') {
          toolData.args = { ...toolData.args, ...(hook.transform?.args ?? {}) }
          continue
        }

        toolData[USER_HOOK_DECISION_KEY] = {
          action: hook.action,
          hookId: hook.id,
          reason: hook.reason ?? `User hook '${hook.id}' requested ${hook.action}.`,
        }
        return toolData
      }

      return toolData
    }
  }

  return createPlugin(name, { hooks: handlers })
}
