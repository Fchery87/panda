'use client'

import { useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'

type AdvisorReviewRecord = {
  _id: string
  gates: string[]
  status: 'approved' | 'needs_changes' | 'blocked'
  summary: string
  risks: Array<{
    severity: 'low' | 'medium' | 'high'
    file?: string
    finding: string
    recommendation: string
  }>
  reviewer?: string
  createdAt: number
}

export function AdvisorReviewsList({ reviews }: { reviews: AdvisorReviewRecord[] }) {
  if (reviews.length === 0) {
    return (
      <div className="bg-muted/20 border border-dashed border-border p-3 text-xs text-muted-foreground">
        No advisor reviews yet. Risky changes will appear here after review.
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {reviews.map((review) => (
        <article key={review._id} className="bg-background/80 border border-border p-3 text-xs">
          <div className="flex items-center justify-between gap-2">
            <span className="font-medium text-foreground">Advisor review</span>
            <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
              {review.status}
            </span>
          </div>
          <p className="mt-1 text-muted-foreground">{review.summary}</p>
          {review.gates.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-1">
              {review.gates.map((gate) => (
                <span
                  key={gate}
                  className="bg-muted/40 border border-border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide text-muted-foreground"
                >
                  {gate}
                </span>
              ))}
            </div>
          ) : null}
          {review.risks.length > 0 ? (
            <ul className="mt-2 space-y-1 text-muted-foreground">
              {review.risks.map((risk, index) => (
                <li key={`${risk.severity}-${index}`}>
                  <span className="font-mono uppercase">{risk.severity}</span>: {risk.finding} →{' '}
                  {risk.recommendation}
                </li>
              ))}
            </ul>
          ) : null}
        </article>
      ))}
    </div>
  )
}

export function AdvisorReviewsPanel({ chatId }: { chatId?: Id<'chats'> | null }) {
  const reviews = useQuery(api.advisorReviews.listByChat, chatId ? { chatId } : 'skip') as
    | AdvisorReviewRecord[]
    | undefined

  return (
    <section className="space-y-2">
      <div className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
        Advisor reviews
      </div>
      <AdvisorReviewsList reviews={reviews ?? []} />
    </section>
  )
}
