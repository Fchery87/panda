/**
 * Identifier - Generate unique, sortable identifiers
 *
 * Uses ascending identifiers that sort lexicographically by time
 */

let counter = 0
const MAX_COUNTER = 36 ** 6

/**
 * Generate a unique identifier that sorts ascending by creation time
 */
export function ascending(prefix: string = ''): Identifier {
  const timestamp = Date.now().toString(36).padStart(9, '0')
  const random = Math.random().toString(36).slice(2, 8)

  counter = (counter + 1) % MAX_COUNTER
  const sequence = counter.toString(36).padStart(4, '0')

  return `${prefix}${timestamp}${sequence}${random}`
}

/**
 * Generate a random identifier
 */
export function random(length: number = 16): Identifier {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

/**
 * Parse timestamp from ascending identifier
 */
export function parseTimestamp(id: Identifier): number | null {
  try {
    const timestampPart = id.slice(0, 9)
    return parseInt(timestampPart, 36)
  } catch {
    return null
  }
}

/**
 * Compare two identifiers by creation time
 */
export function compare(a: Identifier, b: Identifier): number {
  return a.localeCompare(b)
}

export type Identifier = string
