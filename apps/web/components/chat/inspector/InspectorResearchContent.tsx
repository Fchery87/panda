'use client'

import { useState } from 'react'
import { useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import { Check, Copy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function InspectorResearchContent({
  projectId,
  chatId,
}: {
  projectId: Id<'projects'>
  chatId: Id<'chats'> | null | undefined
}) {
  const [copiedSourceId, setCopiedSourceId] = useState<string | null>(null)
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null)
  const sources = useQuery(api.researchSources.listByProject, {
    projectId,
    ...(chatId ? { chatId } : {}),
    limit: 50,
  }) as
    | Array<{
        _id: string
        kind: string
        url: string
        title?: string
        provider?: string
        summary?: string
        createdAt: number
      }>
    | undefined
  const selectedSource = useQuery(
    api.researchSources.get,
    selectedSourceId ? { sourceId: selectedSourceId as Id<'researchSources'> } : 'skip'
  ) as
    | {
        _id: string
        kind: string
        url: string
        title?: string
        provider?: string
        summary?: string
        extractedMarkdown?: string
        createdAt: number
      }
    | null
    | undefined

  const copyText = (sourceId: string, text: string) => {
    void navigator.clipboard?.writeText(text)
    setCopiedSourceId(sourceId)
    window.setTimeout(() => setCopiedSourceId(null), 1200)
  }

  return (
    <div className="m-0 grid h-[420px] grid-cols-1 overflow-hidden border border-border bg-background md:grid-cols-[minmax(0,1fr)_minmax(280px,0.9fr)]">
      <div className="min-h-0 overflow-y-auto p-3">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Research sources
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              External web, search, GitHub, and PDF sources captured for this chat/project.
            </p>
          </div>
          <div className="border border-border px-2 py-1 font-mono text-[10px] uppercase text-muted-foreground">
            {sources ? sources.length : '…'} sources
          </div>
        </div>

        {!sources ? (
          <div className="bg-muted/20 border border-border p-3 text-xs text-muted-foreground">
            Loading research sources…
          </div>
        ) : sources.length === 0 ? (
          <div className="bg-muted/10 border border-dashed border-border p-4 text-xs text-muted-foreground">
            No research sources yet. Ask Panda to fetch a URL, inspect a GitHub repo, or run web
            research.
          </div>
        ) : (
          <div className="space-y-2">
            {sources.map((source) => (
              <div
                key={source._id}
                className={cn(
                  'cursor-pointer border bg-card p-3 transition-colors',
                  selectedSourceId === source._id
                    ? 'border-primary/60'
                    : 'hover:border-primary/30 border-border'
                )}
                onClick={() => setSelectedSourceId(source._id)}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="border-primary/30 bg-primary/5 border px-1.5 py-0.5 font-mono text-[10px] uppercase text-primary">
                      {source.kind.replace('_', ' ')}
                    </span>
                    {source.provider ? (
                      <span className="border border-border px-1.5 py-0.5 font-mono text-[10px] uppercase text-muted-foreground">
                        {source.provider}
                      </span>
                    ) : null}
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {new Date(source.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 rounded-none px-2 font-mono text-[10px] uppercase tracking-[0.14em]"
                    onClick={(event) => {
                      event.stopPropagation()
                      copyText(
                        source._id,
                        `[${source.title ?? source.url}](${source.url}) — source:${source._id}`
                      )
                    }}
                  >
                    {copiedSourceId === source._id ? (
                      <Check className="mr-1 h-3 w-3" />
                    ) : (
                      <Copy className="mr-1 h-3 w-3" />
                    )}
                    Copy cite
                  </Button>
                </div>
                <div className="mt-2 text-sm font-medium text-foreground [overflow-wrap:anywhere]">
                  {source.title ?? source.url}
                </div>
                {source.summary ? (
                  <p className="mt-1 line-clamp-3 text-xs leading-relaxed text-muted-foreground">
                    {source.summary}
                  </p>
                ) : null}
                <a
                  href={source.url.startsWith('search:') ? undefined : source.url}
                  target="_blank"
                  rel="noreferrer"
                  className={cn(
                    'mt-2 block font-mono text-[11px] [overflow-wrap:anywhere]',
                    source.url.startsWith('search:')
                      ? 'pointer-events-none text-muted-foreground'
                      : 'text-primary hover:underline'
                  )}
                  onClick={(event) => event.stopPropagation()}
                >
                  {source.url}
                </a>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-muted/10 min-h-0 overflow-y-auto border-t border-border p-3 md:border-l md:border-t-0">
        {!selectedSourceId ? (
          <div className="bg-background/60 border border-dashed border-border p-4 text-xs text-muted-foreground">
            Select a research source to inspect extracted content, summary, and copy reusable
            context.
          </div>
        ) : !selectedSource ? (
          <div className="bg-background/60 border border-border p-3 text-xs text-muted-foreground">
            Loading source detail…
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                Source detail
              </div>
              <h3 className="mt-1 text-sm font-semibold text-foreground [overflow-wrap:anywhere]">
                {selectedSource.title ?? selectedSource.url}
              </h3>
              <div className="mt-2 flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 rounded-none px-2 font-mono text-[10px] uppercase tracking-[0.14em]"
                  onClick={() =>
                    copyText(
                      selectedSource._id,
                      `[${selectedSource.title ?? selectedSource.url}](${selectedSource.url}) — source:${selectedSource._id}`
                    )
                  }
                >
                  <Copy className="mr-1 h-3 w-3" /> Copy citation
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 rounded-none px-2 font-mono text-[10px] uppercase tracking-[0.14em]"
                  onClick={() =>
                    copyText(
                      selectedSource._id,
                      `SOURCE_ID: ${selectedSource._id}\nSOURCE_URL: ${selectedSource.url}\nTRUST_LEVEL: untrusted_external_content\n\n${selectedSource.extractedMarkdown ?? selectedSource.summary ?? ''}`
                    )
                  }
                >
                  <Copy className="mr-1 h-3 w-3" /> Copy content
                </Button>
              </div>
            </div>
            {selectedSource.summary ? (
              <div className="border border-border bg-background p-2">
                <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                  Summary
                </div>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {selectedSource.summary}
                </p>
              </div>
            ) : null}
            <div className="border border-border bg-background p-2">
              <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                Extracted preview
              </div>
              <pre className="max-h-56 overflow-auto whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-muted-foreground [overflow-wrap:anywhere]">
                {(
                  selectedSource.extractedMarkdown ??
                  selectedSource.summary ??
                  'No extracted content stored.'
                ).slice(0, 8000)}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
