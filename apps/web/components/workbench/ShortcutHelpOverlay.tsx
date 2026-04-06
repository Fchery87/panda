'use client'

import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { shortcutRegistry, type ShortcutEntry } from '@/lib/shortcuts/registry'

interface ShortcutHelpOverlayProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

function formatKeys(keys: string): string {
  return keys
    .split('+')
    .map((k) => {
      if (k === 'mod') return navigator.platform?.includes('Mac') ? '\u2318' : 'Ctrl'
      if (k === 'shift') return '\u21E7'
      if (k === 'alt') return navigator.platform?.includes('Mac') ? '\u2325' : 'Alt'
      return k.toUpperCase()
    })
    .join(' + ')
}

export function ShortcutHelpOverlay({ open, onOpenChange }: ShortcutHelpOverlayProps) {
  const [shortcuts, setShortcuts] = useState<ShortcutEntry[]>([])

  useEffect(() => {
    if (open) {
      setShortcuts(shortcutRegistry.listAll())
    }
  }, [open])

  const grouped = shortcuts.reduce<Record<string, ShortcutEntry[]>>((acc, entry) => {
    const cat = entry.category || 'General'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(entry)
    return acc
  }, {})

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg rounded-none font-mono">
        <DialogHeader>
          <DialogTitle className="font-mono">Keyboard Shortcuts</DialogTitle>
        </DialogHeader>
        <div className="max-h-[60vh] space-y-4 overflow-y-auto">
          {Object.entries(grouped).map(([category, entries]) => (
            <div key={category}>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                {category}
              </h3>
              <div className="space-y-1">
                {entries.map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between py-1">
                    <span className="text-sm text-foreground">{entry.label}</span>
                    <kbd className="border border-border bg-muted px-2 py-0.5 text-xs">
                      {formatKeys(entry.keys)}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {shortcuts.length === 0 && (
            <p className="text-sm text-muted-foreground">No shortcuts registered.</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
