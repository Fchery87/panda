'use client'

import { useCallback } from 'react'
import { toast } from 'sonner'
import { appLog } from '@/lib/logger'
import { buildInlineChatFailureDisplay } from '@/lib/workbench-navigation'

interface UseProjectInlineEditingParams {
  projectId: string
  isRightPanelOpen: boolean
  isMobileLayout: boolean
  setContextualPrompt: (value: string | null) => void
  setIsRightPanelOpen: (value: boolean | ((prev: boolean) => boolean)) => void
  setRightPanelTab: (tab: 'chat' | 'run' | 'changes' | 'context' | 'preview') => void
  setMobilePrimaryPanel: (panel: 'workspace' | 'chat' | 'review') => void
  runEvalScenario: (args: {
    prompt: string
    mode: 'code'
  }) => Promise<{ output: string; error?: string }>
}

export function useProjectInlineEditing({
  projectId,
  isRightPanelOpen,
  isMobileLayout,
  setContextualPrompt,
  setIsRightPanelOpen,
  setRightPanelTab,
  setMobilePrimaryPanel,
  runEvalScenario,
}: UseProjectInlineEditingParams) {
  const handleContextualChat = useCallback(
    (selection: string, filePath: string) => {
      const ext = filePath.split('.').pop() || 'text'
      const prompt = `\`\`\`${ext}\n// ${filePath}\n${selection}\n\`\`\``
      setContextualPrompt(prompt)
      if (!isRightPanelOpen) {
        setIsRightPanelOpen(true)
      }
      setRightPanelTab('chat')
      if (isMobileLayout) {
        setMobilePrimaryPanel('chat')
      }
    },
    [
      isMobileLayout,
      isRightPanelOpen,
      setContextualPrompt,
      setIsRightPanelOpen,
      setMobilePrimaryPanel,
      setRightPanelTab,
    ]
  )

  const handleInlineChat = useCallback(
    async (prompt: string, selection: string, filePath: string) => {
      try {
        const result = await runEvalScenario({
          prompt: `The user wants to edit ${filePath}.\n${selection ? `Selected text:\n\`\`\`\n${selection}\n\`\`\`\n` : ''}User request: ${prompt}\n\nReturn ONLY the new code that should replace the selected text (or be inserted at the cursor). Do NOT wrap it in markdown block quotes. Do NOT add any explanations.`,
          mode: 'code',
        })
        if (result.error) throw new Error(result.error)

        let output = result.output
        if (output.startsWith('```')) {
          const lines = output.split('\n')
          if (lines.length > 2) {
            output = lines.slice(1, -1).join('\n')
          }
        }
        return output
      } catch (err) {
        const failure = buildInlineChatFailureDisplay(err)
        appLog.error('[projects/[projectId]] Inline chat failed', {
          projectId,
          filePath,
          error:
            err instanceof Error
              ? {
                  name: err.name,
                  message: err.message,
                  stack: err.stack,
                }
              : err,
        })
        toast.error(failure.title, {
          description: failure.description,
        })
        return null
      }
    },
    [projectId, runEvalScenario]
  )

  return {
    handleContextualChat,
    handleInlineChat,
  }
}
