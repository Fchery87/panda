'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import {
  IconSend,
  IconStop,
  IconEnhance,
  IconRevert,
  IconAttach,
  IconClose,
} from '@/components/ui/icons'

import { useAction, useMutation, useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import { toast } from 'sonner'
import { AgentSelector } from './AgentSelector'
import { AttachmentButton, type Attachment } from './AttachmentButton'
import { MentionPicker } from './MentionPicker'
import { ModelSelector, type AvailableModel } from './ModelSelector'
import { VariantSelector } from './VariantSelector'
import type { ChatMode } from '@/lib/agent/prompt-library'
import { useEditorContextStore } from '@/stores/editorContextStore'
import { useChatSessionStore } from '@/stores/chatSessionStore'
import { OversightToggle } from './OversightToggle'

/**
 * Enhance state for prompt enhancement button
 */
type EnhanceState = 'idle' | 'enhancing' | 'enhanced'

/**
 * Parse @-mention tokens from the message text.
 * Returns the cleaned message (tokens removed) and extracted file paths.
 */
function parseMentions(text: string): { message: string; contextFiles: string[] } {
  const contextFiles: string[] = []
  const message = text
    .replace(/@([^\s@]+)/g, (_, path) => {
      contextFiles.push(path)
      return ''
    })
    .replace(/\s+/g, ' ')
    .trim()
  return { message, contextFiles }
}

function sanitizeAttachmentFileName(fileName: string): string {
  const trimmed = fileName.trim()
  const fallback = 'attachment'
  const safe = (trimmed || fallback).replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '')

  return safe || fallback
}

function formatAttachmentMessage(args: { message: string; attachmentCount: number }): string {
  const trimmedMessage = args.message.trim()
  if (trimmedMessage) return trimmedMessage
  return ''
}

type UploadedAttachmentPayload = {
  storageId: Id<'_storage'>
  path: string
  filename: string
  kind: 'file' | 'image'
  contentType?: string
  size?: number
  contextFilePath?: string
  url?: string
}

interface ChatInputProps {
  projectId?: Id<'projects'>
  chatId?: Id<'chats'>
  mode?: ChatMode
  onModeChange?: (mode: ChatMode) => void
  architectBrainstormEnabled?: boolean
  onArchitectBrainstormEnabledChange?: (enabled: boolean) => void

  onSendMessage?: (
    content: string,
    mode: ChatMode,
    contextFiles?: string[],
    options?: {
      includeEditorContext?: boolean
      variantCount?: number
      attachments?: UploadedAttachmentPayload[]
      attachmentsOnly?: boolean
      manualModeOverride?: boolean
    }
  ) => void
  isStreaming?: boolean
  onStopStreaming?: () => void
  /** File paths available for @-mention context, from the project file tree */
  filePaths?: string[]
  /** Selected AI model */
  model?: string
  onModelChange?: (model: string) => void
  /** Models derived from enabled providers in settings */
  availableModels?: AvailableModel[]
  /** Reasoning variant (effort level) */
  variant?: string
  onVariantChange?: (variant: string) => void
  /** Whether the current model supports reasoning variants */
  supportsReasoning?: boolean
  contextualPrompt?: string | null
  onContextualPromptHandled?: () => void
  attachmentsEnabled?: boolean
}

export function ChatInput({
  projectId,
  chatId,
  mode: controlledMode,
  onModeChange,
  architectBrainstormEnabled = false,
  onArchitectBrainstormEnabledChange,

  onSendMessage,
  isStreaming = false,
  onStopStreaming,
  filePaths = [],
  model,
  onModelChange,
  availableModels,
  variant = 'none',
  onVariantChange,
  supportsReasoning = false,
  contextualPrompt,
  onContextualPromptHandled,
  attachmentsEnabled = false,
}: ChatInputProps) {
  const [input, setInput] = useState('')
  const [uncontrolledMode, setUncontrolledMode] = useState<ChatMode>('code')
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [includeEditorContext, setIncludeEditorContext] = useState(true)
  const [isUploadingAttachments, setIsUploadingAttachments] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const mentionPickerRef = useRef<import('./MentionPicker').MentionPickerHandle | null>(null)
  const timeoutRefs = useRef<ReturnType<typeof setTimeout>[]>([])
  const shouldReduceMotion = useReducedMotion()

  // @-mention picker state
  const [mentionQuery, setMentionQuery] = useState<string | null>(null)
  const [mentionStart, setMentionStart] = useState<number>(-1)
  const [activeMentionDescendant, setActiveMentionDescendant] = useState<string | undefined>()
  const mentionListId = 'chat-input-mentions'

  // Enhance prompt state
  const [enhanceState, setEnhanceState] = useState<EnhanceState>('idle')
  const [preEnhanceText, setPreEnhanceText] = useState('')

  const scheduleTextareaTask = useCallback((callback: () => void) => {
    const timeout = setTimeout(() => {
      timeoutRefs.current = timeoutRefs.current.filter((entry) => entry !== timeout)
      callback()
    }, 0)
    timeoutRefs.current.push(timeout)
  }, [])

  useEffect(() => {
    return () => {
      for (const timeout of timeoutRefs.current) {
        clearTimeout(timeout)
      }
      timeoutRefs.current = []
    }
  }, [])

  useEffect(() => {
    if (contextualPrompt) {
      setInput((prev) => {
        const separator = prev && !prev.endsWith('\n') ? '\n\n' : ''
        return prev + separator + contextualPrompt
      })
      onContextualPromptHandled?.()

      // Auto-resize
      scheduleTextareaTask(() => {
        if (textareaRef.current) {
          textareaRef.current.style.height = 'auto'
          textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`
          textareaRef.current.focus()
        }
      })
    }
  }, [contextualPrompt, onContextualPromptHandled, scheduleTextareaTask])

  // Convex action for enhancing prompts
  const enhancePrompt = useAction(api.enhancePrompt.enhance)
  const generateAttachmentUploadUrl = useMutation(api.chatAttachments.generateUploadUrl)
  const upsertFile = useMutation(api.files.upsert)

  // Fetch admin defaults and user settings for enhancement LLM configuration
  const adminDefaults = useQuery(api.settings.getAdminDefaults)
  const userSettings = useQuery(api.settings.get)

  const mode = controlledMode ?? uncontrolledMode
  const hasSendContent = input.trim().length > 0 || attachments.length > 0
  const activeFile = useEditorContextStore((state) => state.selectedFilePath)
  const selection = useEditorContextStore((state) => state.selection)
  const oversightLevel = useChatSessionStore((state) => state.oversightLevel)
  const setOversightLevel = useChatSessionStore((state) => state.setOversightLevel)
  const setMode = useCallback(
    (nextMode: ChatMode) => {
      onModeChange?.(nextMode)
      if (controlledMode === undefined) {
        setUncontrolledMode(nextMode)
      }
    },
    [controlledMode, onModeChange]
  )

  const handleAttach = useCallback((attachment: Attachment) => {
    setAttachments((prev) => [...prev, attachment])
  }, [])

  const handleRemoveAttachment = useCallback((id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id))
  }, [])

  const handleSend = useCallback(async () => {
    if ((!input.trim() && attachments.length === 0) || isStreaming || isUploadingAttachments) {
      return
    }

    const { message, contextFiles } = parseMentions(input.trim())
    let uploadedAttachments: UploadedAttachmentPayload[] = []

    if (attachments.length > 0) {
      if (!projectId || !chatId) {
        toast.error('Attachments are unavailable for this chat')
        return
      }

      setIsUploadingAttachments(true)
      try {
        uploadedAttachments = await Promise.all(
          attachments.map(async (attachment) => {
            const sanitizedName = sanitizeAttachmentFileName(attachment.file.name)
            const storedPath = `.panda/attachments/${Date.now()}-${attachment.id}-${sanitizedName}`
            const uploadUrl = await generateAttachmentUploadUrl({ chatId })
            const uploadResult = await fetch(uploadUrl, {
              method: 'POST',
              headers: {
                'Content-Type': attachment.file.type || 'application/octet-stream',
              },
              body: attachment.file,
            })

            if (!uploadResult.ok) {
              throw new Error(`Upload failed with status ${uploadResult.status}`)
            }

            const { storageId } = (await uploadResult.json()) as { storageId: Id<'_storage'> }

            if (attachment.type === 'file') {
              const isTextLike =
                attachment.file.type.startsWith('text/') ||
                attachment.file.type === '' ||
                /\.(txt|md|mdx|json|ya?ml|toml|ini|csv|ts|tsx|js|jsx|mjs|cjs|css|scss|html?|xml|py|rb|go|rs|java|kt|swift|sh|sql)$/i.test(
                  attachment.file.name
                )

              if (isTextLike) {
                await upsertFile({
                  projectId,
                  path: storedPath,
                  content: await attachment.file.text(),
                  isBinary: false,
                })
              }

              return {
                storageId,
                path: storedPath,
                filename: attachment.file.name,
                kind: attachment.type,
                contentType: attachment.file.type || undefined,
                size: attachment.file.size,
                contextFilePath: isTextLike ? storedPath : undefined,
                url: undefined,
              }
            }

            return {
              storageId,
              path: storedPath,
              filename: attachment.file.name,
              kind: attachment.type,
              contentType: attachment.file.type || undefined,
              size: attachment.file.size,
              url: attachment.type === 'image' ? attachment.preview : undefined,
            }
          })
        )
      } catch (error) {
        toast.error('Failed to attach files', {
          description: error instanceof Error ? error.message : 'Unknown error',
        })
        setIsUploadingAttachments(false)
        return
      }
      setIsUploadingAttachments(false)
    }

    const nextContextFiles = [
      ...contextFiles,
      ...uploadedAttachments
        .map((attachment) => attachment.contextFilePath)
        .filter((path): path is string => Boolean(path)),
    ]
    const nextMessage = formatAttachmentMessage({
      message: message || input.trim(),
      attachmentCount: uploadedAttachments.length,
    })

    onSendMessage?.(nextMessage || input.trim(), mode, nextContextFiles, {
      includeEditorContext,
      variantCount: variant === 'parallel:2' ? 2 : undefined,
      attachments: uploadedAttachments,
      attachmentsOnly: !message.trim() && uploadedAttachments.length > 0,
      manualModeOverride: true,
    })
    setInput('')
    setMentionQuery(null)
    setActiveMentionDescendant(undefined)
    setAttachments([])
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }, [
    attachments,
    chatId,
    input,
    isStreaming,
    isUploadingAttachments,
    mode,
    variant,
    onSendMessage,
    projectId,
    generateAttachmentUploadUrl,
    includeEditorContext,
    upsertFile,
  ])

  const handleSendWithReset = useCallback(() => {
    void handleSend()
    // Reset enhance state after sending
    setEnhanceState('idle')
    setPreEnhanceText('')
  }, [handleSend])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (mentionQuery !== null && mentionPickerRef.current?.hasItems()) {
        if (e.key === 'ArrowDown') {
          e.preventDefault()
          mentionPickerRef.current.moveActive('next')
          return
        }

        if (e.key === 'ArrowUp') {
          e.preventDefault()
          mentionPickerRef.current.moveActive('prev')
          return
        }

        if (e.key === 'Enter') {
          e.preventDefault()
          mentionPickerRef.current.selectActive()
          return
        }

        if (e.key === 'Escape') {
          e.preventDefault()
          setMentionQuery(null)
          setActiveMentionDescendant(undefined)
          return
        }
      }

      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSendWithReset()
      }
    },
    [handleSendWithReset, mentionQuery]
  )

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const val = e.target.value
      setInput(val)

      // Auto-resize
      const textarea = e.target
      textarea.style.height = 'auto'
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`

      // Detect @-mention trigger
      const cursor = e.target.selectionStart ?? val.length
      const textBeforeCursor = val.slice(0, cursor)
      const atMatch = textBeforeCursor.match(/@([^\s@]*)$/)

      if (atMatch && filePaths.length > 0) {
        setMentionQuery(atMatch[1])
        setMentionStart(cursor - atMatch[0].length)
      } else {
        setMentionQuery(null)
        setActiveMentionDescendant(undefined)
      }
    },
    [filePaths]
  )

  const handleMentionSelect = useCallback(
    (path: string) => {
      if (mentionStart < 0) return
      // Replace the @query token with @path + space
      const before = input.slice(0, mentionStart)
      const after = input.slice(
        input.indexOf(' ', mentionStart + 1) === -1
          ? input.length
          : input.indexOf(' ', mentionStart + 1)
      )
      const newVal = `${before}@${path} ${after}`
      setInput(newVal)
      setMentionQuery(null)
      setActiveMentionDescendant(undefined)
      // Restore focus
      scheduleTextareaTask(() => {
        if (textareaRef.current) {
          textareaRef.current.focus()
          const pos = (before + `@${path} `).length
          textareaRef.current.setSelectionRange(pos, pos)
        }
      })
    },
    [input, mentionStart, scheduleTextareaTask]
  )

  const handleStop = useCallback(() => {
    onStopStreaming?.()
  }, [onStopStreaming])

  const handleEnhance = useCallback(async () => {
    if (!input.trim() || enhanceState === 'enhancing') return

    // Store current text for potential revert
    setPreEnhanceText(input)
    setEnhanceState('enhancing')

    try {
      // Get the provider to use
      const provider = adminDefaults?.enhancementProvider || 'openai'

      // Get API key from user's provider configs
      const providerConfig = userSettings?.providerConfigs?.[provider] as
        | { apiKey?: string; useCodingPlan?: boolean }
        | undefined
      const apiKey = providerConfig?.apiKey
      const useCodingPlan = provider === 'zai' ? providerConfig?.useCodingPlan : undefined

      const result = await enhancePrompt({
        prompt: input.trim(),
        provider: adminDefaults?.enhancementProvider || undefined,
        model: adminDefaults?.enhancementModel || undefined,
        apiKey,
        useCodingPlan,
      })

      if (result?.enhancedPrompt) {
        setInput(result.enhancedPrompt)
        setEnhanceState('enhanced')

        // Auto-resize textarea after setting new content
        scheduleTextareaTask(() => {
          if (textareaRef.current) {
            textareaRef.current.style.height = 'auto'
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`
          }
        })
      } else {
        throw new Error('No enhanced prompt returned')
      }
    } catch {
      // Restore original text on error
      setInput(preEnhanceText || input)
      setEnhanceState('idle')
      toast.error('Failed to enhance prompt. Please try again.')
    }
  }, [
    input,
    enhanceState,
    enhancePrompt,
    preEnhanceText,
    adminDefaults,
    userSettings,
    scheduleTextareaTask,
  ])

  const handleRevert = useCallback(() => {
    if (preEnhanceText) {
      setInput(preEnhanceText)
      setPreEnhanceText('')
      setEnhanceState('idle')

      // Auto-resize textarea after reverting
      scheduleTextareaTask(() => {
        if (textareaRef.current) {
          textareaRef.current.style.height = 'auto'
          textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`
        }
      })
    }
  }, [preEnhanceText, scheduleTextareaTask])

  useEffect(() => {
    if (textareaRef.current && !isStreaming) {
      textareaRef.current.focus()
    }
  }, [isStreaming])

  return (
    <div className="surface-2 shrink-0 border-t border-border p-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] sm:p-3 sm:pb-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2 px-1">
        <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          Direct Panda
        </div>
        <div className="flex items-center gap-2">
          <span className="border border-border bg-background/70 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            @{filePaths.length} files
          </span>
          {attachments.length > 0 ? (
            <span className="border border-border bg-background/70 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              {attachments.length} attachments
            </span>
          ) : null}
        </div>
      </div>

      <div className="relative border border-border bg-background/90">
        {/* @-mention picker */}
        {mentionQuery !== null && (
          <MentionPicker
            ref={mentionPickerRef}
            filePaths={filePaths}
            query={mentionQuery}
            listId={mentionListId}
            onActiveDescendantChange={setActiveMentionDescendant}
            onSelect={handleMentionSelect}
          />
        )}

        <Textarea
          ref={textareaRef}
          value={input}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          aria-label="Message input"
          aria-autocomplete={mentionQuery !== null ? 'list' : 'none'}
          aria-controls={mentionQuery !== null ? mentionListId : undefined}
          aria-expanded={mentionQuery !== null}
          aria-activedescendant={mentionQuery !== null ? activeMentionDescendant : undefined}
          placeholder="Ask anything, @ to mention, / for workflows"
          disabled={isStreaming || isUploadingAttachments}
          className={cn(
            'max-h-[200px] min-h-[72px] resize-none border-0 pr-10 shadow-none sm:min-h-[88px]',
            'rounded-none bg-background',
            'focus-visible:ring-0',
            'font-mono text-sm placeholder:text-muted-foreground/50'
          )}
          rows={1}
        />

        <AnimatePresence mode="wait">
          {isStreaming ? (
            <motion.div
              key="stop"
              initial={shouldReduceMotion ? { opacity: 0 } : { scale: 0.8, opacity: 0 }}
              animate={shouldReduceMotion ? { opacity: 1 } : { scale: 1, opacity: 1 }}
              exit={shouldReduceMotion ? { opacity: 0 } : { scale: 0.8, opacity: 0 }}
              transition={{ duration: shouldReduceMotion ? 0.01 : 0.1 }}
              className="absolute bottom-3 right-3"
            >
              <Button
                size="icon"
                variant="outline"
                onClick={handleStop}
                aria-label="Stop generation"
                className="h-7 w-7 rounded-none border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
              >
                <IconStop className="h-3 w-3" weight="fill" />
              </Button>
            </motion.div>
          ) : (
            <>
              {/* Enhance prompt button - only show when there's text */}
              <AnimatePresence>
                {input.trim() && (
                  <motion.div
                    key="enhance"
                    initial={shouldReduceMotion ? { opacity: 0 } : { scale: 0.8, opacity: 0 }}
                    animate={shouldReduceMotion ? { opacity: 1 } : { scale: 1, opacity: 1 }}
                    exit={shouldReduceMotion ? { opacity: 0 } : { scale: 0.8, opacity: 0 }}
                    transition={{ duration: shouldReduceMotion ? 0.01 : 0.1 }}
                    className="absolute bottom-3 right-3"
                  >
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={enhanceState === 'enhanced' ? handleRevert : handleEnhance}
                      disabled={enhanceState === 'enhancing' || isStreaming}
                      aria-label={
                        enhanceState === 'enhanced' ? 'Revert enhancement' : 'Enhance prompt'
                      }
                      className={cn(
                        'transition-sharp h-7 w-7 rounded-none',
                        enhanceState === 'enhanced'
                          ? 'border-primary bg-primary/10 text-primary hover:bg-primary/20'
                          : 'border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground',
                        enhanceState === 'enhancing' && 'animate-spin'
                      )}
                    >
                      {enhanceState === 'enhanced' ? (
                        <IconRevert className="h-3 w-3" />
                      ) : (
                        <IconEnhance className="h-3 w-3" weight="duotone" />
                      )}
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )}
        </AnimatePresence>
      </div>

      {/* Inline controls row */}
      <div className="mt-2 flex flex-wrap items-center gap-2 border border-border bg-background/80 px-2 py-2">
        {(activeFile || selection) && (
          <button
            type="button"
            className="flex items-center gap-1 border border-border bg-background/70 px-2 py-1 font-mono text-[11px] text-muted-foreground hover:text-foreground"
            onClick={() => setIncludeEditorContext((value) => !value)}
            title={
              includeEditorContext
                ? 'Click to exclude editor context'
                : 'Click to include editor context'
            }
          >
            {includeEditorContext ? (
              <IconAttach className="h-3 w-3" />
            ) : (
              <IconClose className="h-3 w-3" />
            )}
            {selection
              ? `${selection.filePath}:${selection.startLine}-${selection.endLine}`
              : activeFile}
          </button>
        )}

        {attachmentsEnabled ? (
          <AttachmentButton
            attachments={attachments}
            onAttach={handleAttach}
            onRemove={handleRemoveAttachment}
            disabled={isStreaming || isUploadingAttachments}
          />
        ) : null}

        <AgentSelector mode={mode} onModeChange={setMode} disabled={isStreaming} />

        {onModelChange && (
          <ModelSelector
            value={model || 'claude-sonnet-4-5'}
            onChange={onModelChange}
            disabled={isStreaming}
            availableModels={availableModels}
          />
        )}

        {supportsReasoning && onVariantChange && (
          <VariantSelector currentVariant={variant} onVariantChange={onVariantChange} />
        )}

        {mode === 'plan' && onArchitectBrainstormEnabledChange && (
          <button
            type="button"
            onClick={() => onArchitectBrainstormEnabledChange(!architectBrainstormEnabled)}
            disabled={isStreaming}
            aria-pressed={architectBrainstormEnabled}
            aria-label={
              architectBrainstormEnabled ? 'Disable brainstorming' : 'Enable brainstorming'
            }
            className={cn(
              'transition-sharp border border-border px-2.5 py-1 font-mono text-[11px] uppercase tracking-wide',
              'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary',
              'disabled:pointer-events-none disabled:opacity-50',
              architectBrainstormEnabled
                ? 'border-primary bg-primary/10 text-foreground'
                : 'text-muted-foreground hover:border-foreground/30 hover:text-foreground'
            )}
          >
            Brainstorm
          </button>
        )}

        <OversightToggle
          level={oversightLevel}
          onChange={setOversightLevel}
          disabled={isStreaming}
          className="ml-auto"
        />

        <div className="flex items-center gap-2">
          <span className="hidden font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground sm:inline">
            Enter to send
          </span>

          {!isStreaming && (
            <Button
              size="icon"
              onClick={handleSendWithReset}
              disabled={!hasSendContent}
              aria-label="Send message"
              className={cn(
                'transition-sharp h-7 w-7 rounded-none',
                hasSendContent
                  ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                  : 'bg-secondary text-muted-foreground'
              )}
            >
              <IconSend className="h-3 w-3" weight="fill" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
