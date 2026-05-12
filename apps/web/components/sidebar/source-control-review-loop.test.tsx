import { describe, expect, mock, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { SourceControlPane } from './SourceControlPane'
import { buildSourceControlReviewLoop } from './source-control-review-loop'

import type { Id } from '@convex/_generated/dataModel'

let queryResults: unknown[] = []

mock.module('convex/react', () => ({
  useQuery: () => queryResults.shift() ?? null,
  useMutation: () => async () => undefined,
}))

mock.module('@/hooks/useGit', () => ({
  useGit: () => ({
    status: null,
    log: [],
    isLoading: false,
    error: null,
    refreshStatus: async () => undefined,
    refreshLog: async () => undefined,
    stage: async () => undefined,
    unstage: async () => undefined,
    commit: async () => undefined,
  }),
}))

describe('source control review loop', () => {
  test('summarizes branch sync conflict review steps', () => {
    const loop = buildSourceControlReviewLoop({
      branchLabel: 'task/review-loop',
      status: 'conflict',
      changedFiles: ['apps/web/components/sidebar/SourceControlPane.tsx'],
      latestCommit: { branch: 'task/review-loop', pushedAt: null },
      latestPullRequest: null,
    })

    expect(loop.headline).toBe('Conflict blocks the review loop')
    expect(loop.detail).toBe('Resolve the conflict, re-sync, then recommit the branch.')
    expect(loop.steps).toEqual([
      { label: 'Branch', value: 'task/review-loop' },
      { label: 'Sync', value: 'Conflict detected' },
      { label: 'Changes', value: '1 file pending' },
      { label: 'Commit', value: 'Committed on task/review-loop, waiting to push' },
      { label: 'Push', value: 'Ready to push task/review-loop' },
      { label: 'PR', value: 'Waiting for push' },
    ])
  })

  test('renders the GitHub review loop copy in the source control pane', () => {
    const projectId = 'project_123' as Id<'projects'>
    queryResults = [
      {
        repository: {
          name: 'panda',
          fullName: 'nochaserz/panda',
          defaultBranch: 'main',
          htmlUrl: 'https://github.com/nochaserz/panda',
          private: false,
        },
        syncState: {
          baseBranch: 'main',
          lastSyncedCommitSha: 'abc123456789def',
          workingBranch: 'task/review-loop',
          changedFiles: ['apps/web/components/sidebar/SourceControlPane.tsx'],
          status: 'conflict',
        },
      },
      { branch: 'task/review-loop', pushedAt: null },
      null,
    ]

    const html = renderToStaticMarkup(<SourceControlPane projectId={projectId} />)

    expect(html).toContain('Review loop')
    expect(html).toContain('Conflict blocks the review loop')
    expect(html).toContain('Resolve the conflict, re-sync, then recommit the branch.')
    expect(html).toContain('Branch / Sync / Commit / Push / PR')
    expect(html).toContain('Commit Branch')
    expect(html).toContain('Confirm Push to GitHub')
    expect(html).toContain('Pending changes')
  })
})
