import type { AdvisorReview } from './advisor'
import { parseAdvisorReviewerOutput } from './advisor-reviewer'

export interface AdvisorReviewRequestCompletionDraft {
  requestId: string
  review: AdvisorReview
  reviewer: string
}

export function buildAdvisorReviewRequestCompletion(args: {
  requestId: string
  reviewerOutput: string
  reviewer?: string
}): AdvisorReviewRequestCompletionDraft {
  return {
    requestId: args.requestId,
    review: parseAdvisorReviewerOutput(args.reviewerOutput),
    reviewer: args.reviewer ?? 'advisor-reviewer',
  }
}

export function isBlockingAdvisorCompletion(draft: AdvisorReviewRequestCompletionDraft): boolean {
  return draft.review.status === 'blocked' || draft.review.status === 'needs_changes'
}
