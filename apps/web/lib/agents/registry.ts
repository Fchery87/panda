/**
 * Agent Registry
 *
 * Manages subagent definitions and execution.
 * Supports built-in and custom agents for specialized tasks.
 */

import type { ModelInfo } from '@/lib/llm/types'
import type { PermissionsConfig } from '@/lib/permissions'

export type AgentMode = 'primary' | 'subagent' | 'all'

export interface AgentConfig {
  name: string
  description: string
  mode: AgentMode
  model?: string
  prompt?: string
  temperature?: number
  tools?: Record<string, boolean>
  permissions?: Partial<PermissionsConfig>
  hidden?: boolean
  color?: string
  maxSteps?: number
}

export interface Agent extends AgentConfig {
  id: string
}

export interface AgentExecutionContext {
  agentId: string
  parentSessionId?: string
  task: string
  model?: ModelInfo
}

const BUILT_IN_AGENTS: Agent[] = [
  {
    id: 'build',
    name: 'Build',
    description: 'Full development work with all tools enabled',
    mode: 'primary',
    prompt: 'You are an expert software engineer. Write complete, working code.',
    temperature: 0.3,
    permissions: {
      tools: { '*': 'allow' },
      bash: { '*': 'allow' },
    },
  },
  {
    id: 'plan',
    name: 'Plan',
    description: 'Analysis and planning without making changes',
    mode: 'primary',
    prompt:
      'You are a software architect. Analyze code, suggest changes, and create plans without making actual modifications.',
    temperature: 0.1,
    permissions: {
      tools: {
        read: 'allow',
        glob: 'allow',
        grep: 'allow',
        list: 'allow',
        webfetch: 'allow',
        websearch: 'allow',
        todoread: 'allow',
        todowrite: 'allow',
        question: 'allow',
        edit: 'ask',
        write: 'ask',
        bash: 'ask',
      },
      bash: {
        '*': 'ask',
        'git status*': 'allow',
        'git log*': 'allow',
        'git diff*': 'allow',
        'ls *': 'allow',
        'cat *': 'allow',
      },
    },
  },
  {
    id: 'explore',
    name: 'Explore',
    description: 'Fast codebase exploration and search',
    mode: 'subagent',
    prompt:
      'You are a codebase explorer. Quickly find files, search code, and answer questions about the codebase. Do not modify files.',
    temperature: 0.2,
    permissions: {
      tools: {
        read: 'allow',
        glob: 'allow',
        grep: 'allow',
        list: 'allow',
        webfetch: 'allow',
        websearch: 'allow',
        question: 'allow',
        edit: 'deny',
        write: 'deny',
        bash: 'deny',
      },
    },
    maxSteps: 10,
  },
  {
    id: 'general',
    name: 'General',
    description: 'General-purpose agent for multi-step tasks',
    mode: 'subagent',
    prompt:
      'You are a general-purpose assistant. Handle complex tasks that may require multiple steps. You can read and modify files when needed.',
    temperature: 0.4,
    permissions: {
      tools: { '*': 'allow' },
      bash: {
        '*': 'ask',
        'git status*': 'allow',
        'git log*': 'allow',
        'git diff*': 'allow',
        'npm run *': 'allow',
        'bun run *': 'allow',
      },
    },
    maxSteps: 25,
  },
  {
    id: 'review',
    name: 'Review',
    description: 'Code review without making changes',
    mode: 'subagent',
    prompt:
      'You are a code reviewer. Analyze code for quality, security, and best practices. Provide constructive feedback without making changes.',
    temperature: 0.2,
    permissions: {
      tools: {
        read: 'allow',
        glob: 'allow',
        grep: 'allow',
        list: 'allow',
        question: 'allow',
        edit: 'deny',
        write: 'deny',
        bash: 'deny',
      },
    },
    maxSteps: 15,
  },
]

export class AgentRegistry {
  private agents: Map<string, Agent> = new Map()

  constructor() {
    for (const agent of BUILT_IN_AGENTS) {
      this.agents.set(agent.id, agent)
    }
  }

  register(config: AgentConfig): Agent {
    const id = config.name.toLowerCase().replace(/\s+/g, '-')
    const agent: Agent = { ...config, id }
    this.agents.set(id, agent)
    return agent
  }

  unregister(id: string): boolean {
    if (BUILT_IN_AGENTS.some((a) => a.id === id)) {
      return false
    }
    return this.agents.delete(id)
  }

  get(id: string): Agent | undefined {
    return this.agents.get(id)
  }

  list(): Agent[] {
    return Array.from(this.agents.values())
  }

  listPrimary(): Agent[] {
    return this.list().filter((a) => a.mode === 'primary' || a.mode === 'all')
  }

  listSubagents(): Agent[] {
    return this.list().filter((a) => (a.mode === 'subagent' || a.mode === 'all') && !a.hidden)
  }

  getVisibleSubagents(): Agent[] {
    return this.listSubagents().filter((a) => !a.hidden)
  }

  getByMode(mode: AgentMode): Agent[] {
    return this.list().filter((a) => a.mode === mode || a.mode === 'all')
  }
}

let globalRegistry: AgentRegistry | null = null

export function getAgentRegistry(): AgentRegistry {
  if (!globalRegistry) {
    globalRegistry = new AgentRegistry()
  }
  return globalRegistry
}

export function resetAgentRegistry(): void {
  globalRegistry = null
}

export function getAgent(id: string): Agent | undefined {
  return getAgentRegistry().get(id)
}

export function listAgents(): Agent[] {
  return getAgentRegistry().list()
}

export function listSubagents(): Agent[] {
  return getAgentRegistry().listSubagents()
}

export function registerAgent(config: AgentConfig): Agent {
  return getAgentRegistry().register(config)
}
