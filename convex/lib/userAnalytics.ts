import type { Id } from '../_generated/dataModel'
import type { MutationCtx } from '../_generated/server'

type AnalyticsDelta = {
  totalProjects?: number
  totalChats?: number
  totalMessages?: number
  totalTokensUsed?: number
  provider?: string
}

export async function trackUserAnalytics(
  ctx: MutationCtx,
  userId: Id<'users'>,
  delta: AnalyticsDelta
) {
  const existing = await ctx.db
    .query('userAnalytics')
    .withIndex('by_user', (q) => q.eq('userId', userId))
    .first()

  const now = Date.now()

  if (!existing) {
    await ctx.db.insert('userAnalytics', {
      userId,
      totalProjects: Math.max(0, delta.totalProjects ?? 0),
      totalChats: Math.max(0, delta.totalChats ?? 0),
      totalMessages: Math.max(0, delta.totalMessages ?? 0),
      totalTokensUsed: Math.max(0, delta.totalTokensUsed ?? 0),
      providerUsage: delta.provider ? { [delta.provider]: 1 } : {},
      lastActiveAt: now,
      updatedAt: now,
    })
    return
  }

  const nextProviderUsage = {
    ...(existing.providerUsage ?? {}),
  }

  if (delta.provider) {
    nextProviderUsage[delta.provider] = (nextProviderUsage[delta.provider] ?? 0) + 1
  }

  await ctx.db.patch(existing._id, {
    totalProjects: Math.max(0, (existing.totalProjects ?? 0) + (delta.totalProjects ?? 0)),
    totalChats: Math.max(0, (existing.totalChats ?? 0) + (delta.totalChats ?? 0)),
    totalMessages: Math.max(0, (existing.totalMessages ?? 0) + (delta.totalMessages ?? 0)),
    totalTokensUsed: Math.max(0, (existing.totalTokensUsed ?? 0) + (delta.totalTokensUsed ?? 0)),
    providerUsage: nextProviderUsage,
    lastActiveAt: now,
    updatedAt: now,
  })
}
