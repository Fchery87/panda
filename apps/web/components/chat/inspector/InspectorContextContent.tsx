'use client'

import { useMutation, useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import type { PersistedRunEventSummaryInfo } from '@/components/chat/types'
import { Button } from '@/components/ui/button'
import { isProjectRulePath, parseProjectRuleFile } from '@/lib/agent/project-rules'

export function InspectorContextContent({
  projectId,
  runEvents,
}: {
  projectId: Id<'projects'>
  runEvents?: PersistedRunEventSummaryInfo[]
}) {
  const contextEvents = (runEvents ?? []).filter(
    (event) => event.type === 'context_pack' || event.progressCategory === 'context'
  )
  const latest = contextEvents.at(-1)
  const stats = useQuery(api.contextChunks.stats, { projectId })
  const fileMetadata = useQuery(api.files.listMetadata, { projectId })
  const rulePaths = (fileMetadata ?? [])
    .map((file) => file.path)
    .filter(isProjectRulePath)
    .slice(0, 8)
  const ruleFiles = useQuery(
    api.files.batchGet,
    rulePaths.length > 0 ? { projectId, paths: rulePaths } : 'skip'
  )
  const projectRules = (ruleFiles ?? [])
    .filter((file) => file.exists && typeof file.content === 'string')
    .map((file) => parseProjectRuleFile({ path: file.path, content: file.content ?? '' }))
  const rebuildProject = useMutation(api.contextChunks.rebuildProject)
  const purgeProject = useMutation(api.contextChunks.purgeProject)

  return (
    <div className="m-0 space-y-3">
      <div className="grid grid-cols-3 gap-1.5">
        <div className="bg-background/70 border border-border px-3 py-2">
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Packs
          </div>
          <div className="mt-1 text-xs font-medium text-foreground">{contextEvents.length}</div>
        </div>
        <div className="bg-background/70 border border-border px-3 py-2">
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Status
          </div>
          <div className="mt-1 text-xs font-medium text-foreground">
            {latest?.status ?? 'Not built'}
          </div>
        </div>
        <div className="bg-background/70 border border-border px-3 py-2">
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Source
          </div>
          <div className="mt-1 text-xs font-medium text-foreground">Convex</div>
        </div>
      </div>

      <div className="bg-background/80 border border-border">
        <div className="surface-1 flex items-center justify-between border-b border-border px-3 py-2">
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Index maintenance
          </div>
          <div className="flex gap-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 font-mono text-[10px]"
              onClick={() => void rebuildProject({ projectId })}
            >
              Rebuild
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 font-mono text-[10px]"
              onClick={() => void purgeProject({ projectId })}
            >
              Purge
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-1.5 p-3">
          <div className="bg-background/70 border border-border px-2 py-2">
            <div className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
              Chunks
            </div>
            <div className="mt-1 text-xs font-medium text-foreground">
              {stats?.chunkCount ?? '—'}
            </div>
          </div>
          <div className="bg-background/70 border border-border px-2 py-2">
            <div className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
              Tokens
            </div>
            <div className="mt-1 text-xs font-medium text-foreground">
              {stats?.tokenCount ?? '—'}
            </div>
          </div>
          <div className="bg-background/70 border border-border px-2 py-2">
            <div className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
              Sources
            </div>
            <div className="mt-1 text-xs font-medium text-foreground">
              {stats ? Object.keys(stats.bySourceType).length : '—'}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-background/80 border border-border">
        <div className="surface-1 border-b border-border px-3 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          Project rules
        </div>
        <div className="space-y-2 p-3">
          {projectRules.length > 0 ? (
            projectRules.map((rule) => (
              <div key={rule.path} className="bg-background/70 border border-border p-2">
                <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                  {rule.path}
                </div>
                <p className="mt-1 text-xs leading-relaxed text-foreground">
                  {rule.description ?? rule.content.slice(0, 140)}
                </p>
                <div className="mt-2 font-mono text-[10px] text-muted-foreground">
                  {rule.alwaysApply ? 'Always apply' : rule.globs.join(', ') || 'No matching globs'}
                </div>
              </div>
            ))
          ) : (
            <p className="font-mono text-xs text-muted-foreground">
              Checked-in project rules from .panda/rules/*.md will appear here.
            </p>
          )}
        </div>
      </div>

      <div className="bg-background/80 border border-border">
        <div className="surface-1 border-b border-border px-3 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          Retrieval audit
        </div>
        <div className="space-y-2 p-3">
          {contextEvents.length > 0 ? (
            contextEvents.map((event) => (
              <div
                key={event._id ?? `${event.type}-${event.createdAt}`}
                className="bg-background/70 border border-border p-2"
              >
                <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                  {event.createdAt
                    ? new Date(event.createdAt).toLocaleTimeString()
                    : 'Context Pack'}
                </div>
                <p className="mt-1 text-xs leading-relaxed text-foreground">
                  {event.contentPreview ?? 'Context pack was assembled for this run.'}
                </p>
              </div>
            ))
          ) : (
            <p className="font-mono text-xs text-muted-foreground">
              Retrieved context pack audits will appear here after a run starts.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
