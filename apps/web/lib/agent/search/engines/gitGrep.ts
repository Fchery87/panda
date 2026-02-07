import type {
  NormalizedTextSearchRequest,
  SearchMatch,
  SearchResponse,
  SearchRunOptions,
  TextSearchEngine,
} from '../types'
import { runSearchCommand } from '../runner'

export function buildGitGrepArgs(request: NormalizedTextSearchRequest): string[] {
  const args = ['grep', '--line-number', '--column', '--full-name']

  if (request.mode === 'literal') {
    args.push('-F')
  } else {
    args.push('-E')
  }

  if (!request.caseSensitive) {
    args.push('-i')
  }

  args.push('-m', String(request.maxMatchesPerFile))
  args.push('-e', request.query)

  const pathspecs = [...request.paths]
  for (const glob of request.includeGlobs) {
    pathspecs.push(`:(glob)${glob}`)
  }
  for (const glob of request.excludeGlobs) {
    pathspecs.push(`:(exclude,glob)${glob}`)
  }
  if (pathspecs.length > 0) {
    args.push('--', ...pathspecs)
  }

  return args
}

function parseGitGrepLine(line: string): SearchMatch | null {
  // format with --column: path:line:column:content
  const first = line.indexOf(':')
  if (first <= 0) return null
  const second = line.indexOf(':', first + 1)
  if (second <= first) return null
  const third = line.indexOf(':', second + 1)
  if (third <= second) return null

  const file = line.slice(0, first)
  const lineNumber = Number(line.slice(first + 1, second))
  const column = Number(line.slice(second + 1, third))
  const snippet = line.slice(third + 1)

  if (!file || !Number.isFinite(lineNumber) || !Number.isFinite(column)) {
    return null
  }

  return {
    file,
    line: lineNumber,
    column,
    snippet,
  }
}

export async function executeGitGrep(
  request: NormalizedTextSearchRequest,
  options: SearchRunOptions
): Promise<SearchResponse> {
  const result = await runSearchCommand('git', buildGitGrepArgs(request), options)

  const matches: SearchMatch[] = []
  const files = new Set<string>()

  for (const line of result.stdout.split('\n')) {
    if (!line.trim()) continue
    const match = parseGitGrepLine(line)
    if (!match) continue
    files.add(match.file)
    matches.push(match)
    if (matches.length >= request.maxResults) break
  }

  const warnings: string[] = [
    'Using fallback engine git-grep; output and regex behavior may differ from ripgrep.',
  ]
  if (result.timedOut) warnings.push('Search timed out')
  if (result.truncated) warnings.push('Search output was truncated')
  if (result.exitCode !== 0 && result.exitCode !== 1 && result.stderr.trim()) {
    warnings.push(result.stderr.trim())
  }

  return {
    engine: 'git-grep',
    query: request.query,
    mode: request.mode,
    truncated: result.truncated || matches.length >= request.maxResults,
    stats: {
      durationMs: result.durationMs,
      filesMatched: files.size,
      matchesReturned: matches.length,
    },
    warnings,
    matches,
  }
}

export const GIT_GREP_ENGINE: TextSearchEngine = 'git-grep'
