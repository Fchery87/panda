'use client'

import type { Id } from '@convex/_generated/dataModel'
import { EvalPanel } from '@/components/chat/EvalPanel'

export interface InspectorEvalsContentProps {
  projectId: Id<'projects'>
  chatId?: Id<'chats'> | null
  lastUserPrompt?: string | null
  lastAssistantReply?: string | null
  onRunEvalScenario?: (scenario: {
    input?: unknown
    prompt?: string
    expected?: unknown
    mode?: string
    evalMode?: 'read_only' | 'full'
    subagentName?: string
  }) => Promise<{
    output: string
    error?: string
    usage?: { promptTokens: number; completionTokens: number; totalTokens: number }
  }>
}

export function InspectorEvalsContent({
  projectId,
  chatId,
  lastUserPrompt,
  lastAssistantReply,
  onRunEvalScenario,
}: InspectorEvalsContentProps) {
  return (
    <div className="m-0 space-y-3">
      <div className="bg-background/80 border border-border px-3 py-3">
        <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          Eval checks
        </div>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Re-run common prompts and verification scenarios without leaving the active project
          context.
        </p>
      </div>
      <div className="border border-border bg-background">
        <EvalPanel
          projectId={projectId}
          chatId={chatId}
          lastUserPrompt={lastUserPrompt}
          lastAssistantReply={lastAssistantReply}
          onRunScenario={onRunEvalScenario}
        />
      </div>
    </div>
  )
}
