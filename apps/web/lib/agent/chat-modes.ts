export type ChatMode = 'ask' | 'architect' | 'code' | 'build'

export interface ChatModeConfig {
  description: string
  fileAccess: 'read-only' | 'read-write'
  surface: {
    label: string
    shortLabel: string
    description: string
    advanced: boolean
    primaryShortcut?: string
  }
  runtime: {
    forgeAgent: 'builder' | 'manager' | 'executive'
    legacyAgent: 'build' | 'code' | 'plan' | 'ask'
  }
}

export const CHAT_MODE_CONFIGS: Record<ChatMode, ChatModeConfig> = {
  ask: {
    description: 'Read-only Q&A',
    fileAccess: 'read-only',
    surface: {
      label: 'Ask',
      shortLabel: 'Ask',
      description: 'Read-only Q&A without touching files or running changes.',
      advanced: false,
    },
    runtime: {
      forgeAgent: 'manager',
      legacyAgent: 'ask',
    },
  },
  architect: {
    description: 'Clarify, scope, draft, and approve a plan',
    fileAccess: 'read-only',
    surface: {
      label: 'Plan',
      shortLabel: 'Plan',
      description: 'Clarify scope, draft the plan, and get approval before execution.',
      advanced: false,
      primaryShortcut: '1',
    },
    runtime: {
      forgeAgent: 'executive',
      legacyAgent: 'plan',
    },
  },
  code: {
    description: 'Execute an approved plan with coordination',
    fileAccess: 'read-write',
    surface: {
      label: 'Build',
      shortLabel: 'Build',
      description: 'Execute an approved plan with coordinated delivery across the workspace.',
      advanced: false,
      primaryShortcut: '2',
    },
    runtime: {
      forgeAgent: 'manager',
      legacyAgent: 'code',
    },
  },
  build: {
    description: 'Direct expert execution',
    fileAccess: 'read-write',
    surface: {
      label: 'Builder',
      shortLabel: 'Bldr',
      description: 'Direct expert execution when you want the specialist to do the work.',
      advanced: true,
      primaryShortcut: '3',
    },
    runtime: {
      forgeAgent: 'builder',
      legacyAgent: 'build',
    },
  },
}

export function getPrimaryChatModes(): ChatMode[] {
  return (Object.keys(CHAT_MODE_CONFIGS) as ChatMode[]).filter(
    (mode) => !CHAT_MODE_CONFIGS[mode].surface.advanced && mode !== 'ask'
  )
}

export function getAdvancedChatModes(): ChatMode[] {
  return (Object.keys(CHAT_MODE_CONFIGS) as ChatMode[]).filter(
    (mode) => CHAT_MODE_CONFIGS[mode].surface.advanced
  )
}

export function getDefaultForgeHarnessAgent(
  mode: ChatMode
): ChatModeConfig['runtime']['forgeAgent'] {
  return CHAT_MODE_CONFIGS[mode].runtime.forgeAgent
}

export function getLegacyHarnessAgent(mode: ChatMode): ChatModeConfig['runtime']['legacyAgent'] {
  return CHAT_MODE_CONFIGS[mode].runtime.legacyAgent
}
