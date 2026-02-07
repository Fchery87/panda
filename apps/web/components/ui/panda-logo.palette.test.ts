import { describe, expect, it } from 'bun:test'

import { resolvePandaLogoPalette } from './panda-logo.palette'

describe('resolvePandaLogoPalette', () => {
  it('returns brand palette when monochrome is false', () => {
    expect(resolvePandaLogoPalette(false)).toEqual({
      baseFill: '#F2F0E6',
      shadowFill: '#E8E4D8',
      accent: '#F9A825',
      ink: '#000',
    })
  })

  it('returns monochrome palette when monochrome is true', () => {
    expect(resolvePandaLogoPalette(true)).toEqual({
      baseFill: 'currentColor',
      shadowFill: 'currentColor',
      accent: 'currentColor',
      ink: 'currentColor',
    })
  })
})
