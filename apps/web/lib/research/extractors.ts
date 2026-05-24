import { normalizeWhitespace, previewResearchContent, summarizeResearchContent } from './source-guard'
import type { ResearchSourceKind, ResearchToolResult } from './types'

function stripHtml(html: string): string {
  return normalizeWhitespace(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, '')
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

function titleFromHtml(html: string, fallback: string): string {
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]
  return normalizeWhitespace(title ? stripHtml(title) : fallback).slice(0, 200) || fallback
}

function ensureHttpUrl(url: string): URL {
  const parsed = new URL(url)
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('Only http(s) URLs are supported')
  }
  return parsed
}

export async function extractUrlContent(url: string, timeoutMs = 30000): Promise<{
  kind: ResearchSourceKind
  url: string
  title: string
  markdown: string
  summary: string
}> {
  const parsed = ensureHttpUrl(url)
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(parsed.toString(), {
      signal: controller.signal,
      headers: { Accept: 'text/html, text/plain, application/pdf;q=0.8, */*;q=0.5' },
    })
    if (!res.ok) throw new Error(`Fetch failed with HTTP ${res.status}`)
    const contentType = res.headers.get('content-type') ?? ''
    const text = await res.text()
    const isPdf = contentType.includes('application/pdf') || parsed.pathname.toLowerCase().endsWith('.pdf')
    if (isPdf) {
      const markdown = '[PDF extraction placeholder]\n\nPanda fetched this PDF URL, but browser-side PDF text extraction is not enabled in this runtime slice yet. Use the source URL as the citation and implement server-side PDF extraction in Phase 5.'
      return { kind: 'pdf', url: parsed.toString(), title: parsed.pathname.split('/').pop() || parsed.toString(), markdown, summary: summarizeResearchContent(markdown) }
    }
    const markdown = contentType.includes('html') ? stripHtml(text) : normalizeWhitespace(text)
    return {
      kind: 'web_page',
      url: parsed.toString(),
      title: contentType.includes('html') ? titleFromHtml(text, parsed.hostname) : parsed.pathname.split('/').pop() || parsed.hostname,
      markdown,
      summary: summarizeResearchContent(markdown),
    }
  } finally {
    clearTimeout(timer)
  }
}

function parseGitHubUrl(url: string): { owner: string; repo: string; ref?: string; path?: string; mode: 'repo' | 'tree' | 'blob' } | null {
  const parsed = ensureHttpUrl(url)
  if (parsed.hostname !== 'github.com') return null
  const parts = parsed.pathname.split('/').filter(Boolean)
  if (parts.length < 2) return null
  const [owner, repo, marker, ref, ...rest] = parts
  if (marker === 'blob' || marker === 'tree') return { owner, repo, ref, path: rest.join('/'), mode: marker }
  return { owner, repo, mode: 'repo' }
}

async function githubApi(path: string): Promise<unknown> {
  const res = await fetch(`https://api.github.com${path}`, { headers: { Accept: 'application/vnd.github+json' } })
  if (!res.ok) throw new Error(`GitHub API failed with HTTP ${res.status}`)
  return res.json()
}

export async function extractGitHubContent(url: string): Promise<{
  kind: ResearchSourceKind
  url: string
  title: string
  markdown: string
  summary: string
}> {
  const info = parseGitHubUrl(url)
  if (!info) throw new Error('Expected a github.com repository, tree, or blob URL')
  if (info.mode === 'blob' && info.path) {
    const ref = info.ref ?? 'HEAD'
    const rawUrl = `https://raw.githubusercontent.com/${info.owner}/${info.repo}/${ref}/${info.path}`
    const res = await fetch(rawUrl)
    if (!res.ok) throw new Error(`GitHub raw fetch failed with HTTP ${res.status}`)
    const markdown = await res.text()
    return { kind: 'github_file', url, title: `${info.owner}/${info.repo}/${info.path}`, markdown, summary: summarizeResearchContent(markdown) }
  }

  const repo = (await githubApi(`/repos/${info.owner}/${info.repo}`)) as { default_branch?: string; description?: string; full_name?: string; html_url?: string }
  const ref = info.ref ?? repo.default_branch ?? 'main'
  const tree = (await githubApi(`/repos/${info.owner}/${info.repo}/git/trees/${ref}?recursive=1`)) as { tree?: Array<{ path: string; type: string; size?: number }> }
  const paths = (tree.tree ?? []).slice(0, 300).map((item) => `${item.type === 'tree' ? 'dir ' : 'file'} ${item.path}${item.size ? ` (${item.size} bytes)` : ''}`)
  let readme = ''
  try {
    const readmeRes = await fetch(`https://raw.githubusercontent.com/${info.owner}/${info.repo}/${ref}/README.md`)
    if (readmeRes.ok) readme = await readmeRes.text()
  } catch {
    // README is optional; the tree preview still provides useful repo context.
  }
  const pathFilter = info.mode === 'tree' && info.path ? `\n\nDirectory focus: ${info.path}\n` : ''
  const markdown = [`# ${repo.full_name ?? `${info.owner}/${info.repo}`}`, repo.description ?? '', pathFilter, '## README', readme || '(README.md not found)', '## Tree preview', paths.join('\n')].join('\n\n')
  return { kind: info.mode === 'tree' ? 'github_directory' : 'github_repo', url, title: repo.full_name ?? `${info.owner}/${info.repo}`, markdown, summary: summarizeResearchContent(markdown) }
}

export function toResearchToolResult(args: { sourceId: string; kind: ResearchSourceKind; title?: string; url: string; markdown: string; summary: string }): ResearchToolResult {
  const { preview, truncated } = previewResearchContent(args.markdown)
  return { sourceId: args.sourceId, kind: args.kind, title: args.title, url: args.url, summary: args.summary, contentPreview: preview, truncated }
}
