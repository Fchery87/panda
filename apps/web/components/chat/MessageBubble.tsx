'use client'

import { Fragment } from 'react'
import { motion } from 'framer-motion'
import Image from 'next/image'
import { toast } from 'sonner'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { Copy, Download, FileText, User, Bot } from 'lucide-react'
import type { Message } from './types'
import type { ChatMode } from '@/lib/agent/prompt-library'
import { ReasoningPanel } from './ReasoningPanel'
import { SuggestedActions } from './SuggestedActions'
import { extractBrainstormPhase, stripBrainstormPhaseMarker } from '@/lib/chat/brainstorming'
import { ChatMarkdown } from './ChatMarkdown'
import { buildAssistantMessageTranscriptBlocks } from '@/lib/chat/transcript-blocks'
import { getChatModeSurfacePresentation } from '@/lib/chat/chat-mode-surface'

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
  // Pattern order matters: code first (most specific), then bold/italic, then links
  const pattern = /(`[^`]+`|\*\*[^*]+\*\*|__[^_]+__|\*[^*]+\*|_[^_]+_|\[[^\]]+\]\([^)]+\))/g
  const parts = text.split(pattern)

  return parts.map((part, index) => {
    // Code: `text`
    const codeMatch = part.match(/^`([^`]+)`$/)
    if (codeMatch) {
      return (
        <code
          key={index}
          className="rounded bg-muted px-1 py-0.5 font-mono text-xs text-foreground"
        >
          {codeMatch[1]}
        </code>
      )
    }

    // Bold: **text** or __text__
    const boldMatch = part.match(/^\*\*([^*]+)\*\*$/) || part.match(/^__([^_]+)__$/)
    if (boldMatch) {
      return (
        <strong key={index} className="font-semibold text-foreground">
          {boldMatch[1]}
        </strong>
      )
    }

    // Italic: *text* or _text_
    const italicMatch = part.match(/^\*([^*]+)\*$/) || part.match(/^_([^_]+)_$/)
    if (italicMatch) {
      return (
        <em key={index} className="italic text-foreground">
          {italicMatch[1]}
        </em>
      )
    }

    // Link: [text](url)
    const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/)
    if (linkMatch) {
      return (
        <a
          key={index}
          href={linkMatch[2]}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-primary underline underline-offset-2 hover:text-primary/80"
        >
          {linkMatch[1]}
        </a>
      )
    }

    return <Fragment key={index}>{part}</Fragment>
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
            className="whitespace-pre-wrap break-words leading-6 tracking-[0.01em] [overflow-wrap:anywhere]"
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

function formatAttachmentSize(size?: number): string | null {
  if (!size || size <= 0) return null
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${Math.round(size / 102.4) / 10} KB`
  return `${Math.round(size / (1024 * 102.4)) / 10} MB`
}

export function MessageBubble({
  message,
  isStreaming = false,
  onSuggestedAction,
  disableActions = false,
}: MessageBubbleProps) {
  const isUser = message.role === 'user'
  const attachmentsOnly = message.annotations?.attachmentsOnly === true
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
  const rolePresentation = message.annotations?.mode
    ? getChatModeSurfacePresentation(message.annotations.mode)
    : null
  const assistantBlocks = isAssistant ? buildAssistantMessageTranscriptBlocks(message) : []
  const reasoningBlock = assistantBlocks.find(
    (block) => block.kind === 'thinking_teaser' || block.kind === 'thinking_redacted'
  )

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
    <div
      className={cn(
        'flex w-full min-w-0 gap-3 lg:gap-4 xl:gap-5',
        isUser ? 'flex-row-reverse' : 'flex-row'
      )}
    >
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
        className={cn('flex min-w-0 flex-1 flex-col gap-1.5', isUser ? 'items-end' : 'items-start')}
      >
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
            {isUser ? 'You' : `Panda · ${rolePresentation?.label ?? 'Assistant'}`}
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

        {reasoningBlock?.kind === 'thinking_teaser' ? (
          <ReasoningPanel
            content={reasoningBlock.fullContent}
            teaser={reasoningBlock.content}
            isStreaming={isStreaming}
          />
        ) : null}
        {reasoningBlock?.kind === 'thinking_redacted' ? (
          <ReasoningPanel content={reasoningBlock.content} redacted />
        ) : null}

        {!attachmentsOnly ? (
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.2, delay: 0.05 }}
            className={cn(
              'relative min-w-0 rounded-none border px-4 py-2.5 text-sm leading-relaxed',
              'px-3 py-2 text-[13px] xl:px-4 xl:py-2.5 xl:text-sm',
              isUser
                ? 'max-w-[85%] self-end bg-primary text-primary-foreground'
                : 'w-full self-stretch bg-muted text-foreground'
            )}
          >
            <div
              className={cn(
                'min-w-0 leading-6 tracking-[0.01em] [overflow-wrap:anywhere]',
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
              ) : isAssistant ? (
                <ChatMarkdown content={displayContent} />
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
        ) : null}

        {message.attachments && message.attachments.length > 0 ? (
          <div className="grid w-full gap-2">
            {message.attachments.map((attachment, index) => {
              const sizeLabel = formatAttachmentSize(attachment.size)
              if (attachment.kind === 'image' && attachment.url) {
                return (
                  <a
                    key={`${attachment.filename}-${index}`}
                    href={attachment.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="surface-1 flex w-full max-w-md flex-col gap-2 border border-border p-2"
                  >
                    <div className="relative aspect-[4/3] w-full overflow-hidden border border-border bg-muted">
                      <Image
                        src={attachment.url}
                        alt={attachment.filename}
                        fill
                        sizes="(max-width: 768px) 100vw, 28rem"
                        className="object-cover"
                        unoptimized
                      />
                    </div>
                    <div className="flex items-center justify-between gap-2 font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
                      <span className="truncate text-foreground">{attachment.filename}</span>
                      <span className="shrink-0">Open</span>
                    </div>
                  </a>
                )
              }

              return (
                <a
                  key={`${attachment.filename}-${index}`}
                  href={attachment.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="surface-1 flex w-full max-w-md items-center gap-3 border border-border px-3 py-2"
                >
                  <div className="flex h-9 w-9 items-center justify-center border border-border bg-muted text-muted-foreground">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1 font-mono text-[11px] uppercase tracking-wide">
                    <div className="truncate text-foreground">{attachment.filename}</div>
                    <div className="truncate text-muted-foreground">
                      {[attachment.contentType, sizeLabel].filter(Boolean).join(' · ') ||
                        'Stored attachment'}
                    </div>
                  </div>
                  <Download className="h-4 w-4 shrink-0 text-muted-foreground" />
                </a>
              )
            })}
          </div>
        ) : null}

        {isAssistant && isBuild && shouldRedactBuildCode && (
          <div className="flex items-center gap-2 px-1">
            <span className="font-mono text-xs text-muted-foreground/70">Build mode</span>
            <span className="font-mono text-xs text-primary/90">
              (code hidden; use artifacts/editor)
            </span>
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
