'use client'

import { useQuery } from 'convex/react'
import { Lock, Unlock } from 'lucide-react'

import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export interface GitHubRepositorySelection {
  connectionId: Id<'githubConnections'>
  repositoryId: string
  owner: string
  name: string
  fullName: string
  private: boolean
  defaultBranch: string
  htmlUrl: string
}

interface GitHubRepositoryPickerProps {
  value: GitHubRepositorySelection | null
  onChange: (repository: GitHubRepositorySelection | null) => void
  disabled?: boolean
  className?: string
}

export function GitHubRepositoryPicker({
  value,
  onChange,
  disabled = false,
  className,
}: GitHubRepositoryPickerProps) {
  const result = useQuery(api.githubConnections.listAuthorizedRepositories, { limit: 25 })
  const repositories = result?.repositories ?? []
  const connected = Boolean(result?.connected)
  const isLoading = result === undefined

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between gap-3">
        <label className="font-mono text-xs uppercase tracking-[0.06em] text-muted-foreground">
          GitHub Repository
        </label>
        {value ? (
          <button
            type="button"
            className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground underline hover:text-foreground"
            onClick={() => onChange(null)}
            disabled={disabled}
          >
            Clear
          </button>
        ) : null}
      </div>

      {isLoading ? (
        <div className="border border-border bg-background p-3 font-mono text-xs text-muted-foreground">
          Loading authorized repositories...
        </div>
      ) : !connected ? (
        <div className="border border-border bg-background p-3 font-mono text-xs text-muted-foreground">
          Connect GitHub in settings to choose a repository.
        </div>
      ) : repositories.length === 0 ? (
        <div className="border border-border bg-background p-3 font-mono text-xs text-muted-foreground">
          No authorized repositories are available yet.
        </div>
      ) : (
        <div className="max-h-48 space-y-1 overflow-y-auto border border-border bg-background p-1">
          {repositories.map((repository) => {
            const selected = value?.repositoryId === repository.repositoryId
            return (
              <Button
                key={repository.repositoryId}
                type="button"
                variant={selected ? 'secondary' : 'ghost'}
                className="h-auto w-full justify-start px-2 py-2 text-left font-mono"
                onClick={() => onChange(repository)}
                disabled={disabled}
              >
                {repository.private ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs">{repository.fullName}</span>
                  <span className="block truncate text-[10px] uppercase tracking-widest text-muted-foreground">
                    Default branch: {repository.defaultBranch}
                  </span>
                </span>
              </Button>
            )
          })}
        </div>
      )}
    </div>
  )
}
