import type { GrammarId } from '../harness/tool-call-grammars/types'

export type ModelStatus = 'verified' | 'experimental' | 'unverified'

export interface ModelCapability {
  providerId: string
  modelPattern: string | RegExp
  toolCallGrammars: GrammarId[]
  sdkHandlesToolCalls: 'yes' | 'no' | 'sometimes'
  status: ModelStatus
  notes?: string
}

export const MODEL_CAPABILITIES: ModelCapability[] = [
  {
    providerId: 'anthropic',
    modelPattern: /^claude-/,
    toolCallGrammars: ['anthropic-native', 'anthropic-xml-fallback'],
    sdkHandlesToolCalls: 'yes',
    status: 'verified',
  },
  {
    providerId: 'openai',
    modelPattern: /^gpt-/,
    toolCallGrammars: ['openai-native', 'openai-text-json'],
    sdkHandlesToolCalls: 'yes',
    status: 'verified',
  },
  {
    providerId: 'openai-compatible',
    modelPattern: /^kimi-/,
    toolCallGrammars: ['minimax-xml', 'openai-text-json'],
    sdkHandlesToolCalls: 'no',
    status: 'experimental',
    notes: 'kimi-k2.5 emits minimax-xml in text stream; does not use SDK tool_calls field',
  },
  {
    providerId: 'openai-compatible',
    modelPattern: /^deepseek-/,
    toolCallGrammars: ['deepseek-fim', 'openai-text-json'],
    sdkHandlesToolCalls: 'sometimes',
    status: 'experimental',
  },
  {
    providerId: 'openai-compatible',
    modelPattern: /hermes/i,
    toolCallGrammars: ['hermes-tool-call'],
    sdkHandlesToolCalls: 'no',
    status: 'experimental',
  },
  // OpenRouter models — accessed via openai-compatible provider
  {
    providerId: 'openai-compatible',
    modelPattern: /^meta-llama\//,
    toolCallGrammars: ['openai-native', 'openai-text-json'],
    sdkHandlesToolCalls: 'yes',
    status: 'experimental',
    notes: 'Llama models on OpenRouter use standard tool_call format',
  },
  {
    providerId: 'openai-compatible',
    modelPattern: /qwen/i,
    toolCallGrammars: ['qwen-xml', 'openai-text-json'],
    sdkHandlesToolCalls: 'sometimes',
    status: 'experimental',
  },
  {
    providerId: 'openai-compatible',
    modelPattern: /mistral/i,
    toolCallGrammars: ['openai-native', 'openai-text-json'],
    sdkHandlesToolCalls: 'yes',
    status: 'experimental',
  },
  {
    providerId: 'openai-compatible',
    modelPattern: /mixtral/i,
    toolCallGrammars: ['openai-native', 'openai-text-json'],
    sdkHandlesToolCalls: 'yes',
    status: 'experimental',
  },
  {
    providerId: 'openai-compatible',
    modelPattern: /gemini/i,
    toolCallGrammars: ['openai-native', 'openai-text-json'],
    sdkHandlesToolCalls: 'yes',
    status: 'experimental',
  },
  // Together.ai models
  {
    providerId: 'openai-compatible',
    modelPattern: /^togethercomputer\//,
    toolCallGrammars: ['openai-native', 'openai-text-json'],
    sdkHandlesToolCalls: 'yes',
    status: 'experimental',
  },
  // Groq models
  {
    providerId: 'openai-compatible',
    modelPattern: /^llama-/,
    toolCallGrammars: ['openai-native', 'openai-text-json'],
    sdkHandlesToolCalls: 'yes',
    status: 'experimental',
    notes: 'Llama models via Groq use standard tool_call format',
  },
  // Z.ai models
  {
    providerId: 'zai',
    modelPattern: /^glm-/,
    toolCallGrammars: ['openai-native', 'openai-text-json'],
    sdkHandlesToolCalls: 'yes',
    status: 'experimental',
  },
  // Fireworks models
  {
    providerId: 'openai-compatible',
    modelPattern: /^accounts\//,
    toolCallGrammars: ['openai-native', 'openai-text-json'],
    sdkHandlesToolCalls: 'yes',
    status: 'experimental',
  },
]

function matches(pattern: string | RegExp, modelId: string): boolean {
  if (typeof pattern === 'string') return modelId === pattern
  return pattern.test(modelId)
}

export function findCapability(providerId: string, modelId: string): ModelCapability | null {
  return (
    MODEL_CAPABILITIES.find(
      (c) => c.providerId === providerId && matches(c.modelPattern, modelId)
    ) ?? null
  )
}

export function isVerified(providerId: string, modelId: string): boolean {
  const cap = findCapability(providerId, modelId)
  return cap?.status === 'verified'
}

export function getGrammarsForModel(providerId: string, modelId: string): GrammarId[] {
  return findCapability(providerId, modelId)?.toolCallGrammars ?? []
}
