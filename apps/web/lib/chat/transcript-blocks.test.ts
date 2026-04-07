import { describe, expect, test } from 'bun:test'
import {
  buildAssistantMessageTranscriptBlocks,
  buildTranscriptFeedItems,
} from './transcript-blocks'
import type { Message } from '@/components/chat/types'

describe('transcript blocks', () => {
  test('builds assistant message blocks for reasoning, text, and tools', () => {
    const message: Message = {
      _id: 'assistant-1',
      role: 'assistant',
      content: 'Implemented the panel wiring.',
      reasoningContent: 'Inspecting the panel, then mapping role labels.',
      toolCalls: [
        {
          id: 'tool-1',
          name: 'read_files',
          args: { paths: ['apps/web/components/chat/MessageList.tsx'] },
          status: 'completed',
          result: {
            output: 'ok',
            durationMs: 42,
          },
        },
      ],
      annotations: {
        mode: 'build',
      },
      createdAt: 100,
    }

    expect(buildAssistantMessageTranscriptBlocks(message)).toEqual([
      expect.objectContaining({ kind: 'thinking_teaser' }),
      expect.objectContaining({ kind: 'assistant_text' }),
      expect.objectContaining({ kind: 'tool_result' }),
    ])
  })

  test('adds compact transcript tail items for live progress and approvals', () => {
    const messages: Message[] = [
      {
        _id: 'user-1',
        role: 'user',
        content: 'Refactor the transcript.',
        createdAt: 100,
      },
      {
        _id: 'assistant-1',
        role: 'assistant',
        content: 'Working on it.',
        annotations: { mode: 'build' },
        createdAt: 200,
      },
    ]

    const items = buildTranscriptFeedItems({
      messages,
      isStreaming: true,
      liveSteps: [
        {
          id: 'step-1',
          content: 'Mapped transcript event blocks',
          status: 'running',
          category: 'analysis',
          createdAt: 250,
        },
      ],
      runEvents: [
        {
          _id: 'event-1',
          runId: 'run-1',
          type: 'snapshot',
          content: 'Snapshot saved',
          snapshot: {
            hash: 'abc123',
            step: 1,
            files: ['apps/web/components/chat/MessageList.tsx'],
            timestamp: 260,
          },
          createdAt: 260,
        },
      ],
      pendingSpec: {
        id: 'spec-1',
        version: 1,
        tier: 'explicit',
        status: 'draft',
        intent: {
          goal: 'Keep the harness stable while refactoring the transcript',
          userMessage: 'Refactor the transcript',
          constraints: [],
          acceptanceCriteria: [],
        },
        plan: {
          steps: [],
          files: [],
        },
        createdAt: 0,
        updatedAt: 0,
      } as never,
      planStatus: 'approved',
    })

    expect(items.map((item) => item.type)).toEqual([
      'message',
      'message',
      'block',
      'block',
      'block',
      'block',
    ])
    expect(items[2]).toEqual(
      expect.objectContaining({
        type: 'block',
        block: expect.objectContaining({ kind: 'progress_line' }),
      })
    )
  })
})
