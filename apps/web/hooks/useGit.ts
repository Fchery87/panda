// apps/web/hooks/useGit.ts
'use client'

import { useState, useCallback } from 'react'

// --- Raw API client functions (exported for testability) ---

export interface GitStatusResult {
  branch: string
  staged: string[]
  unstaged: string[]
  untracked: string[]
}

export interface GitCommitEntry {
  hash: string
  author: string
  email: string
  date: string
  message: string
}

async function gitCommand(body: Record<string, unknown>) {
  const res = await fetch('/api/git', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(err.error || `Git command failed: ${res.status}`)
  }
  return res.json()
}

export async function gitStatus(): Promise<GitStatusResult> {
  return gitCommand({ command: 'status' })
}

export async function gitLog(limit = 20): Promise<{ commits: GitCommitEntry[] }> {
  return gitCommand({ command: 'log', limit })
}

export async function gitBranches(): Promise<{ current: string; branches: string[] }> {
  return gitCommand({ command: 'branch-list' })
}

export async function gitStage(paths: string[]): Promise<void> {
  await gitCommand({ command: 'stage', paths })
}

export async function gitUnstage(paths: string[]): Promise<void> {
  await gitCommand({ command: 'unstage', paths })
}

export async function gitCommit(message: string): Promise<void> {
  await gitCommand({ command: 'commit', message })
}

export async function gitCheckout(branch: string): Promise<void> {
  await gitCommand({ command: 'checkout', branch })
}

export async function gitDiffStaged(): Promise<string> {
  const result = await gitCommand({ command: 'diff-staged' })
  return result.stdout || ''
}

export async function gitDiffUnstaged(): Promise<string> {
  const result = await gitCommand({ command: 'diff-unstaged' })
  return result.stdout || ''
}

// --- React hook ---

export function useGit() {
  const [status, setStatus] = useState<GitStatusResult | null>(null)
  const [log, setLog] = useState<GitCommitEntry[]>([])
  const [branches, setBranches] = useState<{ current: string; branches: string[] } | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refreshStatus = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await gitStatus()
      setStatus(result)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to get git status')
    } finally {
      setIsLoading(false)
    }
  }, [])

  const refreshLog = useCallback(async (limit = 20) => {
    try {
      const result = await gitLog(limit)
      setLog(result.commits)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to get git log')
    }
  }, [])

  const refreshBranches = useCallback(async () => {
    try {
      const result = await gitBranches()
      setBranches(result)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to list branches')
    }
  }, [])

  const stage = useCallback(
    async (paths: string[]) => {
      await gitStage(paths)
      await refreshStatus()
    },
    [refreshStatus]
  )

  const unstage = useCallback(
    async (paths: string[]) => {
      await gitUnstage(paths)
      await refreshStatus()
    },
    [refreshStatus]
  )

  const commit = useCallback(
    async (message: string) => {
      await gitCommit(message)
      await refreshStatus()
      await refreshLog()
    },
    [refreshStatus, refreshLog]
  )

  const checkout = useCallback(
    async (branch: string) => {
      await gitCheckout(branch)
      await refreshStatus()
      await refreshBranches()
    },
    [refreshStatus, refreshBranches]
  )

  return {
    status,
    log,
    branches,
    isLoading,
    error,
    refreshStatus,
    refreshLog,
    refreshBranches,
    stage,
    unstage,
    commit,
    checkout,
  }
}
