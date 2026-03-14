/// <reference types="node" />

/**
 * Convex Enhance Prompt Action
 *
 * Action that enhances user prompts using a lightweight LLM.
 * Rewrites vague prompts into clearer, more specific, and actionable prompts.
 *
 * @file convex/enhancePrompt.ts
 */

import { action } from './_generated/server'
import { v } from 'convex/values'

/**
 * Clean markdown fences from response
 */
function cleanMarkdownFences(text: string): string {
  // Remove triple backtick code blocks with optional language identifier
  let cleaned = text.replace(/```[\w]*\n?/g, '').replace(/```$/g, '')

  // Remove single backtick wrapping
  cleaned = cleaned.replace(/^`([^`]*)`$/g, '$1')

  // Trim whitespace
  return cleaned.trim()
}

/**
 * Get provider configuration
 */
function getProviderConfig(provider: string, apiKey?: string, useCodingPlan?: boolean) {
  const configs: Record<string, { baseURL: string; defaultModel: string }> = {
    openai: {
      baseURL: 'https://api.openai.com/v1',
      defaultModel: 'gpt-4o-mini',
    },
    openrouter: {
      baseURL: 'https://openrouter.ai/api/v1',
      defaultModel: 'openai/gpt-4o-mini',
    },
    together: {
      baseURL: 'https://api.together.xyz/v1',
      defaultModel: 'meta-llama/Llama-3.1-8B-Instruct-Turbo',
    },
    chutes: {
      baseURL: 'https://llm.chutes.ai/v1',
      defaultModel: 'meta-llama/Meta-Llama-3.1-8B-Instruct',
    },
    groq: {
      baseURL: 'https://api.groq.com/openai/v1',
      defaultModel: 'llama-3.1-8b-instant',
    },
    deepseek: {
      baseURL: 'https://api.deepseek.com/v1',
      defaultModel: 'deepseek-chat',
    },
    anthropic: {
      baseURL: 'https://api.anthropic.com/v1',
      defaultModel: 'claude-3-haiku-20240307',
    },
    zai: {
      baseURL: 'https://api.z.ai/api/paas/v4',
      defaultModel: 'glm-4.7',
    },
  }

  // For Z.ai, determine if using Coding Plan or regular API
  let effectiveApiKey = apiKey || ''
  let baseURL = configs[provider]?.baseURL || configs.openai.baseURL

  if (provider === 'zai') {
    // Use coding plan endpoint if flag is set
    if (useCodingPlan) {
      baseURL = 'https://api.z.ai/api/coding/paas/v4'
    }
    effectiveApiKey = apiKey || process.env.ZAI_API_KEY || process.env.ZAI_CODING_PLAN_KEY || ''
  }

  return {
    baseURL,
    defaultModel: configs[provider]?.defaultModel || configs.openai.defaultModel,
    apiKey: effectiveApiKey,
    supportsSystemMessages: provider !== 'zai',
  }
}

/**
 * Enhance a user prompt
 *
 * Takes a vague or simple prompt and rewrites it to be more specific
 * and actionable for an AI coding assistant.
 */
export const enhance = action({
  args: {
    prompt: v.string(),
    provider: v.optional(v.string()),
    model: v.optional(v.string()),
    apiKey: v.optional(v.string()),
    useCodingPlan: v.optional(v.boolean()),
  },
  handler: async (_ctx, args): Promise<{ enhancedPrompt: string }> => {
    const { prompt, provider, model, apiKey, useCodingPlan } = args

    if (!prompt.trim()) {
      throw new Error('Prompt cannot be empty')
    }

    // Use provided provider/model or fall back to defaults
    // The frontend should fetch admin settings and pass them
    const effectiveProvider = provider || 'openai'
    const effectiveModel = model || 'gpt-4o-mini'

    // Get provider configuration with the provided API key
    const config = getProviderConfig(effectiveProvider, apiKey, useCodingPlan)
    const selectedModel = effectiveModel || config.defaultModel

    // Build the enhancement request
    const systemPrompt = `You are a prompt improvement assistant. Your task is to rewrite user prompts to be clearer, more specific, and more actionable for an AI coding assistant. 

Guidelines:
- Preserve the user's intent exactly
- Add relevant technical context where helpful
- Do not add instructions the user didn't ask for
- Return ONLY the enhanced prompt, no explanations, no markdown code blocks
- Keep the enhanced prompt concise but comprehensive`

    const userMessage = `Rewrite the following user prompt to be clearer, more specific, and more actionable for an AI coding assistant:

${prompt}`

    // Build messages array (Z.ai doesn't support system messages)
    const messages = config.supportsSystemMessages
      ? [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ]
      : [{ role: 'user', content: `${systemPrompt}\n\n${userMessage}` }]

    try {
      // Call the LLM API
      const response = await fetch(`${config.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.apiKey}`,
          ...(effectiveProvider === 'openrouter'
            ? {
                'HTTP-Referer': 'https://panda.ai',
                'X-Title': 'Panda.ai',
              }
            : {}),
        },
        body: JSON.stringify({
          model: selectedModel,
          messages,
          temperature: 0.3,
          max_tokens: 1024,
          stream: false,
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`LLM API error: ${errorText}`)
      }

      const data = await response.json()
      const enhancedPrompt = data.choices?.[0]?.message?.content

      if (!enhancedPrompt) {
        throw new Error('No response from LLM')
      }

      // Clean markdown fences and return
      return { enhancedPrompt: cleanMarkdownFences(enhancedPrompt) }
    } catch (error) {
      console.error('Enhance prompt error:', error)
      throw new Error(error instanceof Error ? error.message : 'Failed to enhance prompt')
    }
  },
})
