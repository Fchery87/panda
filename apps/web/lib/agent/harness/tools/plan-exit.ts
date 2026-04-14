/**
 * Plan-Exit Tool
 *
 * A harness-level tool available exclusively in architect mode (capability: 'plan_exit').
 * Formalizes the transition from planning to execution by:
 * 1. Accepting the agent's declared plan (rationale, files, steps)
 * 2. Emitting a spec_generated event for the UI to display and user to approve
 * 3. Returning a structured result the LLM can reference
 *
 * The tool is only presented to the LLM when the mode ruleset allows it
 * (architect mode: plan_exit → 'ask'). In code/build mode it is absent from
 * the tool-list entirely.
 */

import type { Capability } from '../permission/types'
import type { AgentToolDefinition } from '../../tools'

export const PLAN_EXIT_TOOL_NAME = 'plan_exit' as const

export const planExitToolDefinition: AgentToolDefinition = {
  type: 'function',
  capability: 'plan_exit' as Capability,
  readOnly: true,
  function: {
    name: PLAN_EXIT_TOOL_NAME,
    description:
      'Formally conclude the planning phase. Call this when the plan is complete and ready for user review. ' +
      'Provide the full plan rationale, the list of files that will be modified, and the ordered steps. ' +
      'The user must approve the plan before execution begins.',
    parameters: {
      type: 'object',
      properties: {
        rationale: {
          type: 'string',
          description: 'Explanation of the approach and why it was chosen.',
        },
        files: {
          type: 'array',
          items: { type: 'string' },
          description: 'Exhaustive list of file paths that will be created or modified.',
        },
        steps: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              description: { type: 'string' },
              targetFiles: { type: 'array', items: { type: 'string' } },
            },
            required: ['description', 'targetFiles'],
          },
          description: 'Ordered execution steps with their target files.',
        },
        summary: {
          type: 'string',
          description: 'One-sentence summary for display in the UI.',
        },
      },
      required: ['rationale', 'files', 'steps', 'summary'],
    },
  },
}

export interface PlanExitArgs {
  rationale: string
  files: string[]
  steps: Array<{ description: string; targetFiles: string[] }>
  summary: string
}

/**
 * Build a content signature for integrity verification.
 * Simple deterministic hash of the plan content.
 */
export function buildPlanSignature(args: PlanExitArgs): string {
  const content = JSON.stringify({ rationale: args.rationale, files: args.files.sort(), steps: args.steps })
  let hash = 0
  for (let i = 0; i < content.length; i++) {
    const chr = content.charCodeAt(i)
    hash = (hash << 5) - hash + chr
    hash |= 0
  }
  return `plan_${Math.abs(hash).toString(16)}`
}
