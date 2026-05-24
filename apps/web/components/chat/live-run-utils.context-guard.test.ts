import { describe, expect, it } from 'bun:test'
import { mapRunEventSummariesToProgressSteps } from './live-run-utils'

describe('Context Guard progress metadata', () => {
  it('extracts guarded output metadata from persisted tool result previews', () => {
    const steps = mapRunEventSummariesToProgressSteps([
      {
        _id: 'event-1',
        type: 'progress_step',
        contentPreview: 'Ran command',
        status: 'completed',
        progressCategory: 'tool',
        progressToolName: 'run_command',
        outputPreview: JSON.stringify({
          stdout: 'preview',
          stderr: '',
          exitCode: 0,
          contextGuard: {
            guarded: true,
            classification: 'large',
            rawBytes: 100000,
            returnedBytes: 6000,
            bytesAvoided: 94000,
            evidence: {
              sourceType: 'run_event',
              sourceId: 'tool:abc:command-output',
              chunksWritten: 4,
            },
          },
        }),
        createdAt: 1,
      },
    ])

    expect(steps[0]?.details?.contextGuard?.classification).toBe('large')
    expect(steps[0]?.details?.contextGuard?.bytesAvoided).toBe(94000)
    expect(steps[0]?.details?.contextGuard?.chunksWritten).toBe(4)
    expect(steps[0]?.details?.contextGuard?.sourceId).toBe('tool:abc:command-output')
  })
})
