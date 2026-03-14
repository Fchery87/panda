import { describe, expect, it } from 'bun:test'
import { describePermissionRequest, getCommandApprovalReason } from './permission-presentation'
import { analyzeCommand } from './command-analysis'

describe('permission presentation', () => {
  it('describes file edits as high risk workspace changes', () => {
    const result = describePermissionRequest({
      sessionID: 'session_1',
      messageID: 'message_1',
      tool: 'write_files',
      pattern: 'src/app/page.tsx',
    })

    expect(result.title).toBe('File Edit')
    expect(result.riskTier).toBe('high')
    expect(result.summary).toContain('change files')
  })

  it('describes command execution using command analysis', () => {
    const result = describePermissionRequest({
      sessionID: 'session_1',
      messageID: 'message_1',
      tool: 'run_command',
      pattern: 'bun test && bun run lint',
      metadata: { args: { command: 'bun test && bun run lint' } },
    })

    expect(result.title).toBe('Command Execution')
    expect(result.riskTier).toBe('medium')
    expect(result.detail).toContain('multiple operations')
  })

  it('returns browser-facing approval reasons for command analysis', () => {
    expect(getCommandApprovalReason(analyzeCommand('npm test > out.txt'))).toContain(
      'overwrite files'
    )
    expect(getCommandApprovalReason(analyzeCommand('bun test && bun run lint'))).toContain(
      'multiple operations'
    )
  })
})
