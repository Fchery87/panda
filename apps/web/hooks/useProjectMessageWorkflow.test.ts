import { describe, expect, test } from 'bun:test'
import type { Id } from '@convex/_generated/dataModel'
import { buildDefaultPlanningQuestions } from '@/lib/planning/question-engine'
import {
  buildApprovedPlanExecutionPayload,
  buildArchitectPlanningIntakeRequest,
  executeMessageWorkflowAction,
  shouldQueuePendingDirectSend,
  resolveMessageWorkflowAction,
  shouldRouteMessageToPlanningIntake,
} from './useProjectMessageWorkflow'

describe('useProjectMessageWorkflow architect intake-first behavior', () => {
  test('routes a new architect message into planning intake', () => {
    expect(
      shouldRouteMessageToPlanningIntake({
        mode: 'architect',
        trimmedContent: 'Plan the new dashboard flow',
      })
    ).toBe(true)
  })

  test('keeps an active architect planning session on the intake path', () => {
    expect(
      shouldRouteMessageToPlanningIntake({
        mode: 'architect',
        trimmedContent: 'Also cover migration steps',
      })
    ).toBe(true)
  })

  test('does not route code or build messages into planning intake', () => {
    expect(
      shouldRouteMessageToPlanningIntake({
        mode: 'code',
        trimmedContent: 'Ship it',
      })
    ).toBe(false)
    expect(
      shouldRouteMessageToPlanningIntake({
        mode: 'build',
        trimmedContent: 'Do it directly',
      })
    ).toBe(false)
  })

  test('builds intake requests with fallback planning questions from the trimmed task summary', () => {
    expect(buildArchitectPlanningIntakeRequest('  Plan the new dashboard flow  ')).toEqual({
      taskSummary: 'Plan the new dashboard flow',
      questions: buildDefaultPlanningQuestions({
        taskSummary: 'Plan the new dashboard flow',
      }),
    })
  })

  test('architect with no active chat creates the chat and then starts intake without direct send', () => {
    expect(
      resolveMessageWorkflowAction({
        hasActiveChat: false,
        mode: 'architect',
        trimmedContent: 'Plan the new dashboard flow',
      })
    ).toEqual({
      type: 'create_chat_and_start_planning_intake',
      intakeRequest: {
        taskSummary: 'Plan the new dashboard flow',
        questions: buildDefaultPlanningQuestions({
          taskSummary: 'Plan the new dashboard flow',
        }),
      },
    })
  })

  test('architect with an active planning session continues the intake path', () => {
    expect(
      resolveMessageWorkflowAction({
        hasActiveChat: true,
        mode: 'architect',
        trimmedContent: 'Also cover migration steps',
        activePlanningSessionId: 'planning_1',
      })
    ).toEqual({
      type: 'resume_planning_intake',
    })
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

  test('architect with no active chat creates chat and starts intake without queueing a direct send', async () => {
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
      startPlanningIntake: async ({
        chatId,
        taskSummary,
      }: {
        chatId: Id<'chats'>
        taskSummary: string
        questions: ReturnType<typeof buildDefaultPlanningQuestions>
      }) => {
        calls.push(`start-intake:${chatId}:${taskSummary}`)
      },
      queuePendingDirectSend: () => {
        calls.push('queue-direct-send')
      },
    })

    expect(handled).toBe(true)
    expect(calls).toEqual([
      'create-chat',
      'select-chat:chat_new',
      'start-intake:chat_new:Plan the new dashboard flow',
    ])
  })

  test('architect with an active planning session does not start intake again and does not queue a direct send', async () => {
    const calls: string[] = []

    await expect(
      executeMessageWorkflowAction({
        workflowAction: resolveMessageWorkflowAction({
          hasActiveChat: true,
          mode: 'architect',
          trimmedContent: 'Also cover migration steps',
          activePlanningSessionId: 'planning_1',
        }),
        activeChatId: 'chat_1' as Id<'chats'>,
        startPlanningIntake: async () => {
          calls.push('start-intake')
        },
        queuePendingDirectSend: () => {
          calls.push('queue-direct-send')
        },
      })
    ).rejects.toThrow(
      'A planning intake session is already active and must be completed or cleared first'
    )

    expect(calls).toEqual([])
  })

  test('architect create-chat intake fails fast when startPlanningIntake is missing', async () => {
    await expect(
      executeMessageWorkflowAction({
        workflowAction: resolveMessageWorkflowAction({
          hasActiveChat: false,
          mode: 'architect',
          trimmedContent: 'Plan the new dashboard flow',
        }),
        createChat: async () => 'chat_new' as Id<'chats'>,
        onChatCreated: () => undefined,
      })
    ).rejects.toThrow('Cannot start planning intake without a startPlanningIntake callback')
  })

  test('architect active-chat intake fails fast when startPlanningIntake is missing', async () => {
    await expect(
      executeMessageWorkflowAction({
        workflowAction: resolveMessageWorkflowAction({
          hasActiveChat: true,
          mode: 'architect',
          trimmedContent: 'Plan the new dashboard flow',
        }),
        activeChatId: 'chat_1' as Id<'chats'>,
      })
    ).rejects.toThrow('Cannot start planning intake without a startPlanningIntake callback')
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

  test('architect create-chat intake is not blocked by provider gating', () => {
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

  test('falls back to legacy prose wrapping when no structured approved plan context exists', () => {
    const result = buildApprovedPlanExecutionPayload({
      content: 'Execute the approved plan.',
      approvedPlanExecution: true,
      planDraft: '# Approved Plan\n\n- Step 1',
    })

    expect(result.approvedPlanExecutionContext).toBeUndefined()
    expect(result.content).toContain('Approved plan:')
    expect(result.content).toContain('# Approved Plan')
  })
})
