import type {
  CompletionOptions,
  CompletionResponse,
  LLMProvider,
  ModelInfo,
  ProviderConfig,
  StreamChunk,
} from './types'

const E2E_PROVIDER_CONFIG: ProviderConfig = {
  provider: 'custom',
  auth: { apiKey: 'e2e-local' },
  defaultModel: 'e2e-spec-model',
}

const E2E_MODEL: ModelInfo = {
  id: 'e2e-spec-model',
  name: 'E2E Spec Model',
  provider: 'custom',
  description: 'Deterministic local-only provider for browser E2E flows.',
  maxTokens: 2048,
  contextWindow: 8192,
  capabilities: {
    streaming: true,
    functionCalling: false,
    vision: false,
    jsonMode: false,
    toolUse: false,
    supportsReasoning: false,
  },
}

function buildE2EResponse(_options: CompletionOptions): string {
  return 'E2E agent completed approved specification.'
}

export function isE2ESpecApprovalModeEnabled(): boolean {
  return process.env.NEXT_PUBLIC_E2E_AGENT_MODE === 'spec-approval'
}

export function createE2EProvider(): LLMProvider {
  return {
    name: 'E2E Provider',
    config: E2E_PROVIDER_CONFIG,
    async listModels(): Promise<ModelInfo[]> {
      return [E2E_MODEL]
    },
    async complete(options: CompletionOptions): Promise<CompletionResponse> {
      const content = buildE2EResponse(options)
      return {
        message: {
          role: 'assistant',
          content,
        },
        finishReason: 'stop',
        usage: {
          promptTokens: 16,
          completionTokens: 8,
          totalTokens: 24,
        },
        model: E2E_MODEL.id,
      }
    },
    async *completionStream(options: CompletionOptions): AsyncGenerator<StreamChunk> {
      const content = buildE2EResponse(options)
      yield {
        type: 'text',
        content,
      }
      yield {
        type: 'finish',
        finishReason: 'stop',
        usage: {
          promptTokens: 16,
          completionTokens: 8,
          totalTokens: 24,
        },
      }
    },
  }
}
