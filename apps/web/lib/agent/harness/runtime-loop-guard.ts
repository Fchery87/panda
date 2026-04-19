export function detectCyclicToolPattern(args: {
  history: string[]
  toolCallFrequency: Map<string, number>
  threshold: number
}): boolean {
  const { history, toolCallFrequency, threshold } = args

  if (history.length < 4) {
    return false
  }

  const recent = history.slice(-4)
  const [a, b, c, d] = recent

  if (a !== c || b !== d || a === b) {
    return false
  }

  const toolNames = a?.split('\x1f').map((key) => key.split(':')[0]) ?? []

  const highFreqTools = toolNames.filter((name) => {
    let count = 0
    for (const [key, freq] of toolCallFrequency) {
      if (key.startsWith(`${name}:`) && freq > threshold) {
        count++
      }
    }
    return count > 0
  })

  return highFreqTools.length > 0
}
