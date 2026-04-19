import { describe, expect, test } from 'bun:test'
import type { Id } from '@convex/_generated/dataModel'
import {
  buildApprovedPlanExecutionPayload,
  executeMessageWorkflowAction,
  shouldQueuePendingDirectSend,
  resolveMessageWorkflowAction,
} from './useProjectMessageWorkflow'

describe('useProjectMessageWorkflow direct-send behavior', () => {
  test('architect with no active chat creates the chat and then sends directly', () => {
    expect(
      resolveMessageWorkflowAction({
        hasActiveChat: false,
        mode: 'architect',
        trimmedContent: 'Plan the new dashboard flow',
      })
    ).toEqual({ type: 'create_chat_and_send_directly' })
  })

  test('architect with an active planning session still sends directly', () => {
    expect(
      resolveMessageWorkflowAction({
        hasActiveChat: true,
        mode: 'architect',
        trimmedContent: 'Also cover migration steps',
        activePlanningSessionId: 'planning_1',
      })
    ).toEqual({ type: 'send_directly' })
  })

  test('code and build messages keep the direct-send behavior unchanged', () => {
    expect(
      resolveMessageWorkflowAction({
        hasActiveChat: true,
        mode: 'code',
        trimmedContent: 'Ship it',
      })
    ).toEqual({ type: 'send_directly' })
    expect(
      resolveMessageWorkflowAction({
        hasActiveChat: false,
        mode: 'build',
        trimmedContent: 'Do it directly',
      })
    ).toEqual({ type: 'create_chat_and_send_directly' })
  })

  test('architect with no active chat creates chat and queues a direct send', async () => {
    const calls: string[] = []

    const handled = await executeMessageWorkflowAction({
      workflowAction: resolveMessageWorkflowAction({
        hasActiveChat: false,
        mode: 'architect',
        trimmedContent: 'Plan the new dashboard flow',
      }),
      createChat: async () => {
        calls.push('create-chat')
        return 'chat_new' as Id<'chats'>
      },
      onChatCreated: (chatId: Id<'chats'>) => {
        calls.push(`select-chat:${chatId}`)
      },
      queuePendingDirectSend: () => {
        calls.push('queue-direct-send')
      },
    })

    expect(handled).toBe(true)
    expect(calls).toEqual(['create-chat', 'select-chat:chat_new', 'queue-direct-send'])
  })

  test('code and build direct-send behavior stays unchanged in the workflow executor', async () => {
    const noActiveChatCalls: string[] = []
    const createdAndQueued = await executeMessageWorkflowAction({
      workflowAction: resolveMessageWorkflowAction({
        hasActiveChat: false,
        mode: 'build',
        trimmedContent: 'Do it directly',
      }),
      createChat: async () => {
        noActiveChatCalls.push('create-chat')
        return 'chat_build' as Id<'chats'>
      },
      onChatCreated: (chatId: Id<'chats'>) => {
        noActiveChatCalls.push(`select-chat:${chatId}`)
      },
      queuePendingDirectSend: () => {
        noActiveChatCalls.push('queue-direct-send')
      },
    })
    const activeChatCalls: string[] = []
    const directSendContinues = await executeMessageWorkflowAction({
      workflowAction: resolveMessageWorkflowAction({
        hasActiveChat: true,
        mode: 'code',
        trimmedContent: 'Ship it',
      }),
      activeChatId: 'chat_code' as Id<'chats'>,
      queuePendingDirectSend: () => {
        activeChatCalls.push('queue-direct-send')
      },
    })

    expect(createdAndQueued).toBe(true)
    expect(noActiveChatCalls).toEqual([
      'create-chat',
      'select-chat:chat_build',
      'queue-direct-send',
    ])
    expect(directSendContinues).toBe(false)
    expect(activeChatCalls).toEqual([])
  })

  test('newly created direct-send chats keep context files on the queued pending message path', () => {
    expect(
      shouldQueuePendingDirectSend({
        workflowAction: resolveMessageWorkflowAction({
          hasActiveChat: false,
          mode: 'build',
          trimmedContent: 'Do it directly',
        }),
        providerAvailable: true,
      })
    ).toBe(true)
  })

  test('does not queue pending direct send when provider is unavailable on create-chat direct-send path', () => {
    expect(
      shouldQueuePendingDirectSend({
        workflowAction: resolveMessageWorkflowAction({
          hasActiveChat: false,
          mode: 'build',
          trimmedContent: 'Do it directly',
        }),
        providerAvailable: false,
      })
    ).toBe(false)
  })

  test('architect create-chat direct send remains blocked when provider is unavailable', () => {
    expect(
      shouldQueuePendingDirectSend({
        workflowAction: resolveMessageWorkflowAction({
          hasActiveChat: false,
          mode: 'architect',
          trimmedContent: 'Plan the new dashboard flow',
        }),
        providerAvailable: false,
      })
    ).toBe(false)
  })

  test('prefers structured approved-plan execution context over prose wrapping', () => {
    const artifact = {
      chatId: 'chat_1',
      sessionId: 'planning_1',
      title: 'Ship planning execution',
      summary: 'Implement the approved work',
      markdown: '',
      sections: [{ id: 'scope', title: 'Scope', content: 'Update the workflow', order: 10 }],
      acceptanceChecks: ['Run focused tests'],
      status: 'accepted' as const,
      generatedAt: 1,
    }

    expect(
      buildApprovedPlanExecutionPayload({
        content: 'Execute the approved plan.',
        approvedPlanExecution: true,
        activePlanningSessionId: 'planning_1',
        approvedPlanArtifact: artifact,
      })
    ).toEqual({
      content: 'Execute the approved plan.',
      approvedPlanExecutionContext: {
        sessionId: 'planning_1',
        plan: artifact,
      },
    })
  })

  test('forwards artifact as approvedPlanExecutionContext even when session IDs do not match', () => {
    const artifact = {
      chatId: 'chat_1',
      sessionId: 'planning_old',
      title: 'Old plan',
      summary: '',
      markdown: '',
      sections: [],
      acceptanceChecks: [],
      status: 'accepted' as const,
      generatedAt: 1,
    }

    const result = buildApprovedPlanExecutionPayload({
      content: 'Execute the approved plan.',
      approvedPlanExecution: true,
      activePlanningSessionId: 'planning_new',
      approvedPlanArtifact: artifact,
    })

    expect(result.content).toBe('Execute the approved plan.')
    expect(result.approvedPlanExecutionContext).toEqual({
      sessionId: 'planning_old',
      plan: artifact,
    })
  })

  test('passes content through unchanged when only a raw planDraft is present (no structured artifact)', () => {
    const result = buildApprovedPlanExecutionPayload({
      content: 'Execute the approved plan.',
      approvedPlanExecution: true,
      planDraft: '# Approved Plan\n\n- Step 1',
    })

    expect(result.approvedPlanExecutionContext).toBeUndefined()
    expect(result.content).toBe('Execute the approved plan.')
  })
})
