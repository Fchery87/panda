'use client'

import { useState, useEffect } from 'react'
import { usePaginatedQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import type { ChatMode } from '../lib/agent/prompt-library'
import { normalizeChatMode } from '../lib/agent/prompt-library'
import type { MessageAnnotationInfo, TokenSource, ToolCallInfo } from '../components/chat/types'

export interface Message {
  id: string
  role: 'user' | 'assistant' | 'tool'
  content: string
  createdAt: number
  reasoningContent?: string
  mode: ChatMode
  toolCalls?: ToolCallInfo[]
  annotations?: {
    mode: ChatMode
    model?: string
    provider?: string
    tokenCount?: number
    promptTokens?: number
    completionTokens?: number
    totalTokens?: number
    tokenSource?: TokenSource
    reasoningTokens?: number
    contextWindow?: number
    contextUsedTokens?: number
    contextRemainingTokens?: number
    contextUsagePct?: number
    contextSource?: 'map' | 'provider' | 'fallback'
  }
}

export interface UseMessageHistoryResult {
  messages: Message[]
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>
  persistedMessages:
    | Array<{
        _id: string
        role: string
        content: string
        createdAt: number
        annotations?: unknown[]
      }>
    | undefined
  messagesPaginationStatus: 'LoadingFirstPage' | 'CanLoadMore' | 'LoadingMore' | 'Exhausted'
}

function toOptionalFiniteNumber(value: unknown): number | undefined {
  if (value === undefined || value === null) return undefined
  const num = Number(value)
  if (!Number.isFinite(num)) return undefined
  return num
}

export function useMessageHistory(
  chatId: Id<'chats'> | undefined,
  mode: ChatMode,
  getReasoningRuntimeSettings: () => { showReasoningPanel: boolean },
  isRunningRef: React.RefObject<boolean>
): UseMessageHistoryResult {
  const { results: persistedMessages, status: messagesPaginationStatus } = usePaginatedQuery(
    api.messages.listPaginated,
    chatId ? { chatId } : 'skip',
    { initialNumItems: 50 }
  )

  const [messages, setMessages] = useState<Message[]>([])

  // Hydrate local chat state from Convex when chat changes.
  useEffect(() => {
    if (!persistedMessages || isRunningRef.current) return
    const runtimeSettings = getReasoningRuntimeSettings()

    const hydrated: Message[] = persistedMessages
      .filter((msg) => msg.role === 'user' || msg.role === 'assistant')
      .map((msg) => {
        const firstAnnotation = Array.isArray(msg.annotations)
          ? (msg.annotations[0] as MessageAnnotationInfo | undefined)
          : undefined

        // Map stored and legacy modes consistently to the current 4-mode model.
        const hydratedMode = normalizeChatMode(firstAnnotation?.mode, mode)

        return {
          id: msg._id,
          role: msg.role as 'user' | 'assistant' | 'tool',
          content: msg.content,
          createdAt: msg.createdAt,
          reasoningContent:
            runtimeSettings.showReasoningPanel &&
            typeof firstAnnotation?.reasoningSummary === 'string'
              ? firstAnnotation.reasoningSummary
              : '',
          mode: hydratedMode,
          toolCalls: Array.isArray(firstAnnotation?.toolCalls)
            ? (firstAnnotation?.toolCalls as ToolCallInfo[])
            : ([] as ToolCallInfo[]),
          annotations: {
            mode: hydratedMode,
            model: typeof firstAnnotation?.model === 'string' ? firstAnnotation.model : undefined,
            provider:
              typeof firstAnnotation?.provider === 'string' ? firstAnnotation.provider : undefined,
            tokenCount: toOptionalFiniteNumber(firstAnnotation?.tokenCount),
            promptTokens: toOptionalFiniteNumber(firstAnnotation?.promptTokens),
            completionTokens: toOptionalFiniteNumber(firstAnnotation?.completionTokens),
            totalTokens: toOptionalFiniteNumber(firstAnnotation?.totalTokens),
            tokenSource:
              firstAnnotation?.tokenSource === 'exact' ||
              firstAnnotation?.tokenSource === 'estimated'
                ? firstAnnotation.tokenSource
                : undefined,
            reasoningTokens: toOptionalFiniteNumber(firstAnnotation?.reasoningTokens),
            contextWindow: toOptionalFiniteNumber(firstAnnotation?.contextWindow),
            contextUsedTokens: toOptionalFiniteNumber(firstAnnotation?.contextUsedTokens),
            contextRemainingTokens: toOptionalFiniteNumber(firstAnnotation?.contextRemainingTokens),
            contextUsagePct: toOptionalFiniteNumber(firstAnnotation?.contextUsagePct),
            contextSource:
              firstAnnotation?.contextSource === 'map' ||
              firstAnnotation?.contextSource === 'provider' ||
              firstAnnotation?.contextSource === 'fallback'
                ? firstAnnotation.contextSource
                : undefined,
          },
        }
      })

    setMessages(hydrated)
  }, [chatId, persistedMessages, getReasoningRuntimeSettings, mode, isRunningRef])

  return { messages, setMessages, persistedMessages, messagesPaginationStatus }
}
