'use client'

import type { ModelCompatibilityError } from '@/lib/agent/harness/errors'

interface Props {
  error: ModelCompatibilityError
  onSwitchModel?: () => void
  onReport?: (error: ModelCompatibilityError) => void
}

const MESSAGES: Record<ModelCompatibilityError['kind'], (e: ModelCompatibilityError) => string> = {
  UNMANIFESTED_MODEL: (e) =>
    `Model "${(e as { modelId: string }).modelId}" has no capability entry. It cannot be used in Build mode.`,
  UNVERIFIED_MODEL: (e) =>
    `Model "${(e as { modelId: string }).modelId}" is ${(e as { status: string }).status} and blocked in Build mode.`,
  LEAKED_UNDECLARED_GRAMMAR: (e) =>
    `Model emitted tool-call syntax (${(e as { grammarId: string }).grammarId}) not in its declared grammar list. The run was aborted to prevent corrupted output.`,
  LEAKED_UNKNOWN_GRAMMAR: (_e) =>
    `Model emitted an unknown tool-call syntax. The run was aborted. This may be a new model grammar not yet registered.`,
  PARSER_FAILED: (e) =>
    `Tool-call parsing failed (${(e as { grammarId: string }).grammarId}): ${(e as { cause: string }).cause}`,
}

export function ModelCompatibilityCard({ error, onSwitchModel, onReport }: Props) {
  const message = MESSAGES[error.kind]?.(error) ?? 'An unknown model compatibility error occurred.'

  return (
    <div className="border border-warning/30 bg-warning/10 p-4 text-sm">
      <p className="font-mono font-medium text-foreground">
        Model Compatibility Issue
      </p>
      <p className="mt-1 text-muted-foreground">{message}</p>
      <div className="mt-3 flex gap-2">
        {onSwitchModel && (
          <button
            onClick={onSwitchModel}
            className="bg-warning/15 px-3 py-1 font-mono text-xs font-medium text-foreground hover:bg-warning/25"
          >
            Switch Model
          </button>
        )}
        {onReport && (
          <button
            onClick={() => onReport(error)}
            className="bg-transparent px-3 py-1 font-mono text-xs font-medium text-foreground hover:bg-warning/15"
          >
            Report Issue
          </button>
        )}
      </div>
    </div>
  )
}
