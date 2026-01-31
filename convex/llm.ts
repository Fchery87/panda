/**
 * Convex LLM HTTP Action
 * 
 * HTTP action for streaming chat completions using Vercel AI SDK.
 * Supports streaming responses and tool calls.
 * 
 * @file convex/llm.ts
 */

import { httpAction } from "./_generated/server";
import { streamText, type CoreMessage } from "ai";
import { createOpenAI } from "@ai-sdk/openai";

/**
 * Message type for chat requests
 */
interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  name?: string;
  tool_call_id?: string;
  tool_calls?: Array<{
    id: string;
    type: "function";
    function: {
      name: string;
      arguments: string;
    };
  }>;
}

/**
 * Tool definition for function calling
 */
interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
}

/**
 * Chat request body
 */
interface ChatRequest {
  messages: ChatMessage[];
  model?: string;
  provider?: "openai" | "openrouter" | "together";
  temperature?: number;
  maxTokens?: number;
  tools?: ToolDefinition[];
  mode?: "discuss" | "build";
  chatId?: string;
  projectId?: string;
}

/**
 * Get API configuration based on provider
 */
function getProviderConfig(provider: string) {
  switch (provider) {
    case "openrouter":
      return {
        apiKey: process.env.OPENROUTER_API_KEY,
        baseUrl: "https://openrouter.ai/api/v1",
        defaultModel: "anthropic/claude-3.5-sonnet",
      };
    case "together":
      return {
        apiKey: process.env.TOGETHER_API_KEY,
        baseUrl: "https://api.together.xyz/v1",
        defaultModel: "togethercomputer/llama-3.1-70b",
      };
    case "openai":
    default:
      return {
        apiKey: process.env.OPENAI_API_KEY,
        baseUrl: process.env.OPENAI_BASE_URL,
        defaultModel: "gpt-4o",
      };
  }
}

/**
 * Stream chat HTTP action
 * 
 * POST /api/chat
 * 
 * Request body:
 * {
 *   messages: Array<{ role, content, ... }>,
 *   model?: string,
 *   provider?: 'openai' | 'openrouter' | 'together',
 *   temperature?: number,
 *   maxTokens?: number,
 *   tools?: Array<ToolDefinition>,
 *   mode?: 'discuss' | 'build'
 * }
 * 
 * Response: text/event-stream
 */
export const streamChat = httpAction(async (ctx, req): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  // Only allow POST
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }

  try {
    // Parse request body
    const body: ChatRequest = await req.json();
    const {
      messages,
      model,
      provider = "openai",
      temperature = 0.7,
      maxTokens = 4096,
      tools,
      mode = "discuss",
    } = body;

    // Validate messages
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: "Messages array is required" }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    // Get provider configuration
    const config = getProviderConfig(provider);

    if (!config.apiKey) {
      return new Response(
        JSON.stringify({
          error: `API key not configured for provider: ${provider}`,
        }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    // Create OpenAI client with custom configuration
    const openai = createOpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseUrl,
      headers:
        provider === "openrouter"
          ? {
              "HTTP-Referer": req.headers.get("origin") || "https://panda.ai",
              "X-Title": "Panda.ai",
            }
          : undefined,
    });

    // Select model
    const selectedModel = model || config.defaultModel;

    // Convert messages to AI SDK format
    const coreMessages: CoreMessage[] = messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
      ...(msg.name && { name: msg.name }),
      ...(msg.tool_call_id && { tool_call_id: msg.tool_call_id }),
      ...(msg.tool_calls && { tool_calls: msg.tool_calls }),
    }));

    // Convert tools to AI SDK format if provided
    const sdkTools = tools?.map((tool) => ({
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    }));

    // Add mode-specific system message if not present
    const hasSystemMessage = coreMessages.some((m) => m.role === "system");
    if (!hasSystemMessage) {
      const systemPrompt =
        mode === "build"
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

Be concise but thorough. Focus on actionable insights.`;

      coreMessages.unshift({
        role: "system",
        content: systemPrompt,
      });
    }

    // Start streaming
    const result = streamText({
      model: openai(selectedModel),
      messages: coreMessages,
      temperature,
      maxTokens,
      tools: sdkTools,
    });

    // Create streaming response
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Stream text chunks
          for await (const chunk of result.textStream) {
            const data = JSON.stringify({
              type: "text",
              content: chunk,
            });
            controller.enqueue(new TextEncoder().encode(`data: ${data}\n\n`));
          }

          // Get final result for tool calls and usage
          const finalResult = await result;

          // Send tool calls if any
          if (finalResult.toolCalls && finalResult.toolCalls.length > 0) {
            for (const toolCall of finalResult.toolCalls) {
              const data = JSON.stringify({
                type: "tool_call",
                toolCall: {
                  id: toolCall.toolCallId,
                  type: "function",
                  function: {
                    name: toolCall.toolName,
                    arguments: JSON.stringify(toolCall.args),
                  },
                },
              });
              controller.enqueue(new TextEncoder().encode(`data: ${data}\n\n`));
            }
          }

          // Send finish event with usage
          const finishData = JSON.stringify({
            type: "finish",
            finishReason: finalResult.finishReason,
            usage: {
              promptTokens: finalResult.usage.promptTokens,
              completionTokens: finalResult.usage.completionTokens,
              totalTokens: finalResult.usage.totalTokens,
            },
          });
          controller.enqueue(
            new TextEncoder().encode(`data: ${finishData}\n\n`)
          );

          controller.close();
        } catch (error) {
          const errorData = JSON.stringify({
            type: "error",
            error: error instanceof Error ? error.message : String(error),
          });
          controller.enqueue(new TextEncoder().encode(`data: ${errorData}\n\n`));
          controller.close();
        }
      },
    });

    // Return streaming response
    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    console.error("Error in streamChat:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Internal server error",
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }
});

/**
 * Health check endpoint for LLM service
 */
export const health = httpAction(async (ctx, req): Promise<Response> => {
  return new Response(
    JSON.stringify({
      status: "ok",
      providers: {
        openai: !!process.env.OPENAI_API_KEY,
        openrouter: !!process.env.OPENROUTER_API_KEY,
        together: !!process.env.TOGETHER_API_KEY,
      },
    }),
    {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    }
  );
});
