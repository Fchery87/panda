'use client'

import { useEffect, useState } from 'react'
import { FileText, GitBranch, ListChecks, Pencil, Eye, Save } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Button } from '@/components/ui/button'
import type { WorkspaceOpenTab } from '@/contexts/WorkspaceContext'
import type { GeneratedPlanArtifact } from '@/lib/planning/types'
import { createWorkspacePlanTabRef } from '@/lib/planning/types'
import { cn } from '@/lib/utils'

export interface PlanArtifactTabProps {
  artifact: GeneratedPlanArtifact
  onApprove?: () => void
  onBuildFromPlan?: () => void
  onPlanDraftChange?: (markdown: string) => void
  onSavePlanDraft?: () => void
  approveDisabled?: boolean
  buildDisabled?: boolean
  isSavingPlanDraft?: boolean
  className?: string
}

export function getPlanArtifactWorkspacePath(artifact: GeneratedPlanArtifact): string {
  return `plan:${artifact.sessionId}`
}

export function createPlanArtifactWorkspaceTab(artifact: GeneratedPlanArtifact) {
  return {
    ...createWorkspacePlanTabRef(artifact),
    path: getPlanArtifactWorkspacePath(artifact),
    artifact,
  }
}

export function upsertPlanArtifactWorkspaceTab(
  tabs: WorkspaceOpenTab[],
  artifact: GeneratedPlanArtifact
): WorkspaceOpenTab[] {
  const nextTab = createPlanArtifactWorkspaceTab(artifact)
  const existingIndex = tabs.findIndex((tab) => tab.path === nextTab.path)
  if (existingIndex === -1) {
    return [...tabs, nextTab]
  }

  const nextTabs = [...tabs]
  nextTabs[existingIndex] = nextTab
  return nextTabs
}

function formatPlanStatus(status: GeneratedPlanArtifact['status']): string {
  switch (status) {
    case 'ready_for_review':
      return 'Ready for review'
    case 'accepted':
      return 'Accepted'
    case 'executing':
      return 'Executing'
    case 'completed':
      return 'Completed'
    case 'failed':
      return 'Failed'
    default:
      return status
  }
}

export function PlanArtifactTab({
  artifact,
  onApprove,
  onBuildFromPlan,
  onPlanDraftChange,
  onSavePlanDraft,
  approveDisabled = false,
  buildDisabled = false,
  isSavingPlanDraft = false,
  className,
}: PlanArtifactTabProps) {
  const [mode, setMode] = useState<'review' | 'edit'>('review')
  const [draftMarkdown, setDraftMarkdown] = useState(artifact.markdown.trim())
  const [lastSavedMarkdown, setLastSavedMarkdown] = useState(artifact.markdown.trim())
  const isDirty = draftMarkdown !== lastSavedMarkdown

  useEffect(() => {
    const nextMarkdown = artifact.markdown.trim()
    setDraftMarkdown(nextMarkdown)
    setLastSavedMarkdown(nextMarkdown)
  }, [artifact.sessionId, artifact.generatedAt, artifact.markdown])

  const handleDraftChange = (value: string) => {
    setDraftMarkdown(value)
    onPlanDraftChange?.(value)
  }

  const handleSaveDraft = () => {
    onPlanDraftChange?.(draftMarkdown)
    onSavePlanDraft?.()
    setLastSavedMarkdown(draftMarkdown)
  }
  const sectionContent = artifact.sections.slice().sort((left, right) => left.order - right.order)
  const canApprove = artifact.status === 'ready_for_review' && !!onApprove
  const canBuild =
    (artifact.status === 'accepted' ||
      artifact.status === 'executing' ||
      artifact.status === 'failed' ||
      artifact.status === 'completed') &&
    !!onBuildFromPlan

  return (
    <section
      className={cn('flex h-full min-h-0 flex-col border border-border bg-background', className)}
      aria-label={`Plan artifact ${artifact.title}`}
    >
      <header className="bg-muted/20 border-b border-border px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
              <GitBranch className="h-3.5 w-3.5 text-primary" />
              Plan Artifact
            </div>
            <h3 className="truncate font-mono text-base uppercase tracking-[0.14em] text-foreground">
              {artifact.title}
            </h3>
          </div>
          <span className="border border-border px-2 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            {formatPlanStatus(artifact.status)}
          </span>
        </div>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{artifact.summary}</p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setMode((current) => (current === 'review' ? 'edit' : 'review'))}
              className="h-7 rounded-none px-3 font-mono text-xs"
            >
              {mode === 'review' ? <Pencil className="mr-1.5 h-3 w-3" /> : <Eye className="mr-1.5 h-3 w-3" />}
              {mode === 'review' ? 'Edit' : 'Review'}
            </Button>
            {mode === 'edit' ? (
              <Button
                size="sm"
                variant="outline"
                onClick={handleSaveDraft}
                disabled={!isDirty || isSavingPlanDraft}
                className="h-7 rounded-none px-3 font-mono text-xs"
              >
                <Save className="mr-1.5 h-3 w-3" />
                {isSavingPlanDraft ? 'Saving' : 'Save Draft'}
              </Button>
            ) : null}
            {canApprove ? (
              <Button
                size="sm"
                variant="outline"
                onClick={onApprove}
                disabled={approveDisabled}
                className="h-7 rounded-none px-3 font-mono text-xs"
              >
                Approve
              </Button>
            ) : null}
            {canBuild ? (
              <Button
                size="sm"
                onClick={onBuildFromPlan}
                disabled={buildDisabled}
                className="h-7 rounded-none px-3 font-mono text-xs"
              >
                Build
              </Button>
            ) : null}
          </div>
      </header>

      <div className="min-h-0 flex-1 overflow-auto">
        <div className="grid gap-4 p-4 lg:grid-cols-[1.4fr_0.9fr]">
          <div className="space-y-4">
            <div className="border border-border bg-background p-4">
              <div className="mb-3 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                <FileText className="h-3.5 w-3.5" />
                Full plan
              </div>
              <div className="prose prose-sm dark:prose-invert prose-headings:font-mono prose-headings:uppercase prose-headings:tracking-[0.14em] max-w-none">
                {mode === 'edit' ? (
                  <textarea
                    value={draftMarkdown}
                    onChange={(event) => handleDraftChange(event.currentTarget.value)}
                    className="min-h-[520px] w-full resize-y border border-border bg-background p-3 font-mono text-sm leading-6 text-foreground outline-none focus:border-primary"
                    aria-label="Edit generated plan markdown"
                  />
                ) : (
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{draftMarkdown}</ReactMarkdown>
                )}
              </div>
            </div>

            <div className="border border-border bg-background p-4">
              <div className="mb-3 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                <ListChecks className="h-3.5 w-3.5" />
                Acceptance checks
              </div>
              <ul className="space-y-2 font-mono text-sm leading-6">
                {artifact.acceptanceChecks.map((check, index) => (
                  <li
                    key={`${artifact.sessionId}-${index}`}
                    className="border-l border-border pl-3"
                  >
                    {check}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <aside className="space-y-4">
            <div className="border border-border bg-background p-4">
              <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                Session
              </div>
              <div className="mt-1 font-mono text-sm uppercase tracking-[0.14em] text-foreground">
                {artifact.sessionId}
              </div>
            </div>

            <div className="border border-border bg-background p-4">
              <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                Sections
              </div>
              <div className="mt-3 space-y-3">
                {sectionContent.map((section) => (
                  <div key={section.id} className="border border-border p-3">
                    <div className="font-mono text-xs uppercase tracking-[0.16em] text-foreground">
                      {section.title}
                    </div>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                      {section.content}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </section>
  )
}
