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
    <div className="rounded-none border border-orange-200 bg-orange-50 p-4 text-sm dark:border-orange-900 dark:bg-orange-950">
      <p className="font-mono font-medium text-orange-900 dark:text-orange-100">
        Model Compatibility Issue
      </p>
      <p className="mt-1 text-orange-800 dark:text-orange-200">{message}</p>
      <div className="mt-3 flex gap-2">
        {onSwitchModel && (
          <button
            onClick={onSwitchModel}
            className="rounded-none bg-orange-100 px-3 py-1 font-mono text-xs font-medium text-orange-900 hover:bg-orange-200 dark:bg-orange-900 dark:text-orange-100 dark:hover:bg-orange-800"
          >
            Switch Model
          </button>
        )}
        {onReport && (
          <button
            onClick={() => onReport(error)}
            className="rounded-none bg-transparent px-3 py-1 font-mono text-xs font-medium text-orange-700 hover:bg-orange-100 dark:text-orange-300 dark:hover:bg-orange-900"
          >
            Report Issue
          </button>
        )}
      </div>
    </div>
  )
}
