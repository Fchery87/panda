/**
 * Permissions System
 *
 * Fine-grained permission control for tools and commands.
 * Supports allow/deny/ask levels with pattern matching.
 *
 * Inspired by OpenCode's permission system.
 */

export type PermissionLevel = 'allow' | 'deny' | 'ask'

export interface ToolPermission {
  [toolNameOrPattern: string]: PermissionLevel | CommandPermissions
}

export interface CommandPermissions {
  [commandPattern: string]: PermissionLevel
}

export interface PermissionsConfig {
  tools?: ToolPermission
  bash?: CommandPermissions
}

export const DEFAULT_PERMISSIONS: PermissionsConfig = {
  tools: {
    read: 'allow',
    glob: 'allow',
    grep: 'allow',
    list: 'allow',
    webfetch: 'allow',
    websearch: 'allow',
    todowrite: 'allow',
    todoread: 'allow',
    question: 'allow',
    edit: 'ask',
    write: 'ask',
    bash: 'ask',
  },
  bash: {
    '*': 'ask',
    'git status*': 'allow',
    'git log*': 'allow',
    'git diff*': 'allow',
    'git branch*': 'allow',
    'ls *': 'allow',
    'cat *': 'allow',
    'npm run *': 'allow',
    'bun run *': 'allow',
    'pnpm *': 'allow',
  },
}

export function matchesPattern(pattern: string, value: string): boolean {
  if (pattern === '*') return true

  const regexPattern = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '.*')
    .replace(/\?/g, '.')

  const regex = new RegExp(`^${regexPattern}$`, 'i')
  return regex.test(value)
}

export function resolvePermission(
  permissions: ToolPermission | CommandPermissions,
  name: string
): PermissionLevel | undefined {
  const patterns = Object.keys(permissions)

  let lastMatch: { pattern: string; level: PermissionLevel } | undefined

  for (const pattern of patterns) {
    if (matchesPattern(pattern, name)) {
      const level = permissions[pattern]
      if (typeof level === 'string') {
        lastMatch = { pattern, level }
      }
    }
  }

  return lastMatch?.level
}

export function checkToolPermission(toolName: string, config: PermissionsConfig): PermissionLevel {
  if (!config.tools) {
    return resolvePermission(DEFAULT_PERMISSIONS.tools!, toolName) || 'ask'
  }

  const level = resolvePermission(config.tools, toolName)
  return level || 'ask'
}

export function checkBashPermission(command: string, config: PermissionsConfig): PermissionLevel {
  const bashPermissions = config.bash || DEFAULT_PERMISSIONS.bash!

  const level = resolvePermission(bashPermissions, command)
  return level || 'ask'
}

export function checkPermission(
  type: 'tool' | 'bash',
  name: string,
  config: PermissionsConfig
): PermissionLevel {
  if (type === 'bash') {
    return checkBashPermission(name, config)
  }
  return checkToolPermission(name, config)
}

export function mergePermissions(
  base: PermissionsConfig,
  override: PermissionsConfig
): PermissionsConfig {
  return {
    tools: {
      ...base.tools,
      ...override.tools,
    },
    bash: {
      ...base.bash,
      ...override.bash,
    },
  }
}

export function isAllowed(level: PermissionLevel | undefined): boolean {
  return level === 'allow'
}

export function isDenied(level: PermissionLevel | undefined): boolean {
  return level === 'deny'
}

export function requiresApproval(level: PermissionLevel | undefined): boolean {
  return level === 'ask'
}

export interface PermissionCheckResult {
  allowed: boolean
  requiresApproval: boolean
  level: PermissionLevel
  toolName?: string
  command?: string
}

export function validateToolUse(
  toolName: string,
  config: PermissionsConfig
): PermissionCheckResult {
  const level = checkToolPermission(toolName, config)

  return {
    allowed: isAllowed(level),
    requiresApproval: requiresApproval(level),
    level,
    toolName,
  }
}

export function validateBashCommand(
  command: string,
  config: PermissionsConfig
): PermissionCheckResult {
  const level = checkBashPermission(command, config)

  return {
    allowed: isAllowed(level),
    requiresApproval: requiresApproval(level),
    level,
    command,
  }
}

export function createPermissionConfig(options: Partial<PermissionsConfig>): PermissionsConfig {
  return mergePermissions(DEFAULT_PERMISSIONS, options)
}

export const READ_ONLY_PERMISSIONS: PermissionsConfig = {
  tools: {
    read: 'allow',
    glob: 'allow',
    grep: 'allow',
    list: 'allow',
    webfetch: 'allow',
    websearch: 'allow',
    todoread: 'allow',
    question: 'allow',
    edit: 'deny',
    write: 'deny',
    bash: 'deny',
    todowrite: 'deny',
  },
  bash: {
    '*': 'deny',
    'git status*': 'allow',
    'git log*': 'allow',
    'git diff*': 'allow',
    'ls *': 'allow',
    'cat *': 'allow',
  },
}

export const FULL_ACCESS_PERMISSIONS: PermissionsConfig = {
  tools: {
    '*': 'allow',
  },
  bash: {
    '*': 'allow',
  },
}

export const PLAN_MODE_PERMISSIONS: PermissionsConfig = {
  tools: {
    read: 'allow',
    glob: 'allow',
    grep: 'allow',
    list: 'allow',
    webfetch: 'allow',
    websearch: 'allow',
    todoread: 'allow',
    todowrite: 'allow',
    question: 'allow',
    edit: 'ask',
    write: 'ask',
    bash: 'ask',
  },
  bash: {
    '*': 'ask',
    'git status*': 'allow',
    'git log*': 'allow',
    'git diff*': 'allow',
    'git branch*': 'allow',
    'ls *': 'allow',
    'cat *': 'allow',
  },
}
