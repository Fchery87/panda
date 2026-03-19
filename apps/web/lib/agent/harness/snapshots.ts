/**
 * Git Snapshot - Per-step undo capability
 *
 * Implements OpenCode-style git snapshots that capture the working
 * state without altering history, allowing safe rollback on errors.
 */

import { appLog } from '@/lib/logger'
import type { Identifier } from './types'

const isTestEnvironment =
  process.env.NODE_ENV === 'test' || process.env.BUN_ENV === 'test' || process.env.VITEST === 'true'

/**
 * Snapshot representation
 */
export interface Snapshot {
  hash: string
  messageID: Identifier
  step: number
  timestamp: number
  files: string[]
}

/**
 * Snapshot manager for capturing and restoring git states
 */
class SnapshotManager {
  private snapshots: Map<Identifier, Snapshot[]> = new Map()
  private gitDir: string | null = '.'

  /**
   * Initialize the snapshot manager for a project
   */
  init(projectPath: string): void {
    this.gitDir = `${projectPath}/.git`
  }

  /**
   * Check if git is available
   */
  isGitAvailable(): boolean {
    return this.gitDir !== null
  }

  /**
   * Track current state as a snapshot
   * Uses git write-tree to create a tree object without a commit
   */
  async track(
    sessionID: Identifier,
    messageID: Identifier,
    step: number
  ): Promise<Snapshot | null> {
    if (!this.gitDir) {
      return null
    }

    if (isTestEnvironment) {
      return null
    }

    try {
      const result = await this.executeGitCommand(`git add -A && git write-tree`)

      if (!result.success) {
        appLog.error('[Snapshot] Failed to create snapshot:', result.error)
        return null
      }

      const hash = result.output.trim()

      const snapshot: Snapshot = {
        hash,
        messageID,
        step,
        timestamp: Date.now(),
        files: await this.getChangedFiles(),
      }

      if (!this.snapshots.has(sessionID)) {
        this.snapshots.set(sessionID, [])
      }

      this.snapshots.get(sessionID)!.push(snapshot)

      return snapshot
    } catch (error) {
      appLog.error('[Snapshot] Error creating snapshot:', error)
      return null
    }
  }

  /**
   * Restore to a specific snapshot
   */
  async restore(sessionID: Identifier, snapshotHash: string): Promise<boolean> {
    if (!this.gitDir) {
      return false
    }

    try {
      const result = await this.executeGitCommand(
        `git read-tree ${snapshotHash} && git checkout-index -a -f`
      )

      if (!result.success) {
        appLog.error('[Snapshot] Failed to restore:', result.error)
        return false
      }

      return true
    } catch (error) {
      appLog.error('[Snapshot] Error restoring snapshot:', error)
      return false
    }
  }

  /**
   * Restore to the last snapshot for a session
   */
  async restoreLast(sessionID: Identifier): Promise<boolean> {
    const snapshots = this.snapshots.get(sessionID)
    if (!snapshots || snapshots.length === 0) {
      return false
    }

    const lastSnapshot = snapshots[snapshots.length - 1]
    return this.restore(sessionID, lastSnapshot.hash)
  }

  /**
   * Get all snapshots for a session
   */
  getSnapshots(sessionID: Identifier): Snapshot[] {
    return this.snapshots.get(sessionID) ?? []
  }

  /**
   * Get the last N snapshots for a session
   */
  getLastSnapshots(sessionID: Identifier, count: number): Snapshot[] {
    const snapshots = this.getSnapshots(sessionID)
    return snapshots.slice(-count)
  }

  /**
   * Clear snapshots for a session
   */
  clear(sessionID: Identifier): void {
    this.snapshots.delete(sessionID)
  }

  /**
   * Clear all snapshots
   */
  clearAll(): void {
    this.snapshots.clear()
  }

  /**
   * Get list of changed files
   */
  private async getChangedFiles(): Promise<string[]> {
    if (!this.gitDir) {
      return []
    }

    try {
      const result = await this.executeGitCommand(`git diff --name-only HEAD`)

      if (!result.success) {
        return []
      }

      return result.output.trim().split('\n').filter(Boolean)
    } catch (error) {
      void error
      return []
    }
  }

  /**
   * Execute a git command
   */
  private async executeGitCommand(command: string): Promise<{
    success: boolean
    output: string
    error?: string
  }> {
    try {
      const response = await fetch('/api/git', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command }),
      })

      if (!response.ok) {
        const error = await response.text()
        return { success: false, output: '', error }
      }

      const result = await response.json()
      return {
        success: result.exitCode === 0,
        output: result.stdout ?? '',
        error: result.stderr,
      }
    } catch (error) {
      return {
        success: false,
        output: '',
        error: error instanceof Error ? error.message : 'Git command failed',
      }
    }
  }
}

export const snapshots = new SnapshotManager()

/**
 * Create a diff between two snapshots
 */
export async function diffSnapshots(
  fromHash: string,
  toHash: string
): Promise<{ diff: string; error?: string }> {
  if (isTestEnvironment) {
    return { diff: '' }
  }
  try {
    const response = await fetch('/api/git/diff', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: fromHash, to: toHash }),
    })

    if (!response.ok) {
      return { diff: '', error: await response.text() }
    }

    const result = await response.json()
    return { diff: result.diff ?? '' }
  } catch (error) {
    return {
      diff: '',
      error: error instanceof Error ? error.message : 'Failed to get diff',
    }
  }
}

/**
 * Create a patch file from a snapshot
 */
export async function createPatch(
  snapshotHash: string
): Promise<{ patch: string; error?: string }> {
  if (isTestEnvironment) {
    return { patch: '' }
  }
  try {
    const response = await fetch('/api/git/patch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hash: snapshotHash }),
    })

    if (!response.ok) {
      return { patch: '', error: await response.text() }
    }

    const result = await response.json()
    return { patch: result.patch ?? '' }
  } catch (error) {
    return {
      patch: '',
      error: error instanceof Error ? error.message : 'Failed to create patch',
    }
  }
}
