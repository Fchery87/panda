import {
  CHAT_MODE_CONFIGS,
  getAdvancedChatModes,
  getPrimaryChatModes,
  type ChatMode,
} from '@/lib/agent/chat-modes'

export type ChatModeSurfacePresentation = {
  mode: ChatMode
  label: string
  shortLabel: string
  description: string
  advanced: boolean
}

const SURFACE_PRESENTATIONS: Record<ChatMode, ChatModeSurfacePresentation> = Object.fromEntries(
  (
    Object.entries(CHAT_MODE_CONFIGS) as Array<[ChatMode, (typeof CHAT_MODE_CONFIGS)[ChatMode]]>
  ).map(([mode, config]) => [
    mode,
    {
      mode,
      label: config.surface.label,
      shortLabel: config.surface.shortLabel,
      description: config.surface.description,
      advanced: config.surface.advanced,
    },
  ])
) as Record<ChatMode, ChatModeSurfacePresentation>

function cloneSurfacePresentation(
  presentation: ChatModeSurfacePresentation
): ChatModeSurfacePresentation {
  return { ...presentation }
}

export function getChatModeSurfacePresentation(mode: ChatMode): ChatModeSurfacePresentation {
  return cloneSurfacePresentation(SURFACE_PRESENTATIONS[mode])
}

export function getPrimaryChatModeSurfaceOptions(): ChatModeSurfacePresentation[] {
  return getPrimaryChatModes().map((mode) => cloneSurfacePresentation(SURFACE_PRESENTATIONS[mode]))
}

export function getAdvancedChatModeSurfaceOptions(): ChatModeSurfacePresentation[] {
  return getAdvancedChatModes().map((mode) => cloneSurfacePresentation(SURFACE_PRESENTATIONS[mode]))
}
