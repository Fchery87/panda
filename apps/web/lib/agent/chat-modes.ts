export type ChatMode = 'ask' | 'plan' | 'code' | 'build'
export type PrimaryMode = 'ask' | 'plan' | 'agent'
export type AgentAutonomy = 'guided' | 'autopilot'
export type SecondaryAction = 'debug' | 'review' | 'docs'
export type AutoModeSwitchPolicy = 'auto' | 'suggest' | 'manual'

export interface ModeSelection {
  primaryMode: PrimaryMode
  autonomy?: AgentAutonomy
  secondaryAction?: SecondaryAction | null
}

export interface PrimaryModeSurface {
  id: PrimaryMode
  label: string
  shortLabel: string
  description: string
  primaryShortcut?: string
  defaultRuntimeMode: ChatMode
  allowedAutonomy?: AgentAutonomy[]
  defaultAutonomy?: AgentAutonomy
}

export interface SecondaryActionConfig {
  id: SecondaryAction
  label: string
  description: string
  defaultModeSelection: ModeSelection
  promptHint: string
}

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

export type ModeLayoutEmphasis =
  | 'chat-dominant'
  | 'plan-context'
  | 'editor-chat'
  | 'workbench-dominant'

export interface ModeLayoutHint {
  emphasis: ModeLayoutEmphasis
  editorDefaultSize: number
  chatDefaultSize: number
  inspectorDefaultOpen: boolean
}

export interface ChatModeConfig {
  description: string
  fileAccess: 'read-only' | 'read-write'
  layout: ModeLayoutHint
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

export const PRIMARY_MODE_SURFACES: Record<PrimaryMode, PrimaryModeSurface> = {
  ask: {
    id: 'ask',
    label: 'Ask',
    shortLabel: 'Ask',
    description: 'Research, explain, audit, and answer without changing files.',
    primaryShortcut: '⇧1',
    defaultRuntimeMode: 'ask',
  },
  plan: {
    id: 'plan',
    label: 'Plan',
    shortLabel: 'Plan',
    description: 'Turn findings and constraints into a durable implementation plan.',
    primaryShortcut: '⇧2',
    defaultRuntimeMode: 'plan',
  },
  agent: {
    id: 'agent',
    label: 'Agent',
    shortLabel: 'Agent',
    description: 'Implement, verify, and iterate with selectable autonomy.',
    primaryShortcut: '⇧3',
    defaultRuntimeMode: 'code',
    allowedAutonomy: ['guided', 'autopilot'],
    defaultAutonomy: 'guided',
  },
}

export const SECONDARY_ACTION_CONFIGS: Record<SecondaryAction, SecondaryActionConfig> = {
  debug: {
    id: 'debug',
    label: 'Debug',
    description: 'Investigate, reproduce, patch, and verify a bug.',
    defaultModeSelection: { primaryMode: 'agent', autonomy: 'guided', secondaryAction: 'debug' },
    promptHint:
      'Use a hypothesis-driven debug loop: hypothesize, inspect/reproduce, instrument if needed, patch, then verify.',
  },
  review: {
    id: 'review',
    label: 'Review',
    description: 'Review a diff, plan, implementation, or selected files.',
    defaultModeSelection: { primaryMode: 'ask', secondaryAction: 'review' },
    promptHint:
      'Review the target carefully, separate blockers from suggestions, and cite concrete files or plan sections.',
  },
  docs: {
    id: 'docs',
    label: 'Docs',
    description: 'Create or update documentation and implementation notes.',
    defaultModeSelection: { primaryMode: 'agent', autonomy: 'guided', secondaryAction: 'docs' },
    promptHint:
      'Focus on documentation changes and keep code edits out of scope unless explicitly requested.',
  },
}

export const CHAT_MODE_CONFIGS: Record<ChatMode, ChatModeConfig> = {
  ask: {
    description: 'Research and answer without changing files',
    fileAccess: 'read-only',
    layout: {
      emphasis: 'chat-dominant',
      editorDefaultSize: 38,
      chatDefaultSize: 62,
      inspectorDefaultOpen: false,
    },
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
    layout: {
      emphasis: 'plan-context',
      editorDefaultSize: 52,
      chatDefaultSize: 48,
      inspectorDefaultOpen: false,
    },
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
    layout: {
      emphasis: 'editor-chat',
      editorDefaultSize: 60,
      chatDefaultSize: 40,
      inspectorDefaultOpen: false,
    },
    surface: {
      label: 'Agent · Guided',
      shortLabel: 'Guided',
      description: 'Agent mode with review prompts before edits and commands.',
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
        'You are now in Code mode. Your FIRST action is to call write_files or run_command — never narrate what you plan to do without calling a tool. Make the focused change, then verify it.',
    },
  },
  build: {
    description: 'Execute broad changes end-to-end',
    fileAccess: 'read-write',
    layout: {
      emphasis: 'workbench-dominant',
      editorDefaultSize: 70,
      chatDefaultSize: 30,
      inspectorDefaultOpen: false,
    },
    surface: {
      label: 'Agent · Autopilot',
      shortLabel: 'Autopilot',
      description: 'Agent mode that applies safe changes and interrupts for risky actions.',
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

export function resolveRuntimeMode(selection: ModeSelection): ChatMode {
  if (selection.primaryMode === 'ask') return 'ask'
  if (selection.primaryMode === 'plan') return 'plan'
  return selection.autonomy === 'autopilot' ? 'build' : 'code'
}

export function modeSelectionFromRuntimeMode(mode: ChatMode): ModeSelection {
  if (mode === 'ask') return { primaryMode: 'ask' }
  if (mode === 'plan') return { primaryMode: 'plan' }
  if (mode === 'build') return { primaryMode: 'agent', autonomy: 'autopilot' }
  return { primaryMode: 'agent', autonomy: 'guided' }
}

export function getPrimaryModeSurfaces(): PrimaryModeSurface[] {
  return [PRIMARY_MODE_SURFACES.ask, PRIMARY_MODE_SURFACES.plan, PRIMARY_MODE_SURFACES.agent]
}

export function getAgentAutonomyOptions(): Array<{
  id: AgentAutonomy
  label: string
  description: string
  runtimeMode: ChatMode
}> {
  return [
    {
      id: 'guided',
      label: 'Guided',
      description: 'Review edits and commands before they run.',
      runtimeMode: 'code',
    },
    {
      id: 'autopilot',
      label: 'Autopilot',
      description: 'Let Panda apply safe changes and interrupt for risky actions.',
      runtimeMode: 'build',
    },
  ]
}

export function getSecondaryActions(): SecondaryActionConfig[] {
  return [
    SECONDARY_ACTION_CONFIGS.debug,
    SECONDARY_ACTION_CONFIGS.review,
    SECONDARY_ACTION_CONFIGS.docs,
  ]
}

/**
 * Legacy runtime modes retained for compatibility with persisted chats and the harness.
 * New UI should prefer getPrimaryModeSurfaces() plus getAgentAutonomyOptions().
 */
export function getPrimaryChatModes(): ChatMode[] {
  return ['ask', 'plan', 'code']
}

export function getAdvancedChatModes(): ChatMode[] {
  return []
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
