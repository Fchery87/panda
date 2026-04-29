import { describe, expect, test } from 'bun:test'
import type { Id } from '@convex/_generated/dataModel'

import { startRunOrchestration } from './run-orchestration'

describe('startRunOrchestration', () => {
  test('persists the user message, creates the Run, begins buffering, and appends run_started in order', async () => {
    const calls: string[] = []
    const chatId = 'chat-1' as Id<'chats'>
    const projectId = 'project-1' as Id<'projects'>
    const userId = 'user-1' as Id<'users'>
    const runId = 'run-1' as Id<'agentRuns'>
    const userMessageId = 'message-1' as Id<'messages'>
    const storageId = 'storage-1' as Id<'_storage'>

    const result = await startRunOrchestration({
      chatId,
      projectId,
      userId,
      mode: 'code',
      provider: 'openai',
      model: 'gpt-5.5',
      userContent: 'Implement the plan',
      attachmentsOnly: false,
      attachments: [
        {
          storageId,
          kind: 'file',
          filename: 'notes.md',
          contentType: 'text/markdown',
          size: 123,
          contextFilePath: 'docs/notes.md',
          url: 'blob:test',
        },
      ],
      approvedPlanExecution: true,
      addMessage: async (args) => {
        calls.push(`addMessage:${args.role}:${args.content}`)
        expect(args.annotations[0]).toMatchObject({
          mode: 'code',
          attachmentsOnly: false,
          model: 'gpt-5.5',
          provider: 'openai',
        })
        expect(args.annotations[0]?.attachments).toEqual([
          {
            id: String(storageId),
            kind: 'file',
            filename: 'notes.md',
            contentType: 'text/markdown',
            size: 123,
            url: 'blob:test',
            contextFilePath: 'docs/notes.md',
          },
        ])
        return userMessageId
      },
      createChatAttachments: async (args) => {
        calls.push(`createChatAttachments:${String(args.messageId)}`)
        expect(args.attachments).toEqual([
          {
            storageId,
            kind: 'file',
            filename: 'notes.md',
            contentType: 'text/markdown',
            size: 123,
            contextFilePath: 'docs/notes.md',
          },
        ])
      },
      createRun: async (args) => {
        calls.push(`createRun:${args.mode}:${args.userMessage}`)
        return runId
      },
      beginRun: (createdRunId) => {
        calls.push(`beginRun:${String(createdRunId)}`)
      },
      onRunCreated: async (args) => {
        calls.push(`onRunCreated:${String(args.runId)}:${String(args.approvedPlanExecution)}`)
      },
      appendRunEvent: async (event) => {
        calls.push(`appendRunEvent:${event.type}:${event.status ?? ''}`)
      },
    })

    expect(result).toEqual({ runId, userMessageId })
    expect(calls).toEqual([
      'addMessage:user:Implement the plan',
      `createChatAttachments:${String(userMessageId)}`,
      'createRun:code:Implement the plan',
      `beginRun:${String(runId)}`,
      `onRunCreated:${String(runId)}:true`,
      'appendRunEvent:run_started:running',
    ])
  })
})
