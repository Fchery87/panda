import { describe, expect, test } from 'bun:test'

describe('Convex bandwidth payload contracts', () => {
  test('files.listMetadata excludes content while preserving metadata fields', () => {
    const file = {
      _id: 'file-id',
      _creationTime: 100,
      projectId: 'project-id',
      path: 'src/index.ts',
      content: 'large file content',
      isBinary: false,
      updatedAt: 123,
    }

    const { content, ...metadata } = file

    expect(metadata).not.toHaveProperty('content')
    expect(metadata).toEqual({
      _id: 'file-id',
      _creationTime: 100,
      projectId: 'project-id',
      path: 'src/index.ts',
      isBinary: false,
      updatedAt: 123,
    })
  })

  test('chats.listRecent returns bounded summary fields', () => {
    const chat = {
      _id: 'chat-id',
      _creationTime: 100,
      projectId: 'project-id',
      title: 'Recent chat',
      mode: 'plan',
      createdAt: 123,
      updatedAt: 456,
      archivedAt: 789,
      privateMetadata: { tokenCount: 1000 },
    }

    const summary = {
      _id: chat._id,
      _creationTime: chat._creationTime,
      projectId: chat.projectId,
      title: chat.title,
      mode: chat.mode,
      createdAt: chat.createdAt,
      updatedAt: chat.updatedAt,
    }

    expect(summary).toEqual({
      _id: 'chat-id',
      _creationTime: 100,
      projectId: 'project-id',
      title: 'Recent chat',
      mode: 'plan',
      createdAt: 123,
      updatedAt: 456,
    })
    expect(summary).not.toHaveProperty('archivedAt')
    expect(summary).not.toHaveProperty('privateMetadata')
  })

  test('runtime checkpoint summaries exclude the checkpoint payload', () => {
    const row = {
      _id: 'checkpoint-id',
      runId: 'run-id',
      chatId: 'chat-id',
      sessionID: 'session-1',
      reason: 'step',
      savedAt: 123,
      agentName: 'code',
      version: 1,
      checkpoint: { state: { messages: [{ content: 'large transcript' }] } },
    }

    const summary = {
      _id: row._id,
      runId: row.runId,
      chatId: row.chatId,
      sessionID: row.sessionID,
      reason: row.reason,
      savedAt: row.savedAt,
      agentName: row.agentName,
      version: row.version,
    }

    expect(summary).not.toHaveProperty('checkpoint')
    expect(summary).toEqual({
      _id: 'checkpoint-id',
      runId: 'run-id',
      chatId: 'chat-id',
      sessionID: 'session-1',
      reason: 'step',
      savedAt: 123,
      agentName: 'code',
      version: 1,
    })
  })

  test('shared transcript mapping only exposes public chat and message fields', () => {
    const chat = {
      _id: 'chat-id',
      projectId: 'project-id',
      title: 'Shared session',
      mode: 'ask',
      createdAt: 123,
      updatedAt: 456,
    }
    const message = {
      _id: 'message-id',
      chatId: 'chat-id',
      role: 'assistant',
      content: 'Public answer',
      annotations: [{ type: 'private-debug' }],
      createdAt: 789,
    }

    const chatHeader = {
      title: chat.title,
      mode: chat.mode,
      createdAt: chat.createdAt,
    }
    const transcriptMessage = {
      role: message.role,
      content: message.content,
      createdAt: message.createdAt,
    }

    expect(chatHeader).toEqual({
      title: 'Shared session',
      mode: 'ask',
      createdAt: 123,
    })
    expect(transcriptMessage).toEqual({
      role: 'assistant',
      content: 'Public answer',
      createdAt: 789,
    })
    expect(chatHeader).not.toHaveProperty('_id')
    expect(chatHeader).not.toHaveProperty('projectId')
    expect(chatHeader).not.toHaveProperty('updatedAt')
    expect(transcriptMessage).not.toHaveProperty('_id')
    expect(transcriptMessage).not.toHaveProperty('chatId')
    expect(transcriptMessage).not.toHaveProperty('annotations')
  })

  test('run event summaries use previews instead of full content and error fields', () => {
    const event = {
      _id: 'event-id',
      runId: 'run-id',
      chatId: 'chat-id',
      sequence: 1,
      type: 'assistant_delta',
      status: 'running',
      progressCategory: 'thinking',
      progressToolName: 'read',
      progressHasArtifactTarget: true,
      targetFilePaths: ['src/index.ts'],
      toolCallId: 'tool-call-id',
      toolName: 'read',
      args: { path: 'src/index.ts' },
      output: 'large tool output',
      content: 'x'.repeat(600),
      error: 'e'.repeat(600),
      durationMs: 10,
      planStepIndex: 0,
      planStepTitle: 'Inspect files',
      planTotalSteps: 2,
      completedPlanStepIndexes: [0],
      usage: { totalTokens: 10 },
      snapshot: { id: 'snapshot-id' },
      createdAt: 123,
    }

    const summary = {
      _id: event._id,
      runId: event.runId,
      chatId: event.chatId,
      sequence: event.sequence,
      type: event.type,
      status: event.status,
      progressCategory: event.progressCategory,
      progressToolName: event.progressToolName,
      progressHasArtifactTarget: event.progressHasArtifactTarget,
      targetFilePaths: event.targetFilePaths,
      toolCallId: event.toolCallId,
      toolName: event.toolName,
      durationMs: event.durationMs,
      planStepIndex: event.planStepIndex,
      planStepTitle: event.planStepTitle,
      planTotalSteps: event.planTotalSteps,
      completedPlanStepIndexes: event.completedPlanStepIndexes,
      usage: event.usage,
      snapshot: event.snapshot,
      createdAt: event.createdAt,
      contentPreview: event.content.slice(0, 500),
      errorPreview: event.error.slice(0, 500),
    }

    expect(summary).not.toHaveProperty('content')
    expect(summary).not.toHaveProperty('error')
    expect(summary).not.toHaveProperty('args')
    expect(summary).not.toHaveProperty('output')
    expect(summary.contentPreview).toHaveLength(500)
    expect(summary.errorPreview).toHaveLength(500)
    expect(summary.contentPreview).toBe(event.content.slice(0, 500))
    expect(summary.errorPreview).toBe(event.error.slice(0, 500))
  })
})
