import { describe, expect, test } from 'bun:test'
import { guardAssistantClaims } from './assistant-claim-guard'

describe('assistant claim guard', () => {
  test('leaves verified file and command claims unchanged', () => {
    const result = guardAssistantClaims({
      content: 'Created `src/a.ts` and ran `bun test` successfully. Tests passed.',
      runEvents: [
        {
          type: 'tool_result',
          toolName: 'write_files',
          output: JSON.stringify({ files: [{ path: 'src/a.ts', success: true }] }),
        },
        {
          type: 'tool_result',
          toolName: 'run_command',
          args: { command: 'bun test' },
          output: JSON.stringify({ exitCode: 0, stdout: 'ok', stderr: '' }),
        },
      ],
      fileExists: (path) => path === 'src/a.ts',
    })

    expect(result.changed).toBe(false)
  })

  test('adds verification note for unbacked file claims', () => {
    const result = guardAssistantClaims({
      content: 'Created `src/missing.ts`.',
      runEvents: [],
      fileExists: () => false,
    })

    expect(result.changed).toBe(true)
    expect(result.content).toContain('Panda verification note')
    expect(result.warnings[0]).toContain('src/missing.ts')
  })

  test('adds verification note for test success without a command receipt', () => {
    const result = guardAssistantClaims({
      content: 'The tests passed.',
      runEvents: [],
    })

    expect(result.changed).toBe(true)
    expect(result.warnings[0]).toContain('Validation success claim is unverified')
  })
})
