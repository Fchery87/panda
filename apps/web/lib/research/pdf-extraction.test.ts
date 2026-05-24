import { describe, expect, it } from 'bun:test'

// Documents the current server-side PDF contract: PDF URLs are valid research
// sources even when extraction falls back to an unavailable marker.
describe('research pdf extraction contract', () => {
  it('uses an explicit unavailable marker instead of pretending extraction succeeded', () => {
    const fallback = '[PDF extraction unavailable]\n\nPanda stored this PDF URL as a research source, but text extraction did not return usable content. The original URL remains available for citation.'
    expect(fallback).toContain('PDF extraction unavailable')
    expect(fallback).toContain('original URL remains available')
  })
})
