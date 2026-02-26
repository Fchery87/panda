'use client'

import { Fragment } from 'react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { Copy, User, Bot } from 'lucide-react'
import type { Message } from './types'
import type { ChatMode } from '@/lib/agent/prompt-library'
import { ReasoningPanel } from './ReasoningPanel'
import { SuggestedActions } from './SuggestedActions'
import { extractBrainstormPhase, stripBrainstormPhaseMarker } from '@/lib/chat/brainstorming'

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

function renderInlineFormatting(text: string) {
  const parts = text.split(/(\*\*.*?\*\*)/g)
  return parts.map((part, index) => {
    const boldMatch = part.match(/^\*\*(.*?)\*\*$/)
    if (!boldMatch) return <Fragment key={index}>{part}</Fragment>
    return (
      <strong key={index} className="font-semibold text-foreground">
        {boldMatch[1]}
      </strong>
    )
  })
}

type ArchitectSection = {
  key: string
  title?: string
  bodyLines: string[]
  kind: 'section' | 'text'
}

function parseArchitectSections(content: string): ArchitectSection[] {
  const lines = content.split('\n')
  const sections: ArchitectSection[] = []
  let current: ArchitectSection | null = null

  const pushCurrent = () => {
    if (!current) return
    sections.push(current)
    current = null
  }

  for (const rawLine of lines) {
    const line = rawLine.trimEnd()
    const sectionMatch = line.match(/^\s*(?:\d+[.)]\s+)?\*\*(.+?)\*\*\s*(.*)$/)
    if (sectionMatch) {
      pushCurrent()
      current = {
        key: `section-${sections.length}`,
        title: sectionMatch[1],
        bodyLines: sectionMatch[2] ? [sectionMatch[2]] : [],
        kind: 'section',
      }
      continue
    }

    if (!current) {
      current = {
        key: `text-${sections.length}`,
        bodyLines: [line],
        kind: 'text',
      }
    } else {
      current.bodyLines.push(line)
    }
  }

  pushCurrent()

  return sections
}

function renderArchitectBody(lines: string[]) {
  const blocks: Array<
    | { type: 'p'; lines: string[] }
    | { type: 'ul'; lines: string[] }
    | { type: 'ol'; lines: string[] }
  > = []

  const flushParagraph = (bucket: string[]) => {
    if (bucket.length === 0) return
    blocks.push({ type: 'p', lines: [...bucket] })
    bucket.length = 0
  }

  const paragraphBucket: string[] = []

  for (const raw of lines) {
    const line = raw.trim()
    if (line.length === 0) {
      flushParagraph(paragraphBucket)
      continue
    }

    if (/^[-*]\s+/.test(line)) {
      flushParagraph(paragraphBucket)
      const text = line.replace(/^[-*]\s+/, '')
      const prev = blocks[blocks.length - 1]
      if (prev?.type === 'ul') {
        prev.lines.push(text)
      } else {
        blocks.push({ type: 'ul', lines: [text] })
      }
      continue
    }

    if (/^\d+[.)]\s+/.test(line)) {
      flushParagraph(paragraphBucket)
      const text = line.replace(/^\d+[.)]\s+/, '')
      const prev = blocks[blocks.length - 1]
      if (prev?.type === 'ol') {
        prev.lines.push(text)
      } else {
        blocks.push({ type: 'ol', lines: [text] })
      }
      continue
    }

    paragraphBucket.push(line)
  }

  flushParagraph(paragraphBucket)

  return (
    <div className="space-y-2">
      {blocks.map((block, blockIndex) => {
        if (block.type === 'ul') {
          return (
            <ul
              key={`ul-${blockIndex}`}
              className="space-y-1 pl-4 text-[13px] leading-6 xl:text-sm"
            >
              {block.lines.map((line, i) => (
                <li key={i} className="list-disc marker:text-primary/70">
                  {renderInlineFormatting(line)}
                </li>
              ))}
            </ul>
          )
        }

        if (block.type === 'ol') {
          return (
            <ol
              key={`ol-${blockIndex}`}
              className="space-y-1 pl-4 text-[13px] leading-6 xl:text-sm"
            >
              {block.lines.map((line, i) => (
                <li key={i} className="list-decimal marker:font-mono marker:text-muted-foreground">
                  {renderInlineFormatting(line)}
                </li>
              ))}
            </ol>
          )
        }

        return (
          <p
            key={`p-${blockIndex}`}
            className="whitespace-pre-wrap break-words leading-6 tracking-[0.01em]"
          >
            {block.lines.map((line, i) => (
              <Fragment key={i}>
                {i > 0 ? <br /> : null}
                {renderInlineFormatting(line)}
              </Fragment>
            ))}
          </p>
        )
      })}
    </div>
  )
}

function formatBrainstormPhaseLabel(
  phase: ReturnType<typeof extractBrainstormPhase>
): string | null {
  if (!phase) return null
  if (phase === 'validated_plan') return 'Validated Plan'
  if (phase === 'discovery') return 'Discovery'
  if (phase === 'options') return 'Options'
  return null
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
  const isArchitect = message.annotations?.mode === 'architect'
  const brainstormPhase = isAssistant && isArchitect ? extractBrainstormPhase(displayContent) : null
  const architectContent = brainstormPhase
    ? stripBrainstormPhaseMarker(displayContent).trim()
    : displayContent
  const architectSections =
    isAssistant && isArchitect && architectContent ? parseArchitectSections(architectContent) : []
  const hasStructuredArchitectContent =
    !!brainstormPhase || /\*\*.+?\*\*|^\s*(?:[-*]|\d+[.)])\s+/m.test(architectContent)
  const shouldUseArchitectRenderer =
    isAssistant && isArchitect && hasStructuredArchitectContent && architectSections.length > 0
  const brainstormPhaseLabel = formatBrainstormPhaseLabel(brainstormPhase)
  const canCopyValidatedPlan =
    isAssistant &&
    isArchitect &&
    brainstormPhase === 'validated_plan' &&
    architectContent.length > 0

  const handleCopyPlan = async () => {
    if (!canCopyValidatedPlan) return
    try {
      await navigator.clipboard.writeText(architectContent)
      toast.success('Plan copied')
    } catch {
      toast.error('Failed to copy plan')
    }
  }

  return (
    <div className={cn('flex gap-2.5 xl:gap-3', isUser ? 'flex-row-reverse' : 'flex-row')}>
      {/* Avatar */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.2 }}
      >
        <Avatar className={cn('h-7 w-7 shrink-0 xl:h-8 xl:w-8', isUser && 'bg-primary/10')}>
          {isUser ? (
            <AvatarFallback className="bg-primary text-primary-foreground">
              <User className="h-3.5 w-3.5 xl:h-4 xl:w-4" />
            </AvatarFallback>
          ) : (
            <AvatarFallback className="bg-secondary text-secondary-foreground">
              <Bot className="h-3.5 w-3.5 xl:h-4 xl:w-4" />
            </AvatarFallback>
          )}
        </Avatar>
      </motion.div>

      {/* Message Content */}
      <div
        className={cn(
          'flex max-w-[94%] flex-col gap-1.5 xl:max-w-[88%] 2xl:max-w-[78%]',
          isUser ? 'items-end' : 'items-start'
        )}
      >
        {isAssistant && message.reasoningContent && (
          <ReasoningPanel content={message.reasoningContent} isStreaming={isStreaming} />
        )}

        {brainstormPhaseLabel && (
          <div className="flex w-full items-center gap-2">
            <span className="border border-primary/30 bg-primary/5 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-primary">
              Brainstorm · {brainstormPhaseLabel}
            </span>
            {canCopyValidatedPlan && (
              <button
                type="button"
                onClick={handleCopyPlan}
                className="inline-flex items-center gap-1 border border-border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-foreground"
                title="Copy validated plan"
              >
                <Copy className="h-3 w-3" />
                Copy Plan
              </button>
            )}
          </div>
        )}

        {/* Header */}
        <div
          className={cn(
            'flex flex-wrap items-center gap-x-2 gap-y-1',
            isUser ? 'flex-row-reverse' : 'flex-row'
          )}
        >
          <span className="text-[11px] font-medium text-muted-foreground xl:text-xs">
            {isUser ? 'You' : 'Assistant'}
          </span>
          {message.annotations?.model && (
            <Badge
              variant="secondary"
              className="hidden h-5 px-1.5 py-0 font-mono text-[10px] xl:inline-flex"
              title={String(message.annotations.model)}
            >
              {message.annotations.model}
            </Badge>
          )}
          <span className="font-mono text-[10px] tabular-nums text-muted-foreground/60 xl:text-[11px]">
            {formatTimestamp(message.createdAt)}
          </span>
        </div>

        {/* Message Bubble */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.2, delay: 0.05 }}
          className={cn(
            'relative rounded-none border px-4 py-2.5 text-sm leading-relaxed',
            'px-3 py-2 text-[13px] xl:px-4 xl:py-2.5 xl:text-sm',
            isUser ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'
          )}
        >
          <div
            className={cn(
              'leading-6 tracking-[0.01em]',
              'selection:bg-primary/20 selection:text-foreground',
              isUser && 'selection:bg-primary-foreground/20 selection:text-primary-foreground'
            )}
          >
            {shouldUseArchitectRenderer ? (
              <div className="space-y-2.5">
                {architectSections.map((section, sectionIndex) => {
                  if (section.kind === 'section') {
                    return (
                      <div
                        key={section.key}
                        className={cn(
                          'border border-border/70 bg-background/40 px-2.5 py-2',
                          sectionIndex === 0 && 'border-primary/25'
                        )}
                      >
                        <div className="mb-1.5 font-mono text-[11px] uppercase tracking-wide text-foreground/90">
                          {section.title}
                        </div>
                        {renderArchitectBody(section.bodyLines)}
                      </div>
                    )
                  }

                  return <div key={section.key}>{renderArchitectBody(section.bodyLines)}</div>
                })}
              </div>
            ) : (
              <div className="whitespace-pre-wrap break-words">{displayContent}</div>
            )}
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
            <span className="font-mono text-xs text-primary/90">
              (code hidden; use artifacts/editor)
            </span>
          </div>
        )}

        {isAssistant && message.toolCalls && message.toolCalls.length > 0 && (
          <div className="w-full space-y-1.5 px-1 pt-1">
            {message.toolCalls.map((call) => (
              <div
                key={call.id}
                className="border border-border bg-background/70 px-2 py-1.5 font-mono text-[11px]"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-foreground/90">{call.name}</span>
                  <span
                    className={cn(
                      'shrink-0 border px-1 py-0 uppercase tracking-wide',
                      call.status === 'error'
                        ? 'border-destructive/40 text-destructive'
                        : 'border-border text-muted-foreground'
                    )}
                  >
                    {call.status}
                  </span>
                </div>
                {call.result?.error && (
                  <div className="mt-1 whitespace-pre-wrap break-words leading-relaxed text-destructive">
                    {call.result.error}
                  </div>
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
