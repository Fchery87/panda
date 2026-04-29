'use client'

import { GitBranch } from 'lucide-react'
import {
  IconFile,
  IconConnected,
  IconDisconnected,
  IconStreaming,
  IconCheck,
  IconError,
  IconSpinner,
} from '@/components/ui/icons'
import { cn } from '@/lib/utils'
import { SpecBadge } from './SpecBadge'
import type { SpecStatus, SpecTier } from '@/lib/agent/spec/types'
import {
  resolveRuntimeAvailability,
  type RuntimeProviderStatus,
} from '@/lib/workspace/runtime-availability'

export type AgentStatus = 'idle' | 'running' | 'completed' | 'failed'

interface StatusBarProps {
  filePath?: string | null
  cursorPosition?: { line: number; column: number } | null
  language?: string
  branch?: string
  isConnected?: boolean
  isStreaming?: boolean
  className?: string
  /** Spec engine enabled - shows spec badge when true */
  specEngineEnabled?: boolean
  /** Current spec status */
  specStatus?: SpecStatus | null
  /** Current spec tier */
  specTier?: SpecTier
  /** Number of constraints met */
  specConstraintsMet?: number
  /** Total number of constraints */
  specConstraintsTotal?: number
  /** Callback when spec badge is clicked */
  onSpecClick?: () => void
  /** Currently active model display name */
  activeModel?: string
  /** Agent run status for persistent indicator */
  agentStatus?: AgentStatus
  /** Callback when agent status badge is clicked (focus chat panel) */
  onAgentStatusClick?: () => void
  webcontainerStatus?: RuntimeProviderStatus
}

function getLanguageFromPath(path: string | null | undefined): string {
  if (!path) return 'Plain Text'
  const ext = path.split('.').pop()?.toLowerCase()
  const languages: Record<string, string> = {
    ts: 'TypeScript',
    tsx: 'TypeScript React',
    js: 'JavaScript',
    jsx: 'JavaScript React',
    json: 'JSON',
    md: 'Markdown',
    css: 'CSS',
    scss: 'SCSS',
    html: 'HTML',
    py: 'Python',
    go: 'Go',
    rs: 'Rust',
    java: 'Java',
  }
  return languages[ext || ''] || 'Plain Text'
}

function AgentStatusIcon({ status }: { status: AgentStatus }) {
  switch (status) {
    case 'running':
      return <IconSpinner className="h-3 w-3 animate-spin" />
    case 'completed':
      return <IconCheck className="h-3 w-3 text-green-500" weight="bold" />
    case 'failed':
      return <IconError className="h-3 w-3 text-destructive" weight="bold" />
    default:
      return <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground" />
  }
}

export function StatusBar({
  filePath,
  cursorPosition,
  language,
  branch,
  isConnected = true,
  isStreaming = false,
  className,
  specEngineEnabled = false,
  specStatus = null,
  specTier,
  specConstraintsMet,
  specConstraintsTotal,
  onSpecClick,
  activeModel,
  agentStatus = 'idle',
  onAgentStatusClick,
  webcontainerStatus = 'unsupported',
}: StatusBarProps) {
  const displayLanguage = language || getLanguageFromPath(filePath)
  const filename = filePath?.split('/').pop() || 'No file'
  const runtimeAvailability = resolveRuntimeAvailability({ status: webcontainerStatus })

  return (
    <footer
      className={cn(
        'surface-1 flex h-6 items-center justify-between border-t border-border',
        'px-3 font-mono text-code-xs text-muted-foreground',
        className
      )}
    >
      <div className="flex items-center gap-3">
        {isStreaming ? (
          <span className="flex items-center gap-1.5 text-primary">
            <IconStreaming className="h-3 w-3 animate-spin" />
            AI thinking...
          </span>
        ) : (
          <span className="flex items-center gap-1.5">
            <IconFile className="h-3 w-3" weight="duotone" />
            <span className="max-w-[200px] truncate">{filename}</span>
          </span>
        )}

        {cursorPosition && (
          <span className="text-muted-foreground/70">
            Ln {cursorPosition.line}, Col {cursorPosition.column}
          </span>
        )}

        <span className="text-muted-foreground/70">{displayLanguage}</span>

        <span className="text-muted-foreground/70">UTF-8</span>
      </div>

      <div className="flex items-center gap-3">
        {activeModel && (
          <span className="hidden text-muted-foreground/70 sm:inline">{activeModel}</span>
        )}

        <span className="hidden text-muted-foreground/70 md:inline" aria-live="polite">
          WC: {runtimeAvailability.label}
        </span>

        <button
          type="button"
          onClick={onAgentStatusClick}
          className={cn(
            'flex items-center gap-1.5 transition-colors hover:text-foreground',
            agentStatus === 'running' && 'text-primary'
          )}
          aria-label={`Agent: ${agentStatus}`}
        >
          <AgentStatusIcon status={agentStatus} />
          <span className="hidden sm:inline">Agent: {agentStatus}</span>
        </button>

        {specEngineEnabled && specStatus && (
          <SpecBadge
            status={specStatus}
            tier={specTier}
            constraintsMet={specConstraintsMet}
            constraintsTotal={specConstraintsTotal}
            onClick={onSpecClick}
          />
        )}

        {branch && (
          <button
            type="button"
            className="flex items-center gap-1 transition-colors hover:text-foreground"
            aria-label={`Git branch: ${branch}`}
          >
            <GitBranch className="h-3 w-3" />
            {branch}
          </button>
        )}

        <span
          className={cn('flex items-center', isConnected ? 'text-primary' : 'text-destructive')}
          aria-live="polite"
          title={isConnected ? 'Connected' : 'Disconnected'}
        >
          {isConnected ? (
            <IconConnected className="h-3 w-3" />
          ) : (
            <>
              <IconDisconnected className="h-3 w-3" />
              <span className="ml-1">Disconnected</span>
            </>
          )}
        </span>
      </div>
    </footer>
  )
}
