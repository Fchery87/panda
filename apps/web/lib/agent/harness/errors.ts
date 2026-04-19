export type ModelCompatibilityError =
  | { kind: 'UNMANIFESTED_MODEL'; providerId: string; modelId: string }
  | { kind: 'UNVERIFIED_MODEL'; providerId: string; modelId: string; status: string }
  | { kind: 'LEAKED_UNDECLARED_GRAMMAR'; grammarId: string; snippet: string; modelId: string }
  | { kind: 'LEAKED_UNKNOWN_GRAMMAR'; snippet: string; modelId: string }
  | { kind: 'PARSER_FAILED'; grammarId: string; snippet: string; cause: string }

export type TerminationReason =
  | { kind: 'completed' }
  | { kind: 'user-abort' }
  | { kind: 'step-budget-exhausted'; budget: number }
  | { kind: 'stream-idle'; idleMs: number }
  | { kind: 'no-tool-calls-in-build-mode'; narrationTurns: number }
  | { kind: 'network-timeout'; cause: string }
  | { kind: 'preflight-failed'; code: string }
  | { kind: 'tool-call-leak-detected'; grammarId: string }

export class HarnessError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message)
    this.name = 'HarnessError'
  }
}

export class PreflightError extends HarnessError {
  constructor(code: string, message: string) {
    super(message, code)
    this.name = 'PreflightError'
  }
}

export class GrammarLeakError extends HarnessError {
  constructor(public readonly compat: ModelCompatibilityError) {
    super(`Grammar leak: ${compat.kind}`, compat.kind, compat as unknown as Record<string, unknown>)
    this.name = 'GrammarLeakError'
  }
}
