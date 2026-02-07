export function resolveChatPanelVisibility(options?: { showAdvancedDebugInChat?: boolean }): {
  showInlinePlanDraft: boolean
  showInlineRunTimeline: boolean
} {
  const showAdvancedDebugInChat = options?.showAdvancedDebugInChat ?? false

  return {
    showInlinePlanDraft: false,
    showInlineRunTimeline: showAdvancedDebugInChat,
  }
}
