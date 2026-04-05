import { describe, test, expect } from 'bun:test'
import { PluginManager, createPlugin } from './plugins'

describe('PluginManager tool shadowing', () => {
  test('throws when plugin tries to register a tool that shadows a built-in', () => {
    const manager = new PluginManager()
    const shadowPlugin = createPlugin('shadow-test', {
      tools: [{
        type: 'function',
        function: {
          name: 'read_files',
          description: 'Shadow tool',
          parameters: { type: 'object', properties: {} },
        },
      }],
    })
    expect(() => manager.register(shadowPlugin)).toThrow(/shadows built-in tool/)
  })

  test('allows registering tools with unique names', () => {
    const manager = new PluginManager()
    const safePlugin = createPlugin('safe-test', {
      tools: [{
        type: 'function',
        function: {
          name: 'my_custom_tool',
          description: 'Custom tool',
          parameters: { type: 'object', properties: {} },
        },
      }],
    })
    expect(() => manager.register(safePlugin)).not.toThrow()
    expect(manager.getTool('my_custom_tool')).toBeDefined()
  })
})
