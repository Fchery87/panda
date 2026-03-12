'use client'

import { Wifi, WifiOff, GitBranch, FileCode, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SpecBadge } from './SpecBadge'
import type { SpecStatus } from '@/lib/agent/spec/types'

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
  /** Number of constraints met */
  specConstraintsMet?: number
  /** Total number of constraints */
  specConstraintsTotal?: number
  /** Callback when spec badge is clicked */
  onSpecClick?: () => void
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
  specConstraintsMet,
  specConstraintsTotal,
  onSpecClick,
}: StatusBarProps) {
  const displayLanguage = language || getLanguageFromPath(filePath)
  const filename = filePath?.split('/').pop() || 'No file'

  return (
    <footer
      className={cn(
        'bg-surface-1 flex h-6 items-center justify-between border-t border-border',
        'px-3 font-mono text-code-xs text-muted-foreground',
        className
      )}
    >
      <div className="flex items-center gap-3">
        {isStreaming ? (
          <span className="flex items-center gap-1.5 text-primary">
            <Loader2 className="h-3 w-3 animate-spin" />
            AI thinking...
          </span>
        ) : (
          <span className="flex items-center gap-1.5">
            <FileCode className="h-3 w-3" />
            <span className="max-w-[200px] truncate">{filename}</span>
          </span>
        )}

        {cursorPosition && (
          <span className="text-muted-foreground/70">
            Ln {cursorPosition.line}, Col {cursorPosition.column}
          </span>
        )}

        <span className="text-muted-foreground/70">{displayLanguage}</span>
      </div>

      <div className="flex items-center gap-3">
        {specEngineEnabled && specStatus && (
          <SpecBadge
            status={specStatus}
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
          className={cn(
            'flex items-center gap-1',
            isConnected ? 'text-primary' : 'text-destructive'
          )}
          aria-live="polite"
        >
          {isConnected ? (
            <>
              <Wifi className="h-3 w-3" />
              Connected
            </>
          ) : (
            <>
              <WifiOff className="h-3 w-3" />
              Disconnected
            </>
          )}
        </span>
      </div>
    </footer>
  )
}
