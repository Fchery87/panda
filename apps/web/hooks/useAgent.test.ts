import { describe, expect, it } from 'bun:test'
import { buildPublicSendMessageOptions } from './useAgent'

describe('buildPublicSendMessageOptions', () => {
  it('forwards attachmentsOnly through the public sendMessage wrapper options', () => {
    expect(
      buildPublicSendMessageOptions({
        approvedPlanExecution: true,
        attachmentsOnly: true,
        attachments: [],
      })
    ).toEqual({
      clearInput: true,
      approvedPlanExecution: true,
      attachmentsOnly: true,
      attachments: [],
    })
  })

  it('forwards structured approved plan execution context through the public sendMessage wrapper', () => {
    const plan = {
      chatId: 'chat_1',
      sessionId: 'planning_1',
      title: 'Ship planning execution',
      summary: 'Implement the approved work',
      markdown: '',
      sections: [],
      acceptanceChecks: [],
      status: 'accepted' as const,
      generatedAt: 1,
    }

    expect(
      buildPublicSendMessageOptions({
        approvedPlanExecution: true,
        approvedPlanExecutionContext: {
          sessionId: 'planning_1',
          plan,
        },
      })
    ).toEqual({
      clearInput: true,
      approvedPlanExecution: true,
      approvedPlanExecutionContext: {
        sessionId: 'planning_1',
        plan,
      },
      attachments: undefined,
      attachmentsOnly: undefined,
    })
  })
})
