'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Badge } from '@/components/ui/badge'
import { Info, RotateCcw } from 'lucide-react'
import {
  type PermissionLevel,
  type PermissionsConfig,
  DEFAULT_PERMISSIONS,
  READ_ONLY_PERMISSIONS,
  FULL_ACCESS_PERMISSIONS,
  PLAN_MODE_PERMISSIONS,
} from '@/lib/permissions'

interface PermissionsEditorProps {
  value: PermissionsConfig
  onChange: (config: PermissionsConfig) => void
  className?: string
}

const COMMON_TOOLS = [
  { name: 'read', description: 'Read file contents' },
  { name: 'glob', description: 'Search files by pattern' },
  { name: 'grep', description: 'Search file contents' },
  { name: 'list', description: 'List directory contents' },
  { name: 'webfetch', description: 'Fetch web content' },
  { name: 'websearch', description: 'Search the web' },
  { name: 'todowrite', description: 'Write todo items' },
  { name: 'todoread', description: 'Read todo items' },
  { name: 'question', description: 'Ask user questions' },
  { name: 'edit', description: 'Edit existing files' },
  { name: 'write', description: 'Write new files' },
  { name: 'bash', description: 'Run shell commands' },
]

const COMMON_COMMANDS = [
  { pattern: 'git status*', description: 'Check repository status' },
  { pattern: 'git log*', description: 'View commit history' },
  { pattern: 'git diff*', description: 'View changes' },
  { pattern: 'git branch*', description: 'List branches' },
  { pattern: 'ls *', description: 'List files' },
  { pattern: 'cat *', description: 'View file contents' },
  { pattern: 'npm run *', description: 'Run npm scripts' },
  { pattern: 'bun run *', description: 'Run bun scripts' },
  { pattern: 'pnpm *', description: 'Run pnpm commands' },
  { pattern: '*', description: 'All other commands' },
]

const PRESETS: { name: string; config: PermissionsConfig; description: string }[] = [
  {
    name: 'Default',
    config: DEFAULT_PERMISSIONS,
    description: 'Balanced: read allowed, write/execute require approval',
  },
  {
    name: 'Read Only',
    config: READ_ONLY_PERMISSIONS,
    description: 'Safe: only read operations allowed',
  },
  {
    name: 'Plan Mode',
    config: PLAN_MODE_PERMISSIONS,
    description: 'Planning: read allowed, changes require approval',
  },
  {
    name: 'Full Access',
    config: FULL_ACCESS_PERMISSIONS,
    description: 'Unrestricted: all operations allowed',
  },
]

export function PermissionsEditor({ value, onChange, className }: PermissionsEditorProps) {
  const updateToolPermission = (toolName: string, level: PermissionLevel) => {
    onChange({
      ...value,
      tools: {
        ...value.tools,
        [toolName]: level,
      },
    })
  }

  const updateBashPermission = (pattern: string, level: PermissionLevel) => {
    onChange({
      ...value,
      bash: {
        ...value.bash,
        [pattern]: level,
      },
    })
  }

  const applyPreset = (config: PermissionsConfig) => {
    onChange(config)
  }

  const resetToDefault = () => {
    onChange(DEFAULT_PERMISSIONS)
  }

  const getToolLevel = (toolName: string): PermissionLevel => {
    if (!value.tools) return 'ask'
    const level = value.tools[toolName]
    return typeof level === 'string' ? level : 'ask'
  }

  const getBashLevel = (pattern: string): PermissionLevel => {
    if (!value.bash) return 'ask'
    const level = value.bash[pattern]
    return typeof level === 'string' ? level : 'ask'
  }

  const renderLevelSelect = (
    level: PermissionLevel,
    onChangeLevel: (level: PermissionLevel) => void
  ) => (
    <Select value={level} onValueChange={onChangeLevel}>
      <SelectTrigger
        className={cn(
          'h-7 w-24 rounded-none font-mono text-xs',
          level === 'allow' && 'border-green-500/50 bg-green-500/10',
          level === 'deny' && 'border-red-500/50 bg-red-500/10',
          level === 'ask' && 'border-yellow-500/50 bg-yellow-500/10'
        )}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="rounded-none">
        <SelectItem value="allow" className="font-mono text-xs">
          Allow
        </SelectItem>
        <SelectItem value="deny" className="font-mono text-xs">
          Deny
        </SelectItem>
        <SelectItem value="ask" className="font-mono text-xs">
          Ask
        </SelectItem>
      </SelectContent>
    </Select>
  )

  return (
    <div className={cn('space-y-6', className)}>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-mono text-sm font-medium">Tool & Command Permissions</h3>
          <p className="text-xs text-muted-foreground">
            Control what actions the agent can perform automatically
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={resetToDefault}
          className="rounded-none font-mono text-xs"
        >
          <RotateCcw className="mr-1 h-3 w-3" />
          Reset
        </Button>
      </div>

      <div className="space-y-2">
        <Label className="font-mono text-xs">Presets</Label>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((preset) => (
            <Button
              key={preset.name}
              variant="outline"
              size="sm"
              onClick={() => applyPreset(preset.config)}
              className="rounded-none font-mono text-xs"
            >
              {preset.name}
            </Button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <Label className="font-mono text-xs">Tool Permissions</Label>
        <div className="rounded-none border border-border">
          <div className="bg-surface-2 grid grid-cols-[1fr_auto] gap-2 border-b border-border p-2">
            <span className="font-mono text-xs font-medium">Tool</span>
            <span className="font-mono text-xs font-medium">Permission</span>
          </div>
          <div className="divide-y divide-border">
            {COMMON_TOOLS.map((tool) => (
              <div key={tool.name} className="grid grid-cols-[1fr_auto] items-center gap-2 p-2">
                <div className="flex items-center gap-2">
                  <code className="font-mono text-xs">{tool.name}</code>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="h-3 w-3 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent className="rounded-none font-mono text-xs">
                        {tool.description}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                {renderLevelSelect(getToolLevel(tool.name), (level) =>
                  updateToolPermission(tool.name, level)
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <Label className="font-mono text-xs">Bash Command Permissions</Label>
        <div className="rounded-none border border-border">
          <div className="bg-surface-2 grid grid-cols-[1fr_auto] gap-2 border-b border-border p-2">
            <span className="font-mono text-xs font-medium">Pattern</span>
            <span className="font-mono text-xs font-medium">Permission</span>
          </div>
          <div className="divide-y divide-border">
            {COMMON_COMMANDS.map((cmd) => (
              <div key={cmd.pattern} className="grid grid-cols-[1fr_auto] items-center gap-2 p-2">
                <div className="flex items-center gap-2">
                  <code className="font-mono text-xs">{cmd.pattern}</code>
                  {cmd.pattern === '*' && (
                    <Badge variant="outline" className="rounded-none font-mono text-xs">
                      catch-all
                    </Badge>
                  )}
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="h-3 w-3 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent className="rounded-none font-mono text-xs">
                        {cmd.description}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                {renderLevelSelect(getBashLevel(cmd.pattern), (level) =>
                  updateBashPermission(cmd.pattern, level)
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-surface-2 rounded-none border border-border p-3">
        <div className="flex items-start gap-2">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <div className="space-y-1 text-xs text-muted-foreground">
            <p>
              <strong>Allow:</strong> Action executes automatically without prompting
            </p>
            <p>
              <strong>Deny:</strong> Action is blocked and will not execute
            </p>
            <p>
              <strong>Ask:</strong> You will be prompted to approve each action
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function Label({ className, children }: { className?: string; children: React.ReactNode }) {
  return <label className={cn('text-sm font-medium', className)}>{children}</label>
}

export type { PermissionsConfig, PermissionLevel }
