import type { AdvisorReview } from './advisor'
import { buildAdvisorReviewRequestCompletion } from './advisor-review-request-completion'

export interface PendingAdvisorReviewRequest {
  _id: string
  prompt: string
}

export interface AdvisorReviewExecutionResult {
  requestId: string
  rawOutput: string
  review: AdvisorReview
  reviewer: string
}

export async function executeAdvisorReviewRequest(args: {
  request: PendingAdvisorReviewRequest
  startReviewerRun?: (requestId: string) => Promise<unknown>
  runAdvisorReviewer: (prompt: string) => Promise<string>
  completeWithReview: (input: {
    requestId: string
    status: AdvisorReview['status']
    summary: string
    risks: AdvisorReview['risks']
    reviewer: string
  }) => Promise<unknown>
  reviewer?: string
}): Promise<AdvisorReviewExecutionResult> {
  await args.startReviewerRun?.(args.request._id)
  const rawOutput = await args.runAdvisorReviewer(args.request.prompt)
  const completion = buildAdvisorReviewRequestCompletion({
    requestId: args.request._id,
    reviewerOutput: rawOutput,
    reviewer: args.reviewer,
  })

  await args.completeWithReview({
    requestId: completion.requestId,
    status: completion.review.status,
    summary: completion.review.summary,
    risks: completion.review.risks,
    reviewer: completion.reviewer,
  })

  return {
    requestId: completion.requestId,
    rawOutput,
    review: completion.review,
    reviewer: completion.reviewer,
  }
}
