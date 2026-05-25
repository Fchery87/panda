import { verifyClaim } from './claim-verifier'

const FILE_CLAIM_PATTERN = /\b(?:created|added|updated|modified|wrote)\s+`([^`]+)`/giu
const COMMAND_CLAIM_PATTERN = /\b(?:ran|executed)\s+`([^`]+)`/giu
const TEST_PASS_PATTERN = /\b(?:tests?|checks?|build)\s+(?:passed|succeeded|completed successfully)\b/iu

export interface GuardAssistantClaimsArgs {
  content: string
  runEvents: Array<{
    type: string
    toolName?: string
    args?: Record<string, unknown>
    output?: string
    error?: string
    targetFilePaths?: string[]
    status?: string
  }>
  fileExists?: (path: string) => boolean
}

export interface GuardAssistantClaimsResult {
  content: string
  changed: boolean
  warnings: string[]
}

function unique(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))]
}

function extractMatches(content: string, pattern: RegExp): string[] {
  return unique([...content.matchAll(pattern)].map((match) => match[1] ?? ''))
}

export function guardAssistantClaims(args: GuardAssistantClaimsArgs): GuardAssistantClaimsResult {
  const warnings: string[] = []
  const fileClaims = extractMatches(args.content, FILE_CLAIM_PATTERN)
  const commandClaims = extractMatches(args.content, COMMAND_CLAIM_PATTERN)

  for (const path of fileClaims) {
    const result = verifyClaim({
      kind: 'file_write',
      target: path,
      runEvents: args.runEvents,
      fileExists: args.fileExists,
    })
    if (result.status !== 'verified') {
      warnings.push(`File claim for \`${path}\` is ${result.status}; ${result.errors.join('; ')}`)
    }
  }

  for (const command of commandClaims) {
    const result = verifyClaim({ kind: 'command_run', target: command, runEvents: args.runEvents })
    if (result.status !== 'verified') {
      warnings.push(`Command claim for \`${command}\` is ${result.status}; ${result.errors.join('; ')}`)
    }
  }

  if (TEST_PASS_PATTERN.test(args.content)) {
    const hasVerifiedCommand = args.runEvents.some((event) => {
      if (event.toolName !== 'run_command') return false
      const command = String(event.args?.command ?? '').toLowerCase()
      if (!/(test|lint|typecheck|build|format)/.test(command)) return false
      try {
        const parsed = JSON.parse(event.output ?? '{}') as { exitCode?: unknown }
        return parsed.exitCode === 0 && !event.error
      } catch {
        return false
      }
    })
    if (!hasVerifiedCommand) {
      warnings.push('Validation success claim is unverified; no successful test/lint/typecheck/build command receipt was found.')
    }
  }

  if (warnings.length === 0) return { content: args.content, changed: false, warnings }

  return {
    content: `${args.content.trim()}\n\n> Panda verification note: Some success claims could not be fully verified from execution receipts. Treat them as attempted until the Proof/Changes surfaces confirm them.\n> ${warnings.join('\n> ')}`,
    changed: true,
    warnings,
  }
}
