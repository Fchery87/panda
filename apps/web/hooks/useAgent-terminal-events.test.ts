import { describe, expect, test } from 'bun:test'
import { reduceTerminalAgentEvent } from './useAgent-terminal-events'

describe('reduceTerminalAgentEvent', () => {
  test('keeps error terminal state when a late complete arrives afterward', () => {
    const afterError = reduceTerminalAgentEvent(
      { runFinalized: false, terminalStatus: null },
      'error'
    )

    expect(afterError).toEqual({
      shouldProcess: true,
      runFinalized: true,
      terminalStatus: 'error',
    })

    const afterLateComplete = reduceTerminalAgentEvent(
      {
        runFinalized: afterError.runFinalized,
        terminalStatus: afterError.terminalStatus,
      },
      'complete'
    )

    expect(afterLateComplete).toEqual({
      shouldProcess: false,
      runFinalized: true,
      terminalStatus: 'error',
    })
  })

  test('keeps completed terminal state when a late error arrives afterward', () => {
    const afterComplete = reduceTerminalAgentEvent(
      { runFinalized: false, terminalStatus: null },
      'complete'
    )

    expect(afterComplete).toEqual({
      shouldProcess: true,
      runFinalized: true,
      terminalStatus: 'complete',
    })

    const afterLateError = reduceTerminalAgentEvent(
      {
        runFinalized: afterComplete.runFinalized,
        terminalStatus: afterComplete.terminalStatus,
      },
      'error'
    )

    expect(afterLateError).toEqual({
      shouldProcess: false,
      runFinalized: true,
      terminalStatus: 'complete',
    })
  })
})
