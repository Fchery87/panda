'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import {
  ArrowUp,
  Square,
  Lightbulb,
  SlidersHorizontal,
  ChevronDown,
  Target,
  Zap,
  Eye,
  Sparkles,
  Undo2,
} from 'lucide-react'
import { useAction, useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import { toast } from 'sonner'
import { AgentSelector, MODE_OPTIONS } from './AgentSelector'
import { AttachmentButton, type Attachment } from './AttachmentButton'
import { MentionPicker } from './MentionPicker'
import { ModelSelector, type AvailableModel } from './ModelSelector'
import { VariantSelector } from './VariantSelector'
import type { ChatMode } from '@/lib/agent/prompt-library'
import type { SpecTier } from '@/lib/agent/spec/types'

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

interface ChatInputProps {
  mode?: ChatMode
  onModeChange?: (mode: ChatMode) => void
  architectBrainstormEnabled?: boolean
  onArchitectBrainstormEnabledChange?: (enabled: boolean) => void
  onSendMessage?: (content: string, mode: ChatMode, contextFiles?: string[]) => void
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
  /** SpecNative: Current spec tier override (auto-detect if not set) */
  specTier?: SpecTier | 'auto'
  /** SpecNative: Callback when user changes spec tier override */
  onSpecTierChange?: (tier: SpecTier | 'auto') => void
}

export function ChatInput({
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
  specTier = 'auto',
  onSpecTierChange,
}: ChatInputProps) {
  const [input, setInput] = useState('')
  const [uncontrolledMode, setUncontrolledMode] = useState<ChatMode>('code')
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // @-mention picker state
  const [mentionQuery, setMentionQuery] = useState<string | null>(null)
  const [mentionStart, setMentionStart] = useState<number>(-1)
  const [optionsOpen, setOptionsOpen] = useState(false)

  // Enhance prompt state
  const [enhanceState, setEnhanceState] = useState<EnhanceState>('idle')
  const [preEnhanceText, setPreEnhanceText] = useState('')

  // Convex action for enhancing prompts
  const enhancePrompt = useAction(api.enhancePrompt.enhance)

  // Fetch admin defaults and user settings for enhancement LLM configuration
  const adminDefaults = useQuery(api.settings.getAdminDefaults)
  const userSettings = useQuery(api.settings.get)

  const mode = controlledMode ?? uncontrolledMode
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
    setAttachments(prev => [...prev, attachment])
  }, [])

  const handleRemoveAttachment = useCallback((id: string) => {
    setAttachments(prev => prev.filter(a => a.id !== id))
  }, [])

  const handleSend = useCallback(() => {
    if (input.trim() && !isStreaming) {
      const { message, contextFiles } = parseMentions(input.trim())
      onSendMessage?.(message || input.trim(), mode, contextFiles)
      setInput('')
      setMentionQuery(null)
      setAttachments([])
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
      }
    }
  }, [input, isStreaming, mode, onSendMessage])

  const handleSendWithReset = useCallback(() => {
    handleSend()
    // Reset enhance state after sending
    setEnhanceState('idle')
    setPreEnhanceText('')
  }, [handleSend])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // Don't send on Enter if mention picker is open (handled by picker itself)
      if (mentionQuery !== null) return
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
      // Restore focus
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus()
          const pos = (before + `@${path} `).length
          textareaRef.current.setSelectionRange(pos, pos)
        }
      }, 0)
    },
    [input, mentionStart]
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
        setTimeout(() => {
          if (textareaRef.current) {
            textareaRef.current.style.height = 'auto'
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`
          }
        }, 0)
      } else {
        throw new Error('No enhanced prompt returned')
      }
    } catch {
      // Restore original text on error
      setInput(preEnhanceText || input)
      setEnhanceState('idle')
      toast.error('Failed to enhance prompt. Please try again.')
    }
  }, [input, enhanceState, enhancePrompt, preEnhanceText, adminDefaults, userSettings])

  const handleRevert = useCallback(() => {
    if (preEnhanceText) {
      setInput(preEnhanceText)
      setPreEnhanceText('')
      setEnhanceState('idle')

      // Auto-resize textarea after reverting
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.style.height = 'auto'
          textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`
        }
      }, 0)
    }
  }, [preEnhanceText])

  useEffect(() => {
    if (textareaRef.current && !isStreaming) {
      textareaRef.current.focus()
    }
  }, [isStreaming])

  const currentModeOption = MODE_OPTIONS.find((m) => m.value === mode)
  const placeholderText = currentModeOption
    ? `${currentModeOption.description}...`
    : 'Type your message...'

  const showBrainstormToggle = mode === 'architect'
  const hasAdvancedControls =
    Boolean(onModelChange) ||
    (supportsReasoning && Boolean(onVariantChange)) ||
    showBrainstormToggle ||
    Boolean(onSpecTierChange)

  // Spec tier configuration
  const tierOptions: {
    value: SpecTier | 'auto'
    label: string
    icon: React.ReactNode
    description: string
  }[] = [
    {
      value: 'auto',
      label: 'Auto',
      icon: <Zap className="h-3 w-3" />,
      description: 'Auto-detect tier',
    },
    {
      value: 'instant',
      label: 'Instant',
      icon: <Target className="h-3 w-3" />,
      description: 'Direct response',
    },
    {
      value: 'ambient',
      label: 'Ambient',
      icon: <Eye className="h-3 w-3" />,
      description: 'Silent spec',
    },
    {
      value: 'explicit',
      label: 'Explicit',
      icon: <Target className="h-3 w-3" />,
      description: 'Full spec review',
    },
  ]

  return (
    <div className="surface-2 border-t border-border p-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] sm:p-3 sm:pb-3">
      <div className="relative">
        {/* @-mention picker */}
        {mentionQuery !== null && (
          <MentionPicker
            filePaths={filePaths}
            query={mentionQuery}
            onSelect={handleMentionSelect}
            onClose={() => setMentionQuery(null)}
          />
        )}

        <Textarea
          ref={textareaRef}
          value={input}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholderText}
          disabled={isStreaming}
          className={cn(
            'max-h-[200px] min-h-[68px] resize-none pr-12 sm:min-h-[80px]',
            'rounded-none border border-border bg-background',
            'focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary',
            'font-mono text-sm placeholder:text-muted-foreground/50'
          )}
          rows={1}
        />

        <AnimatePresence mode="wait">
          {isStreaming ? (
            <motion.div
              key="stop"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ duration: 0.1 }}
              className="absolute bottom-3 right-3"
            >
              <Button
                size="icon"
                variant="outline"
                onClick={handleStop}
                aria-label="Stop generation"
                className="h-7 w-7 rounded-none border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
              >
                <Square className="h-3 w-3 fill-current" />
              </Button>
            </motion.div>
          ) : (
            <>
              {/* Enhance prompt button - only show when there's text */}
              <AnimatePresence>
                {input.trim() && (
                  <motion.div
                    key="enhance"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                    transition={{ duration: 0.1 }}
                    className="absolute bottom-3 right-12"
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
                        <Undo2 className="h-3 w-3" />
                      ) : (
                        <Sparkles className="h-3 w-3" />
                      )}
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>

              <motion.div
                key="send"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{ duration: 0.1 }}
                className="absolute bottom-3 right-3"
              >
                <Button
                  size="icon"
                  onClick={handleSendWithReset}
                  disabled={!input.trim()}
                  aria-label="Send message"
                  className={cn(
                    'transition-sharp h-7 w-7 rounded-none',
                    input.trim()
                      ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                      : 'bg-secondary text-muted-foreground'
                  )}
                >
                  <ArrowUp className="h-3 w-3" />
                </Button>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom toolbar: single row always */}
      <div className="mt-2 flex items-center gap-2">
        <AttachmentButton
          attachments={attachments}
          onAttach={handleAttach}
          onRemove={handleRemoveAttachment}
          disabled={isStreaming}
        />
        <AgentSelector mode={mode} onModeChange={setMode} disabled={isStreaming} />

        {hasAdvancedControls && (
          <Popover open={optionsOpen} onOpenChange={setOptionsOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                disabled={isStreaming}
                className={cn(
                  'transition-sharp flex items-center gap-1 border px-2 py-1 font-mono text-xs uppercase tracking-wide',
                  optionsOpen
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground'
                )}
              >
                <SlidersHorizontal className="h-3 w-3" />
                Options
                <ChevronDown
                  className={cn('h-3 w-3 transition-transform', optionsOpen && 'rotate-180')}
                />
              </button>
            </PopoverTrigger>
            <PopoverContent
              align="start"
              side="top"
              sideOffset={8}
              className="w-auto min-w-[280px] rounded-none border-border p-3"
            >
              <div className="space-y-3">
                {onModelChange && (
                  <div className="space-y-1.5">
                    <label className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
                      Model
                    </label>
                    <ModelSelector
                      value={model || 'claude-sonnet-4-5'}
                      onChange={onModelChange}
                      disabled={isStreaming}
                      availableModels={availableModels}
                    />
                  </div>
                )}

                {supportsReasoning && onVariantChange && (
                  <div className="space-y-1.5">
                    <label className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
                      Reasoning
                    </label>
                    <VariantSelector currentVariant={variant} onVariantChange={onVariantChange} />
                  </div>
                )}

                {showBrainstormToggle && (
                  <div className="space-y-1.5">
                    <label className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
                      Brainstorm
                    </label>
                    <button
                      type="button"
                      disabled={isStreaming}
                      onClick={() =>
                        onArchitectBrainstormEnabledChange?.(!architectBrainstormEnabled)
                      }
                      className={cn(
                        'transition-sharp flex w-full items-center justify-between border px-2 py-1.5 font-mono text-xs uppercase tracking-wide',
                        architectBrainstormEnabled
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground'
                      )}
                    >
                      <span className="flex items-center gap-1.5">
                        <Lightbulb className="h-3 w-3" />
                        Enable
                      </span>
                      {architectBrainstormEnabled && (
                        <span className="text-[10px] opacity-80">Active</span>
                      )}
                    </button>
                  </div>
                )}

                {onSpecTierChange && (
                  <div className="space-y-1.5">
                    <label className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
                      Spec Tier
                    </label>
                    <div className="flex border border-border">
                      {tierOptions.map((tier, index) => (
                        <button
                          key={tier.value}
                          type="button"
                          disabled={isStreaming}
                          onClick={() => onSpecTierChange(tier.value)}
                          title={tier.description}
                          className={cn(
                            'transition-sharp flex flex-1 items-center justify-center gap-1 py-1.5 font-mono text-[10px] uppercase tracking-wide',
                            specTier === tier.value
                              ? 'bg-primary text-primary-foreground'
                              : 'text-muted-foreground hover:text-foreground',
                            index !== tierOptions.length - 1 && 'border-r border-border'
                          )}
                        >
                          {tier.icon}
                          {tier.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </PopoverContent>
          </Popover>
        )}

        <div className="ml-auto flex items-center gap-2 font-mono text-xs text-muted-foreground">
          <span className="hidden 2xl:inline">
            {filePaths.length > 0 ? '@ to mention a file · ' : ''}Enter to send
          </span>
          <span className="2xl:hidden">{filePaths.length > 0 ? '@ file' : 'Enter'}</span>
        </div>
      </div>
    </div>
  )
}
