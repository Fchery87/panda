import type { Id, Doc } from '../_generated/dataModel'
import type { MutationCtx } from '../_generated/server'

type AgentRunEventDoc = Doc<'agentRunEvents'>

export type AgentRunEventInsert = Omit<AgentRunEventDoc, '_id' | '_creationTime'>

function previewText(value: string | undefined): string | undefined {
  return value === undefined ? undefined : value.slice(0, 500)
}

/**
 * Central seam for persisting run events.
 *
 * Keep all writes to `agentRunEvents` behind this helper so the hot event row can be
 * split from cold event bodies without chasing scattered insert call sites.
 */
export async function insertRunEvent(
  ctx: MutationCtx,
  event: AgentRunEventInsert
): Promise<Id<'agentRunEvents'>> {
  const { content, output, error, args, snapshot, ...hotEvent } = event
  const hasBody =
    content !== undefined ||
    output !== undefined ||
    error !== undefined ||
    args !== undefined ||
    snapshot !== undefined
  const hasArgs = args !== undefined
  const hasSnapshot = snapshot !== undefined

  const eventId = await ctx.db.insert('agentRunEvents', {
    ...hotEvent,
    contentPreview: event.contentPreview ?? previewText(content),
    outputPreview: event.outputPreview ?? previewText(output),
    errorPreview: event.errorPreview ?? previewText(error),
    hasBody,
    hasArgs,
    hasSnapshot,
  })

  if (hasBody) {
    await ctx.db.insert('agentRunEventBodies', {
      eventId,
      runId: event.runId,
      chatId: event.chatId,
      sequence: event.sequence,
      content,
      output,
      error,
      args,
      snapshot,
      createdAt: event.createdAt,
    })
  }

  return eventId
}

export async function deleteRunEventWithBody(
  ctx: MutationCtx,
  eventId: Id<'agentRunEvents'>
): Promise<void> {
  const bodies = await ctx.db
    .query('agentRunEventBodies')
    .withIndex('by_event', (q) => q.eq('eventId', eventId))
    .take(10)

  for (const body of bodies) {
    await ctx.db.delete(body._id)
  }

  await ctx.db.delete(eventId)
}
