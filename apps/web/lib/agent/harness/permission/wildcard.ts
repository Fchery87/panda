/**
 * Minimal wildcard matcher supporting:
 *  - `*`  — matches any sequence of characters except `/`
 *  - `**` — matches any sequence of characters including `/`
 *  - literal characters
 */
export function wildcardMatch(pattern: string, value: string): boolean {
  return wildcardToRegExp(pattern).test(value)
}

function wildcardToRegExp(pattern: string): RegExp {
  // Escape regex special chars except * which we handle
  let regStr = ''
  let i = 0
  while (i < pattern.length) {
    const ch = pattern[i]
    if (ch === '*' && pattern[i + 1] === '*') {
      regStr += '.*'
      i += 2
      // consume optional trailing slash
      if (pattern[i] === '/') i++
    } else if (ch === '*') {
      regStr += '[^/]*'
      i++
    } else {
      // escape regex meta characters
      regStr += ch.replace(/[.+^${}()|[\]\\]/g, '\\$&')
      i++
    }
  }
  return new RegExp(`^${regStr}$`)
}
