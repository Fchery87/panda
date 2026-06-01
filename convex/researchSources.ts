import { v } from 'convex/values'
import { action, mutation, query } from './_generated/server'
import { api } from './_generated/api'
import type { Id } from './_generated/dataModel'

const ResearchSourceKind = v.union(
  v.literal('web_page'),
  v.literal('web_search'),
  v.literal('github_repo'),
  v.literal('github_directory'),
  v.literal('github_file'),
  v.literal('pdf')
)

const ResearchProvider = v.union(
  v.literal('direct_fetch'),
  v.literal('github'),
  v.literal('pdf'),
  v.literal('exa'),
  v.literal('perplexity'),
  v.literal('gemini'),
  v.literal('jina')
)

const ResearchCitation = v.object({
  title: v.string(),
  url: v.string(),
  snippet: v.optional(v.string()),
})

const SearchProviderInput = v.union(
  v.literal('auto'),
  v.literal('exa'),
  v.literal('perplexity'),
  v.literal('gemini')
)

const RecencyFilter = v.union(
  v.literal('day'),
  v.literal('week'),
  v.literal('month'),
  v.literal('year')
)

type SearchResult = {
  title: string
  url: string
  snippet?: string
}

type SearchPayload = {
  answer: string
  results: SearchResult[]
  provider: 'exa' | 'perplexity' | 'gemini'
}

function configuredProvider(
  requested?: 'auto' | 'exa' | 'perplexity' | 'gemini'
): 'exa' | 'perplexity' | 'gemini' | null {
  if (requested === 'exa') return process.env.EXA_API_KEY ? 'exa' : null
  if (requested === 'perplexity') return process.env.PERPLEXITY_API_KEY ? 'perplexity' : null
  if (requested === 'gemini') return process.env.GEMINI_API_KEY ? 'gemini' : null
  if (process.env.EXA_API_KEY) return 'exa'
  if (process.env.PERPLEXITY_API_KEY) return 'perplexity'
  if (process.env.GEMINI_API_KEY) return 'gemini'
  return null
}

async function searchExa(
  query: string,
  numResults: number,
  domainFilter?: string[]
): Promise<SearchPayload> {
  const key = process.env.EXA_API_KEY
  if (!key) throw new Error('EXA_API_KEY is not configured')
  const includeDomains = domainFilter?.filter((domain) => domain && !domain.startsWith('-'))
  const excludeDomains = domainFilter
    ?.filter((domain) => domain.startsWith('-'))
    .map((domain) => domain.slice(1))
  const res = await fetch('https://api.exa.ai/search', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': key },
    body: JSON.stringify({
      query,
      numResults,
      ...(includeDomains?.length ? { includeDomains } : {}),
      ...(excludeDomains?.length ? { excludeDomains } : {}),
    }),
  })
  if (!res.ok) throw new Error(`Exa search failed with HTTP ${res.status}`)
  const json = (await res.json()) as {
    results?: Array<{ title?: string; url?: string; text?: string; snippet?: string }>
  }
  const results = (json.results ?? [])
    .filter((item) => item.url)
    .map((item) => ({
      title: item.title || item.url!,
      url: item.url!,
      snippet: item.snippet ?? item.text?.slice(0, 300),
    }))
  return { provider: 'exa', answer: `Found ${results.length} Exa result(s) for: ${query}`, results }
}

async function searchPerplexity(query: string, numResults: number): Promise<SearchPayload> {
  const key = process.env.PERPLEXITY_API_KEY
  if (!key) throw new Error('PERPLEXITY_API_KEY is not configured')
  const res = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      model: process.env.PERPLEXITY_SEARCH_MODEL ?? 'sonar',
      messages: [{ role: 'user', content: query }],
      max_tokens: 800,
      return_citations: true,
      search_recency_filter: undefined,
    }),
  })
  if (!res.ok) throw new Error(`Perplexity search failed with HTTP ${res.status}`)
  const json = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>
    citations?: string[]
  }
  const answer = json.choices?.[0]?.message?.content ?? ''
  const results = (json.citations ?? []).slice(0, numResults).map((url) => ({ title: url, url }))
  return { provider: 'perplexity', answer, results }
}

async function searchGemini(query: string, numResults: number): Promise<SearchPayload> {
  const key = process.env.GEMINI_API_KEY
  if (!key) throw new Error('GEMINI_API_KEY is not configured')
  const model = process.env.GEMINI_SEARCH_MODEL ?? 'gemini-2.5-flash'
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `Search/summarize the web for this query and include source URLs when possible. Query: ${query}`,
              },
            ],
          },
        ],
        tools: [{ google_search: {} }],
      }),
    }
  )
  if (!res.ok) throw new Error(`Gemini search failed with HTTP ${res.status}`)
  const json = (await res.json()) as {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> }
      groundingMetadata?: { groundingChunks?: Array<{ web?: { uri?: string; title?: string } }> }
    }>
  }
  const candidate = json.candidates?.[0]
  const answer = candidate?.content?.parts?.map((part) => part.text ?? '').join('\n') ?? ''
  const results = (candidate?.groundingMetadata?.groundingChunks ?? [])
    .map((chunk) => chunk.web)
    .filter((web): web is { uri: string; title?: string } => Boolean(web?.uri))
    .slice(0, numResults)
    .map((web) => ({ title: web.title ?? web.uri, url: web.uri }))
  return { provider: 'gemini', answer, results }
}

async function searchWithProvider(args: {
  provider: 'exa' | 'perplexity' | 'gemini'
  query: string
  numResults: number
  domainFilter?: string[]
}): Promise<SearchPayload> {
  if (args.provider === 'exa')
    return await searchExa(args.query, args.numResults, args.domainFilter)
  if (args.provider === 'perplexity') return await searchPerplexity(args.query, args.numResults)
  return await searchGemini(args.query, args.numResults)
}

function normalizeText(input: string): string {
  return input
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function stripHtml(html: string): string {
  return normalizeText(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<h([1-6])[^>]*>/gi, (_m, level) => `\n${'#'.repeat(Number(level))} `)
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<li[^>]*>/gi, '\n- ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
  )
}

function summarize(input: string, max = 1200): string {
  const text = normalizeText(input)
  return text.length > max ? `${text.slice(0, max).trim()}…` : text
}

function titleFromHtml(html: string, fallback: string): string {
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]
  return summarize(title ? stripHtml(title) : fallback, 200)
}

async function hashText(input: string): Promise<string> {
  const data = new TextEncoder().encode(input)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

async function extractPdfViaJina(url: string): Promise<string | null> {
  try {
    const res = await fetch(`https://r.jina.ai/${url}`, {
      headers: { accept: 'text/markdown', 'x-no-cache': 'true' },
    })
    if (!res.ok) return null
    const text = await res.text()
    const marker = text.indexOf('Markdown Content:')
    const markdown =
      marker >= 0 ? text.slice(marker + 'Markdown Content:'.length).trim() : text.trim()
    return markdown.length > 100 ? markdown : null
  } catch {
    return null
  }
}

export const create = mutation({
  args: {
    projectId: v.id('projects'),
    chatId: v.optional(v.id('chats')),
    runId: v.optional(v.id('agentRuns')),
    kind: ResearchSourceKind,
    url: v.string(),
    title: v.optional(v.string()),
    provider: v.optional(ResearchProvider),
    contentHash: v.string(),
    extractedMarkdown: v.optional(v.string()),
    summary: v.optional(v.string()),
    citations: v.optional(v.array(ResearchCitation)),
    metadata: v.optional(v.record(v.string(), v.any())),
  },
  handler: async (ctx, args): Promise<Id<'researchSources'>> => {
    const now = Date.now()
    return await ctx.db.insert('researchSources', { ...args, createdAt: now, updatedAt: now })
  },
})

export const get = query({
  args: { sourceId: v.id('researchSources') },
  handler: async (ctx, { sourceId }) => await ctx.db.get(sourceId),
})

export const listByProject = query({
  args: {
    projectId: v.id('projects'),
    chatId: v.optional(v.id('chats')),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { projectId, chatId, limit }) => {
    const rows = await ctx.db
      .query('researchSources')
      .withIndex('by_project_created', (q) => q.eq('projectId', projectId))
      .order('desc')
      .take(Math.min(Math.max(limit ?? 50, 1), 200))
    return chatId ? rows.filter((row) => row.chatId === chatId) : rows
  },
})

export const searchWeb = action({
  args: {
    projectId: v.id('projects'),
    chatId: v.optional(v.id('chats')),
    query: v.optional(v.string()),
    queries: v.optional(v.array(v.string())),
    provider: v.optional(SearchProviderInput),
    numResults: v.optional(v.number()),
    includeContent: v.optional(v.boolean()),
    recencyFilter: v.optional(RecencyFilter),
    domainFilter: v.optional(v.array(v.string())),
  },
  handler: async (
    ctx,
    args
  ): Promise<{
    status: 'ok' | 'error' | 'provider_not_configured'
    provider?: 'exa' | 'perplexity' | 'gemini'
    responseId?: string
    sourceIds: string[]
    queryResults?: Array<{
      query: string
      answer: string
      provider: 'exa' | 'perplexity' | 'gemini'
      sourceId: string
      sources: Array<{ title: string; url: string; snippet?: string }>
    }>
    message?: string
    requestedProvider?: string
    error?: string
  }> => {
    const queries = (args.queries?.length ? args.queries : args.query ? [args.query] : [])
      .map((query) => query.trim())
      .filter(Boolean)
      .slice(0, 4)
    if (queries.length === 0) {
      return { status: 'error', error: 'No query provided. Use query or queries.', sourceIds: [] }
    }

    const provider = configuredProvider(args.provider)
    if (!provider) {
      return {
        status: 'provider_not_configured',
        message:
          'Configure EXA_API_KEY, PERPLEXITY_API_KEY, or GEMINI_API_KEY in Convex environment variables to enable research_web_search.',
        requestedProvider: args.provider ?? 'auto',
        sourceIds: [],
      }
    }

    const numResults = Math.min(Math.max(Math.floor(args.numResults ?? 5), 1), 10)
    const queryResults: Array<{
      query: string
      answer: string
      provider: 'exa' | 'perplexity' | 'gemini'
      sourceId: string
      sources: Array<{ title: string; url: string; snippet?: string }>
    }> = []
    const sourceIds: string[] = []

    for (const query of queries) {
      const payload = await searchWithProvider({
        provider,
        query,
        numResults,
        domainFilter: args.domainFilter,
      })
      const citations = payload.results.map((result) => ({
        title: result.title,
        url: result.url,
        snippet: result.snippet,
      }))
      const markdown = [
        `# Web search: ${query}`,
        '',
        payload.answer,
        '',
        '## Sources',
        ...payload.results.map(
          (result, index) =>
            `${index + 1}. [${result.title}](${result.url})${result.snippet ? ` — ${result.snippet}` : ''}`
        ),
      ].join('\n')
      const sourceId = (await ctx.runMutation(api.researchSources.create, {
        projectId: args.projectId,
        chatId: args.chatId,
        kind: 'web_search' as const,
        url: `search:${query}`,
        title: `Web search: ${query}`,
        provider: payload.provider,
        contentHash: await hashText(markdown),
        extractedMarkdown: markdown,
        summary: payload.answer.slice(0, 1200),
        citations,
        metadata: {
          query,
          numResults,
          includeContent: args.includeContent === true,
          recencyFilter: args.recencyFilter,
          domainFilter: args.domainFilter,
        },
      })) as Id<'researchSources'>
      sourceIds.push(sourceId)

      if (args.includeContent === true) {
        for (const result of payload.results.slice(0, Math.min(3, numResults))) {
          try {
            const parsed = new URL(result.url)
            if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') continue
            const res = await fetch(parsed.toString(), {
              headers: { accept: 'text/html, text/plain, */*;q=0.5' },
            })
            if (!res.ok) continue
            const contentType = res.headers.get('content-type') ?? ''
            const raw = await res.text()
            const markdown = contentType.includes('html') ? stripHtml(raw) : normalizeText(raw)
            const pageTitle = contentType.includes('html')
              ? titleFromHtml(raw, result.title)
              : result.title
            const pageSourceId = await ctx.runMutation(api.researchSources.create, {
              projectId: args.projectId,
              chatId: args.chatId,
              kind: 'web_page' as const,
              url: parsed.toString(),
              title: pageTitle,
              provider: 'direct_fetch' as const,
              contentHash: await hashText(markdown),
              extractedMarkdown: markdown,
              summary: summarize(markdown),
              citations: [{ title: result.title, url: result.url, snippet: result.snippet }],
              metadata: { parentSearchSourceId: sourceId, query },
            })
            sourceIds.push(pageSourceId)
          } catch {
            // Individual result fetches are best-effort; the search source remains useful.
          }
        }
      }

      queryResults.push({
        query,
        answer: payload.answer,
        provider: payload.provider,
        sourceId,
        sources: citations,
      })
    }

    return { status: 'ok', provider, responseId: sourceIds[0] ?? '', sourceIds, queryResults }
  },
})

export const fetchUrl = action({
  args: {
    projectId: v.id('projects'),
    chatId: v.optional(v.id('chats')),
    url: v.string(),
    timeoutMs: v.optional(v.number()),
  },
  handler: async (
    ctx,
    args
  ): Promise<
    | {
        status: 'ok'
        sourceId: string
        kind: string
        title: string
        url: string
        summary: string
        contentPreview: string
        truncated: boolean
      }
    | { status: 'error'; error: string }
  > => {
    try {
      const parsed = new URL(args.url)
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:')
        throw new Error('Only http(s) URLs are supported')
      const controller = new AbortController()
      const timer = setTimeout(
        () => controller.abort(),
        Math.min(Math.max(args.timeoutMs ?? 30000, 1000), 60000)
      )
      try {
        const res = await fetch(parsed.toString(), {
          signal: controller.signal,
          headers: { accept: 'text/html, text/plain, application/pdf;q=0.8, */*;q=0.5' },
        })
        if (!res.ok) throw new Error(`Fetch failed with HTTP ${res.status}`)
        const contentType = res.headers.get('content-type') ?? ''
        const isPdf =
          contentType.includes('application/pdf') || parsed.pathname.toLowerCase().endsWith('.pdf')
        const raw = isPdf ? '' : await res.text()
        const pdfMarkdown = isPdf ? await extractPdfViaJina(parsed.toString()) : null
        const markdown = isPdf
          ? (pdfMarkdown ??
            '[PDF extraction unavailable]\n\nPanda stored this PDF URL as a research source, but text extraction did not return usable content. The original URL remains available for citation.')
          : contentType.includes('html')
            ? stripHtml(raw)
            : normalizeText(raw)
        const title = isPdf
          ? parsed.pathname.split('/').pop() || parsed.toString()
          : contentType.includes('html')
            ? titleFromHtml(raw, parsed.hostname)
            : parsed.pathname.split('/').pop() || parsed.hostname
        const kind = isPdf ? ('pdf' as const) : ('web_page' as const)
        const sourceId = await ctx.runMutation(api.researchSources.create, {
          projectId: args.projectId,
          chatId: args.chatId,
          kind,
          url: parsed.toString(),
          title,
          provider: isPdf ? ('pdf' as const) : ('direct_fetch' as const),
          contentHash: await hashText(markdown),
          extractedMarkdown: markdown,
          summary: summarize(markdown),
        })
        const contentPreview = summarize(markdown, 6000)
        return {
          status: 'ok',
          sourceId,
          kind,
          title,
          url: parsed.toString(),
          summary: summarize(markdown),
          contentPreview,
          truncated: markdown.length > contentPreview.length,
        }
      } finally {
        clearTimeout(timer)
      }
    } catch (error) {
      return {
        status: 'error',
        error: error instanceof Error ? error.message : 'Failed to fetch URL',
      }
    }
  },
})

function parseGitHubUrl(url: string): {
  owner: string
  repo: string
  ref?: string
  path?: string
  mode: 'repo' | 'tree' | 'blob'
} | null {
  const parsed = new URL(url)
  if (parsed.hostname !== 'github.com') return null
  const parts = parsed.pathname.split('/').filter(Boolean)
  if (parts.length < 2) return null
  const [owner, repo, marker, ref, ...rest] = parts
  if (marker === 'blob' || marker === 'tree')
    return { owner, repo, ref, path: rest.join('/'), mode: marker }
  return { owner, repo, mode: 'repo' }
}

async function githubApi(path: string): Promise<unknown> {
  const res = await fetch(`https://api.github.com${path}`, {
    headers: { accept: 'application/vnd.github+json' },
  })
  if (!res.ok) throw new Error(`GitHub API failed with HTTP ${res.status}`)
  return await res.json()
}

export const fetchGithub = action({
  args: { projectId: v.id('projects'), chatId: v.optional(v.id('chats')), url: v.string() },
  handler: async (
    ctx,
    args
  ): Promise<
    | {
        status: 'ok'
        sourceId: string
        kind: string
        title: string
        url: string
        summary: string
        contentPreview: string
        truncated: boolean
      }
    | { status: 'error'; error: string }
  > => {
    try {
      const info = parseGitHubUrl(args.url)
      if (!info) throw new Error('Expected a github.com repository, tree, or blob URL')
      let kind: 'github_repo' | 'github_directory' | 'github_file'
      let title: string
      let markdown: string
      if (info.mode === 'blob' && info.path) {
        const ref = info.ref ?? 'HEAD'
        const rawUrl = `https://raw.githubusercontent.com/${info.owner}/${info.repo}/${ref}/${info.path}`
        const res = await fetch(rawUrl)
        if (!res.ok) throw new Error(`GitHub raw fetch failed with HTTP ${res.status}`)
        markdown = await res.text()
        kind = 'github_file'
        title = `${info.owner}/${info.repo}/${info.path}`
      } else {
        const repo = (await githubApi(`/repos/${info.owner}/${info.repo}`)) as {
          default_branch?: string
          description?: string
          full_name?: string
        }
        const ref = info.ref ?? repo.default_branch ?? 'main'
        const tree = (await githubApi(
          `/repos/${info.owner}/${info.repo}/git/trees/${ref}?recursive=1`
        )) as { tree?: Array<{ path: string; type: string; size?: number }> }
        let readme = ''
        try {
          const res = await fetch(
            `https://raw.githubusercontent.com/${info.owner}/${info.repo}/${ref}/README.md`
          )
          if (res.ok) readme = await res.text()
        } catch {
          readme = ''
        }
        const paths = (tree.tree ?? [])
          .slice(0, 300)
          .map(
            (item) =>
              `${item.type === 'tree' ? 'dir ' : 'file'} ${item.path}${item.size ? ` (${item.size} bytes)` : ''}`
          )
        kind = info.mode === 'tree' ? 'github_directory' : 'github_repo'
        title = repo.full_name ?? `${info.owner}/${info.repo}`
        markdown = [
          `# ${title}`,
          repo.description ?? '',
          info.path ? `Directory focus: ${info.path}` : '',
          '## README',
          readme || '(README.md not found)',
          '## Tree preview',
          paths.join('\n'),
        ].join('\n\n')
      }
      const sourceId = await ctx.runMutation(api.researchSources.create, {
        projectId: args.projectId,
        chatId: args.chatId,
        kind,
        url: args.url,
        title,
        provider: 'github',
        contentHash: await hashText(markdown),
        extractedMarkdown: markdown,
        summary: summarize(markdown),
      })
      const contentPreview = summarize(markdown, 6000)
      return {
        status: 'ok',
        sourceId,
        kind,
        title,
        url: args.url,
        summary: summarize(markdown),
        contentPreview,
        truncated: markdown.length > contentPreview.length,
      }
    } catch (error) {
      return {
        status: 'error',
        error: error instanceof Error ? error.message : 'Failed to fetch GitHub source',
      }
    }
  },
})
