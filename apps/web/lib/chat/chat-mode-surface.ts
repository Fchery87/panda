import type { ChatMode } from '@/lib/agent/prompt-library'

export type ChatModeSurfacePresentation = {
  mode: ChatMode
  label: string
  shortLabel: string
  description: string
  advanced: boolean
}

const SURFACE_PRESENTATIONS: Record<ChatMode, ChatModeSurfacePresentation> = {
  ask: {
    mode: 'ask',
    label: 'Build',
    shortLabel: 'Build',
    description: 'Default delivery coordination for everyday requests.',
    advanced: false,
  },
  architect: {
    mode: 'architect',
    label: 'Plan',
    shortLabel: 'Plan',
    description: 'Strategy, architecture, and review decisions.',
    advanced: false,
  },
  code: {
    mode: 'code',
    label: 'Build',
    shortLabel: 'Build',
    description: 'Default delivery coordination for everyday requests.',
    advanced: false,
  },
  build: {
    mode: 'build',
    label: 'Builder',
    shortLabel: 'Bldr',
    description: 'Direct task-scoped execution for advanced users.',
    advanced: true,
  },
}

export function getChatModeSurfacePresentation(mode: ChatMode): ChatModeSurfacePresentation {
  return SURFACE_PRESENTATIONS[mode]
}

export function getPrimaryChatModeSurfaceOptions(): ChatModeSurfacePresentation[] {
  return [SURFACE_PRESENTATIONS.architect, SURFACE_PRESENTATIONS.code]
}

export function getAdvancedChatModeSurfaceOptions(): ChatModeSurfacePresentation[] {
  return [SURFACE_PRESENTATIONS.build]
}
