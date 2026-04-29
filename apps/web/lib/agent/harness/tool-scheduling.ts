import type { ToolCall } from '../../llm/types'

export interface PreparedToolCall {
  toolCall: ToolCall
  parsedArgs: Record<string, unknown>
  dedupKey: string
}

export type ToolSkipReason = 'duplicate' | 'max_tool_calls_per_step'

export interface SkippedToolCall {
  tool: PreparedToolCall
  reason: ToolSkipReason
}

export type ToolExecutionPlanItem =
  | { action: 'execute'; tool: PreparedToolCall }
  | { action: 'skip'; tool: PreparedToolCall; reason: ToolSkipReason }

export interface ToolExecutionPlan {
  parallel: ToolExecutionPlanItem[]
  sequential: ToolExecutionPlanItem[]
  skipped: SkippedToolCall[]
}

const PARALLELIZABLE_TOOLS = new Set([
  'read_files',
  'list_directory',
  'search_code',
  'search_code_ast',
  'search_codebase',
])

export function planToolExecution(
  tools: PreparedToolCall[],
  options: { dedupEnabled: boolean; maxToolCallsPerStep?: number }
): ToolExecutionPlan {
  const seenDedupKeys = new Set<string>()
  let executableCount = 0
  const plan: ToolExecutionPlan = { parallel: [], sequential: [], skipped: [] }
  const partitioned = tools.reduce(
    (acc, tool) => {
      if (PARALLELIZABLE_TOOLS.has(tool.toolCall.function.name)) {
        acc.parallel.push(tool)
      } else {
        acc.sequential.push(tool)
      }
      return acc
    },
    { parallel: [] as PreparedToolCall[], sequential: [] as PreparedToolCall[] }
  )

  const addToolToPlan = (tool: PreparedToolCall, bucket: ToolExecutionPlanItem[]) => {
    if (options.dedupEnabled && seenDedupKeys.has(tool.dedupKey)) {
      const skipped = { tool, reason: 'duplicate' as const }
      bucket.push({ action: 'skip', ...skipped })
      plan.skipped.push(skipped)
      return
    }

    if (options.dedupEnabled) {
      seenDedupKeys.add(tool.dedupKey)
    }

    if (
      typeof options.maxToolCallsPerStep === 'number' &&
      executableCount >= options.maxToolCallsPerStep
    ) {
      const skipped = { tool, reason: 'max_tool_calls_per_step' as const }
      bucket.push({ action: 'skip', ...skipped })
      plan.skipped.push(skipped)
      return
    }

    executableCount++
    bucket.push({ action: 'execute', tool })
  }

  for (const tool of partitioned.parallel) {
    addToolToPlan(tool, plan.parallel)
  }

  for (const tool of partitioned.sequential) {
    addToolToPlan(tool, plan.sequential)
  }

  return plan
}

export function createToolSkipError(
  reason: ToolSkipReason,
  toolName: string,
  maxToolCalls?: number
) {
  if (reason === 'duplicate') {
    return `Skipped duplicate tool call within step: ${toolName} (duplicate tool call)`
  }

  return (
    `Reached maximum tool calls per step (${maxToolCalls}); ` +
    `skipping additional tool call: ${toolName}`
  )
}
