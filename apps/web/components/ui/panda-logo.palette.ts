export interface PandaLogoPalette {
  ink: string
  faceLeft: string
  faceRight: string
  faceHighlight: string
  muzzleLight: string
  accent: string
  accentGlow: string
}

export function resolvePandaLogoPalette(monochrome: boolean): PandaLogoPalette {
  if (monochrome) {
    return {
      ink: 'currentColor',
      faceLeft: 'currentColor',
      faceRight: 'currentColor',
      faceHighlight: 'currentColor',
      muzzleLight: 'currentColor',
      accent: 'currentColor',
      accentGlow: 'currentColor',
    }
  }

  return {
    ink: '#050505',
    faceLeft: '#FBF8EA',
    faceRight: '#F3EEDC',
    faceHighlight: '#F8F4E5',
    muzzleLight: '#F9F5E7',
    accent: '#F6A817',
    accentGlow: '#F4A51C',
  }
}
