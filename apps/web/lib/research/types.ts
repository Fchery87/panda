export type ResearchSourceKind =
  | 'web_page'
  | 'web_search'
  | 'github_repo'
  | 'github_directory'
  | 'github_file'
  | 'pdf'

export type ResearchProvider =
  | 'direct_fetch'
  | 'github'
  | 'pdf'
  | 'exa'
  | 'perplexity'
  | 'gemini'
  | 'jina'

export interface ResearchCitation {
  title: string
  url: string
  snippet?: string
}

export interface ResearchSourceRecord {
  sourceId: string
  projectId: string
  chatId?: string
  runId?: string
  kind: ResearchSourceKind
  url: string
  title?: string
  provider?: ResearchProvider
  contentHash: string
  extractedMarkdown?: string
  summary?: string
  citations?: ResearchCitation[]
  metadata?: Record<string, unknown>
  createdAt: number
  updatedAt: number
}

export interface StoreResearchSourceInput {
  projectId: string
  chatId?: string
  runId?: string
  kind: ResearchSourceKind
  url: string
  title?: string
  provider?: ResearchProvider
  extractedMarkdown?: string
  summary?: string
  citations?: ResearchCitation[]
  metadata?: Record<string, unknown>
}

export interface ResearchToolResult {
  sourceId: string
  kind: ResearchSourceKind
  title?: string
  url: string
  summary: string
  contentPreview: string
  truncated: boolean
}
