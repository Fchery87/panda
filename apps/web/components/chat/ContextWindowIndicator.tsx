'use client'

import { useState } from 'react'
import { TooltipProvider, Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  generateStructuredSummary,
  formatSummaryForHandoff,
  type ChatMessage,
} from '@/lib/agent/context/session-summary'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'

interface ContextWindowUsage {
  usedTokens: number
  contextWindow: number
  remainingTokens: number
  usagePct: number
  session: { totalTokens: number }
  currentRun?: { source: string }
}

interface ContextWindowIndicatorProps {
  usage: ContextWindowUsage
  chatHistory: { role: string; content: string }[]
  onNewSession: () => void
}

export function ContextWindowIndicator({
  usage,
  chatHistory,
  onNewSession,
}: ContextWindowIndicatorProps) {
  const [showResetDialog, setShowResetDialog] = useState(false)
  const isWarning = usage.usagePct > 80
  const isCritical = usage.usagePct > 95

  const handleNewSession = () => {
    onNewSession()
    setShowResetDialog(false)
  }

  return (
    <TooltipProvider>
      <div className="flex items-center gap-3">
        {/* Progress Bar with Tooltip */}
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-2">
              <div className="relative h-2 w-20 overflow-hidden rounded-none bg-muted">
                <div
                  className={cn(
                    'absolute inset-y-0 left-0 transition-all duration-300',
                    isCritical ? 'bg-destructive' : isWarning ? 'bg-status-warning' : 'bg-primary'
                  )}
                  style={{ width: `${Math.min(usage.usagePct, 100)}%` }}
                />
              </div>

              <span
                className={cn(
                  'font-mono text-xs',
                  isCritical && 'font-bold text-destructive',
                  isWarning && !isCritical && 'text-status-warning'
                )}
              >
                {usage.usagePct}%
              </span>
            </div>
          </TooltipTrigger>

          <TooltipContent side="bottom" className="max-w-xs">
            <div className="space-y-1 text-xs">
              <p className="font-semibold">Context Window Usage</p>
              <p>Used: {usage.usedTokens.toLocaleString()} tokens</p>
              <p>Window: {usage.contextWindow.toLocaleString()} tokens</p>
              <p>Remaining: {usage.remainingTokens.toLocaleString()} tokens</p>
              <p>Session: {usage.session.totalTokens.toLocaleString()} tokens</p>
              {isWarning && (
                <p
                  className={cn(
                    'mt-2 font-medium',
                    isCritical ? 'text-destructive' : 'text-status-warning'
                  )}
                >
                  {isCritical
                    ? '⚠️ Critical: Context nearly full. Start new session immediately.'
                    : '⚠️ Warning: Performance may degrade. Consider starting a new session.'}
                </p>
              )}
            </div>
          </TooltipContent>
        </Tooltip>

        {/* Warning Icon */}
        {isWarning && (
          <Tooltip>
            <TooltipTrigger asChild>
              <AlertTriangle
                className={cn('h-4 w-4', isCritical ? 'text-destructive' : 'text-status-warning')}
              />
            </TooltipTrigger>
            <TooltipContent>
              {isCritical
                ? 'Context window nearly full. Start new session now.'
                : 'Context window filling up. Consider starting a new session.'}
            </TooltipContent>
          </Tooltip>
        )}

        {/* New Session Button (when warning) */}
        {isWarning && (
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              'h-7 px-2 text-xs',
              isCritical && 'text-destructive hover:bg-destructive/10 hover:text-destructive'
            )}
            onClick={() => setShowResetDialog(true)}
          >
            <RefreshCw className="mr-1 h-3 w-3" />
            New Session
          </Button>
        )}
      </div>

      {/* Session Reset Dialog */}
      <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <DialogContent className="rounded-none sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle
                className={cn('h-5 w-5', isCritical ? 'text-destructive' : 'text-status-warning')}
              />
              Start New Session?
            </DialogTitle>
            <DialogDescription>
              Your context window is at {usage.usagePct}% capacity. Starting a new session will
              reset the conversation history but preserve your files and artifacts.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-none bg-muted p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="font-mono text-xs font-medium">Session Summary</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs"
                  onClick={() => {
                    const summary = generateSummary(chatHistory)
                    navigator.clipboard.writeText(summary)
                  }}
                >
                  Copy
                </Button>
              </div>

              <ScrollArea className="h-[150px] rounded-none border border-border bg-background">
                <div className="p-3 font-mono text-xs text-muted-foreground">
                  {generateSummary(chatHistory)}
                </div>
              </ScrollArea>
            </div>

            <p className="text-xs text-muted-foreground">
              Tip: Copy the summary above and paste it in the new session to maintain context.
            </p>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowResetDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleNewSession} variant={isCritical ? 'destructive' : 'default'}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Start New Session
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  )
}

function generateSummary(
  history: {
    role: string
    content: string
    toolCalls?: Array<{ name: string; args: Record<string, unknown>; output?: string }>
  }[]
): string {
  if (history.length === 0) return 'No conversation history'

  // Convert to ChatMessage format
  const messages: ChatMessage[] = history.map((msg) => ({
    role: msg.role as 'user' | 'assistant' | 'tool',
    content: msg.content,
    toolCalls: msg.toolCalls,
  }))

  const summary = generateStructuredSummary({ messages })
  return formatSummaryForHandoff(summary)
}
