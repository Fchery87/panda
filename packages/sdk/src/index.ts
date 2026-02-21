export * from './types'
import type { PermissionLevel } from './types'

export const DEFAULT_PERMISSIONS = {
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
} as const

export const READ_ONLY_PERMISSIONS = {
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
} as const

export const FULL_ACCESS_PERMISSIONS = {
  tools: {
    '*': 'allow',
  },
  bash: {
    '*': 'allow',
  },
} as const

export function matchesPermissionPattern(pattern: string, value: string): boolean {
  if (pattern === '*') return true

  const regexPattern = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '.*')
    .replace(/\?/g, '.')

  const regex = new RegExp(`^${regexPattern}$`, 'i')
  return regex.test(value)
}

export function resolvePermission(
  permissions: Record<string, PermissionLevel>,
  name: string
): PermissionLevel {
  const patterns = Object.keys(permissions)

  for (const pattern of patterns) {
    if (matchesPermissionPattern(pattern, name)) {
      return permissions[pattern]
    }
  }

  return 'ask'
}
