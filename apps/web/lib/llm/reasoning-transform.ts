/**
 * Reasoning Transform - Multi-provider reasoning normalization
 *
 * Maps normalized reasoning options to provider-specific parameters:
 * - OpenAI o-series: reasoning_effort
 * - DeepSeek: reasoning_effort
 * - Anthropic: thinking.budgetTokens
 * - Gemini: thinkingConfig.thinkingLevel
 *
 * Also handles extracting <think> tags from inline reasoning.
 */

import type { ReasoningOptions, ProviderCapabilities, ProviderType, StreamChunk } from './types'

/**
 * Provider-specific reasoning parameters
 */
export interface ProviderReasoningParams {
  openai?: {
    reasoning_effort?: 'low' | 'medium' | 'high'
  }
  deepseek?: {
    reasoning_effort?: 'low' | 'medium' | 'high'
  }
  anthropic?: {
    thinking?: {
      type: 'enabled'
      budget_tokens: number
    }
  }
  gemini?: {
    thinkingConfig?: {
      thinkingLevel: 'minimal' | 'low' | 'medium' | 'high'
    }
  }
}

/**
 * Map normalized reasoning options to provider-specific parameters
 * based on provider capabilities
 */
export function mapReasoningToProvider(
  options: ReasoningOptions | undefined,
  provider: ProviderType,
  capabilities: ProviderCapabilities
): Record<string, unknown> | undefined {
  if (!options?.enabled) {
    return undefined
  }

  // If provider doesn't support reasoning, don't add params
  if (!capabilities.supportsReasoning) {
    return undefined
  }

  switch (provider) {
    case 'openai':
    case 'openrouter':
      return mapToOpenAIReasoning(options, capabilities)

    case 'deepseek':
      return mapToDeepSeekReasoning(options, capabilities)

    case 'anthropic':
      return mapToAnthropicReasoning(options, capabilities)

    case 'zai':
      return mapToZaiReasoning(options, capabilities)

    default:
      return undefined
  }
}

/**
 * Map reasoning options for OpenAI providers
 * Uses reasoning_effort for o-series models
 */
function mapToOpenAIReasoning(
  options: ReasoningOptions,
  capabilities: ProviderCapabilities
): Record<string, unknown> | undefined {
  if (capabilities.reasoningControl !== 'effort') {
    return undefined
  }

  const params: Record<string, unknown> = {}

  // Map effort level to OpenAI's reasoning_effort
  if (options.effort) {
    params.reasoning_effort = options.effort
  } else if (options.budgetTokens) {
    // Convert budget tokens to effort level
    params.reasoning_effort = budgetToEffort(options.budgetTokens)
  } else if (options.level) {
    params.reasoning_effort = levelToEffort(options.level)
  }

  return Object.keys(params).length > 0 ? params : undefined
}

/**
 * Map reasoning options for DeepSeek
 * Uses reasoning_effort parameter
 */
function mapToDeepSeekReasoning(
  options: ReasoningOptions,
  _capabilities: ProviderCapabilities
): Record<string, unknown> | undefined {
  const params: Record<string, unknown> = {}

  if (options.effort) {
    params.reasoning_effort = options.effort
  } else if (options.budgetTokens) {
    params.reasoning_effort = budgetToEffort(options.budgetTokens)
  } else if (options.level) {
    params.reasoning_effort = levelToEffort(options.level)
  }

  return Object.keys(params).length > 0 ? params : undefined
}

/**
 * Map reasoning options for Anthropic
 * Uses thinking.budgetTokens
 */
function mapToAnthropicReasoning(
  options: ReasoningOptions,
  capabilities: ProviderCapabilities
): Record<string, unknown> | undefined {
  if (capabilities.reasoningControl !== 'budget') {
    return undefined
  }

  const params: Record<string, unknown> = {}

  // Map budget tokens to Anthropic's thinking configuration
  if (options.budgetTokens && options.budgetTokens > 0) {
    params.thinking = {
      type: 'enabled',
      budget_tokens: options.budgetTokens,
    }
  } else if (options.effort) {
    // Convert effort to budget tokens
    params.thinking = {
      type: 'enabled',
      budget_tokens: effortToBudget(options.effort),
    }
  } else if (options.level) {
    params.thinking = {
      type: 'enabled',
      budget_tokens: levelToBudget(options.level),
    }
  }

  return params
}

/**
 * Map reasoning options for Z.ai
 * Uses thinking.budgetTokens like Anthropic
 */
function mapToZaiReasoning(
  options: ReasoningOptions,
  _capabilities: ProviderCapabilities
): Record<string, unknown> | undefined {
  const params: Record<string, unknown> = {}

  if (options.budgetTokens && options.budgetTokens > 0) {
    params.thinking = {
      type: 'enabled',
      budget_tokens: options.budgetTokens,
    }
  } else if (options.effort) {
    params.thinking = {
      type: 'enabled',
      budget_tokens: effortToBudget(options.effort),
    }
  } else if (options.level) {
    params.thinking = {
      type: 'enabled',
      budget_tokens: levelToBudget(options.level),
    }
  }

  return params
}

/**
 * Convert budget tokens to effort level
 */
function budgetToEffort(budgetTokens: number): 'low' | 'medium' | 'high' {
  if (budgetTokens < 2000) return 'low'
  if (budgetTokens < 8000) return 'medium'
  return 'high'
}

/**
 * Convert effort level to budget tokens
 */
function effortToBudget(effort: string): number {
  switch (effort) {
    case 'low':
      return 2000
    case 'medium':
      return 8000
    case 'high':
    case 'max':
      return 16000
    default:
      return 8000
  }
}

/**
 * Convert level to effort
 */
function levelToEffort(level: string): 'low' | 'medium' | 'high' {
  switch (level) {
    case 'minimal':
    case 'low':
      return 'low'
    case 'medium':
      return 'medium'
    case 'high':
      return 'high'
    default:
      return 'medium'
  }
}

/**
 * Convert level to budget tokens
 */
function levelToBudget(level: string): number {
  switch (level) {
    case 'minimal':
      return 1000
    case 'low':
      return 2000
    case 'medium':
      return 8000
    case 'high':
      return 16000
    default:
      return 8000
  }
}

/**
 * Extract think tags from text content
 * Supports <think> and <thinking> tags (DeepSeek, open-source models)
 *
 * Returns an array of { type, content } where type is 'text' or 'reasoning'
 */
export function extractThinkTags(text: string): Array<{
  type: 'text' | 'reasoning'
  content: string
}> {
  if (!text) return [{ type: 'text', content: '' }]

  const result: Array<{ type: 'text' | 'reasoning'; content: string }> = []
  const patterns = [
    /\u003cthink\u003e([\s\S]*?)\u003c\/think\u003e/g,
    /\u003cthinking\u003e([\s\S]*?)\u003c\/thinking\u003e/g,
  ]

  let lastIndex = 0

  for (const pattern of patterns) {
    let match
    pattern.lastIndex = 0

    while ((match = pattern.exec(text)) !== null) {
      // Add text before the tag
      if (match.index > lastIndex) {
        const beforeText = text.slice(lastIndex, match.index).trim()
        if (beforeText) {
          result.push({ type: 'text', content: beforeText })
        }
      }

      // Add the thinking content
      const thinkingContent = match[1]?.trim() || ''
      if (thinkingContent) {
        result.push({ type: 'reasoning', content: thinkingContent })
      }

      lastIndex = match.index + match[0].length
    }
  }

  // Add remaining text after last tag
  if (lastIndex < text.length) {
    const afterText = text.slice(lastIndex).trim()
    if (afterText) {
      result.push({ type: 'text', content: afterText })
    }
  }

  // If no think tags found, return the whole text as text
  if (result.length === 0) {
    return [{ type: 'text', content: text }]
  }

  return result
}

/**
 * Process a stream chunk to extract inline thinking
 * Returns an array of StreamChunk objects (may include reasoning chunks)
 */
export function processChunkWithThinking(chunk: StreamChunk): StreamChunk[] {
  // Only process text chunks
  if (chunk.type !== 'text' || !chunk.content) {
    return [chunk]
  }

  const extracted = extractThinkTags(chunk.content)

  // If no think tags found, return original chunk
  if (extracted.length === 1 && extracted[0]!.type === 'text') {
    return [chunk]
  }

  // Convert extracted parts to stream chunks
  return extracted.map((part) => {
    if (part.type === 'reasoning') {
      return {
        type: 'reasoning' as const,
        reasoningContent: part.content,
      }
    }
    return {
      type: 'text' as const,
      content: part.content,
    }
  })
}
