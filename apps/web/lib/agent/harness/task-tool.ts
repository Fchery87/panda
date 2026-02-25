/**
 * Task Tool - Subagent delegation for specialized tasks
 *
 * Implements OpenCode-style TaskTool that allows agents to spawn
 * specialized subagents for complex operations like:
 * - Code exploration
 * - Security auditing
 * - Performance analysis
 * - Test generation
 * - Code review
 */

import type { AgentConfig, Identifier, SubagentResult, SubtaskPart } from './types'
import type { ToolDefinition } from '../../llm/types'
import { agents } from './agents'
import { ascending } from './identifier'
import { intersectPermissions } from './permissions'
import { bus } from './event-bus'

/**
 * Task tool input schema
 */
export const TASK_TOOL_DEFINITION: ToolDefinition = {
  type: 'function',
  function: {
    name: 'task',
    description: `Launch a specialized subagent to handle a complex task.

Available subagent types:
- explore: Thorough codebase exploration for understanding unfamiliar code
- security-auditor: Security-focused code review for vulnerabilities
- performance-analyzer: Analyze code for performance bottlenecks
- test-generator: Generate comprehensive test suites
- code-reviewer: Review code for quality and best practices
- debugger: Dedicated debugger for tracking down runtime exceptions
- tech-writer: Tech writer for generating or updating documentation

Use this tool when:
- You need specialized expertise for a specific task
- You want to delegate complex multi-step operations
- You need to explore large codebases efficiently
- You want a fresh perspective on code quality or security

The subagent will work autonomously and return its findings.

CRITICAL: You can spawn multiple subagents in parallel! To do this, simply output multiple \`task\` tool calls in a single response. They will all execute concurrently (Panda Swarm) and return their results together.`,
    parameters: {
      type: 'object',
      properties: {
        subagent_type: {
          type: 'string',
          description: 'The type of specialized agent to use',
          enum: [
            'explore',
            'security-auditor',
            'performance-analyzer',
            'test-generator',
            'code-reviewer',
            'debugger',
            'tech-writer',
          ],
        },
        prompt: {
          type: 'string',
          description:
            'The detailed task for the subagent to perform. Be specific about what you need.',
        },
        description: {
          type: 'string',
          description: 'A short (3-5 words) description of the task for logging',
        },
      },
      required: ['subagent_type', 'prompt', 'description'],
    },
  },
}

/**
 * Task tool execution context
 */
export interface TaskToolContext {
  sessionID: Identifier
  messageID: Identifier
  parentAgent: AgentConfig
  runSubagent: (
    agent: AgentConfig,
    prompt: string,
    sessionID: Identifier
  ) => Promise<SubagentResult>
}

/**
 * Execute the task tool
 */
export async function executeTaskTool(
  args: {
    subagent_type: string
    prompt: string
    description: string
  },
  ctx: TaskToolContext
): Promise<{ output: string; error?: string; metadata?: Record<string, unknown> }> {
  const agentConfig = agents.get(args.subagent_type)

  if (!agentConfig) {
    return {
      output: '',
      error: `Unknown subagent type: ${args.subagent_type}. Available types: ${agents
        .listSubagents()
        .map((a) => a.name)
        .join(', ')}`,
    }
  }

  if (agentConfig.mode === 'primary') {
    return {
      output: '',
      error: `Agent "${args.subagent_type}" is a primary agent and cannot be used as a subagent.`,
    }
  }

  const childSessionID = ascending('session_')
  const delegatedAgent: AgentConfig = {
    ...agentConfig,
    permission: intersectPermissions(ctx.parentAgent.permission, agentConfig.permission),
  }

  bus.emit('subagent.started', ctx.sessionID, {
    parentSessionID: ctx.sessionID,
    childSessionID,
    agent: delegatedAgent.name,
    description: args.description,
  })

  try {
    const result = await ctx.runSubagent(delegatedAgent, args.prompt, childSessionID)

    bus.emit('subagent.completed', ctx.sessionID, {
      parentSessionID: ctx.sessionID,
      childSessionID,
      agent: delegatedAgent.name,
      success: !result.error,
    })

    return {
      output: result.error ? `Subagent error: ${result.error}\n\n${result.output}` : result.output,
      error: result.error,
      metadata: {
        childSessionID,
        agent: delegatedAgent.name,
        usage: result.usage,
        cost: result.cost,
      },
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    bus.emit('subagent.completed', ctx.sessionID, {
      parentSessionID: ctx.sessionID,
      childSessionID,
      agent: delegatedAgent.name,
      success: false,
      error: errorMessage,
    })

    return {
      output: '',
      error: `Failed to execute subagent: ${errorMessage}`,
    }
  }
}

/**
 * Create a subtask part for deferred execution
 */
export function createSubtaskPart(
  messageID: Identifier,
  sessionID: Identifier,
  agent: string,
  prompt: string
): SubtaskPart {
  return {
    id: ascending('part_'),
    messageID,
    sessionID,
    type: 'subtask',
    agent,
    prompt,
  }
}

/**
 * Question tool for user interaction during execution
 */
export const QUESTION_TOOL_DEFINITION: ToolDefinition = {
  type: 'function',
  function: {
    name: 'question',
    description: `Ask the user a question during execution.

Use this tool when:
- You need clarification on the user's request
- You need the user to make a decision
- You need more information to proceed

The user's response will be provided in the next turn.`,
    parameters: {
      type: 'object',
      properties: {
        questions: {
          type: 'array',
          description: 'Questions to ask the user',
          items: {
            type: 'object',
            properties: {
              question: {
                type: 'string',
                description: 'The question to ask',
              },
              header: {
                type: 'string',
                description: 'Short header for the question (max 30 chars)',
              },
              options: {
                type: 'array',
                description: 'Predefined options for the user to choose from',
                items: {
                  type: 'object',
                  properties: {
                    label: {
                      type: 'string',
                      description: 'Display label for the option',
                    },
                    description: {
                      type: 'string',
                      description: 'Explanation of what this option means',
                    },
                  },
                  required: ['label', 'description'],
                },
              },
              multiple: {
                type: 'boolean',
                description: 'Allow selecting multiple options',
              },
            },
            required: ['question', 'header'],
          },
        },
      },
      required: ['questions'],
    },
  },
}

/**
 * Execute the question tool
 */
export async function executeQuestionTool(
  args: {
    questions: Array<{
      question: string
      header: string
      options?: Array<{ label: string; description: string }>
      multiple?: boolean
    }>
  },
  ctx: {
    sessionID: Identifier
    messageID: Identifier
    askUser: (questions: typeof args.questions) => Promise<string[]>
  }
): Promise<{ output: string; error?: string }> {
  try {
    const answers = await ctx.askUser(args.questions)

    const formatted = args.questions.map((q, i) => ({
      question: q.question,
      answer: answers[i] ?? 'No answer provided',
    }))

    return {
      output: JSON.stringify(formatted, null, 2),
    }
  } catch (error) {
    return {
      output: '',
      error: error instanceof Error ? error.message : 'Failed to get user response',
    }
  }
}

/**
 * Get all task-related tool definitions
 */
export function getTaskToolDefinitions(): ToolDefinition[] {
  return [TASK_TOOL_DEFINITION, QUESTION_TOOL_DEFINITION]
}
