import { describe, expect, it } from 'bun:test'
import {
  buildFailedRunEvent,
  buildPublicSendMessageOptions,
  buildSendMessageContent,
  buildSpecCancelledRunEvent,
} from './useAgent'

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

describe('buildSendMessageContent', () => {
  it('returns the attachment placeholder when attachments are submitted without text', () => {
    expect(
      buildSendMessageContent('   ', {
        attachmentsOnly: true,
        attachments: [
          {
            storageId: 'storage_1' as never,
            kind: 'file',
            filename: 'notes.txt',
          },
        ],
        includeEditorContext: false,
      })
    ).toBe('[User attached files for review.]')
  })
})

describe('useAgent run event builders', () => {
  it('builds a stable spec-cancelled run event payload', () => {
    expect(buildSpecCancelledRunEvent()).toEqual({
      type: 'spec_cancelled',
      content: 'Specification approval cancelled',
      status: 'stopped',
    })
  })

  it('builds a stable failed run event payload', () => {
    expect(buildFailedRunEvent('boom')).toEqual({
      type: 'error',
      error: 'boom',
      status: 'failed',
    })
  })
})
