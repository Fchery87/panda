'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import { useHotkeys } from 'react-hotkeys-hook'
import { useRouter } from 'next/navigation'
import {
  FileIcon,
  Command,
  Settings,
  MessageSquare,
  Search,
  Moon,
  Sun,
  Monitor,
} from 'lucide-react'
import { useTheme } from 'next-themes'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useShortcuts } from '@/hooks/useShortcuts'
import { cn } from '@/lib/utils'
import { useCommandPaletteStore } from '@/stores/commandPaletteStore'
import type { ChatMode } from '@/lib/agent/prompt-library'

interface CommandItem {
  id: string
  type: 'file' | 'command' | 'mode' | 'setting' | 'theme'
  title: string
  subtitle?: string
  icon: React.ReactNode
  shortcut?: string
  action: () => void
}

interface CommandPaletteProps {
  projectId?: string
  files?: Array<{ path: string }>
  onModeChange?: (mode: ChatMode) => void
  currentMode?: ChatMode
}

export function CommandPalette({
  projectId: _projectId,
  files = [],
  onModeChange,
  currentMode: _currentMode,
}: CommandPaletteProps) {
  const { isOpen, close: closePalette } = useCommandPaletteStore()
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const router = useRouter()
  const { setTheme } = useTheme()

  const shortcuts = useMemo(
    () => [
      {
        id: 'command-palette',
        keys: 'mod+k',
        label: 'Command Palette',
        handler: () => useCommandPaletteStore.getState().toggle(),
        category: 'General',
      },
    ],
    []
  )

  useShortcuts(shortcuts)

  // Close on Escape
  useHotkeys('esc', () => closePalette(), { enabled: isOpen })

  // Navigation shortcuts when open
  useHotkeys(
    'up',
    () => {
      setSelectedIndex((prev) => Math.max(0, prev - 1))
    },
    { enabled: isOpen }
  )

  useHotkeys(
    'down',
    () => {
      setSelectedIndex((prev) => Math.min(filteredCommands.length - 1, prev + 1))
    },
    { enabled: isOpen }
  )

  useHotkeys(
    'enter',
    () => {
      const command = filteredCommands[selectedIndex]
      if (command) {
        command.action()
        closePalette()
        setQuery('')
      }
    },
    { enabled: isOpen }
  )

  // Build command list
  const commands = useMemo(() => {
    const list: CommandItem[] = [
      // Navigation
      {
        id: 'nav-projects',
        type: 'command',
        title: 'Go to Projects',
        subtitle: 'View all projects',
        icon: <Command className="h-4 w-4" />,
        shortcut: 'G P',
        action: () => router.push('/projects'),
      },
      {
        id: 'nav-settings',
        type: 'setting',
        title: 'Open Settings',
        subtitle: 'Configure preferences',
        icon: <Settings className="h-4 w-4" />,
        shortcut: 'Cmd+,',
        action: () => router.push('/settings'),
      },

      // Chat Modes
      {
        id: 'mode-ask',
        type: 'mode',
        title: 'Switch to Ask Mode',
        subtitle: 'Ask questions without file changes',
        icon: <MessageSquare className="h-4 w-4" />,
        action: () => onModeChange?.('ask'),
      },
      {
        id: 'mode-architect',
        type: 'mode',
        title: 'Switch to Architect Mode',
        subtitle: 'Design and plan features',
        icon: <MessageSquare className="h-4 w-4" />,
        action: () => onModeChange?.('architect'),
      },
      {
        id: 'mode-code',
        type: 'mode',
        title: 'Switch to Code Mode',
        subtitle: 'Write and edit code',
        icon: <MessageSquare className="h-4 w-4" />,
        action: () => onModeChange?.('code'),
      },
      {
        id: 'mode-build',
        type: 'mode',
        title: 'Switch to Build Mode',
        subtitle: 'Run commands and build',
        icon: <MessageSquare className="h-4 w-4" />,
        action: () => onModeChange?.('build'),
      },

      // Theme
      {
        id: 'theme-light',
        type: 'theme',
        title: 'Set Light Theme',
        subtitle: 'Switch to light mode',
        icon: <Sun className="h-4 w-4" />,
        action: () => setTheme('light'),
      },
      {
        id: 'theme-dark',
        type: 'theme',
        title: 'Set Dark Theme',
        subtitle: 'Switch to dark mode',
        icon: <Moon className="h-4 w-4" />,
        action: () => setTheme('dark'),
      },
      {
        id: 'theme-system',
        type: 'theme',
        title: 'Set System Theme',
        subtitle: 'Use system preference',
        icon: <Monitor className="h-4 w-4" />,
        action: () => setTheme('system'),
      },

      // File search (if files provided)
      ...files.map((file) => ({
        id: `file-${file.path}`,
        type: 'file' as const,
        title: file.path.split('/').pop() || file.path,
        subtitle: file.path,
        icon: <FileIcon className="h-4 w-4" />,
        action: () => {
          // Would need to integrate with file selection
          void file.path
        },
      })),
    ]

    return list
  }, [router, onModeChange, setTheme, files])

  // Filter commands based on query
  const filteredCommands = useMemo(() => {
    if (!query.trim()) return commands

    const lowerQuery = query.toLowerCase()
    return commands.filter(
      (cmd) =>
        cmd.title.toLowerCase().includes(lowerQuery) ||
        cmd.subtitle?.toLowerCase().includes(lowerQuery) ||
        cmd.type.toLowerCase().includes(lowerQuery)
    )
  }, [commands, query])

  // Reset selection when query changes
  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  const handleSelect = useCallback(
    (command: CommandItem) => {
      command.action()
      closePalette()
      setQuery('')
    },
    [closePalette]
  )

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && closePalette()}>
      <DialogContent
        className="max-w-2xl gap-0 rounded-none border-border p-0"
        aria-describedby="command-palette-description"
      >
        <DialogTitle className="sr-only">Command Palette</DialogTitle>
        <p id="command-palette-description" className="sr-only">
          Search for files, commands, and settings. Use arrow keys to navigate, Enter to select.
        </p>

        {/* Search Input */}
        <div className="border-b border-border p-4">
          <div className="flex items-center gap-3">
            <Search className="h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Search files, commands, or settings..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-auto border-0 bg-transparent px-0 text-lg focus-visible:ring-0 focus-visible:ring-offset-0"
              autoFocus
            />
          </div>
        </div>

        {/* Results */}
        <div className="max-h-[400px] overflow-y-auto">
          {filteredCommands.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <p>No results found</p>
              <p className="mt-1 text-sm">Try a different search term</p>
            </div>
          ) : (
            <div className="py-2">
              {filteredCommands.map((command, index) => (
                <button
                  key={command.id}
                  onClick={() => handleSelect(command)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={cn(
                    'flex w-full items-center gap-3 px-4 py-3 text-left transition-colors',
                    index === selectedIndex && 'bg-accent'
                  )}
                >
                  <div className="text-muted-foreground">{command.icon}</div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium">{command.title}</div>
                    {command.subtitle && (
                      <div className="truncate text-xs text-muted-foreground">
                        {command.subtitle}
                      </div>
                    )}
                  </div>
                  {command.shortcut && (
                    <kbd className="rounded-none bg-muted px-2 py-1 font-mono text-xs">
                      {command.shortcut}
                    </kbd>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border p-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="rounded-none bg-muted px-1.5 py-0.5 font-mono">↑</kbd>
              <kbd className="rounded-none bg-muted px-1.5 py-0.5 font-mono">↓</kbd>
              <span className="ml-1">Navigate</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded-none bg-muted px-1.5 py-0.5 font-mono">↵</kbd>
              <span className="ml-1">Select</span>
            </span>
          </div>
          <span className="flex items-center gap-1">
            <kbd className="rounded-none bg-muted px-1.5 py-0.5 font-mono">esc</kbd>
            <span className="ml-1">Close</span>
          </span>
        </div>
      </DialogContent>
    </Dialog>
  )
}
