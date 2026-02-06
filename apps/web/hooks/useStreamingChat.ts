/**
 * useStreamingChat Hook
 *
 * Custom React hook for streaming chat using Convex HTTP actions.
 * Streams responses from the LLM and persists messages to Convex.
 *
 * @file apps/web/hooks/useStreamingChat.ts
 */

'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import { toast } from 'sonner'

/**
 * Chat mode type
 */
type ChatMode = 'discuss' | 'build'

/**
 * Message type
 */
interface ChatMessage {
  _id?: string
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string
  createdAt?: number
}

/**
 * Options for useStreamingChat
 */
interface UseStreamingChatOptions {
  chatId: Id<'chats'>
  projectId: Id<'projects'>
  mode: ChatMode
  onError?: (error: Error) => void
  onFinish?: () => void
}

/**
 * Return type for useStreamingChat
 */
interface UseStreamingChatReturn {
  messages: ChatMessage[]
  input: string
  setInput: (input: string) => void
  isLoading: boolean
  error: Error | null
  handleSubmit: (e?: React.FormEvent) => void
  handleInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
  stop: () => void
}

type ParsedSseEvent =
  | { type: 'text'; content: string }
  | { type: 'reasoning'; reasoningContent: string }
  | { type: 'finish' }

interface ParseSseChunkResult {
  events: ParsedSseEvent[]
  buffer: string
}

const DATA_PREFIX = 'data: '

function parseSseDataPayload(data: string): ParsedSseEvent | null {
  if (data === '[DONE]') {
    return null
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(data)
  } catch {
    return null
  }

  if (!parsed || typeof parsed !== 'object') {
    return null
  }

  const payload = parsed as Record<string, unknown>
  const eventType = payload.type

  if (eventType === 'text' && typeof payload.content === 'string') {
    return { type: 'text', content: payload.content }
  }
  if (eventType === 'reasoning' && typeof payload.reasoningContent === 'string') {
    return { type: 'reasoning', reasoningContent: payload.reasoningContent }
  }
  if (eventType === 'finish') {
    return { type: 'finish' }
  }

  // Backward compatibility with older payload shape.
  if (typeof payload.content === 'string') {
    return { type: 'text', content: payload.content }
  }

  return null
}

export function parseSseChunk(chunk: string, previousBuffer = ''): ParseSseChunkResult {
  const input = `${previousBuffer}${chunk}`
  const lines = input.split('\n')
  const buffer = lines.pop() ?? ''
  const events: ParsedSseEvent[] = []

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed.startsWith(DATA_PREFIX)) continue
    const event = parseSseDataPayload(trimmed.slice(DATA_PREFIX.length))
    if (event) {
      events.push(event)
    }
  }

  return { events, buffer }
}

/**
 * Hook for streaming chat with Convex integration
 *
 * Features:
 * - Streams responses from Convex HTTP action
 * - Persists messages to Convex after streaming completes
 * - Supports both 'discuss' and 'build' modes
 * - Real-time message updates via Convex subscriptions
 */
export function useStreamingChat(options: UseStreamingChatOptions): UseStreamingChatReturn {
  const { chatId, mode, onError, onFinish } = options

  // Fetch existing messages from Convex (skip if no chatId)
  const existingMessages = useQuery(api.messages.list, chatId ? { chatId } : 'skip')

  // Fetch settings to get provider configuration
  const settings = useQuery(api.settings.get)

  // Convex mutations for persisting messages
  const addMessage = useMutation(api.messages.add)

  // Local state for streaming
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [streamingContent, setStreamingContent] = useState('')

  // Abort controller for stopping stream
  const abortControllerRef = useRef<AbortController | null>(null)
  const rafFlushRef = useRef<number | null>(null)

  // Combine existing messages with streaming message
  const messages: ChatMessage[] = [
    ...(existingMessages || []),
    ...(streamingContent
      ? [
          {
            _id: 'streaming',
            role: 'assistant' as const,
            content: streamingContent,
            createdAt: Date.now(),
          },
        ]
      : []),
  ]

  /**
   * Handle input change
   */
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
  }, [])

  /**
   * Stop streaming
   */
  const stop = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    if (rafFlushRef.current !== null) {
      cancelAnimationFrame(rafFlushRef.current)
      rafFlushRef.current = null
    }
    setIsLoading(false)
  }, [])

  /**
   * Handle form submission
   */
  const handleSubmit = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault()

      if (!input.trim() || isLoading) return

      const userMessage = input.trim()
      setInput('')
      setError(null)
      setIsLoading(true)
      setStreamingContent('')

      try {
        // Save user message to Convex
        await addMessage({
          chatId,
          role: 'user',
          content: userMessage,
        })

        // Get provider and API key from settings, fallback to environment
        const defaultProvider =
          settings?.defaultProvider || process.env.NEXT_PUBLIC_LLM_PROVIDER || 'openai'
        const providerConfig = settings?.providerConfigs?.[defaultProvider]
        const apiKey = providerConfig?.apiKey || process.env.NEXT_PUBLIC_OPENAI_API_KEY || ''
        const provider = providerConfig?.enabled ? defaultProvider : 'openai'
        const selectedModel = providerConfig?.defaultModel || 'gpt-4o-mini'

        // Create abort controller for this request
        abortControllerRef.current = new AbortController()

        // Call Convex HTTP action (use convex.site for HTTP actions)
        const convexSiteUrl =
          process.env.NEXT_PUBLIC_CONVEX_SITE_URL || process.env.NEXT_PUBLIC_CONVEX_URL || ''
        const response = await fetch(`${convexSiteUrl}/api/llm/streamChat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messages: [
              ...(existingMessages || []).map((m) => ({ role: m.role, content: m.content })),
              { role: 'user', content: userMessage },
            ],
            mode,
            provider,
            apiKey,
          }),
          signal: abortControllerRef.current.signal,
        })

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        if (!response.body) {
          throw new Error('No response body')
        }

        // Read streaming response
        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let fullContent = ''
        let fullReasoning = ''
        let pendingPaint = false
        let sseBuffer = ''

        const schedulePaint = () => {
          if (pendingPaint) return
          pendingPaint = true
          rafFlushRef.current = requestAnimationFrame(() => {
            pendingPaint = false
            rafFlushRef.current = null
            setStreamingContent(fullContent)
          })
        }

        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break

            const decodedChunk = decoder.decode(value, { stream: true })
            const parsed = parseSseChunk(decodedChunk, sseBuffer)
            sseBuffer = parsed.buffer

            for (const event of parsed.events) {
              if (event.type === 'text') {
                fullContent += event.content
                schedulePaint()
                continue
              }
              if (event.type === 'reasoning') {
                fullReasoning += event.reasoningContent
                continue
              }
            }
          }

          if (sseBuffer) {
            const finalParsed = parseSseChunk('\n', sseBuffer)
            for (const event of finalParsed.events) {
              if (event.type === 'text') {
                fullContent += event.content
                schedulePaint()
                continue
              }
              if (event.type === 'reasoning') {
                fullReasoning += event.reasoningContent
              }
            }
          }
        } finally {
          reader.releaseLock()
        }

        // Save assistant message to Convex
        if (fullContent) {
          await addMessage({
            chatId,
            role: 'assistant',
            content: fullContent,
            annotations: [
              {
                model: selectedModel,
                provider,
                ...(fullReasoning ? { reasoningSummary: fullReasoning } : {}),
              },
            ],
          })
        }

        setStreamingContent('')
        onFinish?.()
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Unknown error')
        setError(error)
        onError?.(error)
        toast.error(error.message)
      } finally {
        setIsLoading(false)
        abortControllerRef.current = null
      }
    },
    [input, isLoading, chatId, existingMessages, mode, addMessage, onFinish, onError, settings]
  )

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  return {
    messages,
    input,
    setInput,
    isLoading,
    error,
    handleSubmit,
    handleInputChange,
    stop,
  }
}

/**
 * Alternative hook using manual fetch (without Convex real-time)
 * Use this if you need more control over the streaming process
 */
export function useStreamingChatManual(options: UseStreamingChatOptions): UseStreamingChatReturn {
  const { chatId, mode, onError, onFinish } = options

  const addMessage = useMutation(api.messages.add)

  // Fetch settings to get provider configuration
  const settings = useQuery(api.settings.get)

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const abortControllerRef = useRef<AbortController | null>(null)

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
  }, [])

  const stop = useCallback(() => {
    abortControllerRef.current?.abort()
    abortControllerRef.current = null
    setIsLoading(false)
  }, [])

  const handleSubmit = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault()

      if (!input.trim() || isLoading) return

      const userMessage = input.trim()
      setInput('')
      setError(null)
      setIsLoading(true)

      // Add user message to local state
      const newMessages: ChatMessage[] = [...messages, { role: 'user', content: userMessage }]
      setMessages(newMessages)

      // Save to Convex
      await addMessage({
        chatId,
        role: 'user',
        content: userMessage,
      })

      try {
        // Get provider and API key from settings, fallback to environment
        const defaultProvider =
          settings?.defaultProvider || process.env.NEXT_PUBLIC_LLM_PROVIDER || 'openai'
        const providerConfig = settings?.providerConfigs?.[defaultProvider]
        const apiKey = providerConfig?.apiKey || process.env.NEXT_PUBLIC_OPENAI_API_KEY || ''
        const provider = providerConfig?.enabled ? defaultProvider : 'openai'
        const selectedModel = providerConfig?.defaultModel || 'gpt-4o-mini'
        const convexSiteUrl =
          process.env.NEXT_PUBLIC_CONVEX_SITE_URL || process.env.NEXT_PUBLIC_CONVEX_URL || ''

        abortControllerRef.current = new AbortController()

        const response = await fetch(`${convexSiteUrl}/api/llm/streamChat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: newMessages,
            mode,
            provider,
            apiKey,
          }),
          signal: abortControllerRef.current.signal,
        })

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
        if (!response.body) throw new Error('No response body')

        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let fullContent = ''
        let fullReasoning = ''
        let sseBuffer = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const decodedChunk = decoder.decode(value, { stream: true })
          const parsed = parseSseChunk(decodedChunk, sseBuffer)
          sseBuffer = parsed.buffer

          for (const event of parsed.events) {
            if (event.type === 'text') {
              fullContent += event.content
              // Update messages with streaming content
              setMessages([...newMessages, { role: 'assistant', content: fullContent }])
              continue
            }
            if (event.type === 'reasoning') {
              fullReasoning += event.reasoningContent
            }
          }
        }

        if (sseBuffer) {
          const finalParsed = parseSseChunk('\n', sseBuffer)
          for (const event of finalParsed.events) {
            if (event.type === 'text') {
              fullContent += event.content
              setMessages([...newMessages, { role: 'assistant', content: fullContent }])
              continue
            }
            if (event.type === 'reasoning') {
              fullReasoning += event.reasoningContent
            }
          }
        }

        // Save final message to Convex
        if (fullContent) {
          await addMessage({
            chatId,
            role: 'assistant',
            content: fullContent,
            annotations: [
              {
                model: selectedModel,
                provider,
                ...(fullReasoning ? { reasoningSummary: fullReasoning } : {}),
              },
            ],
          })
        }

        onFinish?.()
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Unknown error')
        setError(error)
        onError?.(error)
        toast.error(error.message)
      } finally {
        setIsLoading(false)
        abortControllerRef.current = null
      }
    },
    [input, isLoading, messages, chatId, mode, addMessage, onFinish, onError, settings]
  )

  useEffect(() => {
    return () => abortControllerRef.current?.abort()
  }, [])

  return {
    messages,
    input,
    setInput,
    isLoading,
    error,
    handleSubmit,
    handleInputChange,
    stop,
  }
}
