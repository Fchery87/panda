import type {
  NormalizedTextSearchRequest,
  SearchMatch,
  SearchResponse,
  SearchRunOptions,
  TextSearchEngine,
} from '../types'
import { runSearchCommand } from '../runner'

export function buildGrepArgs(request: NormalizedTextSearchRequest): string[] {
  const args = ['-R', '--line-number', '-I', '--binary-files=without-match']

  if (request.mode === 'literal') {
    args.push('-F')
  } else {
    args.push('-E')
  }

  if (!request.caseSensitive) {
    args.push('-i')
  }

  args.push('-m', String(request.maxMatchesPerFile))

  for (const glob of request.includeGlobs) {
    args.push('--include', glob)
  }
  for (const glob of request.excludeGlobs) {
    args.push('--exclude', glob)
  }

  args.push(request.query)
  args.push(...request.paths)

  return args
}

function parseGrepLine(line: string): SearchMatch | null {
  // format: path:line:content
  const first = line.indexOf(':')
  if (first <= 0) return null
  const second = line.indexOf(':', first + 1)
  if (second <= first) return null

  const file = line.slice(0, first)
  const lineNumber = Number(line.slice(first + 1, second))
  const snippet = line.slice(second + 1)

  if (!file || !Number.isFinite(lineNumber)) return null

  return {
    file,
    line: lineNumber,
    column: 1,
    snippet,
  }
}

export async function executeGrep(
  request: NormalizedTextSearchRequest,
  options: SearchRunOptions
): Promise<SearchResponse> {
  const result = await runSearchCommand('grep', buildGrepArgs(request), options)

  const matches: SearchMatch[] = []
  const files = new Set<string>()

  for (const line of result.stdout.split('\n')) {
    if (!line.trim()) continue
    const match = parseGrepLine(line)
    if (!match) continue
    files.add(match.file)
    matches.push(match)
    if (matches.length >= request.maxResults) break
  }

  const warnings: string[] = [
    'Using fallback engine grep; results may be less precise than ripgrep.',
  ]
  if (result.timedOut) warnings.push('Search timed out')
  if (result.truncated) warnings.push('Search output was truncated')
  if (result.exitCode !== 0 && result.exitCode !== 1 && result.stderr.trim()) {
    warnings.push(result.stderr.trim())
  }

  return {
    engine: 'grep',
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

export const GREP_ENGINE: TextSearchEngine = 'grep'
