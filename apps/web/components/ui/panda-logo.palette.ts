export interface PandaLogoPalette {
  baseFill: string
  shadowFill: string
  accent: string
  ink: string
}

export function resolvePandaLogoPalette(monochrome: boolean): PandaLogoPalette {
  if (monochrome) {
    return {
      baseFill: 'currentColor',
      shadowFill: 'currentColor',
      accent: 'currentColor',
      ink: 'currentColor',
    }
  }

  return {
    baseFill: '#F2F0E6',
    shadowFill: '#E8E4D8',
    accent: '#F9A825',
    ink: '#000',
  }
}
