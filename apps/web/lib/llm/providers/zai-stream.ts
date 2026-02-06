/**
 * Z.ai Direct Streaming Implementation
 *
 * This module provides a direct fetch-based streaming implementation for Z.ai,
 * which requires special handling for tool streaming (tool_stream=true parameter).
 *
 * The Vercel AI SDK's streamText doesn't support Z.ai's custom parameters,
 * so we implement our own streaming parser for Z.ai specifically.
 */

import type { StreamChunk, CompletionOptions, ToolCall } from '../types'

/**
 * Stream completion from Z.ai using direct HTTP fetch
 * This properly handles Z.ai-specific parameters like tool_stream
 */
export async function* zaiCompletionStream(
  options: CompletionOptions,
  config: { apiKey: string; baseUrl: string }
): AsyncGenerator<StreamChunk> {
  const url = `${config.baseUrl}/chat/completions`

  // Build request body with Z.ai-specific parameters
  const requestBody: {
    model: string
    messages: CompletionOptions['messages']
    temperature?: number
    max_tokens?: number
    top_p?: number
    frequency_penalty?: number
    presence_penalty?: number
    stream: true
    tools?: CompletionOptions['tools']
    tool_choice?: 'auto'
    tool_stream?: boolean
  } = {
    model: options.model,
    messages: options.messages,
    temperature: options.temperature ?? 0.7,
    max_tokens: options.maxTokens,
    top_p: options.topP,
    frequency_penalty: options.frequencyPenalty,
    presence_penalty: options.presencePenalty,
    stream: true,
  }

  // Add tools if provided
  if (options.tools && options.tools.length > 0) {
    requestBody.tools = options.tools
    requestBody.tool_choice = 'auto'
    // Z.ai-specific: enable tool streaming
    requestBody.tool_stream = true
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify(requestBody),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[zaiCompletionStream] HTTP error:', response.status, errorText)
      yield {
        type: 'error',
        error: `Z.ai API error (${response.status}): ${errorText}`,
      }
      return
    }

    if (!response.body) {
      yield {
        type: 'error',
        error: 'No response body from Z.ai API',
      }
      return
    }

    // Parse SSE stream
    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    const toolCalls: Map<number, ToolCall> = new Map()

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })

        // Process complete lines
        const lines = buffer.split('\n')
        buffer = lines.pop() || '' // Keep incomplete line in buffer

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed || !trimmed.startsWith('data: ')) continue

          const data = trimmed.slice(6) // Remove 'data: ' prefix

          if (data === '[DONE]') {
            continue
          }

          try {
            const chunk = JSON.parse(data)

            const delta = chunk.choices?.[0]?.delta

            if (!delta) {
              continue
            }

            // Handle text content
            if (delta.content) {
              yield {
                type: 'text',
                content: delta.content,
              }
            }

            // Handle reasoning content (thinking mode)
            if (delta.reasoning_content) {
              yield {
                type: 'reasoning',
                reasoningContent: delta.reasoning_content,
              }
            }

            // Handle tool calls - collect them during streaming but DON'T yield yet
            // We need to wait for all chunks to arrive to get complete arguments
            if (delta.tool_calls) {
              for (const toolCall of delta.tool_calls) {
                const index = toolCall.index ?? 0

                if (!toolCalls.has(index)) {
                  // New tool call
                  const newToolCall: ToolCall = {
                    id: toolCall.id || `call_${index}_${Date.now()}`,
                    type: 'function',
                    function: {
                      name: toolCall.function?.name || '',
                      arguments: toolCall.function?.arguments || '',
                    },
                  }
                  toolCalls.set(index, newToolCall)
                } else {
                  // Append to existing tool call
                  const existing = toolCalls.get(index)!
                  if (toolCall.function?.arguments) {
                    existing.function.arguments += toolCall.function.arguments
                  }
                  if (toolCall.function?.name) {
                    existing.function.name = toolCall.function.name
                  }
                }

                // DON'T yield here - arguments are still incomplete
                // We'll yield all tool calls at the end of the stream
              }
            }
          } catch {
            // Skip malformed SSE chunks
          }
        }
      }
    } finally {
      reader.releaseLock()
    }

    // Yield final tool calls (now complete with all arguments)
    if (toolCalls.size > 0) {
      for (const [, toolCall] of toolCalls) {
        // Validate the arguments are complete JSON
        try {
          JSON.parse(toolCall.function.arguments)
        } catch {
          // Skip validation failures here; downstream tool execution can still surface errors.
        }

        yield {
          type: 'tool_call',
          toolCall,
        }
      }
    }

    // Yield finish event
    yield {
      type: 'finish',
      finishReason: toolCalls.size > 0 ? 'tool_calls' : 'stop',
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.error('[zaiCompletionStream] Error:', error)
    yield {
      type: 'error',
      error: `Z.ai streaming error: ${errorMsg}`,
    }
  }
}
