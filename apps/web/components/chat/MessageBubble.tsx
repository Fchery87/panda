'use client'

import { motion } from 'framer-motion'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { User, Bot } from 'lucide-react'
import type { Message } from './types'

interface MessageBubbleProps {
  message: Message
  isStreaming?: boolean
  resendInBuildContent?: string
  onResendInBuild?: (content: string) => void
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
  resendInBuildContent,
  onResendInBuild,
  disableActions = false,
}: MessageBubbleProps) {
  const isUser = message.role === 'user'
  const isAssistant = message.role === 'assistant'
  const isDiscuss = message.annotations?.mode === 'discuss'
  const isBuild = message.annotations?.mode === 'build'
  const hasFencedCode = isAssistant && isDiscuss && message.content.includes('```')
  const shouldRedactBuildCode = isAssistant && isBuild && message.content.includes('```')
  const displayContent = shouldRedactBuildCode
    ? redactFencedCodeBlocks(message.content)
    : message.content

  return (
    <div
      className={cn(
        'flex gap-3',
        isUser ? 'flex-row-reverse' : 'flex-row'
      )}
    >
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
            <>
              <AvatarImage src="/bot-avatar.png" alt="Assistant" />
              <AvatarFallback className="bg-secondary text-secondary-foreground">
                <Bot className="h-4 w-4" />
              </AvatarFallback>
            </>
          )}
        </Avatar>
      </motion.div>

      {/* Message Content */}
      <div className={cn('flex flex-col gap-1 max-w-[75%]', isUser ? 'items-end' : 'items-start')}>
        {/* Header */}
        <div className={cn('flex items-center gap-2', isUser ? 'flex-row-reverse' : 'flex-row')}>
          <span className="text-xs font-medium text-muted-foreground">
            {isUser ? 'You' : 'Assistant'}
          </span>
          {message.annotations?.model && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              {message.annotations.model}
            </Badge>
          )}
          <span className="text-[10px] text-muted-foreground/60">
            {formatTimestamp(message.createdAt)}
          </span>
        </div>

        {/* Message Bubble */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.2, delay: 0.05 }}
          className={cn(
            'relative px-4 py-2.5 rounded-2xl text-sm leading-relaxed',
            isUser
              ? 'bg-primary text-primary-foreground rounded-tr-sm'
              : 'bg-muted text-foreground rounded-tl-sm'
          )}
        >
          <div className="whitespace-pre-wrap break-words">
            {displayContent}
            {isStreaming && (
              <motion.span
                className={cn(
                  'inline-block w-0.5 h-4 ml-0.5 align-middle',
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
            <span className="text-[10px] text-muted-foreground/70 font-mono">
              Build mode
            </span>
            <span className="text-[10px] text-amber-500/90 font-mono">
              (code hidden; use artifacts/editor)
            </span>
          </div>
        )}

        {isAssistant && isDiscuss && (
          <div className="flex items-center gap-2 px-1">
            <span className="text-[10px] text-muted-foreground/70 font-mono">
              Plan mode
            </span>
            {hasFencedCode && (
              <span className="text-[10px] text-amber-500/90 font-mono">
                (response includes code; expected a plan)
              </span>
            )}
            {onResendInBuild && resendInBuildContent && (
              <Button
                size="sm"
                variant="default"
                className="h-7 rounded-none font-mono text-xs"
                disabled={disableActions || isStreaming}
                onClick={() => onResendInBuild(resendInBuildContent)}
              >
                Build this
              </Button>
            )}
          </div>
        )}

        {/* Token Count (if available) */}
        {message.annotations?.tokenCount && (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-[10px] text-muted-foreground/60 px-1"
          >
            {message.annotations.tokenCount} tokens
          </motion.span>
        )}
      </div>
    </div>
  )
}
