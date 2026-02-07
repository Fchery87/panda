import path from 'node:path'
import { runAstSearch, runTextSearch } from './engines'
import { isDeniedPath, toWorkspaceRelativePath, validateSearchRequest } from './validate'
import type { SearchRequest, SearchResponse } from './types'

const RESULT_DENYLIST_WARNING = 'Some matches were filtered due to protected paths.'

function resolveCwd(workingDirectory?: string): string {
  const root = process.cwd()
  if (!workingDirectory) return root

  const normalizedWorkingDirectory = toWorkspaceRelativePath(workingDirectory)
  const resolved = path.resolve(root, normalizedWorkingDirectory)

  if (!resolved.startsWith(root)) {
    throw new Error('Invalid workingDirectory: must stay within project root')
  }

  return resolved
}

export interface SearchServiceOptions {
  workingDirectory?: string
}

export async function executeSearch(
  request: SearchRequest,
  options: SearchServiceOptions = {}
): Promise<SearchResponse> {
  const normalized = validateSearchRequest(request)
  const cwd = resolveCwd(options.workingDirectory)

  const response =
    normalized.type === 'ast'
      ? await runAstSearch(normalized, cwd)
      : await runTextSearch(normalized, cwd)

  const filteredMatches = response.matches.filter((m) => {
    try {
      const rel = toWorkspaceRelativePath(m.file)
      return !isDeniedPath(rel)
    } catch {
      return false
    }
  })

  const removedCount = response.matches.length - filteredMatches.length
  if (removedCount > 0 && !response.warnings.includes(RESULT_DENYLIST_WARNING)) {
    response.warnings.push(RESULT_DENYLIST_WARNING)
  }

  return {
    ...response,
    matches: filteredMatches,
    stats: {
      ...response.stats,
      matchesReturned: filteredMatches.length,
    },
  }
}
