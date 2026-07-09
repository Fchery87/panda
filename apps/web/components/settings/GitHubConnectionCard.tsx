'use client'

import { useMutation, useQuery } from 'convex/react'
import { Github } from 'lucide-react'

import { api } from '@convex/_generated/api'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface GitHubConnectionCardProps {
  className?: string
}

export function GitHubConnectionCard({ className }: GitHubConnectionCardProps) {
  const status = useQuery(api.githubConnections.getStatus)
  const disconnect = useMutation(api.githubConnections.disconnect)

  const isLoading = status === undefined
  const installUrl = status?.installUrl ?? 'https://github.com/apps'
  const connected = Boolean(status?.connected)

  return (
    <div className={cn('border border-border p-4', className)}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center border border-border bg-background">
            <Github className="h-4 w-4" />
          </div>
          <div className="min-w-0 space-y-1">
            <h3 className="font-mono text-sm font-medium">GitHub</h3>
            <p className="text-xs text-muted-foreground">
              Connect GitHub to open repositories in Panda and ship work through branches, commits,
              pushes, and pull requests.
            </p>
            {isLoading ? (
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Checking connection
              </p>
            ) : connected ? (
              <div className="space-y-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                <p>
                  Connected to {status.accountLogin} ({status.accountType})
                </p>
                <p>Repository access: {status.repositorySelection}</p>
              </div>
            ) : (
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Not connected
              </p>
            )}
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          {connected ? (
            <Button
              variant="outline"
              size="sm"
              className="font-mono"
              onClick={() => void disconnect()}
            >
              Disconnect
            </Button>
          ) : (
            <Button asChild size="sm" className="font-mono" disabled={isLoading}>
              <a href={installUrl}>Connect GitHub</a>
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
