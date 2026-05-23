import { describe, expect, test } from 'bun:test'
import { resolveSubagentRegistry } from './registry'

describe('subagent registry', () => {
  test('includes built-in subagents and resolves normalized custom subagents', () => {
    const registry = resolveSubagentRegistry({
      customSubagents: [
        {
          _id: 'custom-1',
          name: 'Design Reviewer',
          description: 'Reviews UI consistency',
          prompt: 'Review the UI for consistency.',
          capabilityPreset: 'research',
        },
      ],
    })

    expect(registry.some((agent) => agent.name === 'planner' && agent.source === 'built-in')).toBe(
      true
    )

    const custom = registry.find((agent) => agent.name === 'design-reviewer')
    expect(custom).toBeDefined()
    expect(custom?.source).toBe('custom')
    expect(custom?.permission.write_files).toBe('deny')
  })

  test('filters custom subagents whose capability preset is disabled by policy', () => {
    const registry = resolveSubagentRegistry({
      allowedCapabilityPresets: ['research'],
      customSubagents: [
        {
          _id: 'custom-1',
          name: 'Builder Bot',
          description: 'Builds things',
          capabilityPreset: 'builder',
        },
      ],
    })

    expect(registry.some((agent) => agent.name === 'builder-bot')).toBe(false)
  })
})
