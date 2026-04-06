/**
 * Plugin System - Extensibility through hooks and custom tools
 *
 * Implements OpenCode-style plugin architecture:
 * - Lifecycle hooks for all operations
 * - Custom tool registration
 * - Custom agent registration
 * - Hook priority and ordering
 */

import { appLog } from '@/lib/logger'
import { AGENT_TOOLS } from '../tools'
import type {
  Plugin,
  HookType,
  HookHandler,
  HookContext,
  ToolDefinition,
  AgentConfig,
} from './types'

type HookEntry = {
  plugin: string
  priority: number
  handler: HookHandler<unknown>
}

function debugHarnessLog(...args: unknown[]): void {
  if (process.env.NEXT_PUBLIC_PANDA_AGENT_HARNESS_DEBUG_LOGS !== '1') {
    return
  }
  console.log(...args)
}

export class PluginManager {
  private plugins: Map<string, Plugin> = new Map()
  private hooks: Map<HookType, HookEntry[]> = new Map()
  private customTools: Map<string, ToolDefinition> = new Map()
  private customAgents: Map<string, AgentConfig> = new Map()

  /**
   * Register a plugin
   */
  register(plugin: Plugin): void {
    if (this.plugins.has(plugin.name)) {
      appLog.warn(`[PluginManager] Plugin "${plugin.name}" already registered, replacing`)
      this.unregister(plugin.name)
    }

    this.plugins.set(plugin.name, plugin)

    if (plugin.hooks) {
      for (const [hookType, handler] of Object.entries(plugin.hooks)) {
        this.addHook(plugin.name, hookType as HookType, handler as HookHandler, 0)
      }
    }

    if (plugin.tools) {
      const builtinNames = new Set(AGENT_TOOLS.map((t) => t.function.name))
      for (const tool of plugin.tools) {
        if (builtinNames.has(tool.function.name)) {
          throw new Error(
            `Plugin "${plugin.name}" shadows built-in tool "${tool.function.name}". ` +
              `Use a unique name to avoid overriding core tools.`
          )
        }
        this.customTools.set(tool.function.name, tool)
      }
    }

    if (plugin.agents) {
      for (const agent of plugin.agents) {
        this.customAgents.set(agent.name, agent)
      }
    }
  }

  /**
   * Unregister a plugin
   */
  unregister(name: string): void {
    const plugin = this.plugins.get(name)
    if (!plugin) return

    this.plugins.delete(name)

    for (const [hookType, entries] of this.hooks) {
      this.hooks.set(
        hookType,
        entries.filter((e) => e.plugin !== name)
      )
    }

    if (plugin.tools) {
      for (const tool of plugin.tools) {
        this.customTools.delete(tool.function.name)
      }
    }

    if (plugin.agents) {
      for (const agent of plugin.agents) {
        this.customAgents.delete(agent.name)
      }
    }
  }

  /**
   * Add a hook handler
   */
  addHook(plugin: string, hookType: HookType, handler: HookHandler, priority: number = 0): void {
    if (!this.hooks.has(hookType)) {
      this.hooks.set(hookType, [])
    }

    const entries = this.hooks.get(hookType)!
    entries.push({ plugin, priority, handler })
    entries.sort((a, b) => b.priority - a.priority)
  }

  /**
   * Execute hooks for a given type
   */
  async executeHooks<T>(
    hookType: HookType,
    context: HookContext,
    data: T
  ): Promise<{ result: T; errors: Array<{ plugin: string; error: Error }> }> {
    const entries = this.hooks.get(hookType)
    if (!entries || entries.length === 0) return { result: data, errors: [] }

    const errors: Array<{ plugin: string; error: Error }> = []
    let result = data

    for (const entry of entries) {
      try {
        const hookResult = await entry.handler(context, result)
        if (hookResult !== undefined) {
          result = hookResult as T
        }
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error))
        appLog.error(`[PluginManager] Hook error in ${entry.plugin}:`, err)
        errors.push({ plugin: entry.plugin, error: err })
      }
    }

    return { result, errors }
  }

  /**
   * Get all registered tools (built-in + custom)
   */
  getTools(): ToolDefinition[] {
    return Array.from(this.customTools.values())
  }

  /**
   * Get a specific tool
   */
  getTool(name: string): ToolDefinition | undefined {
    return this.customTools.get(name)
  }

  /**
   * Get all registered agents (custom)
   */
  getAgents(): AgentConfig[] {
    return Array.from(this.customAgents.values())
  }

  /**
   * Get a specific agent
   */
  getAgent(name: string): AgentConfig | undefined {
    return this.customAgents.get(name)
  }

  /**
   * List all registered plugins
   */
  listPlugins(): Plugin[] {
    return Array.from(this.plugins.values())
  }

  /**
   * Check if a plugin is registered
   */
  has(name: string): boolean {
    return this.plugins.has(name)
  }

  /**
   * Get a specific plugin by name
   */
  getPlugin(name: string): Plugin | undefined {
    return this.plugins.get(name)
  }
}

export const plugins = new PluginManager()

/**
 * Create a simple plugin
 */
export function createPlugin(
  name: string,
  config: {
    hooks?: Partial<Record<HookType, HookHandler<unknown>>>
    tools?: ToolDefinition[]
    agents?: AgentConfig[]
  }
): Plugin {
  return {
    name,
    version: '1.0.0',
    hooks: config.hooks ?? {},
    tools: config.tools,
    agents: config.agents,
  }
}

/**
 * Logging plugin example
 */
export const loggingPlugin = createPlugin('logging', {
  hooks: {
    'tool.execute.before': async (ctx, data) => {
      debugHarnessLog(`[Tool] ${ctx.agent.name} executing:`, data)
      return data
    },
    'tool.execute.after': async (ctx, data) => {
      debugHarnessLog(`[Tool] ${ctx.agent.name} completed:`, data)
      return data
    },
    'session.start': async (ctx, data) => {
      debugHarnessLog(`[Session] Started:`, ctx.sessionID)
      return data
    },
    'session.end': async (ctx, data) => {
      debugHarnessLog(`[Session] Ended:`, ctx.sessionID)
      return data
    },
  },
})

/**
 * Cost tracking plugin
 */
export const costTrackingPlugin = createPlugin('cost-tracking', {
  hooks: {
    'llm.response': async (ctx, data) => {
      const typedData = data as { usage?: { totalTokens: number }; modelID: string }
      if (typedData.usage) {
        const cost = calculateCost(typedData.modelID, typedData.usage.totalTokens)
        debugHarnessLog(
          `[Cost] ${ctx.sessionID}: $${cost.toFixed(6)} (${typedData.usage.totalTokens} tokens)`
        )
      }
      return data
    },
  },
})

function calculateCost(modelID: string, tokens: number): number {
  const pricing: Record<string, { input: number; output: number }> = {
    'claude-sonnet-4': { input: 0.000003, output: 0.000015 },
    'claude-opus-4': { input: 0.000015, output: 0.000075 },
    'gpt-4o': { input: 0.000005, output: 0.000015 },
    'gpt-4-turbo': { input: 0.00001, output: 0.00003 },
  }

  const price = pricing[modelID] ?? { input: 0.000001, output: 0.000003 }
  return tokens * ((price.input + price.output) / 2)
}

/**
 * Spec Tracking Plugin - Tracks execution against specifications
 *
 * Hooks into tool execution to:
 * - Mark completed spec steps
 * - Track constraint satisfaction
 * - Log spec execution events
 *
 * Note: Drift detection is handled by the dedicated drift-detection plugin
 */
export const specTrackingPlugin = createPlugin('spec-tracking', {
  hooks: {
    'tool.execute.after': async (ctx, data) => {
      const typedData = data as {
        toolName: string
        args: Record<string, unknown>
        result: { output?: string; error?: string }
      }

      // Log spec-related tool execution
      if (process.env.NEXT_PUBLIC_PANDA_SPEC_DEBUG === '1') {
        debugHarnessLog(`[SpecTracking] Tool executed: ${typedData.toolName}`, {
          sessionID: ctx.sessionID,
          step: ctx.step,
          hasError: !!typedData.result.error,
        })
      }

      // Note: Drift detection is handled by the drift-detection plugin
      // which runs separately and monitors all write operations

      return data
    },

    'spec.execute.before': async (ctx, data) => {
      const typedData = data as { spec?: { id: string; intent: { goal: string } } }

      if (process.env.NEXT_PUBLIC_PANDA_SPEC_DEBUG === '1') {
        debugHarnessLog(`[SpecTracking] Spec execution starting:`, {
          sessionID: ctx.sessionID,
          specId: typedData.spec?.id,
          goal: typedData.spec?.intent.goal.slice(0, 50),
        })
      }

      return data
    },

    'spec.verify': async (ctx, data) => {
      const typedData = data as {
        passed: boolean
        criterionResults: Array<{ criterionId: string; passed: boolean }>
      }

      if (process.env.NEXT_PUBLIC_PANDA_SPEC_DEBUG === '1') {
        const passedCount = typedData.criterionResults.filter((r) => r.passed).length
        debugHarnessLog(`[SpecTracking] Spec verification complete:`, {
          sessionID: ctx.sessionID,
          passed: typedData.passed,
          criteriaPassed: `${passedCount}/${typedData.criterionResults.length}`,
        })
      }

      return data
    },

    'spec.drift.detected': async (ctx, data) => {
      const typedData = data as { specId: string; filePath: string; reason: string }

      appLog.warn(`[SpecTracking] Drift detected:`, {
        sessionID: ctx.sessionID,
        specId: typedData.specId,
        filePath: typedData.filePath,
        reason: typedData.reason,
      })

      return data
    },
  },
})

import { createDriftDetectionPlugin } from '../spec/drift-detection'

/**
 * Drift detection plugin - monitors specs for code drift
 */
export const driftDetectionPlugin = createDriftDetectionPlugin({
  enabled: true,
  minSeverity: 'low',
})

export const defaultPlugins = [
  loggingPlugin,
  costTrackingPlugin,
  specTrackingPlugin,
  driftDetectionPlugin,
] as const

export function registerDefaultPlugins(): void {
  for (const plugin of defaultPlugins) {
    if (!plugins.has(plugin.name)) {
      plugins.register(plugin)
    }
  }
}

export type { Plugin, HookType, HookHandler, HookContext }
