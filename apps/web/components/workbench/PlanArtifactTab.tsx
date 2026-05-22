'use client'

import { useEffect, useMemo, useState } from 'react'
import { FileText, GitBranch, ListChecks, Pencil, Eye, Save } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Button } from '@/components/ui/button'
import type { WorkspaceOpenTab } from '@/contexts/WorkspaceContext'
import type { GeneratedPlanArtifact } from '@/lib/planning/types'
import { createWorkspacePlanTabRef, serializeGeneratedPlanArtifact } from '@/lib/planning/types'
import { cn } from '@/lib/utils'

type PlanFrontmatter = {
  raw: string | null
  body: string
  fields: Record<string, string>
  todos: Array<{ content: string; status: string }>
}

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

function parsePlanFrontmatter(markdown: string): PlanFrontmatter {
  if (!markdown.startsWith('---')) {
    return { raw: null, body: markdown, fields: {}, todos: [] }
  }

  const closeIndex = markdown.indexOf('\n---', 3)
  if (closeIndex === -1) {
    return { raw: null, body: markdown, fields: {}, todos: [] }
  }

  const raw = markdown.slice(0, closeIndex + 4)
  const body = markdown.slice(closeIndex + 4).replace(/^\s+/, '')
  const fields: Record<string, string> = {}
  const todos: Array<{ content: string; status: string }> = []
  let currentTodo: { content: string; status: string } | null = null

  for (const line of raw.split('\n').slice(1, -1)) {
    const fieldMatch = line.match(/^([A-Za-z][A-Za-z0-9_-]*):\s*(.*)$/)
    if (fieldMatch) {
      fields[fieldMatch[1]!] = fieldMatch[2]!.replace(/^['"]|['"]$/g, '')
    }

    const todoContentMatch = line.match(/^\s+content:\s*(.*)$/)
    if (todoContentMatch) {
      currentTodo = {
        content: todoContentMatch[1]!.replace(/^['"]|['"]$/g, ''),
        status: 'pending',
      }
      todos.push(currentTodo)
    }

    const todoStatusMatch = line.match(/^\s+status:\s*(.*)$/)
    if (todoStatusMatch && currentTodo) {
      currentTodo.status = todoStatusMatch[1]!.replace(/^['"]|['"]$/g, '')
    }
  }

  return { raw, body, fields, todos }
}

function MermaidBlock({ chart }: { chart: string }) {
  const [svg, setSvg] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const render = async () => {
      try {
        const mermaid = (await import('mermaid')).default
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: 'strict',
          theme: document.documentElement.classList.contains('dark') ? 'dark' : 'default',
        })
        const id = `panda-plan-mermaid-${Math.random().toString(36).slice(2)}`
        const result = await mermaid.render(id, chart)
        if (!cancelled) setSvg(result.svg)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Unable to render diagram')
      }
    }
    void render()
    return () => {
      cancelled = true
    }
  }, [chart])

  if (error) {
    return (
      <pre className="overflow-auto border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
        <code>{chart}</code>
      </pre>
    )
  }

  if (!svg) {
    return (
      <div className="flex min-h-32 items-center justify-center border border-border bg-muted/20 font-mono text-xs uppercase tracking-widest text-muted-foreground">
        Rendering diagram…
      </div>
    )
  }

  return (
    <div
      className="overflow-auto border border-border bg-background p-3 [&_svg]:mx-auto [&_svg]:max-w-full"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  )
}

function PlanMarkdownView({ markdown }: { markdown: string }) {
  const parsed = useMemo(() => parsePlanFrontmatter(markdown), [markdown])

  return (
    <div className="space-y-4">
      {(parsed.fields.name || parsed.fields.overview || parsed.todos.length > 0) && (
        <div className="grid gap-3 border border-border bg-muted/10 p-3 md:grid-cols-[1fr_auto]">
          <div className="min-w-0">
            {parsed.fields.name ? (
              <div className="truncate font-mono text-sm uppercase tracking-[0.16em] text-foreground">
                {parsed.fields.name}
              </div>
            ) : null}
            {parsed.fields.overview ? (
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                {parsed.fields.overview}
              </p>
            ) : null}
          </div>
          {parsed.todos.length > 0 ? (
            <div className="min-w-48 border border-border bg-background p-2">
              <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Plan tasks
              </div>
              <div className="mt-2 space-y-1.5">
                {parsed.todos.slice(0, 5).map((todo, index) => (
                  <div key={`${todo.content}-${index}`} className="flex items-start gap-2 text-xs">
                    <span className="mt-1 h-2 w-2 shrink-0 border border-border bg-muted" />
                    <span className="min-w-0 flex-1 text-muted-foreground">{todo.content}</span>
                    <span className="font-mono text-[9px] uppercase text-muted-foreground">
                      {todo.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      )}

      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="border-b border-border pb-2 font-mono text-xl uppercase tracking-[0.14em] text-foreground">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="mt-6 font-mono text-sm uppercase tracking-[0.18em] text-foreground">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="mt-4 font-mono text-xs uppercase tracking-[0.16em] text-muted-foreground">
              {children}
            </h3>
          ),
          table: ({ children }) => (
            <div className="overflow-x-auto border border-border">
              <table className="w-full border-collapse text-sm">{children}</table>
            </div>
          ),
          th: ({ children }) => (
            <th className="border-b border-border bg-muted/30 px-3 py-2 text-left font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              {children}
            </th>
          ),
          td: ({ children }) => <td className="border-t border-border px-3 py-2">{children}</td>,
          code: ({ className, children }) => {
            const match = /language-(\w+)/.exec(className ?? '')
            const code = String(children).replace(/\n$/, '')
            if (match?.[1] === 'mermaid') return <MermaidBlock chart={code} />
            return <code className={className}>{children}</code>
          },
          pre: ({ children }) => (
            <pre className="overflow-auto border border-border bg-muted/30 p-3 text-xs">{children}</pre>
          ),
        }}
      >
        {parsed.body || markdown}
      </ReactMarkdown>
    </div>
  )
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
  const initialMarkdown = useMemo(() => serializeGeneratedPlanArtifact(artifact), [artifact])
  const [mode, setMode] = useState<'review' | 'edit'>('review')
  const [draftMarkdown, setDraftMarkdown] = useState(initialMarkdown)
  const [lastSavedMarkdown, setLastSavedMarkdown] = useState(initialMarkdown)
  const isDirty = draftMarkdown !== lastSavedMarkdown

  useEffect(() => {
    setDraftMarkdown(initialMarkdown)
    setLastSavedMarkdown(initialMarkdown)
  }, [initialMarkdown])

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
                  <PlanMarkdownView markdown={draftMarkdown} />
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
