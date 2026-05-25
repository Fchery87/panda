import { describe, expect, test } from 'bun:test'
import { successVerbForClaim, verifyClaim } from './claim-verifier'

describe('claim verifier', () => {
  test('marks file claims verified only when tool receipt and filesystem evidence both exist', () => {
    const result = verifyClaim({
      kind: 'file_write',
      target: 'src/new-file.ts',
      runEvents: [
        {
          type: 'tool_result',
          toolName: 'write_files',
          output: JSON.stringify({
            status: 'pending_review',
            files: [{ path: 'src/new-file.ts', success: true }],
          }),
        },
      ],
      fileExists: (path) => path === 'src/new-file.ts',
    })

    expect(result.status).toBe('verified')
    expect(successVerbForClaim(result)).toBe('created')
  })

  test('marks queued writes as attempted when file tree verification is missing', () => {
    const result = verifyClaim({
      kind: 'file_write',
      target: 'src/new-file.ts',
      runEvents: [
        {
          type: 'tool_result',
          toolName: 'write_files',
          output: JSON.stringify({
            files: [{ path: 'src/new-file.ts', success: true }],
          }),
        },
      ],
      fileExists: () => false,
    })

    expect(result.status).toBe('attempted')
    expect(successVerbForClaim(result)).toBe('attempted')
  })

  test('verifies successful command claims from run_command receipts', () => {
    const result = verifyClaim({
      kind: 'command_run',
      target: 'bun test',
      runEvents: [
        {
          type: 'tool_result',
          toolName: 'run_command',
          args: { command: 'bun test' },
          output: JSON.stringify({ stdout: 'ok', stderr: '', exitCode: 0 }),
        },
      ],
    })

    expect(result.status).toBe('verified')
  })

  test('marks failed command claims as failed', () => {
    const result = verifyClaim({
      kind: 'test_result',
      target: 'bun test',
      runEvents: [
        {
          type: 'tool_result',
          toolName: 'run_command',
          args: { command: 'bun test' },
          output: JSON.stringify({ stdout: '', stderr: 'fail', exitCode: 1 }),
          error: 'Command failed with exit code 1',
        },
      ],
    })

    expect(result.status).toBe('failed')
    expect(successVerbForClaim(result)).toBe('failed')
  })
})
