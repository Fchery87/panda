/**
 * OpenAI Compatible Provider
 * 
 * Supports OpenAI, OpenRouter, Together.ai, and other OpenAI-compatible APIs.
 * Uses the Vercel AI SDK for streaming completions.
 */

import { streamText, generateText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import type {
  LLMProvider,
  ModelInfo,
  CompletionOptions,
  CompletionResponse,
  StreamChunk,
  ToolCall,
  ProviderConfig,
} from './types';

/**
 * OpenAI Compatible Provider implementation
 * Works with OpenAI, OpenRouter, Together.ai, and other compatible APIs
 */
export class OpenAICompatibleProvider implements LLMProvider {
  name = 'openai-compatible';
  config: ProviderConfig;
  private client: ReturnType<typeof createOpenAI>;

  constructor(config: ProviderConfig) {
    this.config = config;
    
    // Create AI SDK client with custom configuration
    this.client = createOpenAI({
      apiKey: config.auth.apiKey,
      baseURL: config.auth.baseUrl,
      headers: config.customHeaders,
    });
  }

  /**
   * List available models
   * For OpenAI-compatible APIs, we return common models
   * For OpenRouter, we fetch from their API
   */
  async listModels(): Promise<ModelInfo[]> {
    // If using OpenRouter, fetch models from their API
    if (this.config.auth.baseUrl?.includes('openrouter')) {
      return this.listOpenRouterModels();
    }

    // If using Together.ai, fetch models from their API
    if (this.config.auth.baseUrl?.includes('together')) {
      return this.listTogetherModels();
    }

    // Default OpenAI models
    return this.getDefaultOpenAIModels();
  }

  /**
   * Create a non-streaming completion
   */
  async complete(options: CompletionOptions): Promise<CompletionResponse> {
    const result = await generateText({
      model: this.client(options.model),
      messages: this.convertMessages(options.messages),
      temperature: options.temperature ?? 0.7,
      maxTokens: options.maxTokens,
      topP: options.topP,
      frequencyPenalty: options.frequencyPenalty,
      presencePenalty: options.presencePenalty,
      tools: this.convertTools(options.tools),
    });

    return {
      message: {
        role: 'assistant',
        content: result.text,
      },
      finishReason: result.finishReason as any,
      usage: {
        promptTokens: result.usage.promptTokens,
        completionTokens: result.usage.completionTokens,
        totalTokens: result.usage.totalTokens,
      },
      model: options.model,
    };
  }

  /**
   * Create a streaming completion
   * Yields chunks of text, tool calls, and finish events
   */
  async *completionStream(options: CompletionOptions): AsyncGenerator<StreamChunk> {
    const result = streamText({
      model: this.client(options.model),
      messages: this.convertMessages(options.messages),
      temperature: options.temperature ?? 0.7,
      maxTokens: options.maxTokens,
      topP: options.topP,
      frequencyPenalty: options.frequencyPenalty,
      presencePenalty: options.presencePenalty,
      tools: this.convertTools(options.tools),
    });

    let toolCalls: ToolCall[] = [];
    
    // Stream text deltas
    for await (const delta of result.textStream) {
      yield {
        type: 'text',
        content: delta,
      };
    }

    // Get the final result for tool calls and usage
    const finalResult = await result;

    // Handle tool calls
    if (finalResult.toolCalls && finalResult.toolCalls.length > 0) {
      for (const toolCall of finalResult.toolCalls) {
        const tc: ToolCall = {
          id: toolCall.toolCallId,
          type: 'function',
          function: {
            name: toolCall.toolName,
            arguments: JSON.stringify(toolCall.args),
          },
        };
        toolCalls.push(tc);
        
        yield {
          type: 'tool_call',
          toolCall: tc,
        };
      }
    }

    // Yield finish event with usage
    yield {
      type: 'finish',
      finishReason: finalResult.finishReason as any,
      usage: {
        promptTokens: finalResult.usage.promptTokens,
        completionTokens: finalResult.usage.completionTokens,
        totalTokens: finalResult.usage.totalTokens,
      },
    };
  }

  /**
   * Convert our message format to AI SDK format
   */
  private convertMessages(messages: CompletionOptions['messages']) {
    return messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
      ...(msg.name && { name: msg.name }),
      ...(msg.tool_calls && { tool_calls: msg.tool_calls }),
      ...(msg.tool_call_id && { tool_call_id: msg.tool_call_id }),
    }));
  }

  /**
   * Convert our tool format to AI SDK format
   */
  private convertTools(tools?: CompletionOptions['tools']) {
    if (!tools || tools.length === 0) return undefined;

    return tools.map((tool) => ({
      name: tool.function.name,
      description: tool.function.description,
      parameters: tool.function.parameters,
    }));
  }

  /**
   * Fetch models from OpenRouter API
   */
  private async listOpenRouterModels(): Promise<ModelInfo[]> {
    try {
      const response = await fetch('https://openrouter.ai/api/v1/models', {
        headers: {
          'Authorization': `Bearer ${this.config.auth.apiKey}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch OpenRouter models: ${response.statusText}`);
      }

      const data = await response.json();
      
      return data.data.map((model: any) => ({
        id: model.id,
        name: model.name || model.id,
        provider: 'openrouter' as const,
        description: model.description,
        maxTokens: model.top_provider?.max_completion_tokens || 4096,
        contextWindow: model.context_length || 8192,
        capabilities: {
          streaming: true,
          functionCalling: model.features?.includes('tools') || false,
          vision: model.features?.includes('vision') || model.id.includes('vision') || model.id.includes('claude-3'),
          jsonMode: true,
          toolUse: model.features?.includes('tools') || false,
        },
        pricing: {
          inputPerToken: model.pricing?.prompt || 0,
          outputPerToken: model.pricing?.completion || 0,
        },
      }));
    } catch (error) {
      console.error('Error fetching OpenRouter models:', error);
      return this.getFallbackModels('openrouter');
    }
  }

  /**
   * Fetch models from Together.ai API
   */
  private async listTogetherModels(): Promise<ModelInfo[]> {
    try {
      const response = await fetch('https://api.together.xyz/v1/models', {
        headers: {
          'Authorization': `Bearer ${this.config.auth.apiKey}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch Together models: ${response.statusText}`);
      }

      const data = await response.json();
      
      return data.map((model: any) => ({
        id: model.id,
        name: model.display_name || model.id,
        provider: 'together' as const,
        description: model.description,
        maxTokens: model.context_length || 4096,
        contextWindow: model.context_length || 8192,
        capabilities: {
          streaming: true,
          functionCalling: model.supports_tools || false,
          vision: model.supports_vision || model.id.includes('llava') || false,
          jsonMode: true,
          toolUse: model.supports_tools || false,
        },
      }));
    } catch (error) {
      console.error('Error fetching Together models:', error);
      return this.getFallbackModels('together');
    }
  }

  /**
   * Get default OpenAI models
   */
  private getDefaultOpenAIModels(): ModelInfo[] {
    return [
      {
        id: 'gpt-4o',
        name: 'GPT-4o',
        provider: 'openai',
        description: 'Most capable multimodal model',
        maxTokens: 4096,
        contextWindow: 128000,
        capabilities: {
          streaming: true,
          functionCalling: true,
          vision: true,
          jsonMode: true,
          toolUse: true,
        },
      },
      {
        id: 'gpt-4o-mini',
        name: 'GPT-4o Mini',
        provider: 'openai',
        description: 'Fast, affordable small model for focused tasks',
        maxTokens: 4096,
        contextWindow: 128000,
        capabilities: {
          streaming: true,
          functionCalling: true,
          vision: true,
          jsonMode: true,
          toolUse: true,
        },
      },
      {
        id: 'gpt-4-turbo',
        name: 'GPT-4 Turbo',
        provider: 'openai',
        description: 'Previous generation model with 128k context',
        maxTokens: 4096,
        contextWindow: 128000,
        capabilities: {
          streaming: true,
          functionCalling: true,
          vision: true,
          jsonMode: true,
          toolUse: true,
        },
      },
      {
        id: 'gpt-3.5-turbo',
        name: 'GPT-3.5 Turbo',
        provider: 'openai',
        description: 'Fast, cost-effective model for simpler tasks',
        maxTokens: 4096,
        contextWindow: 16385,
        capabilities: {
          streaming: true,
          functionCalling: true,
          vision: false,
          jsonMode: true,
          toolUse: true,
        },
      },
    ];
  }

  /**
   * Get fallback models when API fetch fails
   */
  private getFallbackModels(provider: 'openrouter' | 'together'): ModelInfo[] {
    if (provider === 'openrouter') {
      return [
        {
          id: 'anthropic/claude-3.5-sonnet',
          name: 'Claude 3.5 Sonnet',
          provider: 'openrouter',
          maxTokens: 8192,
          contextWindow: 200000,
          capabilities: {
            streaming: true,
            functionCalling: true,
            vision: true,
            jsonMode: true,
            toolUse: true,
          },
        },
        {
          id: 'openai/gpt-4o',
          name: 'GPT-4o',
          provider: 'openrouter',
          maxTokens: 4096,
          contextWindow: 128000,
          capabilities: {
            streaming: true,
            functionCalling: true,
            vision: true,
            jsonMode: true,
            toolUse: true,
          },
        },
      ];
    }

    return [
      {
        id: 'togethercomputer/llama-3.1-70b',
        name: 'Llama 3.1 70B',
        provider: 'together',
        maxTokens: 4096,
        contextWindow: 128000,
        capabilities: {
          streaming: true,
          functionCalling: true,
          vision: false,
          jsonMode: true,
          toolUse: true,
        },
      },
    ];
  }
}

/**
 * Factory function to create a provider instance
 */
export function createOpenAICompatibleProvider(config: ProviderConfig): OpenAICompatibleProvider {
  return new OpenAICompatibleProvider(config);
}
