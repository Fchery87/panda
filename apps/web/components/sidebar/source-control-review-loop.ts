export type GitHubSyncStatus = 'clean' | 'dirty' | 'remote_changed' | 'conflict'

interface SourceControlReviewLoopArgs {
  branchLabel: string
  status: GitHubSyncStatus
  changedFiles: string[]
  latestCommit: {
    branch: string
    pushedAt?: number | null
  } | null
  latestPullRequest: {
    status: string
    title: string
    url?: string | null
  } | null
}

interface SourceControlReviewLoopStep {
  label: string
  value: string
}

export interface SourceControlReviewLoop {
  headline: string
  detail: string
  steps: SourceControlReviewLoopStep[]
}

function describeSyncStatus(status: GitHubSyncStatus): { label: string; detail: string } {
  switch (status) {
    case 'conflict':
      return {
        label: 'Conflict detected',
        detail: 'Resolve the merge conflict before committing more work.',
      }
    case 'remote_changed':
      return {
        label: 'Remote changed',
        detail: 'Sync from GitHub before you stage or commit again.',
      }
    case 'dirty':
      return {
        label: 'Working copy dirty',
        detail: 'Stage and commit the branch before you push.',
      }
    case 'clean':
    default:
      return {
        label: 'Clean working copy',
        detail: 'Ready for the next review loop step.',
      }
  }
}

export function buildSourceControlReviewLoop({
  branchLabel,
  status,
  changedFiles,
  latestCommit,
  latestPullRequest,
}: SourceControlReviewLoopArgs): SourceControlReviewLoop {
  const sync = describeSyncStatus(status)
  const changedFilesLabel =
    changedFiles.length === 0
      ? 'No pending file changes'
      : `${changedFiles.length} file${changedFiles.length === 1 ? '' : 's'} pending`

  const commitLabel = latestCommit
    ? latestCommit.pushedAt
      ? `Committed on ${latestCommit.branch}`
      : `Committed on ${latestCommit.branch}, waiting to push`
    : changedFiles.length > 0
      ? 'Ready to commit the branch'
      : 'Waiting for the first commit'

  const pushLabel = latestCommit
    ? latestCommit.pushedAt
      ? `Pushed ${latestCommit.branch}`
      : `Ready to push ${latestCommit.branch}`
    : 'Waiting for a commit'

  const prLabel = latestPullRequest
    ? `PR ${latestPullRequest.status}: ${latestPullRequest.title}`
    : latestCommit?.pushedAt
      ? 'Ready to draft a PR'
      : 'Waiting for push'

  const headline =
    status === 'conflict'
      ? 'Conflict blocks the review loop'
      : status === 'remote_changed'
        ? 'Sync before the next commit'
        : changedFiles.length > 0
          ? 'Commit changes before you push'
          : latestCommit && !latestCommit.pushedAt
            ? 'Push the Panda branch to GitHub'
            : latestPullRequest
              ? `Pull request ${latestPullRequest.status}`
              : 'Create a task branch when you are ready'

  const detail =
    status === 'conflict'
      ? 'Resolve the conflict, re-sync, then recommit the branch.'
      : status === 'remote_changed'
        ? 'Pull the remote commit before you stage or commit more work.'
        : changedFiles.length > 0
          ? 'Stage the diff, commit the branch, then confirm the push.'
          : latestCommit && !latestCommit.pushedAt
            ? 'Confirm the push before you draft the pull request.'
            : latestPullRequest?.status === 'draft'
              ? 'Confirm the draft before you open the PR for review.'
              : latestPullRequest
                ? 'Open the PR when the branch is ready for review.'
                : 'Start a task branch to begin the review loop.'

  return {
    headline,
    detail,
    steps: [
      { label: 'Branch', value: branchLabel },
      { label: 'Sync', value: sync.label },
      { label: 'Changes', value: changedFilesLabel },
      { label: 'Commit', value: commitLabel },
      { label: 'Push', value: pushLabel },
      { label: 'PR', value: prLabel },
    ],
  }
}
