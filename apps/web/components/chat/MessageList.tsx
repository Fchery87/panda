'use client'

import { useEffect, useMemo, useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { MessageBubble } from './MessageBubble'
import { TranscriptEventRow } from './TranscriptEventRow'
import { cn } from '@/lib/utils'
import type { Message, PersistedRunEventInfo } from './types'
import type { ChatMode } from '@/lib/agent/prompt-library'
import type { LiveProgressStep } from './live-run-utils'
import type { FormalSpecification } from '@/lib/agent/spec/types'
import type { PlanStatus } from '@/lib/chat/planDraft'
import { buildTranscriptFeedItems } from '@/lib/chat/transcript-blocks'

interface MessageListProps {
  messages: Message[]
  isStreaming?: boolean
  onSuggestedAction?: (prompt: string, targetMode?: ChatMode) => void
  liveSteps?: LiveProgressStep[]
  runEvents?: PersistedRunEventInfo[]
  currentSpec?: FormalSpecification | null
  pendingSpec?: FormalSpecification | null
  planStatus?: PlanStatus | null
}

export function MessageList({
  messages,
  isStreaming = false,
  onSuggestedAction,
  liveSteps,
  runEvents,
  currentSpec,
  pendingSpec,
  planStatus,
}: MessageListProps) {
  const parentRef = useRef<HTMLDivElement>(null)
  const feedItems = useMemo(
    () =>
      buildTranscriptFeedItems({
        messages,
        liveSteps,
        runEvents,
        currentSpec,
        pendingSpec,
        planStatus,
        isStreaming,
      }),
    [messages, liveSteps, runEvents, currentSpec, pendingSpec, planStatus, isStreaming]
  )
  const lastAssistantMessageId = [...messages]
    .reverse()
    .find((message) => message.role === 'assistant')?._id

  const virtualizer = useVirtualizer({
    count: feedItems.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 120,
    overscan: 5,
  })

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (feedItems.length > 0) {
      virtualizer.scrollToIndex(feedItems.length - 1, { align: 'end', behavior: 'smooth' })
    }
  }, [feedItems.length, isStreaming, virtualizer])

  if (feedItems.length === 0) {
    return (
      <div className="h-full min-h-0 min-w-0 overflow-auto">
        <div
          className={cn(
            'flex h-full min-h-[300px] flex-col items-center justify-center',
            'px-6 text-center sm:px-8'
          )}
        >
          <div className="text-sm text-muted-foreground">
            <p className="mb-2 font-medium">No messages yet</p>
            <p className="max-w-[28ch] text-xs leading-relaxed">
              Start a conversation to begin chatting with the AI assistant.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div ref={parentRef} className="h-full min-h-0 min-w-0 overflow-auto">
      <div
        className="relative w-full"
        style={{ height: `${virtualizer.getTotalSize()}px` }}
        role="log"
        aria-live="polite"
        aria-label="Chat messages"
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
                />
              ) : (
                <TranscriptEventRow block={item.block} />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
