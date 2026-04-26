import { mutation } from './_generated/server'
import { v } from 'convex/values'

export const makeFirstAdmin = mutation({
  args: {
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query('users')
      .withIndex('email', (q) => q.eq('email', args.email))
      .first()

    if (!user) {
      throw new Error(`User not found with email: ${args.email}`)
    }

    await ctx.db.patch(user._id, {
      isAdmin: true,
      adminRole: 'super',
      adminGrantedAt: Date.now(),
    })

    return { success: true, userId: user._id }
  },
})

/**
 * One-time seed: bootstrap admin settings on a fresh deployment.
 * Remove after use.
 */
export const seedAdminSettings = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query('adminSettings').order('desc').first()
    if (existing) {
      throw new Error('Admin settings already exist. Delete them first if you want to re-seed.')
    }

    const id = await ctx.db.insert('adminSettings', {
      globalDefaultProvider: 'crofai',
      globalDefaultModel: 'glm-5.1-precision',
      enhancementProvider: 'zai',
      enhancementModel: 'glm-4.7-flash',
      allowUserOverrides: true,
      allowUserMCP: true,
      allowUserSubagents: true,
      systemMaintenance: false,
      registrationEnabled: true,
      maxProjectsPerUser: 100,
      maxChatsPerProject: 50,
      updatedAt: Date.now(),
    })

    return { success: true, id }
  },
})

/**
 * One-time seed: bootstrap user settings (provider configs) for a specific user.
 * Remove after use.
 */
export const seedUserSettings = mutation({
  args: {
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query('users')
      .withIndex('email', (q) => q.eq('email', args.email))
      .first()

    if (!user) {
      throw new Error(`User not found with email: ${args.email}`)
    }

    const existing = await ctx.db
      .query('settings')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .first()

    if (existing) {
      throw new Error('User settings already exist. Delete them first if you want to re-seed.')
    }

    const id = await ctx.db.insert('settings', {
      userId: user._id,
      theme: 'system',
      language: 'en',
      defaultProvider: 'crofai',
      defaultModel: 'greg',
      overrideGlobalProvider: true,
      overrideGlobalModel: true,
      agentDefaults: {
        allowedCommandPrefixes: [],
        autoApplyFiles: true,
        autoRunCommands: true,
      },
      providerConfigs: {
        crofai: {
          apiKey: 'nahcrof_HPgwnbIAeMUTtKFGhkDQ',
          availableModels: ['deepseek-v4-pro', 'deepseek-v3.2', 'glm-5.1', 'glm-5.1-precision', 'greg', 'kimi-k2.6', 'kimi-k2.6-precision', 'kimi-k2.5', 'kimi-k2.5-lightning', 'glm-5', 'glm-4.7', 'glm-4.7-flash', 'gemma-4-31b-it', 'minimax-m2.5', 'qwen3.6-27b', 'qwen3.5-397b-a17b', 'qwen3.5-9b', 'qwen3.5-9b-chat'],
          baseUrl: 'https://crof.ai/v1',
          defaultModel: 'glm-5.1-precision',
          description: 'OpenAI-compatible inference endpoint with mixed open and frontier models',
          enabled: true,
          name: 'crof.ai',
          provider: 'crofai',
          reasoningBudget: 6000,
          reasoningEnabled: true,
          reasoningMode: 'auto',
          showReasoningPanel: true,
        },
        zai: {
          apiKey: '3e7dc2286176431297050fdd887018c3.uuzrX4KWKH7IW3rV',
          availableModels: ['glm-5v-turbo', 'glm-5.1', 'glm-5-turbo', 'glm-5', 'glm-4.7-flash', 'glm-4.7-flashx', 'glm-4.7', 'glm-4.6v', 'glm-4.6', 'glm-4.5v', 'glm-4.5', 'glm-4.5-air', 'glm-4.5-flash'],
          baseUrl: 'https://api.z.ai/api/coding/paas/v4',
          defaultModel: 'glm-4.7',
          description: 'Z.ai GLM-4.7 series models for coding (supports API key or Coding Plan)',
          enabled: true,
          name: 'Z.ai',
          provider: 'zai',
          reasoningBudget: 6000,
          reasoningEnabled: true,
          reasoningMode: 'auto',
          showReasoningPanel: true,
          useCodingPlan: true,
        },
        openrouter: {
          apiKey: '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',
          availableModels: ['minimax/minimax-m2.5:free', 'deepseek/deepseek-v3.2', 'qwen/qwen3-coder', 'google/gemini-2.5-flash', 'anthropic/claude-sonnet-4.5'],
          baseUrl: 'https://openrouter.ai/api/v1',
          defaultModel: 'minimax/minimax-m2.5:free',
          description: 'Access multiple AI models through a single API',
          enabled: true,
          name: 'OpenRouter',
          provider: 'openrouter',
        },
        chutes: {
          apiKey: 'cpk_4c96cfa538bc4d6ebb15ec31a83bc9e2.0c901ba9b8f25388960c0f3811c06bf0.M99opFyoQfW0YmKz3FXDQiFWw2IR5NQQ',
          availableModels: ['zai-org/GLM-5-Turbo', 'zai-org/GLM-5.1-TEE', 'deepseek-ai/DeepSeek-V3.2-TEE', 'Qwen/Qwen3-coder-flash'],
          baseUrl: 'https://llm.chutes.ai/v1',
          defaultModel: 'zai-org/GLM-5-Turbo',
          description: 'Decentralized AI platform with access to Llama, DeepSeek, Qwen models',
          enabled: true,
          name: 'Chutes.ai',
          provider: 'chutes',
        },
        openai: {
          apiKey: '',
          availableModels: ['gpt-4o', 'gpt-4o-mini', 'gpt-4.1', 'o4-mini'],
          defaultModel: 'gpt-4o-mini',
          description: 'Official OpenAI API for GPT models',
          enabled: false,
          name: 'OpenAI',
          provider: 'openai',
        },
        anthropic: {
          apiKey: '',
          availableModels: ['claude-sonnet-4.5', 'claude-opus-4.5', 'claude-haiku-4.5'],
          baseUrl: 'https://api.anthropic.com/v1',
          defaultModel: 'claude-sonnet-4.5',
          description: 'Native Anthropic Claude API',
          enabled: false,
          name: 'Anthropic',
          provider: 'anthropic',
          reasoningBudget: 6000,
          reasoningEnabled: true,
          reasoningMode: 'auto',
          showReasoningPanel: true,
        },
        together: {
          apiKey: '',
          availableModels: ['meta-llama/Llama-3.1-70B-Instruct-Turbo'],
          baseUrl: 'https://api.together.xyz/v1',
          defaultModel: 'meta-llama/Llama-3.1-70B-Instruct-Turbo',
          description: 'Fast inference for open-source models',
          enabled: false,
          name: 'Together.ai',
          provider: 'together',
        },
      },
      updatedAt: Date.now(),
    })

    return { success: true, id }
  },
})
