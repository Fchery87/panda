/**
 * Next.js API Route - Streaming Chat
 *
 * Fallback streaming endpoint using Vercel AI SDK.
 * Used when Convex HTTP actions have issues or for local development.
 *
 * @file apps/web/app/api/chat/route.ts
 */

import { streamText, type CoreMessage, type ToolSet } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { NextRequest } from 'next/server'

/**
 * Message type for chat requests
 */
interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string
  name?: string
  tool_call_id?: string
  tool_calls?: Array<{
    id: string
    type: 'function'
    function: {
      name: string
      arguments: string
    }
  }>
}

/**
 * Tool definition for function calling
 */
interface ToolDefinition {
  name: string
  description: string
  parameters: {
    type: 'object'
    properties: Record<string, unknown>
    required?: string[]
  }
}

/**
 * Chat request body
 */
interface ChatRequest {
  messages: ChatMessage[]
  model?: string
  provider?: 'openai' | 'openrouter' | 'together' | 'zai'
  temperature?: number
  maxTokens?: number
  tools?: ToolDefinition[]
  mode?: 'discuss' | 'build'
  chatId?: string
  projectId?: string
}

/**
 * Get API configuration based on provider
 */
function getProviderConfig(provider: string) {
  switch (provider) {
    case 'openrouter':
      return {
        apiKey: process.env.OPENROUTER_API_KEY,
        baseUrl: 'https://openrouter.ai/api/v1',
        defaultModel: 'anthropic/claude-3.5-sonnet',
      }
    case 'together':
      return {
        apiKey: process.env.TOGETHER_API_KEY,
        baseUrl: 'https://api.together.xyz/v1',
        defaultModel: 'togethercomputer/llama-3.1-70b',
      }
    case 'zai':
      return {
        apiKey: process.env.ZAI_API_KEY || process.env.ZAI_CODING_PLAN_KEY,
        baseUrl: process.env.ZAI_BASE_URL || 'https://api.z.ai/api/paas/v4',
        defaultModel: 'glm-4.7',
      }
    case 'openai':
    default:
      return {
        apiKey: process.env.OPENAI_API_KEY,
        baseUrl: process.env.OPENAI_BASE_URL,
        defaultModel: 'gpt-4o',
      }
  }
}

/**
 * POST handler for streaming chat
 */
export async function POST(req: NextRequest) {
  try {
    // Parse request body
    const body: ChatRequest = await req.json()
    const {
      messages,
      model,
      provider = 'openai',
      temperature = 0.7,
      maxTokens = 4096,
      tools,
      mode = 'discuss',
    } = body

    // Validate messages
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: 'Messages array is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Get provider configuration
    const config = getProviderConfig(provider)

    if (!config.apiKey) {
      return new Response(
        JSON.stringify({
          error: `API key not configured for provider: ${provider}`,
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    // Create OpenAI client with custom configuration
    const openai = createOpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseUrl,
      headers:
        provider === 'openrouter'
          ? {
              'HTTP-Referer': req.headers.get('origin') || 'https://panda.ai',
              'X-Title': 'Panda.ai',
            }
          : undefined,
    })

    // Select model
    const selectedModel = model || config.defaultModel

    // Convert messages to AI SDK format
    const coreMessages: CoreMessage[] = messages.map((msg): CoreMessage => {
      // Build message based on role
      if (msg.role === 'tool') {
        return {
          role: 'tool',
          content: [{ type: 'text', text: msg.content }],
          tool_call_id: msg.tool_call_id || '',
        } as unknown as CoreMessage
      }

      const baseMsg = {
        role: msg.role,
        content: msg.content,
      } as CoreMessage

      if (msg.name) {
        ;(baseMsg as any).name = msg.name
      }
      if (msg.tool_calls) {
        ;(baseMsg as any).tool_calls = msg.tool_calls
      }

      return baseMsg
    })

    // Convert tools to AI SDK format if provided
    const sdkTools: ToolSet | undefined = tools?.reduce((acc, tool) => {
      acc[tool.name] = {
        description: tool.description,
        parameters: tool.parameters as any,
      }
      return acc
    }, {} as ToolSet)

    // Add mode-specific system message if not present
    const hasSystemMessage = coreMessages.some((m) => m.role === 'system')
    if (!hasSystemMessage) {
      const systemPrompt =
        mode === 'build'
          ? `You are Panda.ai, an AI software engineer. You help users write, modify, and improve code.

You have access to tools:
- read_files: Read file contents to understand the codebase
- write_files: Write or modify files (provide complete content)
- run_command: Run CLI commands to verify changes

When making changes:
1. Read relevant files first to understand context
2. Explain your approach
3. Write complete file content (not diffs)
4. Run commands to verify

Follow existing code patterns and conventions.`
          : `You are Panda.ai, an AI software architect. You help users plan, design, and architect software projects.

You excel at:
- Breaking down requirements
- Designing system architecture
- Creating implementation plans
- Discussing trade-offs
- Answering technical questions

Be concise but thorough. Focus on actionable insights.`

      coreMessages.unshift({
        role: 'system',
        content: systemPrompt,
      })
    }

    // Start streaming with Vercel AI SDK
    const result = streamText({
      model: openai(selectedModel),
      messages: coreMessages,
      temperature,
      maxTokens,
      tools: sdkTools,
    })

    // Return streaming response using AI SDK's toDataStreamResponse
    return result.toDataStreamResponse({
      headers: {
        // Add CORS headers if needed
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    })
  } catch (error) {
    console.error('Error in chat API:', error)
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Internal server error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
}

/**
 * OPTIONS handler for CORS preflight
 */
export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
