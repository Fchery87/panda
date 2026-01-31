/**
 * Agent Runtime
 * 
 * Core runtime for executing agent tasks with streaming support.
 * Manages the conversation loop, tool execution, and response streaming.
 */

import type {
  LLMProvider,
  CompletionMessage,
  CompletionOptions,
  StreamChunk,
  ToolCall,
} from '../llm/types';
import type { PromptContext } from './prompt-library';
import type { ToolContext, ToolExecutionResult } from './tools';
import { getPromptForMode } from './prompt-library';
import { AGENT_TOOLS, executeTool } from './tools';

/**
 * Runtime options for agent execution
 */
export interface RuntimeOptions {
  provider: LLMProvider;
  model?: string;
  maxIterations?: number;
  temperature?: number;
  maxTokens?: number;
}

/**
 * Agent event types for streaming
 */
export type AgentEventType =
  | 'thinking'
  | 'text'
  | 'tool_call'
  | 'tool_result'
  | 'error'
  | 'complete';

/**
 * Agent event for streaming
 */
export interface AgentEvent {
  type: AgentEventType;
  content?: string;
  toolCall?: ToolCall;
  toolResult?: ToolExecutionResult;
  error?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

/**
 * Agent runtime state
 */
interface RuntimeState {
  messages: CompletionMessage[];
  iteration: number;
  toolResults: ToolExecutionResult[];
  isComplete: boolean;
  // Track executed tool calls for deduplication
  executedToolCalls: Set<string>;
  // Track tool call patterns to prevent loops
  toolCallHistory: string[];
}

/**
 * Runtime configuration options
 */
export interface RuntimeConfig {
  maxIterations?: number;
  maxToolCallsPerIteration?: number;
  enableToolDeduplication?: boolean;
  toolLoopThreshold?: number;
}

/**
 * Generate a hash for a tool call to detect duplicates
 */
function hashToolCall(toolCall: ToolCall): string {
  return `${toolCall.function.name}:${toolCall.function.arguments}`;
}

/**
 * Agent Runtime - manages agent execution
 */
export class AgentRuntime {
  private options: RuntimeOptions;
  private toolContext: ToolContext;

  constructor(options: RuntimeOptions, toolContext: ToolContext) {
    this.options = options;
    this.toolContext = toolContext;
  }

  /**
   * Run the agent with streaming output
   * This is a generator that yields events as they occur
   */
  async *run(promptContext: PromptContext, config?: RuntimeConfig): AsyncGenerator<AgentEvent> {
    // Initialize state
    const state: RuntimeState = {
      messages: getPromptForMode(promptContext),
      iteration: 0,
      toolResults: [],
      isComplete: false,
      executedToolCalls: new Set(),
      toolCallHistory: [],
    };

    const maxIterations = this.options.maxIterations ?? config?.maxIterations ?? 10;
    const maxToolCallsPerIteration = config?.maxToolCallsPerIteration ?? 5;
    const enableDeduplication = config?.enableToolDeduplication ?? true;
    const toolLoopThreshold = config?.toolLoopThreshold ?? 3;
    const model = this.options.model ?? 'gpt-4o';

    try {
      // Main agent loop
      while (state.iteration < maxIterations && !state.isComplete) {
        state.iteration++;

        // Yield thinking event
        yield {
          type: 'thinking',
          content: `Iteration ${state.iteration}: Generating response...`,
        };

        // Create completion options
        const completionOptions: CompletionOptions = {
          model,
          messages: state.messages,
          temperature: this.options.temperature ?? 0.7,
          maxTokens: this.options.maxTokens,
          tools: promptContext.chatMode === 'build' ? AGENT_TOOLS : undefined,
          stream: true,
        };

        // Stream the completion
        let fullContent = '';
        let pendingToolCalls: ToolCall[] = [];
        let finishReason: string | undefined;
        let usage: { promptTokens: number; completionTokens: number; totalTokens: number } | undefined;

        for await (const chunk of this.options.provider.completionStream(completionOptions)) {
          // Handle different chunk types
          switch (chunk.type) {
            case 'text':
              if (chunk.content) {
                fullContent += chunk.content;
                yield {
                  type: 'text',
                  content: chunk.content,
                };
              }
              break;

            case 'tool_call':
              if (chunk.toolCall) {
                pendingToolCalls.push(chunk.toolCall);
                yield {
                  type: 'tool_call',
                  toolCall: chunk.toolCall,
                };
              }
              break;

            case 'finish':
              finishReason = chunk.finishReason;
              if (chunk.usage) {
                usage = chunk.usage;
              }
              break;

            case 'error':
              yield {
                type: 'error',
                error: chunk.error ?? 'Unknown error during streaming',
              };
              return;
          }
        }

        // Add assistant message to history
        const assistantMessage: CompletionMessage = {
          role: 'assistant',
          content: fullContent,
          ...(pendingToolCalls.length > 0 && { tool_calls: pendingToolCalls }),
        };
        state.messages.push(assistantMessage);

        // Handle tool calls if any
        if (pendingToolCalls.length > 0) {
          // Limit tool calls per iteration to prevent abuse
          if (pendingToolCalls.length > maxToolCallsPerIteration) {
            yield {
              type: 'thinking',
              content: `Limiting to ${maxToolCallsPerIteration} tool calls out of ${pendingToolCalls.length} requested...`,
            };
            pendingToolCalls = pendingToolCalls.slice(0, maxToolCallsPerIteration);
          }

          // Deduplicate tool calls
          if (enableDeduplication) {
            const uniqueToolCalls: ToolCall[] = [];
            for (const toolCall of pendingToolCalls) {
              const toolHash = hashToolCall(toolCall);
              
              if (state.executedToolCalls.has(toolHash)) {
                yield {
                  type: 'thinking',
                  content: `Skipping duplicate tool call: ${toolCall.function.name}`,
                };
                continue;
              }
              
              uniqueToolCalls.push(toolCall);
              state.executedToolCalls.add(toolHash);
            }
            pendingToolCalls = uniqueToolCalls;
          }

          // Track tool call patterns for loop detection
          const currentToolPattern = pendingToolCalls.map(tc => tc.function.name).join(',');
          state.toolCallHistory.push(currentToolPattern);
          
          // Detect tool call loops (same pattern repeated)
          if (state.toolCallHistory.length >= toolLoopThreshold) {
            const recentPatterns = state.toolCallHistory.slice(-toolLoopThreshold);
            if (recentPatterns.every(p => p === recentPatterns[0]) && recentPatterns[0] !== '') {
              yield {
                type: 'error',
                error: `Detected tool call loop: ${recentPatterns[0]}. Stopping to prevent infinite iteration.`,
              };
              state.isComplete = true;
              break;
            }
          }

          // Execute each tool call
          for (const toolCall of pendingToolCalls) {
            yield {
              type: 'thinking',
              content: `Executing tool: ${toolCall.function.name}...`,
            };

            const result = await executeTool(toolCall, this.toolContext);
            state.toolResults.push(result);

            yield {
              type: 'tool_result',
              toolResult: result,
            };

            // Add tool result to messages
            state.messages.push({
              role: 'tool',
              content: result.error
                ? `Error: ${result.error}\n\nOutput: ${result.output}`
                : result.output,
              tool_call_id: toolCall.id,
            });
          }

          // Continue loop for next iteration with tool results
          continue;
        }

        // No tool calls - agent is done
        state.isComplete = true;

        // Yield complete event
        yield {
          type: 'complete',
          content: fullContent,
          usage,
        };
      }

      // Check if we hit max iterations
      if (state.iteration >= maxIterations && !state.isComplete) {
        yield {
          type: 'error',
          error: `Agent reached maximum iterations (${maxIterations}) without completing`,
        };
      }
    } catch (error) {
      yield {
        type: 'error',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Run the agent without streaming (returns complete result)
   */
  async runSync(promptContext: PromptContext): Promise<{
    content: string;
    toolResults: ToolExecutionResult[];
    usage?: { promptTokens: number; completionTokens: number; totalTokens: number };
    error?: string;
  }> {
    const events: AgentEvent[] = [];
    
    for await (const event of this.run(promptContext)) {
      events.push(event);
    }

    const completeEvent = events.find((e) => e.type === 'complete');
    const errorEvent = events.find((e) => e.type === 'error');
    const toolResults = events
      .filter((e) => e.type === 'tool_result' && e.toolResult)
      .map((e) => e.toolResult!);

    return {
      content: completeEvent?.content ?? '',
      toolResults,
      usage: completeEvent?.usage,
      error: errorEvent?.error,
    };
  }
}

/**
 * Factory function to create an agent runtime
 */
export function createAgentRuntime(
  options: RuntimeOptions,
  toolContext: ToolContext
): AgentRuntime {
  return new AgentRuntime(options, toolContext);
}

/**
 * Quick helper to run an agent with minimal setup
 */
export async function runAgent(
  provider: LLMProvider,
  promptContext: PromptContext,
  toolContext: ToolContext,
  options: Omit<RuntimeOptions, 'provider'> = {}
): Promise<{
  content: string;
  toolResults: ToolExecutionResult[];
  usage?: { promptTokens: number; completionTokens: number; totalTokens: number };
  error?: string;
}> {
  const runtime = createAgentRuntime(
    { provider, ...options },
    toolContext
  );
  return runtime.runSync(promptContext);
}

/**
 * Stream helper for React hooks
 */
export async function* streamAgent(
  provider: LLMProvider,
  promptContext: PromptContext,
  toolContext: ToolContext,
  options: Omit<RuntimeOptions, 'provider'> = {},
  config?: RuntimeConfig
): AsyncGenerator<AgentEvent> {
  const runtime = createAgentRuntime(
    { provider, ...options },
    toolContext
  );
  yield* runtime.run(promptContext, config);
}
