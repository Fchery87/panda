export interface ShortcutEntry {
  id: string
  keys: string
  label: string
  handler: () => void
  category?: string
}

export class ShortcutRegistry {
  private shortcuts = new Map<string, ShortcutEntry>()

  register(entry: ShortcutEntry): void {
    this.shortcuts.set(entry.id, entry)
  }

  unregister(id: string): void {
    this.shortcuts.delete(id)
  }

  get(id: string): ShortcutEntry | undefined {
    return this.shortcuts.get(id)
  }

  findConflict(keys: string): string | undefined {
    for (const [id, entry] of this.shortcuts.entries()) {
      if (entry.keys === keys) {
        return id
      }
    }

    return undefined
  }

  listAll(): ShortcutEntry[] {
    return Array.from(this.shortcuts.values())
  }

  matchEvent(event: KeyboardEvent): ShortcutEntry | undefined {
    const parts: string[] = []

    if (event.metaKey || event.ctrlKey) {
      parts.push('mod')
    }
    if (event.shiftKey) {
      parts.push('shift')
    }
    if (event.altKey) {
      parts.push('alt')
    }

    parts.push(event.key.toLowerCase())

    const pressed = parts.join('+')

    for (const entry of this.shortcuts.values()) {
      if (entry.keys === pressed) {
        return entry
      }
    }

    return undefined
  }
}

export const shortcutRegistry = new ShortcutRegistry()
