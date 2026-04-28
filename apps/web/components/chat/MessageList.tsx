'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { MessageBubble } from './MessageBubble'
import { TranscriptEventRow } from './TranscriptEventRow'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import type { LatestRunReceiptInfo, Message, PersistedRunEventSummaryInfo } from './types'
import type { ChatMode } from '@/lib/agent/prompt-library'
import type { LiveProgressStep } from './live-run-utils'
import type { FormalSpecification } from '@/lib/agent/spec/types'
import type { PlanStatus } from '@/lib/chat/planDraft'
import { buildTranscriptFeedItems } from '@/lib/chat/transcript-blocks'
import { getTranscriptModePolicy } from '@/lib/chat/transcript-policy'

interface MessageListProps {
  messages: Message[]
  isStreaming?: boolean
  onSuggestedAction?: (prompt: string, targetMode?: ChatMode) => void
  liveSteps?: LiveProgressStep[]
  runEvents?: PersistedRunEventSummaryInfo[]
  latestRunReceipt?: LatestRunReceiptInfo | null
  userIntent?: string | null
  currentSpec?: FormalSpecification | null
  pendingSpec?: FormalSpecification | null
  planStatus?: PlanStatus | null
  chatMode: ChatMode
}

export function MessageList({
  messages,
  isStreaming = false,
  onSuggestedAction,
  liveSteps,
  runEvents,
  latestRunReceipt,
  userIntent,
  currentSpec,
  pendingSpec,
  planStatus,
  chatMode,
}: MessageListProps) {
  const parentRef = useRef<HTMLDivElement>(null)
  const [isPinnedToBottom, setIsPinnedToBottom] = useState(true)
  const [showJumpToLatest, setShowJumpToLatest] = useState(false)
  const transcriptPolicy = getTranscriptModePolicy(chatMode)
  const feedItems = useMemo(
    () =>
      buildTranscriptFeedItems({
        messages,
        chatMode,
        liveSteps,
        runEvents,
        latestRunReceipt: latestRunReceipt?.receipt,
        userIntent,
        currentSpec,
        pendingSpec,
        planStatus,
        isStreaming,
      }),
    [
      messages,
      chatMode,
      liveSteps,
      runEvents,
      latestRunReceipt?.receipt,
      userIntent,
      currentSpec,
      pendingSpec,
      planStatus,
      isStreaming,
    ]
  )
  const lastAssistantMessageId = [...messages]
    .reverse()
    .find((message) => message.role === 'assistant')?._id
  const failedCriteria = useMemo(() => {
    if (currentSpec?.status !== 'failed' || !currentSpec.verificationResults?.length) {
      return []
    }

    return currentSpec.verificationResults
      .filter((result) => !result.passed)
      .map((result) => ({
        id: result.criterionId,
        description:
          currentSpec.intent.acceptanceCriteria.find(
            (criterion) => criterion.id === result.criterionId
          )?.behavior ??
          result.message ??
          result.criterionId,
      }))
  }, [currentSpec])

  const virtualizer = useVirtualizer({
    count: feedItems.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 120,
    overscan: 5,
  })

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (feedItems.length > 0 && isPinnedToBottom) {
      virtualizer.scrollToIndex(feedItems.length - 1, {
        align: 'end',
        behavior: isStreaming ? 'auto' : 'smooth',
      })
      setShowJumpToLatest(false)
    } else if (feedItems.length > 0 && !isPinnedToBottom) {
      setShowJumpToLatest(true)
    }
  }, [feedItems.length, isPinnedToBottom, isStreaming, virtualizer])

  const updatePinnedState = () => {
    const element = parentRef.current
    if (!element) return
    const distanceFromBottom = element.scrollHeight - element.scrollTop - element.clientHeight
    const isPinned = distanceFromBottom < 80
    setIsPinnedToBottom(isPinned)
    if (isPinned) {
      setShowJumpToLatest(false)
    }
  }

  const handleJumpToLatest = () => {
    if (feedItems.length === 0) return
    virtualizer.scrollToIndex(feedItems.length - 1, {
      align: 'end',
      behavior: 'smooth',
    })
    setIsPinnedToBottom(true)
    setShowJumpToLatest(false)
  }

  useEffect(() => {
    const element = parentRef.current
    if (!element) return
    updatePinnedState()
    element.addEventListener('scroll', updatePinnedState, { passive: true })
    return () => element.removeEventListener('scroll', updatePinnedState)
  }, [feedItems.length])

  if (feedItems.length === 0) {
    return (
      <div className="h-full min-h-0 min-w-0 overflow-auto">
        <div
          className={cn(
            'flex h-full min-h-[300px] flex-col items-center justify-center',
            'px-6 text-center sm:px-8'
          )}
        >
          <div className="max-w-sm border border-border bg-background/80 px-6 py-6 text-sm text-muted-foreground">
            <p className="mb-2 font-medium text-foreground">No messages yet</p>
            <p className="max-w-[32ch] text-xs leading-relaxed">
              Start a conversation to define the next task, review a plan, or continue the active
              work thread.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div ref={parentRef} className="relative h-full min-h-0 min-w-0 overflow-auto">
      <div
        className="relative w-full"
        style={{ height: `${virtualizer.getTotalSize()}px` }}
        role="log"
        aria-live="polite"
        aria-label="Chat messages"
        data-transcript-policy={transcriptPolicy.mode}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const item = feedItems[virtualRow.index]
          return (
            <div
              key={item.id}
              data-index={virtualRow.index}
              ref={virtualizer.measureElement}
              className="absolute left-0 top-0 w-full px-3 py-2 xl:px-4"
              style={{ transform: `translateY(${virtualRow.start}px)` }}
            >
              {item.type === 'message' ? (
                <MessageBubble
                  message={item.message}
                  isStreaming={isStreaming && item.message._id === lastAssistantMessageId}
                  onSuggestedAction={onSuggestedAction}
                  disableActions={isStreaming}
                  failedCriteria={item.message._id === lastAssistantMessageId ? failedCriteria : []}
                />
              ) : (
                <TranscriptEventRow block={item.block} />
              )}
            </div>
          )
        })}
      </div>
      {showJumpToLatest ? (
        <div className="pointer-events-none sticky bottom-3 z-10 flex justify-center px-3">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleJumpToLatest}
            className="shadow-sharp-sm pointer-events-auto rounded-none border-primary/40 bg-background/95 font-mono text-[10px] uppercase tracking-[0.18em]"
          >
            Jump To Latest
          </Button>
        </div>
      ) : null}
    </div>
  )
}
