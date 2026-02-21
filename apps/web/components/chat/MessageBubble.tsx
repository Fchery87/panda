'use client'

import { motion } from 'framer-motion'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { User, Bot } from 'lucide-react'
import type { Message } from './types'
import type { ChatMode } from '@/lib/agent/prompt-library'
import { ReasoningPanel } from './ReasoningPanel'
import { SuggestedActions } from './SuggestedActions'

interface MessageBubbleProps {
  message: Message
  isStreaming?: boolean
  onSuggestedAction?: (prompt: string, targetMode?: ChatMode) => void
  disableActions?: boolean
}

function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp)
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function redactFencedCodeBlocks(content: string): string {
  if (!content.includes('```')) return content
  return content.replace(/```[\s\S]*?```/g, '[code omitted in Build mode — see artifacts]')
}

export function MessageBubble({
  message,
  isStreaming = false,
  onSuggestedAction,
  disableActions = false,
}: MessageBubbleProps) {
  const isUser = message.role === 'user'
  const isAssistant = message.role === 'assistant'
  const isBuild = message.annotations?.mode === 'build'
  const shouldRedactBuildCode = isAssistant && isBuild && message.content.includes('```')
  const displayContent = shouldRedactBuildCode
    ? redactFencedCodeBlocks(message.content)
    : message.content

  return (
    <div className={cn('flex gap-3', isUser ? 'flex-row-reverse' : 'flex-row')}>
      {/* Avatar */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.2 }}
      >
        <Avatar className={cn('h-8 w-8', isUser && 'bg-primary/10')}>
          {isUser ? (
            <AvatarFallback className="bg-primary text-primary-foreground">
              <User className="h-4 w-4" />
            </AvatarFallback>
          ) : (
            <AvatarFallback className="bg-secondary text-secondary-foreground">
              <Bot className="h-4 w-4" />
            </AvatarFallback>
          )}
        </Avatar>
      </motion.div>

      {/* Message Content */}
      <div className={cn('flex max-w-[75%] flex-col gap-1', isUser ? 'items-end' : 'items-start')}>
        {isAssistant && message.reasoningContent && (
          <ReasoningPanel content={message.reasoningContent} isStreaming={isStreaming} />
        )}

        {/* Header */}
        <div className={cn('flex items-center gap-2', isUser ? 'flex-row-reverse' : 'flex-row')}>
          <span className="text-xs font-medium text-muted-foreground">
            {isUser ? 'You' : 'Assistant'}
          </span>
          {message.annotations?.model && (
            <Badge variant="secondary" className="px-1.5 py-0 text-xs">
              {message.annotations.model}
            </Badge>
          )}
          <span className="text-xs text-muted-foreground/60">
            {formatTimestamp(message.createdAt)}
          </span>
        </div>

        {/* Message Bubble */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.2, delay: 0.05 }}
          className={cn(
            'relative rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
            isUser
              ? 'rounded-tr-sm bg-primary text-primary-foreground'
              : 'rounded-tl-sm bg-muted text-foreground'
          )}
        >
          <div className="whitespace-pre-wrap break-words">
            {displayContent}
            {isStreaming && (
              <motion.span
                className={cn(
                  'ml-0.5 inline-block h-4 w-0.5 align-middle',
                  isUser ? 'bg-primary-foreground' : 'bg-foreground'
                )}
                animate={{ opacity: [1, 0, 1] }}
                transition={{ duration: 0.8, repeat: Infinity, ease: 'easeInOut' }}
              />
            )}
          </div>
        </motion.div>

        {isAssistant && isBuild && shouldRedactBuildCode && (
          <div className="flex items-center gap-2 px-1">
            <span className="font-mono text-xs text-muted-foreground/70">Build mode</span>
            <span className="font-mono text-xs text-amber-500/90">
              (code hidden; use artifacts/editor)
            </span>
          </div>
        )}

        {isAssistant && message.toolCalls && message.toolCalls.length > 0 && (
          <div className="w-full space-y-1 px-1 pt-1">
            {message.toolCalls.map((call) => (
              <div
                key={call.id}
                className="border border-border bg-background/70 px-2 py-1 font-mono text-xs"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate">{call.name}</span>
                  <span className="uppercase text-muted-foreground">{call.status}</span>
                </div>
                {call.result?.error && (
                  <div className="mt-1 text-destructive">{call.result.error}</div>
                )}
              </div>
            ))}
          </div>
        )}
        {/* Suggested Actions */}
        {isAssistant &&
          !isStreaming &&
          message.suggestedActions &&
          message.suggestedActions.length > 0 && (
            <SuggestedActions
              actions={message.suggestedActions}
              disabled={disableActions}
              onAction={(prompt, targetMode) => onSuggestedAction?.(prompt, targetMode)}
            />
          )}
      </div>
    </div>
  )
}
