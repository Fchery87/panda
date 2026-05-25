'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { useMutation, useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import { Button } from '@/components/ui/button'
import { buildAdvisorReviewRequestCompletion, executeAdvisorReviewRequest } from '@/lib/agent/workflow'

type AdvisorReviewRequestRecord = {
  _id: string
  artifactId?: string
  gates: string[]
  prompt: string
  status: 'pending' | 'completed' | 'cancelled'
  createdAt: number
}

type CompleteAdvisorRequest = (args: {
  requestId: string
  reviewerOutput: string
}) => Promise<unknown> | unknown

type RunAdvisorReviewer = (prompt: string) => Promise<string>

export function AdvisorReviewRequestsList({
  requests,
  onCompleteRequest,
  onRunAdvisorReviewer,
  onCancelRequest,
}: {
  requests: AdvisorReviewRequestRecord[]
  onCompleteRequest?: CompleteAdvisorRequest
  onRunAdvisorReviewer?: (request: AdvisorReviewRequestRecord) => Promise<unknown> | unknown
  onCancelRequest?: (requestId: string) => Promise<unknown> | unknown
}) {
  const [activeRequestId, setActiveRequestId] = useState<string | null>(null)
  const [expandedPromptId, setExpandedPromptId] = useState<string | null>(null)
  const [runningRequestIds, setRunningRequestIds] = useState<Set<string>>(new Set())
  const [reviewerOutput, setReviewerOutput] = useState('')
  const pending = requests.filter((request) => request.status === 'pending')
  if (pending.length === 0) {
    return (
      <div className="border border-dashed border-border bg-muted/20 p-3 text-xs text-muted-foreground">
        No pending advisor review requests.
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {pending.map((request) => {
        const isActive = activeRequestId === request._id
        const isPromptExpanded = expandedPromptId === request._id
        const isRunning = runningRequestIds.has(request._id)
        return (
          <article key={request._id} className="border border-border bg-background/80 p-3 text-xs">
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium text-foreground">Pending advisor request</span>
              <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
                {request.status}
              </span>
            </div>
            <div className="mt-2 flex flex-wrap gap-1">
              {request.gates.map((gate) => (
                <span key={gate} className="border border-border bg-muted/40 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
                  {gate}
                </span>
              ))}
            </div>
            <p className={`mt-2 font-mono text-[10px] text-muted-foreground ${isPromptExpanded ? '' : 'line-clamp-3'}`}>
              {request.prompt}
            </p>
            <div className="mt-2 flex gap-2">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-6 flex-1 rounded-none font-mono text-[10px] uppercase tracking-wide"
                onClick={() => setExpandedPromptId(isPromptExpanded ? null : request._id)}
              >
                {isPromptExpanded ? 'Hide Prompt' : 'View Prompt'}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-6 flex-1 rounded-none font-mono text-[10px] uppercase tracking-wide"
                onClick={async () => {
                  await navigator.clipboard?.writeText(request.prompt)
                  toast.success('Advisor prompt copied')
                }}
              >
                Copy Prompt
              </Button>
              {onCancelRequest ? (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-6 flex-1 rounded-none font-mono text-[10px] uppercase tracking-wide"
                  onClick={() => onCancelRequest(request._id)}
                >
                  Cancel Request
                </Button>
              ) : null}
            </div>
            {onCompleteRequest ? (
              <div className="mt-3 space-y-2">
                {onRunAdvisorReviewer ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 w-full rounded-none font-mono text-[10px] uppercase tracking-wide"
                    disabled={isRunning}
                    onClick={async () => {
                      setRunningRequestIds((prev) => new Set(prev).add(request._id))
                      try {
                        await onRunAdvisorReviewer(request)
                        toast.success('Advisor reviewer completed')
                      } catch (error) {
                        toast.error('Advisor reviewer failed', {
                          description: error instanceof Error ? error.message : String(error),
                        })
                      } finally {
                        setRunningRequestIds((prev) => {
                          const next = new Set(prev)
                          next.delete(request._id)
                          return next
                        })
                      }
                    }}
                  >
                    {isRunning ? 'Running Advisor Reviewer…' : 'Run Advisor Reviewer'}
                  </Button>
                ) : null}
                {isActive ? (
                  <>
                    <textarea
                      className="min-h-24 w-full border border-border bg-background p-2 font-mono text-[10px] text-foreground outline-none"
                      placeholder='Paste advisor-reviewer JSON output here...'
                      value={reviewerOutput}
                      onChange={(event) => setReviewerOutput(event.target.value)}
                    />
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        className="h-7 flex-1 rounded-none font-mono text-[10px] uppercase tracking-wide"
                        disabled={!reviewerOutput.trim()}
                        onClick={async () => {
                          await onCompleteRequest({ requestId: request._id, reviewerOutput })
                          setReviewerOutput('')
                          setActiveRequestId(null)
                        }}
                      >
                        Complete Review
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-7 flex-1 rounded-none font-mono text-[10px] uppercase tracking-wide"
                        onClick={() => {
                          setReviewerOutput('')
                          setActiveRequestId(null)
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 w-full rounded-none font-mono text-[10px] uppercase tracking-wide"
                    onClick={() => setActiveRequestId(request._id)}
                  >
                    Enter Advisor Output
                  </Button>
                )}
              </div>
            ) : null}
          </article>
        )
      })}
    </div>
  )
}

export function AdvisorReviewRequestsPanel({
  chatId,
  runAdvisorReviewer,
}: {
  chatId?: Id<'chats'> | null
  runAdvisorReviewer?: RunAdvisorReviewer
}) {
  const requests = useQuery(api.advisorReviewRequests.listByChat, chatId ? { chatId } : 'skip') as
    | AdvisorReviewRequestRecord[]
    | undefined
  const completeWithReview = useMutation(api.advisorReviewRequests.completeWithReview)
  const startReviewerRun = useMutation(api.advisorReviewRequests.startReviewerRun)
  const updateRequestStatus = useMutation(api.advisorReviewRequests.updateStatus)

  return (
    <section className="space-y-2">
      <div className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
        Advisor requests
      </div>
      <AdvisorReviewRequestsList
        requests={requests ?? []}
        onRunAdvisorReviewer={
          runAdvisorReviewer
            ? async (request) => {
                await executeAdvisorReviewRequest({
                  request: { _id: request._id, prompt: request.prompt },
                  startReviewerRun: async (requestId) => {
                    await startReviewerRun({ id: requestId as Id<'advisorReviewRequests'> })
                  },
                  runAdvisorReviewer,
                  completeWithReview: async (input) => {
                    await completeWithReview({
                      id: input.requestId as Id<'advisorReviewRequests'>,
                      status: input.status,
                      summary: input.summary,
                      risks: input.risks,
                      reviewer: input.reviewer,
                    })
                  },
                })
              }
            : undefined
        }
        onCancelRequest={async (requestId) => {
          await updateRequestStatus({
            id: requestId as Id<'advisorReviewRequests'>,
            status: 'cancelled',
          })
          toast.success('Advisor request cancelled')
        }}
        onCompleteRequest={async ({ requestId, reviewerOutput }) => {
          const completion = buildAdvisorReviewRequestCompletion({ requestId, reviewerOutput })
          await completeWithReview({
            id: requestId as Id<'advisorReviewRequests'>,
            status: completion.review.status,
            summary: completion.review.summary,
            risks: completion.review.risks,
            reviewer: completion.reviewer,
          })
        }}
      />
    </section>
  )
}
