import { runSearchCommand } from '../runner'
import type {
  NormalizedAstSearchRequest,
  NormalizedTextSearchRequest,
  SearchResponse,
  TextSearchEngine,
} from '../types'
import { executeAstGrep } from './astGrep'
import { executeGitGrep } from './gitGrep'
import { executeGrep } from './grep'
import { executeRipgrep } from './ripgrep'

const availabilityCache = new Map<string, boolean>()

async function isCommandAvailable(command: string, cwd: string): Promise<boolean> {
  const cacheKey = `${cwd}:${command}`
  const cached = availabilityCache.get(cacheKey)
  if (cached !== undefined) return cached

  const result = await runSearchCommand(command, ['--version'], {
    cwd,
    timeoutMs: 1000,
    maxOutputBytes: 8 * 1024,
  })
  const available = result.exitCode === 0
  availabilityCache.set(cacheKey, available)
  return available
}

async function isInsideGitRepo(cwd: string): Promise<boolean> {
  const result = await runSearchCommand('git', ['rev-parse', '--is-inside-work-tree'], {
    cwd,
    timeoutMs: 1000,
    maxOutputBytes: 4 * 1024,
  })
  return result.exitCode === 0 && result.stdout.trim() === 'true'
}

export async function selectTextSearchEngine(cwd: string): Promise<TextSearchEngine> {
  if (await isCommandAvailable('rg', cwd)) return 'ripgrep'

  const gitAvailable = await isCommandAvailable('git', cwd)
  if (gitAvailable && (await isInsideGitRepo(cwd))) return 'git-grep'

  return 'grep'
}

export async function runTextSearch(
  request: NormalizedTextSearchRequest,
  cwd: string
): Promise<SearchResponse> {
  const options = {
    cwd,
    timeoutMs: request.timeoutMs,
  }

  const engine = await selectTextSearchEngine(cwd)
  if (engine === 'ripgrep') {
    return executeRipgrep(request, options)
  }
  if (engine === 'git-grep') {
    return executeGitGrep(request, options)
  }
  return executeGrep(request, options)
}

export async function runAstSearch(
  request: NormalizedAstSearchRequest,
  cwd: string
): Promise<SearchResponse> {
  const astAvailable = await isCommandAvailable('ast-grep', cwd)
  if (!astAvailable) {
    return {
      engine: 'ast-grep',
      query: request.pattern,
      mode: 'ast',
      truncated: false,
      stats: {
        durationMs: 0,
        filesMatched: 0,
        matchesReturned: 0,
      },
      warnings: ['ast-grep is not available in this environment'],
      matches: [],
    }
  }

  return executeAstGrep(request, {
    cwd,
    timeoutMs: request.timeoutMs,
  })
}
