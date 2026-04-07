import type { ChatMode } from '@/lib/agent/prompt-library'

export type ForgeChatRole = 'executive' | 'manager' | 'builder'

type ForgeRolePresentation = {
  role: ForgeChatRole
  label: string
  shortLabel: string
  description: string
}

const ROLE_PRESENTATIONS: Record<ForgeChatRole, ForgeRolePresentation> = {
  executive: {
    role: 'executive',
    label: 'Executive',
    shortLabel: 'Exec',
    description: 'Architecture, review, and ship decisions',
  },
  manager: {
    role: 'manager',
    label: 'Manager',
    shortLabel: 'Mgr',
    description: 'Coordinates implementation and delivery flow',
  },
  builder: {
    role: 'builder',
    label: 'Builder',
    shortLabel: 'Bldr',
    description: 'Executes tool-driven implementation work',
  },
}

export function mapChatModeToForgeRole(mode: ChatMode): ForgeChatRole {
  switch (mode) {
    case 'architect':
      return 'executive'
    case 'build':
      return 'builder'
    case 'ask':
    case 'code':
    default:
      return 'manager'
  }
}

export function mapForgeRoleToChatMode(role: ForgeChatRole): ChatMode {
  switch (role) {
    case 'executive':
      return 'architect'
    case 'builder':
      return 'build'
    case 'manager':
    default:
      return 'code'
  }
}

export function getForgeRolePresentation(role: ForgeChatRole): ForgeRolePresentation {
  return ROLE_PRESENTATIONS[role]
}

export function getForgeRolePresentationForMode(mode: ChatMode): ForgeRolePresentation {
  return getForgeRolePresentation(mapChatModeToForgeRole(mode))
}
