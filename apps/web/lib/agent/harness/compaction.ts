/**
 * Context Compaction - Auto-summarization for long conversations
 *
 * Implements OpenCode-style context management:
 * - Token counting and budget tracking
 * - Auto-summarization at threshold
 * - Message pruning for old tool outputs
 * - Compaction summaries as special message parts
 */

import { encodingForModel } from 'js-tiktoken'

import type {
  Message,
  Part,
  UserMessage,
  CompactionPart,
  CompactionResult,
  Identifier,
} from './types'
import { ascending } from './identifier'
import { bus } from './event-bus'

/**
 * Compaction configuration
 */
export interface CompactionConfig {
  threshold: number
  targetRatio: number
  preserveRecent: number
  maxToolOutputLength: number
}

const DEFAULT_CONFIG: CompactionConfig = {
  threshold: 0.9,
  targetRatio: 0.5,
  preserveRecent: 4,
  maxToolOutputLength: 10000,
}

let encoder: ReturnType<typeof encodingForModel> | null = null

function getEncoder() {
  if (!encoder) {
    encoder = encodingForModel('gpt-4o')
  }
  return encoder
}

/**
 * Estimate token count for a string using tiktoken (cl100k_base encoding).
 * Falls back to a rough character-based estimate if the tokenizer fails.
 */
export function estimateTokens(text: string): number {
  if (!text) return 0
  try {
    return getEncoder().encode(text).length
  } catch {
    // Fallback: rough character-based estimate if tokenizer fails
    return Math.ceil(text.length / 4)
  }
}

/**
 * Estimate tokens for a message
 */
export function estimateMessageTokens(message: Message): number {
  let tokens = 50

  if ('parts' in message && message.parts) {
    for (const part of message.parts) {
      tokens += estimatePartTokens(part)
    }
  }

  if ('content' in message && typeof message.content === 'string') {
    tokens += estimateTokens(message.content)
  }

  if ('tool_calls' in message && message.tool_calls && Array.isArray(message.tool_calls)) {
    for (const tc of message.tool_calls) {
      tokens += estimateTokens(tc.function.name)
      tokens += estimateTokens(tc.function.arguments)
    }
  }

  return tokens
}

/**
 * Estimate tokens for a part
 */
export function estimatePartTokens(part: Part): number {
  let tokens = 20

  switch (part.type) {
    case 'text':
      tokens += estimateTokens(part.text)
      break
    case 'reasoning':
      tokens += estimateTokens(part.text)
      if (part.summary) tokens += estimateTokens(part.summary)
      break
    case 'tool':
      tokens += estimateTokens(JSON.stringify(part.state))
      break
    case 'subtask':
      tokens += estimateTokens(part.prompt)
      if (part.result) {
        tokens += estimateTokens(part.result.output)
        for (const p of part.result.parts) {
          tokens += estimatePartTokens(p)
        }
      }
      break
    case 'file':
      if (part.source.type === 'base64') {
        tokens += Math.ceil(part.source.data.length / 4)
      } else {
        tokens += 100
      }
      break
    case 'compaction':
      if (part.summary) tokens += estimateTokens(part.summary)
      break
  }

  return tokens
}

/**
 * Check if compaction is needed
 */
export function needsCompaction(
  messages: Message[],
  contextLimit: number,
  config: CompactionConfig = DEFAULT_CONFIG
): boolean {
  const totalTokens = messages.reduce((sum, m) => sum + estimateMessageTokens(m), 0)
  return totalTokens >= contextLimit * config.threshold
}

/**
 * Prune large tool outputs from parts
 */
export function pruneToolOutputs(
  parts: Part[],
  maxLength: number
): { parts: Part[]; pruned: number } {
  let pruned = 0

  const prunedParts = parts.map((part) => {
    if (part.type === 'tool' && 'output' in part.state) {
      const state = part.state as { output: string }
      if (state.output && state.output.length > maxLength) {
        pruned++
        return {
          ...part,
          state: {
            ...part.state,
            output: state.output.slice(0, maxLength) + '\n\n[Output truncated due to length]',
          },
        }
      }
    }
    return part
  })

  return { parts: prunedParts, pruned }
}

/**
 * Filter messages that were already compacted
 */
export function filterCompacted(messages: Message[]): Message[] {
  return messages.filter((m) => {
    if (m.role === 'assistant' && m.summary) return false

    if ('parts' in m) {
      const hasCompaction = m.parts.some((p) => p.type === 'compaction')
      if (hasCompaction) return false
    }

    return true
  })
}

/**
 * Compaction Manager
 */
class CompactionManager {
  private summaries: Map<Identifier, string> = new Map()
  private config: CompactionConfig = DEFAULT_CONFIG

  /**
   * Set configuration
   */
  setConfig(config: Partial<CompactionConfig>): void {
    this.config = { ...this.config, ...config }
  }

  /**
   * Process messages for compaction
   */
  async compact(
    sessionID: Identifier,
    messages: Message[],
    contextLimit: number,
    summarizeFn: (messages: Message[]) => Promise<string>
  ): Promise<CompactionResult> {
    const tokensBefore = messages.reduce((sum, m) => sum + estimateMessageTokens(m), 0)

    bus.emitCompaction(sessionID, 'started', {
      tokensBefore,
      threshold: this.config.threshold,
      messageCount: messages.length,
    })

    const filtered = filterCompacted(messages)
    const preserveCount = Math.min(this.config.preserveRecent, filtered.length)

    const toCompact = filtered.slice(0, -preserveCount)
    const toPreserve = filtered.slice(-preserveCount)

    if (toCompact.length === 0) {
      return {
        summary: '',
        tokensBefore,
        tokensAfter: tokensBefore,
        messagesCompacted: 0,
        error: 'No messages to compact',
      }
    }

    try {
      const summary = await summarizeFn(toCompact)

      this.summaries.set(sessionID, summary)

      const compactionPart: CompactionPart = {
        id: ascending('part_'),
        messageID: ascending('msg_'),
        sessionID,
        type: 'compaction',
        auto: true,
        summary,
      }

      const summaryMessage: UserMessage = {
        id: ascending('msg_'),
        sessionID,
        role: 'user',
        time: { created: Date.now() },
        parts: [compactionPart],
        agent: 'system',
      }

      const pruned = toPreserve.map((m) => {
        if ('parts' in m) {
          const { parts } = pruneToolOutputs(m.parts, this.config.maxToolOutputLength)
          return { ...m, parts }
        }
        return m
      })

      const compacted = [summaryMessage, ...pruned]
      const tokensAfter = compacted.reduce((sum, m) => sum + estimateMessageTokens(m), 0)

      bus.emitCompaction(sessionID, 'completed', {
        tokensBefore,
        tokensAfter,
        messagesCompacted: toCompact.length,
        reduction: ((1 - tokensAfter / tokensBefore) * 100).toFixed(1) + '%',
      })

      return {
        summary,
        tokensBefore,
        tokensAfter,
        messagesCompacted: toCompact.length,
        messages: compacted,
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      bus.emitError(sessionID, { type: 'compaction', error: errorMessage })

      return {
        summary: '',
        tokensBefore,
        tokensAfter: tokensBefore,
        messagesCompacted: 0,
        error: errorMessage,
      }
    }
  }

  /**
   * Get summary for session
   */
  getSummary(sessionID: Identifier): string | undefined {
    return this.summaries.get(sessionID)
  }

  /**
   * Clear summary
   */
  clearSummary(sessionID: Identifier): void {
    this.summaries.delete(sessionID)
  }

  /**
   * Calculate compaction threshold
   */
  getThreshold(contextLimit: number): number {
    return Math.floor(contextLimit * this.config.threshold)
  }

  /**
   * Get target token count after compaction
   */
  getTarget(contextLimit: number): number {
    return Math.floor(contextLimit * this.config.targetRatio)
  }
}

export const compaction = new CompactionManager()

export const SUMMARIZATION_PROMPT = `Provide a detailed but concise summary of the conversation above.

Focus on:
1. What was discussed and decided
2. What files were examined or modified
3. What changes were made
4. What's the current state of work
5. What should be done next

Keep the summary factual and actionable.`
