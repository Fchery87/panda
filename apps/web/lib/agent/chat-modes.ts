export type ChatMode = 'ask' | 'plan' | 'code' | 'build'

export interface HandoffRitual {
  systemMessage: string
}

export interface ModeTransitionRitual {
  fromMode: ChatMode | null
  toMode: ChatMode
  approvedPlanId: string | null
  activeSpecId: string | null
  firstAction: string
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
    description: 'Research and answer without changing files',
    fileAccess: 'read-only',
    surface: {
      label: 'Ask',
      shortLabel: 'Ask',
      description: 'Research, explain, and answer without changing files.',
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
    description: 'Turn intent and findings into an implementation plan',
    fileAccess: 'read-only',
    surface: {
      label: 'Plan',
      shortLabel: 'Plan',
      description: 'Turn findings into a clear implementation plan before execution.',
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
    description: 'Make focused code changes and verify them',
    fileAccess: 'read-write',
    surface: {
      label: 'Code',
      shortLabel: 'Code',
      description: 'Make focused code changes, then run the right checks.',
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
    description: 'Execute broad changes end-to-end',
    fileAccess: 'read-write',
    surface: {
      label: 'Build',
      shortLabel: 'Build',
      description: 'Execute broad changes end-to-end and keep validating.',
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

export function buildModeTransitionRitual(args: {
  fromMode?: ChatMode | null
  toMode: ChatMode
  approvedPlanId?: string | null
  activeSpecId?: string | null
}): ModeTransitionRitual {
  const config = CHAT_MODE_CONFIGS[args.toMode]
  const firstAction = config.requiresToolCalls
    ? 'call an appropriate tool before narrating progress'
    : 'answer directly within the current mode boundaries'
  const lines = [
    `Previous mode: ${args.fromMode ?? 'none'}`,
    `Current mode: ${args.toMode}`,
    `Approved plan: ${args.approvedPlanId ?? 'none'}`,
    `Active spec: ${args.activeSpecId ?? 'none'}`,
    `First action: ${firstAction}.`,
  ]

  if (config.handoffRitual?.systemMessage) {
    lines.push('', config.handoffRitual.systemMessage)
  }

  return {
    fromMode: args.fromMode ?? null,
    toMode: args.toMode,
    approvedPlanId: args.approvedPlanId ?? null,
    activeSpecId: args.activeSpecId ?? null,
    firstAction,
    systemMessage: lines.join('\n'),
  }
}
