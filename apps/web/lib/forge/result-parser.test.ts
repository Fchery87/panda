import { describe, expect, test } from 'bun:test'
import { parseWorkerResult } from './result-parser'

describe('forge result parser', () => {
  test('parses a valid worker result payload', () => {
    const result = parseWorkerResult(
      JSON.stringify({
        outcome: 'completed',
        summary: 'Implemented the snapshot query and added tests.',
        filesTouched: ['convex/forge.ts'],
        testsWritten: ['convex/forge.test.ts'],
        testsRun: [
          {
            command: 'bun test convex/forge.test.ts',
            status: 'passed',
          },
        ],
        evidenceRefs: ['artifact:test:snapshot-query'],
        unresolvedRisks: [],
        followUpActions: [],
        suggestedTaskStatus: 'in_review',
      })
    )

    expect(result.outcome).toBe('completed')
    expect(result.testsRun[0]?.status).toBe('passed')
    expect(result.suggestedTaskStatus).toBe('in_review')
  })

  test('rejects malformed worker result payloads', () => {
    expect(() => parseWorkerResult('not-json')).toThrow(/worker result/i)
    expect(() =>
      parseWorkerResult(
        JSON.stringify({
          outcome: 'completed',
          summary: 'Missing the rest of the contract',
        })
      )
    ).toThrow(/worker result/i)
  })
})
