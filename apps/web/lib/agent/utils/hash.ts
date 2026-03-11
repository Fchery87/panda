/**
 * String utilities for agentic harness
 */

/**
 * Simple string hash for prompt identification
 * Used across spec templates and engine for generating consistent hashes
 */
export function hashString(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash
  }
  return Math.abs(hash).toString(36).slice(0, 8)
}
