import type { Id } from '@convex/_generated/dataModel'
import type { MessageAnnotationInfo, PersistedRunEventInfo } from '@/components/chat/types'
import type { ChatMode } from './prompt-library'

export interface RunOrchestrationAttachment {
  storageId: Id<'_storage'>
  kind: 'file' | 'image'
  filename: string
  contentType?: string
  size?: number
  contextFilePath?: string
  url?: string
}

interface StartRunOrchestrationArgs {
  chatId: Id<'chats'>
  projectId: Id<'projects'>
  userId: Id<'users'>
  mode: ChatMode
  provider?: string
  model: string
  userContent: string
  attachments?: RunOrchestrationAttachment[]
  attachmentsOnly?: boolean
  approvedPlanExecution?: boolean
  addMessage: (args: {
    chatId: Id<'chats'>
    role: 'user'
    content: string
    annotations: MessageAnnotationInfo[]
  }) => Promise<Id<'messages'>>
  createChatAttachments: (args: {
    chatId: Id<'chats'>
    messageId: Id<'messages'>
    attachments: Array<{
      storageId: Id<'_storage'>
      kind: 'file' | 'image'
      filename: string
      contentType?: string
      size?: number
      contextFilePath?: string
    }>
  }) => Promise<unknown>
  createRun: (args: {
    projectId: Id<'projects'>
    chatId: Id<'chats'>
    userId: Id<'users'>
    mode: ChatMode
    provider?: string
    model: string
    userMessage: string
  }) => Promise<Id<'agentRuns'>>
  beginRun: (runId: Id<'agentRuns'>) => void
  onRunCreated?: (args: {
    runId: Id<'agentRuns'>
    approvedPlanExecution: boolean
  }) => void | Promise<void>
  appendRunEvent: (
    event: PersistedRunEventInfo,
    options?: { forceFlush?: boolean }
  ) => Promise<void>
}

export async function startRunOrchestration(args: StartRunOrchestrationArgs): Promise<{
  runId: Id<'agentRuns'>
  userMessageId: Id<'messages'>
}> {
  const userMessageId = await args.addMessage({
    chatId: args.chatId,
    role: 'user',
    content: args.userContent,
    annotations: [
      {
        mode: args.mode,
        attachmentsOnly: args.attachmentsOnly,
        model: args.model,
        provider: args.provider,
        attachments: args.attachments?.map((attachment) => ({
          id: String(attachment.storageId),
          kind: attachment.kind,
          filename: attachment.filename,
          contentType: attachment.contentType,
          size: attachment.size,
          url: attachment.url ?? undefined,
          contextFilePath: attachment.contextFilePath,
        })),
      },
    ],
  })

  if (args.attachments?.length) {
    await args.createChatAttachments({
      chatId: args.chatId,
      messageId: userMessageId,
      attachments: args.attachments.map((attachment) => ({
        storageId: attachment.storageId,
        kind: attachment.kind,
        filename: attachment.filename,
        contentType: attachment.contentType,
        size: attachment.size,
        contextFilePath: attachment.contextFilePath,
      })),
    })
  }

  const runId = await args.createRun({
    projectId: args.projectId,
    chatId: args.chatId,
    userId: args.userId,
    mode: args.mode,
    provider: args.provider,
    model: args.model,
    userMessage: args.userContent,
  })

  args.beginRun(runId)

  if (args.onRunCreated) {
    await args.onRunCreated({
      runId,
      approvedPlanExecution: Boolean(args.approvedPlanExecution),
    })
  }

  await args.appendRunEvent({
    type: 'run_started',
    content: args.userContent,
    status: 'running',
  })

  return { runId, userMessageId }
}
