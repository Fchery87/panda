export type SearchMode = 'literal' | 'regex'
export type JsonStyle = 'pretty' | 'stream' | 'compact'

export type TextSearchEngine = 'ripgrep' | 'git-grep' | 'grep'
export type SearchEngine = TextSearchEngine | 'ast-grep'

export interface SearchMatch {
  file: string
  line: number
  column: number
  endLine?: number
  endColumn?: number
  snippet: string
  submatches?: Array<{ start: number; end: number; text?: string }>
}

export interface SearchStats {
  durationMs: number
  filesScanned?: number
  filesMatched: number
  matchesReturned: number
}

export interface SearchResponse {
  engine: SearchEngine
  query: string
  mode: 'literal' | 'regex' | 'ast'
  truncated: boolean
  stats: SearchStats
  warnings: string[]
  matches: SearchMatch[]
}

export interface TextSearchRequest {
  type: 'text'
  query: string
  mode?: SearchMode
  caseSensitive?: boolean
  includeGlobs?: string[]
  excludeGlobs?: string[]
  paths?: string[]
  maxResults?: number
  maxMatchesPerFile?: number
  contextLines?: number
  timeoutMs?: number
}

export interface AstSearchRequest {
  type: 'ast'
  pattern: string
  language?: string
  paths?: string[]
  maxResults?: number
  timeoutMs?: number
  jsonStyle?: JsonStyle
}

export type SearchRequest = TextSearchRequest | AstSearchRequest

export interface NormalizedTextSearchRequest {
  type: 'text'
  query: string
  mode: SearchMode
  caseSensitive: boolean
  includeGlobs: string[]
  excludeGlobs: string[]
  paths: string[]
  maxResults: number
  maxMatchesPerFile: number
  contextLines: number
  timeoutMs: number
}

export interface NormalizedAstSearchRequest {
  type: 'ast'
  pattern: string
  language?: string
  paths: string[]
  maxResults: number
  timeoutMs: number
  jsonStyle: JsonStyle
}

export interface RunnerResult {
  stdout: string
  stderr: string
  exitCode: number
  durationMs: number
  timedOut: boolean
  truncated: boolean
}

export interface SearchRunOptions {
  cwd: string
  timeoutMs: number
  maxOutputBytes?: number
}
