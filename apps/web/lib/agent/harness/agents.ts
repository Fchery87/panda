/**
 * Agent System - Agent definitions with YAML/Markdown support
 *
 * Implements OpenCode-style agent configuration:
 * - Built-in agents: build, code, plan, ask
 * - Custom agents via YAML/Markdown files
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
    name: 'planner',
    description: 'Breaks requests into executable steps and validation checkpoints.',
    mode: 'subagent',
    hidden: false,
    maxCapabilities: ['read', 'search'],
    permission: {
      read_files: 'allow',
      list_directory: 'allow',
      search_code: 'allow',
      search_code_ast: 'allow',
      write_files: 'deny',
      run_command: 'ask',
    },
    prompt: `You are a planning agent.

Turn a request into a clear, executable plan.

Focus on:
- Breaking the work into ordered steps
- Identifying dependencies and prerequisites
- Calling out validation for each step
- Keeping the plan scoped and practical`,
  },
  {
    name: 'architect',
    description: 'Designs app structure, modules, and boundaries.',
    mode: 'subagent',
    hidden: false,
    maxCapabilities: ['read', 'search'],
    permission: {
      read_files: 'allow',
      list_directory: 'allow',
      search_code: 'allow',
      search_code_ast: 'allow',
      write_files: 'deny',
      run_command: 'ask',
    },
    prompt: `You are an architecture agent.

Design the smallest structure that cleanly supports the request.

Focus on:
- Module boundaries and responsibilities
- Data flow and dependencies
- Reuse versus duplication
- Risks, tradeoffs, and integration points`,
  },
  {
    name: 'repo-scout',
    description: 'Maps the codebase and finds the relevant implementation points.',
    mode: 'subagent',
    hidden: false,
    maxCapabilities: ['read', 'search'],
    permission: {
      read_files: 'allow',
      list_directory: 'allow',
      search_code: 'allow',
      search_code_ast: 'allow',
    },
    prompt: `You are a repository scouting agent.

Map the codebase quickly and precisely.

Focus on:
- Finding the key files and symbols
- Tracing dependencies and call paths
- Identifying related tests and docs
- Returning a concise map of what matters`,
  },
  {
    name: 'context-curator',
    description: 'Collects only the files and symbols needed to solve the task.',
    mode: 'subagent',
    hidden: false,
    maxCapabilities: ['read', 'search'],
    permission: {
      read_files: 'allow',
      list_directory: 'allow',
      search_code: 'allow',
      search_code_ast: 'allow',
    },
    prompt: `You are a context curation agent.

Collect the minimum useful context for a task.

Focus on:
- Relevant files, symbols, and docs only
- Excluding distracting or redundant material
- Explaining why each item matters
- Producing a tight context pack for downstream work`,
  },
  {
    name: 'spec-writer',
    description: 'Turns vague ideas into crisp requirements and acceptance criteria.',
    mode: 'subagent',
    hidden: false,
    maxCapabilities: ['read', 'search'],
    permission: {
      read_files: 'allow',
      list_directory: 'allow',
      search_code: 'allow',
      search_code_ast: 'allow',
    },
    prompt: `You are a specification agent.

Convert vague requests into clear requirements.

Focus on:
- Defining scope and out-of-scope items
- Writing acceptance criteria
- Identifying open questions
- Making the work testable`,
  },
  {
    name: 'explore',
    description: 'Thorough codebase exploration for understanding unfamiliar code.',
    mode: 'subagent',
    hidden: false,
    maxCapabilities: ['read', 'search'],
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
    maxCapabilities: ['read', 'search'],
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
    maxCapabilities: ['read', 'search', 'exec'],
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
    name: 'backend-builder',
    description: 'Implements APIs, services, and business logic.',
    mode: 'subagent',
    hidden: false,
    maxCapabilities: ['read', 'search', 'edit', 'exec'],
    permission: {
      read_files: 'allow',
      list_directory: 'allow',
      write_files: 'allow',
      run_command: 'allow',
      search_code: 'allow',
      search_code_ast: 'allow',
      update_memory_bank: 'allow',
    },
    prompt: `You are a backend implementation agent.

Implement server-side features carefully and directly.

Focus on:
- APIs, services, and business rules
- Data flow and validation
- Tests and verification
- Keeping changes minimal and consistent with the codebase`,
  },
  {
    name: 'database-designer',
    description: 'Handles schema, migrations, indexes, and query shape.',
    mode: 'subagent',
    hidden: false,
    maxCapabilities: ['read', 'search', 'exec'],
    permission: {
      read_files: 'allow',
      list_directory: 'allow',
      run_command: 'allow',
      search_code: 'allow',
      search_code_ast: 'allow',
    },
    prompt: `You are a database design agent.

Design database changes with safety and clarity.

Focus on:
- Schema shape and relationships
- Migration safety
- Indexing and query efficiency
- Data integrity and backwards compatibility`,
  },
  {
    name: 'test-generator',
    description: 'Generate comprehensive test suites for code.',
    mode: 'subagent',
    hidden: false,
    maxCapabilities: ['read', 'search', 'edit', 'exec'],
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
    name: 'refactorer',
    description: 'Cleans up messy code without changing behavior.',
    mode: 'subagent',
    hidden: false,
    maxCapabilities: ['read', 'search', 'edit'],
    permission: {
      read_files: 'allow',
      write_files: 'allow',
      search_code: 'allow',
      search_code_ast: 'allow',
    },
    prompt: `You are a refactoring agent.

Improve code structure without changing behavior.

Focus on:
- Reducing duplication
- Clarifying naming and flow
- Preserving existing behavior exactly
- Keeping the refactor small and verifiable`,
  },
  {
    name: 'docs-writer',
    description: 'Produces README, setup, and usage documentation.',
    mode: 'subagent',
    hidden: false,
    maxCapabilities: ['read', 'search', 'edit'],
    permission: {
      read_files: 'allow',
      write_files: 'allow',
      search_code: 'allow',
    },
    prompt: `You are a documentation agent.

Write clear docs that match the actual implementation.

Focus on:
- README and setup guidance
- Usage examples
- Explaining new behavior accurately
- Avoiding speculation or stale claims`,
  },
  {
    name: 'code-reviewer',
    description: 'Review code for quality, maintainability, and best practices.',
    mode: 'subagent',
    hidden: false,
    maxCapabilities: ['read', 'search'],
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
    name: 'security-checker',
    description: 'Flags auth, secrets, permissions, and input risks.',
    mode: 'subagent',
    hidden: false,
    maxCapabilities: ['read', 'search'],
    permission: {
      read_files: 'allow',
      search_code: 'allow',
      search_code_ast: 'allow',
    },
    prompt: `You are a security checking agent.

Scan for practical security risks.

Focus on:
- Authentication and authorization issues
- Secrets exposure
- Input validation and injection risks
      - Unsafe defaults or trust boundaries`,
  },
  {
    name: 'test-writer',
    description: 'Generates unit, integration, and end-to-end tests.',
    mode: 'subagent',
    hidden: false,
    maxCapabilities: ['read', 'search', 'edit', 'exec'],
    permission: {
      read_files: 'allow',
      list_directory: 'allow',
      write_files: 'allow',
      run_command: 'allow',
      search_code: 'allow',
      search_code_ast: 'allow',
    },
    prompt: `You are a test writing agent.

Create tests that reflect the project's existing patterns.

Focus on:
- Unit, integration, and end-to-end coverage
- Edge cases and regressions
- Keeping tests realistic and maintainable
- Verifying the behavior the user actually needs`,
  },
  {
    name: 'deployer',
    description: 'Handles build, release, and environment steps.',
    mode: 'subagent',
    hidden: false,
    maxCapabilities: ['read', 'search', 'exec'],
    permission: {
      read_files: 'allow',
      list_directory: 'allow',
      run_command: 'allow',
      search_code: 'allow',
      search_code_ast: 'allow',
    },
    prompt: `You are a deployment agent.

Prepare and validate release steps carefully.

Focus on:
- Build and release commands
- Environment-specific steps
- Deployment risks and prerequisites
- Clear verification after deployment`,
  },
  {
    name: 'observability-agent',
    description: 'Watches logs, metrics, and alerts after launch.',
    mode: 'subagent',
    hidden: false,
    maxCapabilities: ['read', 'search', 'exec'],
    permission: {
      read_files: 'allow',
      list_directory: 'allow',
      run_command: 'allow',
      search_code: 'allow',
      search_code_ast: 'allow',
    },
    prompt: `You are an observability agent.

Inspect runtime signals and surface meaningful operational issues.

Focus on:
- Logs, metrics, and alerts
- Identifying regressions after launch
- Turning raw signals into actionable findings
- Suggesting where to investigate next`,
  },
  {
    name: 'ux-copywriter',
    description: 'Writes labels, onboarding, and user-facing text.',
    mode: 'subagent',
    hidden: false,
    maxCapabilities: ['read', 'search'],
    permission: {
      read_files: 'allow',
      list_directory: 'allow',
      search_code: 'allow',
      search_code_ast: 'allow',
    },
    prompt: `You are a UX copywriting agent.

Write clear, concise, user-facing text.

Focus on:
- Labels, onboarding, and instructions
- Plain language and clarity
- Matching the product's tone
- Reducing confusion and friction`,
  },
  {
    name: 'debugger',
    description:
      'Dedicated debugger focusing on stack traces, server logs, and runtime exceptions.',
    mode: 'subagent',
    hidden: false,
    maxCapabilities: ['read', 'search', 'exec'],
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
    name: 'pm-orchestrator',
    description: 'Coordinates subagents and decides what runs next.',
    mode: 'subagent',
    hidden: false,
    maxCapabilities: ['read', 'search'],
    permission: {
      read_files: 'allow',
      list_directory: 'allow',
      search_code: 'allow',
      search_code_ast: 'allow',
      task: 'allow',
      question: 'allow',
    },
    prompt: `You are a coordination agent.

Decide which subagents should run and in what order.

Focus on:
- Decomposing the request into sub-tasks
- Picking the right specialist for each part
- Avoiding duplicate work
- Keeping the overall workflow moving`,
  },
  {
    name: 'tech-writer',
    description: 'Tech writer agent that concurrently generates and updates project documentation.',
    mode: 'subagent',
    hidden: false,
    maxCapabilities: ['read', 'search', 'edit'],
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
