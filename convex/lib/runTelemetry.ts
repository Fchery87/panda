import type { Doc, Id } from '../_generated/dataModel'
import type { MutationCtx } from '../_generated/server'
import { trackUserAnalytics } from './userAnalytics'

type AnalyticsDelta = {
  totalMessages?: number
  totalTokensUsed?: number
  provider?: string
}

function hasAnalyticsDelta(delta: AnalyticsDelta): boolean {
  return Boolean(delta.provider) || Boolean(delta.totalMessages) || Boolean(delta.totalTokensUsed)
}

export async function trackRunStartAnalytics(
  ctx: MutationCtx,
  userId: Id<'users'>,
  args: {
    provider?: string
    analyticsPendingMessageId?: Id<'messages'>
  }
) {
  if (args.analyticsPendingMessageId) {
    return
  }

  await trackUserAnalytics(ctx, userId, {
    provider: args.provider,
  })
}

export async function trackRunTerminalAnalytics(
  ctx: MutationCtx,
  userId: Id<'users'>,
  run: Doc<'agentRuns'>,
  args: {
    totalTokensUsed?: number
  } = {}
) {
  const delta: AnalyticsDelta = {}

  if (run.analyticsPendingMessageId) {
    delta.provider = run.provider

    const pendingMessage = await ctx.db.get(run.analyticsPendingMessageId)
    if (pendingMessage?.analyticsTracked === false) {
      delta.totalMessages = 1
      await ctx.db.patch(pendingMessage._id, {
        analyticsTracked: true,
      })
    }
  }

  if (args.totalTokensUsed) {
    delta.totalTokensUsed = args.totalTokensUsed
  }

  if (!hasAnalyticsDelta(delta)) {
    return
  }

  await trackUserAnalytics(ctx, userId, delta)
}
