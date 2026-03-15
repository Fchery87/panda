'use client'

import { useEffect } from 'react'

import { shortcutRegistry, type ShortcutEntry } from '@/lib/shortcuts/registry'

export function useShortcuts(entries: ShortcutEntry[]) {
  useEffect(() => {
    for (const entry of entries) {
      shortcutRegistry.register(entry)
    }

    return () => {
      for (const entry of entries) {
        shortcutRegistry.unregister(entry.id)
      }
    }
  }, [entries])
}

export function useShortcutListener() {
  useEffect(() => {
    const handleKeydown = (event: KeyboardEvent) => {
      const match = shortcutRegistry.matchEvent(event)

      if (!match) {
        return
      }

      event.preventDefault()
      match.handler()
    }

    window.addEventListener('keydown', handleKeydown)

    return () => {
      window.removeEventListener('keydown', handleKeydown)
    }
  }, [])
}
