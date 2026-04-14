import type { AgentEvent, AgentRuntimeLike, RuntimeConfig } from './runtime'
import type { PromptContext } from './prompt-library'

export interface VariantResult {
  content: string
  toolCalls: number
  elapsedMs: number
}

export async function spawnVariants(args: {
  count: number
  makeRuntime: (variantIndex: number) => AgentRuntimeLike
  promptContext: PromptContext
  runtimeConfig?: RuntimeConfig
}): Promise<VariantResult[]> {
  const runs = Array.from({ length: args.count }, (_, index) =>
    runOne(args.makeRuntime(index), args.promptContext, args.runtimeConfig)
  )

  return Promise.all(runs)
}

async function runOne(
  runtime: AgentRuntimeLike,
  promptContext: PromptContext,
  runtimeConfig?: RuntimeConfig
): Promise<VariantResult> {
  const start = Date.now()
  let content = ''
  let toolCalls = 0

  for await (const event of runtime.run(promptContext, runtimeConfig)) {
    if (event.type === 'text' && event.content) content += event.content
    if (event.type === 'tool_call') toolCalls += 1
    if (isTerminalEvent(event)) break
  }

  return {
    content,
    toolCalls,
    elapsedMs: Date.now() - start,
  }
}

function isTerminalEvent(event: AgentEvent): boolean {
  return event.type === 'complete' || event.type === 'error'
}
