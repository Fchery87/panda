/**
 * Agent System - Agent definitions with YAML/Markdown support
 *
 * Implements OpenCode-style agent configuration:
 * - Built-in agents: build, plan, ask
 * - Custom agents via YAML/Markdown files
 * - Agent modes: primary, subagent, all
 * - Per-agent tool permissions
 */

import type { AgentConfig, AgentMode, Permission, Identifier } from './types'
import { DEFAULT_PERMISSIONS } from './permissions'
import { ascending } from './identifier'

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
  let currentKey = ''
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
      currentKey = key
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

## Workflow

1. Understand the task by reading relevant files
2. Plan the changes needed
3. Implement changes using write_files
4. Verify with tests/lint
5. Summarize what was done`,
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
3. **Create actionable plans**: Break down tasks into clear, implementable steps.
4. **Identify risks**: Flag potential issues or edge cases.

## Available Tools

- \`read_files\`: Read file contents
- \`list_directory\`: Explore project structure  
- \`search_code\`: Search for text patterns
- \`search_code_ast\`: Structural code search

## Output Format

When planning, structure your response as:

### Analysis
- Current state of the code
- Relevant files and patterns

### Proposed Plan
1. Step one
2. Step two
3. ...

### Risks
- Potential issues
- Edge cases to consider

### Next Step
- What should be done first`,
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
