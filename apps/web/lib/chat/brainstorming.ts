export type BrainstormPhase = 'discovery' | 'options' | 'validated_plan'

const PHASE_PATTERN = /brainstorm\s+phase\s*:\s*(discovery|options|validated_plan)/i

export function extractBrainstormPhase(content: string): BrainstormPhase | null {
  const match = content.match(PHASE_PATTERN)
  if (!match) return null

  const phase = match[1]?.toLowerCase()
  if (phase === 'discovery' || phase === 'options' || phase === 'validated_plan') {
    return phase
  }
  return null
}

export function stripBrainstormPhaseMarker(content: string): string {
  return content.replace(
    /^.*brainstorm\s+phase\s*:\s*(?:discovery|options|validated_plan).*\n?/im,
    ''
  )
}
