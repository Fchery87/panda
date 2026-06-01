'use client'

import { Button } from '@/components/ui/button'
import { PlanPanel } from '@/components/plan/PlanPanel'
import type { GeneratedPlanArtifact } from '@/lib/planning/types'
import type { PlanStatus } from '@/lib/chat/planDraft'
import type { DiffFileEntry } from '@/components/workbench/DiffTab'
import { cn } from '@/lib/utils'

type PlanLifecycleStep = {
  label: string
  state: 'done' | 'active' | 'upcoming'
}

function getPlanLifecycleSteps(
  artifactStatus?: GeneratedPlanArtifact['status'],
  planStatus?: PlanStatus | null
): PlanLifecycleStep[] {
  const hasDraft = Boolean(planStatus && planStatus !== 'idle') || Boolean(artifactStatus)
  const order = ['Draft', 'Review', 'Approved', 'Building', 'Changes', 'Verified']
  const activeIndex = artifactStatus
    ? artifactStatus === 'ready_for_review'
      ? 1
      : artifactStatus === 'accepted'
        ? 2
        : artifactStatus === 'executing'
          ? 3
          : artifactStatus === 'completed'
            ? 5
            : artifactStatus === 'failed'
              ? 4
              : 0
    : hasDraft
      ? 0
      : -1

  return order.map((label, index) => ({
    label,
    state: index < activeIndex ? 'done' : index === activeIndex ? 'active' : 'upcoming',
  }))
}

function extractPlanFilePaths(artifact?: GeneratedPlanArtifact | null): string[] {
  if (!artifact) return []
  const content = [artifact.summary, artifact.markdown, ...artifact.sections.map((s) => s.content)]
    .filter(Boolean)
    .join('\n')
  const matches = content.match(/(?:[\w.-]+\/)+[\w.-]+\.[A-Za-z0-9]+/g) ?? []
  return Array.from(new Set(matches)).slice(0, 12)
}

export function PlanFileList({
  title,
  files,
  emptyLabel,
}: {
  title: string
  files: string[]
  emptyLabel: string
}) {
  return (
    <div className="bg-background/80 border border-border px-3 py-3">
      <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        {title}
      </div>
      {files.length > 0 ? (
        <ul className="mt-2 space-y-1">
          {files.map((file) => (
            <li key={file} className="truncate font-mono text-xs text-foreground">
              {file}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-xs text-muted-foreground">{emptyLabel}</p>
      )}
    </div>
  )
}

export interface InspectorPlanContentProps {
  planDraft: string
  generatedPlanArtifact?: GeneratedPlanArtifact | null
  planStatus?: PlanStatus | null
  onPlanDraftChange: (value: string) => void
  onSavePlanDraft: () => void
  onApprovePlan: () => void
  onBuildFromPlan: () => void
  isSavingPlanDraft: boolean
  lastSavedAt?: number | null
  lastGeneratedAt?: number | null
  approveDisabled: boolean
  buildDisabled: boolean
  pendingDiffEntries?: DiffFileEntry[]
  onReviewDiff?: () => void
}

export function InspectorPlanContent({
  planDraft,
  generatedPlanArtifact,
  planStatus,
  onPlanDraftChange,
  onSavePlanDraft,
  onApprovePlan,
  onBuildFromPlan,
  isSavingPlanDraft,
  lastSavedAt,
  lastGeneratedAt,
  approveDisabled,
  buildDisabled,
  pendingDiffEntries = [],
  onReviewDiff,
}: InspectorPlanContentProps) {
  const generatedSummary = generatedPlanArtifact?.summary?.trim() || null
  const acceptanceCheckCount = generatedPlanArtifact?.acceptanceChecks.length ?? 0
  const expectedFiles = extractPlanFilePaths(generatedPlanArtifact)
  const actualChangedFiles = Array.from(new Set(pendingDiffEntries.map((entry) => entry.path)))
  const lifecycleSteps = getPlanLifecycleSteps(generatedPlanArtifact?.status, planStatus)

  return (
    <div className="m-0 space-y-3">
      <div className="grid grid-cols-3 gap-1.5">
        <div className="bg-background/70 border border-border px-2 py-2">
          <div className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
            Plan status
          </div>
          <div className="mt-1 text-xs font-medium text-foreground">
            {(planStatus ?? 'idle').replace('_', ' ')}
          </div>
        </div>
        <div className="bg-background/70 border border-border px-2 py-2">
          <div className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
            Acceptance checks
          </div>
          <div className="mt-1 text-xs font-medium text-foreground">
            {acceptanceCheckCount || 'None'}
          </div>
        </div>
        <div className="bg-background/70 border border-border px-2 py-2">
          <div className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
            Draft
          </div>
          <div className="mt-1 text-xs font-medium text-foreground">
            {isSavingPlanDraft ? 'Saving' : lastSavedAt ? 'Saved' : 'Unsaved'}
          </div>
        </div>
      </div>

      <div className="bg-background/80 border border-border px-3 py-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Implementation lifecycle
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Plan context moves from draft to reviewed changes and run evidence.
            </p>
          </div>
          {actualChangedFiles.length > 0 && onReviewDiff ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 shrink-0 rounded-none font-mono text-[10px] uppercase tracking-[0.16em]"
              onClick={onReviewDiff}
            >
              Open Review Diff
            </Button>
          ) : null}
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {lifecycleSteps.map((step) => (
            <span
              key={step.label}
              className={cn(
                'border px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em]',
                step.state === 'done' && 'border-primary/30 bg-primary/10 text-primary',
                step.state === 'active' &&
                  'border-[oklch(var(--status-warning)/0.35)] bg-[oklch(var(--status-warning)/0.1)] text-[oklch(var(--status-warning))]',
                step.state === 'upcoming' && 'bg-background/60 border-border text-muted-foreground'
              )}
            >
              {step.label}
            </span>
          ))}
        </div>
      </div>

      {(expectedFiles.length > 0 || actualChangedFiles.length > 0) && (
        <div className="grid gap-3 md:grid-cols-2">
          <PlanFileList title="Expected files" files={expectedFiles} emptyLabel="Not specified" />
          <PlanFileList
            title="Actual changed files"
            files={actualChangedFiles}
            emptyLabel="No generated changes yet"
          />
        </div>
      )}

      {generatedSummary ? (
        <div className="bg-background/80 border border-border px-3 py-3">
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Plan summary
          </div>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{generatedSummary}</p>
        </div>
      ) : null}

      <div className="m-0 border border-border bg-background">
        <PlanPanel
          planDraft={planDraft}
          generatedPlanArtifact={generatedPlanArtifact}
          planStatus={planStatus ?? 'idle'}
          onChange={onPlanDraftChange}
          onSave={onSavePlanDraft}
          onApprove={onApprovePlan}
          onBuildFromPlan={onBuildFromPlan}
          isSaving={isSavingPlanDraft}
          lastSavedAt={lastSavedAt ?? null}
          lastGeneratedAt={lastGeneratedAt ?? null}
          approveDisabled={approveDisabled}
          buildDisabled={buildDisabled}
        />
      </div>
    </div>
  )
}
