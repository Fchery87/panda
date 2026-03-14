/**
 * Tool Call Repair
 *
 * Repairs malformed tool call JSON and provides fuzzy matching for tool names.
 * Inspired by OpenCode's experimental_repairToolCall() functionality.
 */

import type { ToolCall, ToolResult } from '../../llm/types'

/**
 * Common JSON repair operations
 */
export function repairJSON(raw: string): string {
  let repaired = raw.trim()

  // Fix trailing commas in objects and arrays
  repaired = repaired.replace(/,(\s*[}\]])/g, '$1')

  // Fix single quotes to double quotes (simple cases)
  // Only replace single quotes that appear to be string delimiters
  repaired = repaired.replace(/([{[,]\s*)'([^']+)'(\s*[}\],:])/g, '$1"$2"$3')

  // Fix unquoted object keys
  repaired = repaired.replace(/([{,]\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/g, '$1"$2":')

  // Fix unclosed braces - add missing closing braces
  const openBraces = (repaired.match(/{/g) || []).length
  const closeBraces = (repaired.match(/}/g) || []).length
  if (openBraces > closeBraces) {
    repaired += '}'.repeat(openBraces - closeBraces)
  }

  // Fix unclosed brackets
  const openBrackets = (repaired.match(/\[/g) || []).length
  const closeBrackets = (repaired.match(/\]/g) || []).length
  if (openBrackets > closeBrackets) {
    repaired += ']'.repeat(openBrackets - closeBrackets)
  }

  // Fix missing quotes around string values (heuristic)
  // Pattern: colon followed by a word not in quotes, followed by comma or closing brace
  repaired = repaired.replace(/:(\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)\s*([,}\]])/g, ':"$2"$3')

  return repaired
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = []

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i]
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j] + 1 // deletion
        )
      }
    }
  }

  return matrix[b.length][a.length]
}

/**
 * Fuzzy match a tool name against known tools
 * Returns the closest match if within threshold, null otherwise
 */
export function fuzzyMatchToolName(name: string, known: string[]): string | null {
  const normalizedName = name.toLowerCase().trim()

  // Exact match (case insensitive)
  const exactMatch = known.find((k) => k.toLowerCase() === normalizedName)
  if (exactMatch) {
    return exactMatch
  }

  // Check Levenshtein distance for each known tool
  let bestMatch: string | null = null
  let bestDistance = Infinity
  const THRESHOLD = 2

  for (const knownTool of known) {
    const distance = levenshteinDistance(normalizedName, knownTool.toLowerCase())

    if (distance < bestDistance && distance <= THRESHOLD) {
      bestDistance = distance
      bestMatch = knownTool
    }
  }

  // Additional heuristic: check for common typos/prefixes
  if (!bestMatch) {
    // Check if the name contains a known tool name as substring
    for (const knownTool of known) {
      if (
        normalizedName.includes(knownTool.toLowerCase()) ||
        knownTool.toLowerCase().includes(normalizedName)
      ) {
        return knownTool
      }
    }
  }

  return bestMatch
}

/**
 * Wrap an invalid tool call in a proper ToolResult with error message
 * This allows the LLM to see what went wrong and potentially correct itself
 */
export function wrapInvalidToolCall(name: string, args: string, error: string): ToolResult {
  return {
    toolCallId: `invalid_${Date.now()}`,
    toolName: name,
    args: { raw: args, parseError: error },
    output: '',
    error: `Invalid tool call: ${error}. The tool '${name}' could not be executed. Please ensure you're using a valid tool name and properly formatted JSON arguments.`,
    durationMs: 0,
  }
}

/**
 * Attempt to parse and repair a tool call
 * Returns the repaired tool call or null if irreparable
 */
export function parseAndRepairToolCall(
  toolCall: ToolCall,
  knownToolNames: string[]
): { toolCall: ToolCall; repaired: boolean; warnings: string[] } | null {
  const warnings: string[] = []
  let repaired = false

  // Try to repair tool name
  let toolName = toolCall.function.name
  if (!knownToolNames.includes(toolName)) {
    const matchedName = fuzzyMatchToolName(toolName, knownToolNames)
    if (matchedName) {
      warnings.push(`Tool name '${toolName}' was corrected to '${matchedName}'`)
      toolName = matchedName
      repaired = true
    } else {
      // Cannot repair - unknown tool
      return null
    }
  }

  // Try to repair arguments JSON
  let args = toolCall.function.arguments
  try {
    JSON.parse(args)
  } catch {
    // Try repair
    const repairedArgs = repairJSON(args)
    try {
      JSON.parse(repairedArgs)
      warnings.push('Tool arguments JSON was repaired automatically')
      args = repairedArgs
      repaired = true
    } catch {
      // Cannot repair arguments
      return null
    }
  }

  return {
    toolCall: {
      ...toolCall,
      function: {
        ...toolCall.function,
        name: toolName,
        arguments: args,
      },
    },
    repaired,
    warnings,
  }
}

/**
 * Safe JSON parse with repair fallback
 */
export function safeJSONParse<T = unknown>(raw: string, defaultValue: T | null = null): T | null {
  try {
    return JSON.parse(raw) as T
  } catch {
    const repaired = repairJSON(raw)
    try {
      return JSON.parse(repaired) as T
    } catch {
      return defaultValue
    }
  }
}

/**
 * Check if a string looks like it might be JSON
 */
export function looksLikeJSON(str: string): boolean {
  const trimmed = str.trim()
  return (
    (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
    (trimmed.startsWith('[') && trimmed.endsWith(']'))
  )
}
