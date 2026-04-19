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
    id: 'planner',
    name: 'Planner',
    description: 'Breaks requests into executable steps and validation checkpoints',
    mode: 'subagent',
    prompt: 'You are a planning agent. Turn a request into a clear, executable plan.',
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
        bash: 'ask',
      },
    },
    maxSteps: 10,
  },
  {
    id: 'architect',
    name: 'Architect',
    description: 'Designs app structure, modules, and boundaries',
    mode: 'subagent',
    prompt:
      'You are an architecture agent. Design the smallest structure that cleanly supports the request.',
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
        bash: 'ask',
      },
    },
    maxSteps: 12,
  },
  {
    id: 'repo-scout',
    name: 'Repo Scout',
    description: 'Reads the codebase and maps dependencies',
    mode: 'subagent',
    prompt: 'You are a repository scouting agent. Map the codebase quickly and precisely.',
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
    maxSteps: 10,
  },
  {
    id: 'context-curator',
    name: 'Context Curator',
    description: 'Collects only the relevant files, symbols, and docs',
    mode: 'subagent',
    prompt: 'You are a context curation agent. Collect the minimum useful context for a task.',
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
    maxSteps: 10,
  },
  {
    id: 'spec-writer',
    name: 'Spec Writer',
    description: 'Turns vague ideas into crisp requirements',
    mode: 'subagent',
    prompt: 'You are a specification agent. Convert vague requests into clear requirements.',
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
    maxSteps: 10,
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
    id: 'backend-builder',
    name: 'Backend Builder',
    description: 'Implements APIs, services, and business logic',
    mode: 'subagent',
    prompt:
      'You are a backend implementation agent. Implement server-side features carefully and directly.',
    temperature: 0.3,
    permissions: {
      tools: {
        read: 'allow',
        glob: 'allow',
        grep: 'allow',
        list: 'allow',
        question: 'allow',
        edit: 'allow',
        write: 'allow',
        bash: 'allow',
      },
    },
    maxSteps: 20,
  },
  {
    id: 'database-designer',
    name: 'Database Designer',
    description: 'Handles schema, migrations, and queries',
    mode: 'subagent',
    prompt: 'You are a database design agent. Design database changes with safety and clarity.',
    temperature: 0.2,
    permissions: {
      tools: {
        read: 'allow',
        glob: 'allow',
        grep: 'allow',
        list: 'allow',
        question: 'allow',
        edit: 'allow',
        write: 'allow',
        bash: 'allow',
      },
    },
    maxSteps: 15,
  },
  {
    id: 'refactorer',
    name: 'Refactorer',
    description: 'Cleans up messy code without changing behavior',
    mode: 'subagent',
    prompt: 'You are a refactoring agent. Improve code structure without changing behavior.',
    temperature: 0.2,
    permissions: {
      tools: {
        read: 'allow',
        glob: 'allow',
        grep: 'allow',
        list: 'allow',
        question: 'allow',
        edit: 'allow',
        write: 'allow',
        bash: 'allow',
      },
    },
    maxSteps: 15,
  },
  {
    id: 'docs-writer',
    name: 'Docs Writer',
    description: 'Produces README, setup, and usage docs',
    mode: 'subagent',
    prompt: 'You are a documentation agent. Write clear docs that match the actual implementation.',
    temperature: 0.2,
    permissions: {
      tools: {
        read: 'allow',
        glob: 'allow',
        grep: 'allow',
        list: 'allow',
        question: 'allow',
        edit: 'allow',
        write: 'allow',
        bash: 'deny',
      },
    },
    maxSteps: 12,
  },
  {
    id: 'security-checker',
    name: 'Security Checker',
    description: 'Flags auth, secrets, permissions, and input risks',
    mode: 'subagent',
    prompt: 'You are a security checking agent. Scan for practical security risks.',
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
    maxSteps: 12,
  },
  {
    id: 'pm-orchestrator',
    name: 'PM Orchestrator',
    description: 'Coordinates all sub-agents and decides what runs next',
    mode: 'subagent',
    prompt: 'You are a coordination agent. Decide which subagents should run and in what order.',
    temperature: 0.2,
    permissions: {
      tools: {
        read: 'allow',
        glob: 'allow',
        grep: 'allow',
        list: 'allow',
        question: 'allow',
        task: 'allow',
        edit: 'deny',
        write: 'deny',
        bash: 'deny',
      },
    },
    maxSteps: 12,
  },
  {
    id: 'test-writer',
    name: 'Test Writer',
    description: 'Generates unit, integration, and end-to-end tests',
    mode: 'subagent',
    prompt:
      'You are a test writing agent. Create tests that reflect the projects existing patterns.',
    temperature: 0.2,
    permissions: {
      tools: {
        read: 'allow',
        glob: 'allow',
        grep: 'allow',
        list: 'allow',
        question: 'allow',
        edit: 'allow',
        write: 'allow',
        bash: 'allow',
      },
    },
    maxSteps: 20,
  },
  {
    id: 'deployer',
    name: 'Deployer',
    description: 'Handles build, release, and environment steps',
    mode: 'subagent',
    prompt: 'You are a deployment agent. Prepare and validate release steps carefully.',
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
        bash: 'allow',
      },
    },
    maxSteps: 12,
  },
  {
    id: 'observability-agent',
    name: 'Observability Agent',
    description: 'Watches logs, metrics, and alerts after launch',
    mode: 'subagent',
    prompt:
      'You are an observability agent. Inspect runtime signals and surface meaningful operational issues.',
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
        bash: 'allow',
      },
    },
    maxSteps: 12,
  },
  {
    id: 'ux-copywriter',
    name: 'UX Copywriter',
    description: 'Writes labels, onboarding, and user-facing text',
    mode: 'subagent',
    prompt: 'You are a UX copywriting agent. Write clear, concise, user-facing text.',
    temperature: 0.2,
    permissions: {
      tools: {
        read: 'allow',
        glob: 'allow',
        grep: 'allow',
        list: 'allow',
        question: 'allow',
        edit: 'allow',
        write: 'allow',
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
