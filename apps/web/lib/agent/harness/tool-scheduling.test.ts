import { describe, expect, test } from 'bun:test'

import { planToolExecution } from './tool-scheduling'

function preparedTool(id: string, name: string, dedupKey: string) {
  return {
    toolCall: {
      id,
      type: 'function' as const,
      function: { name, arguments: '{}' },
    },
    parsedArgs: {},
    dedupKey,
  }
}

describe('planToolExecution', () => {
  test('classifies executable, duplicate, and capped tool calls before runtime side effects', () => {
    const plan = planToolExecution(
      [
        preparedTool('read-1', 'read_files', 'read:a'),
        preparedTool('read-dup', 'read_files', 'read:a'),
        preparedTool('write-1', 'write_files', 'write:b'),
        preparedTool('read-2', 'search_code', 'search:c'),
      ],
      { dedupEnabled: true, maxToolCallsPerStep: 2 }
    )

    expect(
      plan.parallel.map((item) => ({
        id: item.tool.toolCall.id,
        action: item.action,
        reason: item.action === 'skip' ? item.reason : undefined,
      }))
    ).toEqual([
      { id: 'read-1', action: 'execute', reason: undefined },
      { id: 'read-dup', action: 'skip', reason: 'duplicate' },
      { id: 'read-2', action: 'execute', reason: undefined },
    ])
    expect(
      plan.sequential.map((item) => ({
        id: item.tool.toolCall.id,
        action: item.action,
        reason: item.action === 'skip' ? item.reason : undefined,
      }))
    ).toEqual([{ id: 'write-1', action: 'skip', reason: 'max_tool_calls_per_step' }])
    expect(
      plan.skipped.map((item) => ({ id: item.tool.toolCall.id, reason: item.reason }))
    ).toEqual([
      { id: 'read-dup', reason: 'duplicate' },
      { id: 'write-1', reason: 'max_tool_calls_per_step' },
    ])
  })
})
