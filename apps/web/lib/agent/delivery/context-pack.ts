export function buildDeliveryContextPack(args: {
  deliveryState: {
    currentPhase: string
    summary: {
      goal: string
      nextStepBrief?: string
    }
  }
  activeTask: {
    title: string
    status: string
  } | null
  latestReview: {
    decision: string
    summary: string
  } | null
  latestQa: {
    decision: string
    summary: string
  } | null
}) {
  return {
    currentPhase: args.deliveryState.currentPhase,
    goal: args.deliveryState.summary.goal,
    nextStepBrief: args.deliveryState.summary.nextStepBrief ?? null,
    activeTaskTitle: args.activeTask?.title ?? null,
    activeTaskStatus: args.activeTask?.status ?? null,
    latestReviewDecision: args.latestReview?.decision ?? null,
    latestReviewSummary: args.latestReview?.summary ?? null,
    latestQaDecision: args.latestQa?.decision ?? null,
    latestQaSummary: args.latestQa?.summary ?? null,
  }
}
