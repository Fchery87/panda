export type ChatMode = 'ask' | 'plan' | 'code' | 'build'

export interface HandoffRitual {
  systemMessage: string
}

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
    primaryAgent: 'build' | 'code' | 'plan' | 'ask'
  }
  requiresToolCalls: boolean
  outputFormat: 'conversational' | 'action-log'
  handoffRitual?: HandoffRitual
}

export type ModeContract = ChatModeConfig

export const CHAT_MODE_CONFIGS: Record<ChatMode, ChatModeConfig> = {
  ask: {
    description: 'Read-only Q&A',
    fileAccess: 'read-only',
    surface: {
      label: 'Ask',
      shortLabel: 'Ask',
      description: 'Read-only Q&A without touching files or running changes.',
      advanced: false,
      primaryShortcut: '⇧1',
    },
    runtime: {
      primaryAgent: 'ask',
    },
    requiresToolCalls: false,
    outputFormat: 'conversational',
  },
  plan: {
    description: 'Clarify, scope, draft, and approve a plan',
    fileAccess: 'read-only',
    surface: {
      label: 'Plan',
      shortLabel: 'Plan',
      description: 'Clarify scope, draft the plan, and get approval before execution.',
      advanced: false,
      primaryShortcut: '⇧2',
    },
    runtime: {
      primaryAgent: 'plan',
    },
    requiresToolCalls: false,
    outputFormat: 'conversational',
  },
  code: {
    description: 'Execute code changes with read/write/command access',
    fileAccess: 'read-write',
    surface: {
      label: 'Code',
      shortLabel: 'Code',
      description: 'Execute code changes directly with read, write, and command access.',
      advanced: false,
      primaryShortcut: '⇧3',
    },
    runtime: {
      primaryAgent: 'code',
    },
    requiresToolCalls: true,
    outputFormat: 'action-log',
    handoffRitual: {
      systemMessage:
        'You are now in Build mode. Your FIRST action is to call write_files or run_command — never narrate what you plan to do without calling a tool. Read the approved plan, identify step 1, and execute it.',
    },
  },
  build: {
    description: 'Full-access build mode for direct expert execution',
    fileAccess: 'read-write',
    surface: {
      label: 'Build',
      shortLabel: 'Build',
      description: 'Full-access mode for direct expert execution of complex tasks.',
      advanced: false,
      primaryShortcut: '⇧4',
    },
    runtime: {
      primaryAgent: 'build',
    },
    requiresToolCalls: true,
    outputFormat: 'action-log',
    handoffRitual: {
      systemMessage:
        'You are now in Builder mode. Your FIRST action is to call write_files or run_command — never narrate what you plan to do without calling a tool.',
    },
  },
}

export function getPrimaryChatModes(): ChatMode[] {
  return (Object.keys(CHAT_MODE_CONFIGS) as ChatMode[]).filter(
    (mode) => !CHAT_MODE_CONFIGS[mode].surface.advanced
  )
}

export function getAdvancedChatModes(): ChatMode[] {
  return (Object.keys(CHAT_MODE_CONFIGS) as ChatMode[]).filter(
    (mode) => CHAT_MODE_CONFIGS[mode].surface.advanced
  )
}

export function getDefaultHarnessAgent(mode: ChatMode): ChatModeConfig['runtime']['primaryAgent'] {
  return CHAT_MODE_CONFIGS[mode].runtime.primaryAgent
}
