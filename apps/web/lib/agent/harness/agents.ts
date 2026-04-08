/**
 * Agent System - Agent definitions with YAML/Markdown support
 *
 * Implements OpenCode-style agent configuration:
 * - Built-in agents include Forge roles (builder, manager, executive)
 *   plus legacy/direct modes (build, code, plan, ask)
 * - Custom agents via YAML/Markdown files
 * - Agent modes: primary, subagent, all
 * - Per-agent tool permissions
 */

import type { AgentConfig, AgentMode, Permission } from './types'
import { DEFAULT_PERMISSIONS } from './permissions'

/**
 * Parse YAML frontmatter from markdown
 */
function parseFrontmatter(content: string): {
  frontmatter: Record<string, unknown>
  body: string
} {
  const match = content.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/)

  if (!match) {
    return { frontmatter: {}, body: content }
  }

  const frontmatterStr = match[1]
  const body = match[2]
  const frontmatter: Record<string, unknown> = {}

  const lines = frontmatterStr.split('\n')
  let currentArray: unknown[] | null = null
  let indent = 0

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue

    const lineIndent = line.search(/\S/)

    if (currentArray && lineIndent > indent) {
      if (trimmed.startsWith('- ')) {
        currentArray.push(trimmed.slice(2))
      }
      continue
    }

    currentArray = null

    const colonIndex = trimmed.indexOf(':')
    if (colonIndex === -1) continue

    const key = trimmed.slice(0, colonIndex).trim()
    const value = trimmed.slice(colonIndex + 1).trim()

    if (value === '' || value === '|') {
      indent = lineIndent
      if (value === '' && lines[lines.indexOf(line) + 1]?.includes(':')) {
        frontmatter[key] = {}
      } else {
        frontmatter[key] = []
        currentArray = frontmatter[key] as unknown[]
      }
    } else if (value.startsWith('[') && value.endsWith(']')) {
      frontmatter[key] = value
        .slice(1, -1)
        .split(',')
        .map((s) => s.trim().replace(/^["']|["']$/g, ''))
        .filter(Boolean)
    } else if (value === 'true' || value === 'false') {
      frontmatter[key] = value === 'true'
    } else if (/^\d+$/.test(value)) {
      frontmatter[key] = parseInt(value, 10)
    } else if (/^\d+\.\d+$/.test(value)) {
      frontmatter[key] = parseFloat(value)
    } else {
      frontmatter[key] = value.replace(/^["']|["']$/g, '')
    }
  }

  return { frontmatter, body }
}

/**
 * Convert parsed frontmatter to Permission
 */
function parsePermissionConfig(config: Record<string, unknown>): Permission {
  const permission: Permission = {}
  const tools = config.tools as Record<string, boolean | string> | undefined

  if (tools) {
    for (const [tool, value] of Object.entries(tools)) {
      if (typeof value === 'boolean') {
        permission[tool] = value ? 'allow' : 'deny'
      } else if (value === 'allow' || value === 'deny' || value === 'ask') {
        permission[tool] = value
      }
    }
  }

  return permission
}

/**
 * Parse agent from markdown content
 */
export function parseAgentMarkdown(content: string, name: string): AgentConfig {
  const { frontmatter, body } = parseFrontmatter(content)

  const mode = (frontmatter.mode as AgentMode) ?? 'subagent'
  const permission = parsePermissionConfig(frontmatter)

  return {
    name,
    description: (frontmatter.description as string) ?? body.slice(0, 200).trim(),
    model: frontmatter.model as string | undefined,
    variant: frontmatter.variant as string | undefined,
    temperature: frontmatter.temperature as number | undefined,
    topP: frontmatter.topP as number | undefined,
    prompt: body.trim() || undefined,
    permission: Object.keys(permission).length > 0 ? permission : (DEFAULT_PERMISSIONS[mode] ?? {}),
    mode,
    hidden: (frontmatter.hidden as boolean) ?? mode === 'subagent',
    color: frontmatter.color as string | undefined,
    steps: frontmatter.steps as number | undefined,
    options: frontmatter.options as Record<string, unknown> | undefined,
  }
}

/**
 * Built-in agents
 */
export const BUILTIN_AGENTS: AgentConfig[] = [
  {
    name: 'builder',
    description: 'Task-scoped implementation role that produces structured worker results.',
    mode: 'primary',
    permission: DEFAULT_PERMISSIONS.build,
    steps: 40,
    prompt: `You are Panda.ai operating in Forge Builder mode.

Your responsibility is to execute one scoped task at a time.

Rules:
- Stay inside task scope.
- Default to test-first implementation.
- Do not mark canonical state complete yourself.
- Return concise structured results with files touched, tests run, risks, and suggested next status.`,
  },
  {
    name: 'manager',
    description:
      'Canonical orchestration role for task creation, merges, summaries, and state updates.',
    mode: 'primary',
    permission: {
      read_files: 'allow',
      list_directory: 'allow',
      write_files: 'allow',
      run_command: 'allow',
      search_code: 'allow',
      search_code_ast: 'allow',
      update_memory_bank: 'allow',
      task: 'allow',
      question: 'allow',
    },
    steps: 30,
    prompt: `You are Panda.ai operating in Forge Manager mode.

Your responsibility is to maintain canonical project state, assemble context packs, merge worker results, and advance work only when evidence exists.

Rules:
- Own phase and task bookkeeping.
- Keep context concise and task-scoped.
- Do not perform large implementation unless explicitly falling back.
- Do not bypass review or QA gates.`,
  },
  {
    name: 'executive',
    description:
      'High-level review role for architecture, implementation quality, QA, and ship readiness.',
    mode: 'primary',
    permission: DEFAULT_PERMISSIONS.plan,
    steps: 20,
    prompt: `You are Panda.ai operating in Forge Executive mode.

Your responsibility is to review architecture, implementation quality, QA evidence, and ship readiness.

Rules:
- Evaluate quality bars explicitly.
- Produce findings and gate decisions.
- Reject weak work even if it appears functional.
- Do not bypass canonical state or QA gates.`,
  },
  {
    name: 'build',
    description:
      'Full-access agent for active development work. Can read, write, run commands, and execute tasks.',
    mode: 'primary',
    permission: DEFAULT_PERMISSIONS.build,
    steps: 50,
    prompt: `You are Panda.ai, an AI coding agent with full access to the codebase.

Your primary goal is to help users build, modify, and debug code efficiently.

## Operational Guidelines

1. **Use tools proactively**: Read files, search code, and make changes using the available tools.
2. **Verify changes**: Run tests and lint checks after making modifications.
3. **Be concise**: Keep responses short and actionable.
4. **Explain critical actions**: Before destructive operations, briefly explain what you're doing.
5. **Respect user decisions**: If a user rejects a change, don't retry without their request.

## Available Tools

- \`read_files\`: Read file contents
- \`list_directory\`: Explore project structure
- \`write_files\`: Create or modify files
- \`run_command\`: Execute CLI commands
- \`search_code\`: Search for text patterns
- \`search_code_ast\`: Structural code search
- \`update_memory_bank\`: Persist important project knowledge
- \`task\`: Spawn specialized subagents (like debugger, tech-writer, explore) to handle complex tasks in parallel.

## Workflow

1. Understand the task by reading relevant files
2. Plan the changes needed
3. Implement changes using write_files
4. Verify with tests/lint
5. Summarize what was done`,
  },
  {
    name: 'code',
    description:
      'Implementation agent for code changes with read/write/command access, without subagent delegation.',
    mode: 'primary',
    permission: {
      read_files: 'allow',
      list_directory: 'allow',
      write_files: 'allow',
      run_command: 'allow',
      search_code: 'allow',
      search_code_ast: 'allow',
      update_memory_bank: 'allow',
      task: 'deny',
      question: 'deny',
    },
    steps: 30,
    prompt: `You are Panda.ai in code mode. Implement changes directly and concisely.

Use tools to read, edit, and verify. Keep chat output brief and do not paste code blocks.`,
  },
  {
    name: 'plan',
    description:
      'Read-only agent for analysis and planning. Explores codebase without making changes.',
    mode: 'primary',
    permission: DEFAULT_PERMISSIONS.plan,
    steps: 20,
    prompt: `You are Panda.ai in plan mode. Your role is to analyze and plan without making changes.

## Guidelines

1. **Read-only operations**: You can explore files and search code, but cannot write or execute commands.
2. **Provide detailed analysis**: Explain what you find and recommend approaches.
3. **Create actionable plans**: Produce or update a structured plan artifact, not just a chat answer.
4. **Identify risks**: Flag potential issues or edge cases.

## Available Tools

- \`read_files\`: Read file contents
- \`list_directory\`: Explore project structure  
- \`search_code\`: Search for text patterns
- \`search_code_ast\`: Structural code search
- \`task\`: Spawn specialized subagents (like debugger, tech-writer, explore) to handle complex tasks in parallel.

## Output Format

When planning, structure your response as:

## Goal
- One short statement of the desired outcome

## Clarifications
- 0-2 bullets; only what materially affects implementation

## Relevant Files
- Specific file paths, symbols, routes, or systems likely impacted

## Implementation Plan
1. Step one
2. Step two
3. ...

## Risks
- Potential issues
- Edge cases to consider

## Validation
- Checks, tests, or acceptance steps

## Open Questions
- Remaining unresolved questions, or "None"

Prefer concrete file references over generic architecture prose.`,
  },
  {
    name: 'ask',
    description: 'Quick questions and code exploration. Minimal tool access for fast responses.',
    mode: 'primary',
    permission: DEFAULT_PERMISSIONS.ask,
    steps: 5,
    prompt: `You are Panda.ai in ask mode. Answer questions quickly and accurately.

## Guidelines

1. **Be concise**: Direct answers without unnecessary elaboration.
2. **Use search wisely**: Only search when needed to answer accurately.
3. **No modifications**: This mode is for questions only.

## Available Tools

- \`read_files\`: Read specific files
- \`search_code\`: Search for patterns`,
  },
]

/**
 * Subagent templates for delegation
 */
export const SUBAGENT_TEMPLATES: AgentConfig[] = [
  {
    name: 'explore',
    description: 'Thorough codebase exploration for understanding unfamiliar code.',
    mode: 'subagent',
    hidden: false,
    permission: {
      read_files: 'allow',
      list_directory: 'allow',
      search_code: 'allow',
      search_code_ast: 'allow',
    },
    prompt: `You are an exploration agent. Thoroughly investigate the codebase to answer questions.

Focus on:
- Finding all relevant files
- Understanding code structure and patterns
- Identifying dependencies and relationships
- Providing comprehensive summaries`,
  },
  {
    name: 'security-auditor',
    description: 'Security-focused code review for vulnerabilities.',
    mode: 'subagent',
    hidden: false,
    permission: {
      read_files: 'allow',
      search_code: 'allow',
      search_code_ast: 'allow',
    },
    prompt: `You are a security auditor agent. Review code for security issues.

Check for:
- Authentication and authorization flaws
- Input validation issues
- Injection vulnerabilities
- Sensitive data exposure
- Insecure configurations

Provide severity ratings and remediation steps.`,
  },
  {
    name: 'performance-analyzer',
    description: 'Analyze code for performance bottlenecks and optimization opportunities.',
    mode: 'subagent',
    hidden: false,
    permission: {
      read_files: 'allow',
      search_code: 'allow',
      run_command: 'allow',
    },
    prompt: `You are a performance analyzer agent. Identify performance issues.

Analyze:
- Algorithm complexity
- Memory usage patterns
- I/O bottlenecks
- Caching opportunities
- Database query efficiency`,
  },
  {
    name: 'test-generator',
    description: 'Generate comprehensive test suites for code.',
    mode: 'subagent',
    hidden: false,
    permission: {
      read_files: 'allow',
      write_files: 'allow',
      run_command: 'allow',
      search_code: 'allow',
    },
    prompt: `You are a test generator agent. Create thorough test coverage.

Generate:
- Unit tests
- Integration tests
- Edge case tests
- Error handling tests

Use the project's testing framework and conventions.`,
  },
  {
    name: 'code-reviewer',
    description: 'Review code for quality, maintainability, and best practices.',
    mode: 'subagent',
    hidden: false,
    permission: {
      read_files: 'allow',
      search_code: 'allow',
    },
    prompt: `You are a code reviewer agent. Provide constructive feedback.

Review for:
- Code quality and readability
- Design patterns and architecture
- Error handling
- Documentation
- Consistency with project conventions

Provide actionable suggestions with explanations.`,
  },
  {
    name: 'debugger',
    description:
      'Dedicated debugger focusing on stack traces, server logs, and runtime exceptions.',
    mode: 'subagent',
    hidden: false,
    permission: {
      read_files: 'allow',
      run_command: 'allow',
      search_code: 'allow',
      search_code_ast: 'allow',
    },
    prompt: `You are a dedicated debugger agent. Your sole purpose is to track down and solve errors.

Focus strictly on:
- Analyzing stack traces and runtime exceptions
- Reading and interpreting server logs
- Identifying the exact line and logic causing a failure
- Do NOT get distracted by general refactoring or feature additions
- Do NOT use shell operators (|, &&, >) when using the run_command tool

Provide the exact cause of the crash and a precise, minimal fix.`,
  },
  {
    name: 'tech-writer',
    description: 'Tech writer agent that concurrently generates and updates project documentation.',
    mode: 'subagent',
    hidden: false,
    permission: {
      read_files: 'allow',
      write_files: 'allow',
      search_code: 'allow',
    },
    prompt: `You are a technical documentation agent. Your job is to keep documentation perfectly in sync with the codebase.

Focus on:
- Writing and updating high-quality JSDoc/TSDoc comments for functions and classes
- Updating README.md files to reflect new features or changes
- Generating Architecture markdown files for complex modules
- Writing clear, concise explanations of implementation details

When exploring code, ensure your generated documentation strictly matches the actual implementation.`,
  },
]

/**
 * Agent Registry - manages all agents
 */
class AgentRegistry {
  private agents: Map<string, AgentConfig> = new Map()

  constructor() {
    for (const agent of BUILTIN_AGENTS) {
      this.agents.set(agent.name, agent)
    }
    for (const agent of SUBAGENT_TEMPLATES) {
      this.agents.set(agent.name, agent)
    }
  }

  /**
   * Get an agent by name
   */
  get(name: string): AgentConfig | undefined {
    return this.agents.get(name)
  }

  /**
   * List all agents
   */
  list(): AgentConfig[] {
    return Array.from(this.agents.values())
  }

  /**
   * List agents by mode
   */
  listByMode(mode: AgentMode): AgentConfig[] {
    return this.list().filter((a) => a.mode === mode || a.mode === 'all')
  }

  /**
   * List primary agents (for Tab switching)
   */
  listPrimary(): AgentConfig[] {
    return this.list().filter((a) => a.mode === 'primary' || a.mode === 'all')
  }

  /**
   * List subagents (for @ mentions)
   */
  listSubagents(): AgentConfig[] {
    return this.list().filter((a) => !a.hidden && (a.mode === 'subagent' || a.mode === 'all'))
  }

  /**
   * Register a custom agent
   */
  register(config: AgentConfig): void {
    this.agents.set(config.name, config)
  }

  /**
   * Register agent from markdown
   */
  registerFromMarkdown(content: string, name: string): void {
    const config = parseAgentMarkdown(content, name)
    this.register(config)
  }

  /**
   * Unregister an agent
   */
  unregister(name: string): boolean {
    if (BUILTIN_AGENTS.some((a) => a.name === name)) {
      return false
    }
    return this.agents.delete(name)
  }

  /**
   * Check if agent exists
   */
  has(name: string): boolean {
    return this.agents.has(name)
  }
}

export const agents = new AgentRegistry()

export type { AgentConfig, AgentMode }
