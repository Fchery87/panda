'use client'

import { useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import { FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { buildWorkflowArtifactMaterializationDraft } from '@/lib/agent/workflow'

type WorkflowArtifactView = {
  _id: string
  kind: string
  title: string
  status: string
  sourceStage: string
  content: string
  createdAt: number
}

function labelForKind(kind: string): string {
  return kind
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

export function WorkflowArtifactList({
  artifacts,
  chatId,
}: {
  artifacts: WorkflowArtifactView[]
  chatId?: string
}) {
  if (artifacts.length === 0) {
    return (
      <div className="bg-background/70 border border-border p-3 text-xs text-muted-foreground">
        No workflow artifacts yet.
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {artifacts.map((artifact) => {
        const materialized = buildWorkflowArtifactMaterializationDraft({
          chatId: chatId ?? 'chat',
          artifactId: artifact._id,
          kind: artifact.kind,
          title: artifact.title,
          content: artifact.content,
          createdAt: artifact.createdAt,
        })
        return (
          <article key={artifact._id} className="bg-background/80 border border-border p-3 text-xs">
            <div className="flex items-start gap-2">
              <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="truncate font-medium text-foreground">{artifact.title}</h4>
                  <span className="bg-muted/40 border border-border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
                    {labelForKind(artifact.kind)}
                  </span>
                  <span
                    className={cn(
                      'border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide',
                      artifact.status === 'failed'
                        ? 'border-destructive/30 text-destructive'
                        : artifact.status === 'approved'
                          ? 'border-primary/30 text-primary'
                          : 'border-border text-muted-foreground'
                    )}
                  >
                    {artifact.status}
                  </span>
                </div>
                <div className="mt-1 font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
                  Stage · {artifact.sourceStage}
                </div>
                <p className="mt-2 line-clamp-3 whitespace-pre-wrap text-muted-foreground">
                  {artifact.content}
                </p>
                <div className="bg-muted/20 mt-2 border border-dashed border-border p-2 font-mono text-[10px] text-muted-foreground">
                  Optional materialized path: {materialized.path}
                </div>
                <div className="mt-2 flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 rounded-none font-mono text-[10px] uppercase tracking-wide"
                    onClick={() => navigator.clipboard?.writeText(materialized.content)}
                  >
                    Copy Markdown
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 rounded-none font-mono text-[10px] uppercase tracking-wide"
                    onClick={() => navigator.clipboard?.writeText(materialized.path)}
                  >
                    Copy Path
                  </Button>
                </div>
              </div>
            </div>
          </article>
        )
      })}
    </div>
  )
}

export function WorkflowArtifactsPanel({ chatId }: { chatId?: Id<'chats'> | null }) {
  const artifacts = useQuery(api.workflowArtifacts.listByChat, chatId ? { chatId } : 'skip') as
    | WorkflowArtifactView[]
    | undefined

  return (
    <section className="space-y-2">
      <div className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
        Workflow artifacts
      </div>
      <WorkflowArtifactList
        artifacts={artifacts ?? []}
        chatId={chatId ? String(chatId) : undefined}
      />
    </section>
  )
}
