import { describe, expect, it } from 'bun:test'

import { ShortcutRegistry } from './registry'

describe('ShortcutRegistry', () => {
  it('registers and retrieves a shortcut', () => {
    const registry = new ShortcutRegistry()

    registry.register({
      id: 'toggle-sidebar',
      keys: 'mod+b',
      label: 'Toggle Sidebar',
      handler: () => {},
    })

    const shortcut = registry.get('toggle-sidebar')

    expect(shortcut).toBeDefined()
    expect(shortcut!.keys).toBe('mod+b')
  })

  it('detects key conflicts', () => {
    const registry = new ShortcutRegistry()

    registry.register({
      id: 'toggle-sidebar',
      keys: 'mod+b',
      label: 'Toggle Sidebar',
      handler: () => {},
    })

    expect(registry.findConflict('mod+b')).toBe('toggle-sidebar')
  })

  it('unregisters a shortcut', () => {
    const registry = new ShortcutRegistry()

    registry.register({
      id: 'toggle-sidebar',
      keys: 'mod+b',
      label: 'Toggle Sidebar',
      handler: () => {},
    })

    registry.unregister('toggle-sidebar')

    expect(registry.get('toggle-sidebar')).toBeUndefined()
  })

  it('lists all shortcuts for help UI', () => {
    const registry = new ShortcutRegistry()

    registry.register({ id: 'a', keys: 'mod+b', label: 'A', handler: () => {} })
    registry.register({ id: 'b', keys: 'mod+k', label: 'B', handler: () => {} })

    expect(registry.listAll()).toHaveLength(2)
  })

  it('matchEvent returns the correct handler', () => {
    let called = false
    const registry = new ShortcutRegistry()

    registry.register({
      id: 'test',
      keys: 'mod+shift+e',
      label: 'Test',
      handler: () => {
        called = true
      },
    })

    const event = {
      key: 'e',
      metaKey: true,
      ctrlKey: false,
      shiftKey: true,
      altKey: false,
      preventDefault: () => {},
    }

    const match = registry.matchEvent(event as unknown as KeyboardEvent)

    expect(match).toBeDefined()
    match!.handler()
    expect(called).toBe(true)
  })
})
