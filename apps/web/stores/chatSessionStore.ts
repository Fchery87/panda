import { create } from 'zustand'

import type { Id } from '@convex/_generated/dataModel'

import type { ChatMode } from '@/lib/agent/prompt-library'

export type OversightLevel = 'review' | 'autopilot'

export interface UiModelSelection {
  providerId: string
  modelId: string
}

export interface ChatSessionState {
  activeChatId: Id<'chats'> | null
  chatMode: ChatMode
  architectBrainstormEnabled: boolean
  uiSelectedModel: UiModelSelection | null
  reasoningVariant: string | null
  oversightLevel: OversightLevel
  contextualPrompt: string | null

  setActiveChatId: (id: Id<'chats'> | null) => void
  setChatMode: (mode: ChatMode) => void
  setArchitectBrainstormEnabled: (enabled: boolean) => void
  setUiSelectedModel: (model: UiModelSelection | null) => void
  setReasoningVariant: (variant: string | null) => void
  setOversightLevel: (level: OversightLevel) => void
  setContextualPrompt: (prompt: string | null) => void

  reset: () => void
}

const DEFAULTS = {
  activeChatId: null,
  chatMode: 'build' as ChatMode,
  architectBrainstormEnabled: false,
  uiSelectedModel: null,
  reasoningVariant: null,
  oversightLevel: 'review' as OversightLevel,
  contextualPrompt: null,
}

export const useChatSessionStore = create<ChatSessionState>((set) => ({
  ...DEFAULTS,

  setActiveChatId: (id) =>
    set((state) => ({
      activeChatId: id,
      uiSelectedModel: id !== state.activeChatId ? null : state.uiSelectedModel,
    })),
  setChatMode: (mode) => set({ chatMode: mode }),
  setArchitectBrainstormEnabled: (enabled) => set({ architectBrainstormEnabled: enabled }),
  setUiSelectedModel: (model) => set({ uiSelectedModel: model }),
  setReasoningVariant: (variant) => set({ reasoningVariant: variant }),
  setOversightLevel: (level) => set({ oversightLevel: level }),
  setContextualPrompt: (prompt) => set({ contextualPrompt: prompt }),

  reset: () => set(DEFAULTS),
}))
