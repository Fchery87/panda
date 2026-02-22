/**
 * ModeSelector - Backward compatible re-export from AgentSelector
 *
 * This file re-exports AgentSelector for backward compatibility.
 * New code should import from AgentSelector directly.
 */
export { AgentSelector as ModeSelector, MODE_OPTIONS, AgentSelector } from './AgentSelector'

interface ModeOption {
  value: ChatMode
  label: string
  icon: React.ReactNode
  description: string
  shortcut: string
}

const MODE_OPTIONS: ModeOption[] = [
  {
    value: 'ask',
    label: 'Ask',
    icon: <HelpCircle className="h-3.5 w-3.5" />,
    description: 'Read-only Q&A',
    shortcut: '1',
  },
  {
    value: 'architect',
    label: 'Plan',
    icon: <Lightbulb className="h-3.5 w-3.5" />,
    description: 'Planning & architecture',
    shortcut: '2',
  },
  {
    value: 'code',
    label: 'Code',
    icon: <Code className="h-3.5 w-3.5" />,
    description: 'Implementation',
    shortcut: '3',
  },
  {
    value: 'build',
    label: 'Build',
    icon: <Hammer className="h-3.5 w-3.5" />,
    description: 'Full implementation',
    shortcut: '4',
  },
]

export function ModeSelector({ mode, onModeChange, disabled, className }: ModeSelectorProps) {
  const current = MODE_OPTIONS.find((o) => o.value === mode) ?? MODE_OPTIONS[2]

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild disabled={disabled}>
        <button
          className={cn(
            'transition-sharp group flex items-center gap-1.5 border border-border px-2.5 py-1',
            'font-mono text-xs tracking-wide text-muted-foreground',
            'hover:border-foreground/30 hover:text-foreground',
            'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary',
            'data-[state=open]:border-primary data-[state=open]:text-foreground',
            'disabled:pointer-events-none disabled:opacity-50',
            className
          )}
        >
          <span className="flex items-center gap-1.5">
            {current.icon}
            <span className="uppercase">{current.label}</span>
          </span>
          <ChevronDown className="h-3 w-3 opacity-40 transition-transform group-data-[state=open]:rotate-180" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="start"
        sideOffset={6}
        className={cn('shadow-sharp-sm min-w-[220px] rounded-none border-border p-0', 'surface-1')}
      >
        <DropdownMenuRadioGroup value={mode} onValueChange={(v) => onModeChange(v as ChatMode)}>
          {MODE_OPTIONS.map((option) => (
            <DropdownMenuRadioItem
              key={option.value}
              value={option.value}
              className={cn(
                'relative cursor-pointer rounded-none px-3 py-2 font-mono text-xs',
                'transition-sharp focus:bg-secondary focus:text-foreground',
                'data-[state=checked]:bg-primary/10 data-[state=checked]:text-foreground',
                // Hide default Radix radio circle indicator
                '[&>span:first-child]:hidden'
              )}
            >
              {/* Active mode left-edge accent */}
              {option.value === mode && (
                <span className="absolute inset-y-0 left-0 w-0.5 bg-primary" />
              )}

              <span className="flex w-full items-center gap-2.5">
                <span
                  className={cn(
                    'flex h-6 w-6 shrink-0 items-center justify-center border',
                    option.value === mode
                      ? 'border-primary/40 text-primary'
                      : 'border-border text-muted-foreground'
                  )}
                >
                  {option.icon}
                </span>

                <span className="flex flex-col gap-0">
                  <span className="text-xs font-medium uppercase tracking-wider">
                    {option.label}
                  </span>
                  <span className="text-xs font-normal normal-case tracking-normal text-muted-foreground">
                    {option.description}
                  </span>
                </span>

                <DropdownMenuShortcut className="ml-auto font-mono text-xs opacity-30">
                  {option.shortcut}
                </DropdownMenuShortcut>
              </span>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export { MODE_OPTIONS }
export type { ModeOption }
