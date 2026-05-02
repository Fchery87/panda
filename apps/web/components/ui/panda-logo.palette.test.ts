import { describe, expect, it } from 'bun:test'

import { resolvePandaLogoPalette } from './panda-logo.palette'

describe('resolvePandaLogoPalette', () => {
  it('returns brand palette when monochrome is false', () => {
    expect(resolvePandaLogoPalette(false)).toEqual({
      ink: '#050505',
      faceLeft: '#FBF8EA',
      faceRight: '#F3EEDC',
      faceHighlight: '#F8F4E5',
      muzzleLight: '#F9F5E7',
      accent: '#F6A817',
      accentGlow: '#F4A51C',
    })
  })

  it('returns monochrome palette when monochrome is true', () => {
    expect(resolvePandaLogoPalette(true)).toEqual({
      ink: 'currentColor',
      faceLeft: 'currentColor',
      faceRight: 'currentColor',
      faceHighlight: 'currentColor',
      muzzleLight: 'currentColor',
      accent: 'currentColor',
      accentGlow: 'currentColor',
    })
  })
})
