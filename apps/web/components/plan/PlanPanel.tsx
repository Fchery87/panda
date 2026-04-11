'use client'

import { useEffect, useMemo, useState } from 'react'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { MermaidRenderer } from './MermaidRenderer'
import { FileText, GitGraph, Check, Loader2 } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { GeneratedPlanArtifact } from '@/lib/planning/types'

export type PlanPanelTab = 'review' | 'edit' | 'preview'

interface PlanPanelProps {
  planDraft: string
  generatedPlanArtifact?: GeneratedPlanArtifact | null
  planStatus?:
    | 'idle'
    | 'drafting'
    | 'awaiting_review'
    | 'approved'
    | 'stale'
    | 'executing'
    | 'partial'
    | 'completed'
    | 'failed'
  onChange: (value: string) => void
  onSave: () => void
  onApprove?: () => void
  onBuildFromPlan?: () => void
  isSaving: boolean
  lastSavedAt: number | null
  lastGeneratedAt?: number | null
  approveDisabled?: boolean
  buildDisabled?: boolean
}

const STATUS_LABELS: Record<NonNullable<PlanPanelProps['planStatus']>, string> = {
  idle: 'Idle',
  drafting: 'Drafting',
  awaiting_review: 'Awaiting Review',
  approved: 'Approved',
  stale: 'Stale',
  executing: 'Executing',
  partial: 'Partial',
  completed: 'Completed',
  failed: 'Failed',
}

export function getPlanPanelDefaultTab(
  generatedPlanArtifact?: GeneratedPlanArtifact | null
): PlanPanelTab {
  return generatedPlanArtifact ? 'review' : 'edit'
}

export function getPlanPanelArtifactIdentity(
  generatedPlanArtifact?: GeneratedPlanArtifact | null
): string {
  if (!generatedPlanArtifact) return 'draft'
  return `${generatedPlanArtifact.sessionId}:${generatedPlanArtifact.generatedAt}`
}

export function PlanPanel({
  planDraft,
  generatedPlanArtifact,
  planStatus = 'idle',
  onChange,
  onSave,
  onApprove,
  onBuildFromPlan,
  isSaving,
  lastSavedAt,
  lastGeneratedAt,
  approveDisabled = false,
  buildDisabled = false,
}: PlanPanelProps) {
  const hasStructuredPlan = !!generatedPlanArtifact
  const artifactIdentity = getPlanPanelArtifactIdentity(generatedPlanArtifact)
  const [activeTab, setActiveTab] = useState<PlanPanelTab>(
    getPlanPanelDefaultTab(generatedPlanArtifact)
  )

  const mermaidBlocks = useMemo(() => extractMermaidBlocks(planDraft), [planDraft])
  const markdownContent = useMemo(() => removeMermaidBlocks(planDraft), [planDraft])
  const orderedSections = useMemo(
    () =>
      generatedPlanArtifact
        ? [...generatedPlanArtifact.sections].sort(
            (a, b) => a.order - b.order || a.id.localeCompare(b.id)
          )
        : [],
    [generatedPlanArtifact]
  )

  useEffect(() => {
    setActiveTab(getPlanPanelDefaultTab(generatedPlanArtifact))
  }, [artifactIdentity, generatedPlanArtifact])

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border bg-muted/30 px-4 py-3">
        <div className="flex items-center gap-2">
          <GitGraph className="h-4 w-4 text-primary" />
          <span className="font-mono text-sm uppercase tracking-wider">Plan Draft</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="border border-border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
            {STATUS_LABELS[planStatus]}
          </span>
          {lastGeneratedAt && (
            <span className="font-mono text-xs text-muted-foreground">
              Generated{' '}
              {new Date(lastGeneratedAt).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          )}
          {lastSavedAt && (
            <span className="font-mono text-xs text-muted-foreground">
              Saved{' '}
              {new Date(lastSavedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          {onApprove && (
            <Button
              size="sm"
              variant="outline"
              onClick={onApprove}
              disabled={approveDisabled}
              className="h-7 rounded-none px-3 font-mono text-xs"
            >
              Approve Plan
            </Button>
          )}
          {onBuildFromPlan && (
            <Button
              size="sm"
              onClick={onBuildFromPlan}
              disabled={buildDisabled}
              className="h-7 rounded-none px-3 font-mono text-xs"
            >
              Build from Plan
            </Button>
          )}
          <Button
            size="sm"
            onClick={onSave}
            disabled={isSaving}
            className="h-7 rounded-none px-3 font-mono text-xs"
          >
            {isSaving ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <>
                <Check className="mr-1.5 h-3 w-3" />
                Save
              </>
            )}
          </Button>
        </div>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as PlanPanelTab)}
        className="flex-1 overflow-hidden"
      >
        <TabsList className="w-full justify-start rounded-none border-b border-border bg-transparent px-4">
          {hasStructuredPlan ? (
            <TabsTrigger
              value="review"
              className="gap-1.5 rounded-none border-b-2 border-transparent px-3 py-2 font-mono text-xs uppercase tracking-wider data-[state=active]:border-primary data-[state=active]:bg-transparent"
            >
              <Check className="h-3.5 w-3.5" />
              Review
            </TabsTrigger>
          ) : null}
          <TabsTrigger
            value="edit"
            className="gap-1.5 rounded-none border-b-2 border-transparent px-3 py-2 font-mono text-xs uppercase tracking-wider data-[state=active]:border-primary data-[state=active]:bg-transparent"
          >
            <FileText className="h-3.5 w-3.5" />
            Edit
          </TabsTrigger>
          <TabsTrigger
            value="preview"
            className="gap-1.5 rounded-none border-b-2 border-transparent px-3 py-2 font-mono text-xs uppercase tracking-wider data-[state=active]:border-primary data-[state=active]:bg-transparent"
          >
            <GitGraph className="h-3.5 w-3.5" />
            Markdown
          </TabsTrigger>
        </TabsList>

        {generatedPlanArtifact ? (
          <TabsContent value="review" className="m-0 h-[calc(100%-48px)] overflow-auto p-4">
            <div className="space-y-6">
              <section className="space-y-2 border border-border bg-muted/20 p-4">
                <p className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  Structured Review
                </p>
                <h2 className="font-mono text-lg uppercase tracking-[0.08em] text-foreground">
                  {generatedPlanArtifact.title}
                </h2>
                {generatedPlanArtifact.summary.trim() ? (
                  <p className="text-sm leading-6 text-muted-foreground">
                    {generatedPlanArtifact.summary}
                  </p>
                ) : null}
              </section>

              <section className="space-y-3">
                <h3 className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  Plan Sections
                </h3>
                {orderedSections.length > 0 ? (
                  <ol className="space-y-3">
                    {orderedSections.map((section) => (
                      <li key={section.id} className="border border-border bg-background p-4">
                        <div className="flex items-baseline gap-3">
                          <span className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">
                            {section.order}
                          </span>
                          <h4 className="font-mono text-sm uppercase tracking-[0.08em] text-foreground">
                            {section.title}
                          </h4>
                        </div>
                        <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-foreground">
                          {section.content}
                        </p>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="border border-dashed border-border p-4 text-sm text-muted-foreground">
                    No structured sections available.
                  </p>
                )}
              </section>

              <section className="space-y-3">
                <h3 className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  Acceptance Checks
                </h3>
                {generatedPlanArtifact.acceptanceChecks.length > 0 ? (
                  <ul className="space-y-2">
                    {generatedPlanArtifact.acceptanceChecks.map((checkItem) => (
                      <li
                        key={checkItem}
                        className="flex gap-3 border border-border bg-background p-3 text-sm"
                      >
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                        <span>{checkItem}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="border border-dashed border-border p-4 text-sm text-muted-foreground">
                    No acceptance checks provided.
                  </p>
                )}
              </section>
            </div>
          </TabsContent>
        ) : null}

        <TabsContent value="edit" className="m-0 h-[calc(100%-48px)] overflow-auto">
          <Textarea
            value={planDraft}
            onChange={(e) => onChange(e.target.value)}
            placeholder={`# Project Plan

## Phase 1: Setup
- Initialize project
- Configure build tools

## Phase 2: Implementation
- Create components
- Add routing

## Diagram
\`\`\`mermaid
flowchart TD
    A[Start] --> B{Decision}
    B -->|Yes| C[Action 1]
    B -->|No| D[Action 2]
\`\`\``}
            className="h-full min-h-[400px] resize-none rounded-none border-0 bg-transparent font-mono text-sm focus-visible:ring-0"
          />
        </TabsContent>

        <TabsContent value="preview" className="m-0 h-[calc(100%-48px)] overflow-auto p-4">
          <div className="prose prose-sm dark:prose-invert prose-headings:font-mono prose-headings:uppercase prose-headings:tracking-wider max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdownContent}</ReactMarkdown>
          </div>

          {mermaidBlocks.length > 0 && (
            <div className="mt-6 space-y-4">
              <div className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                Diagrams
              </div>
              {mermaidBlocks.map((block, index) => (
                <MermaidRenderer key={index} content={block} className="border border-border" />
              ))}
            </div>
          )}

          {planDraft.trim() === '' && (
            <div className="flex h-40 items-center justify-center text-muted-foreground">
              <div className="text-center">
                <FileText className="mx-auto h-8 w-8 opacity-50" />
                <p className="mt-2 font-mono text-sm">No plan content</p>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

function extractMermaidBlocks(content: string): string[] {
  const regex = /```mermaid\n([\s\S]*?)```/g
  const blocks: string[] = []
  let match
  while ((match = regex.exec(content)) !== null) {
    blocks.push(match[1].trim())
  }
  return blocks
}

function removeMermaidBlocks(content: string): string {
  return content.replace(/```mermaid[\s\S]*?```/g, '').trim()
}
