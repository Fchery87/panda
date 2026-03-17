import { describe, it, expect } from 'bun:test'
import { POST } from '../route'

describe('POST /api/providers/openai-compatible/test', () => {
  it('returns 400 when API key is missing', async () => {
    const request = new Request('http://localhost/api/providers/openai-compatible/test', {
      method: 'POST',
      body: JSON.stringify({ baseUrl: 'https://api.example.com/v1' }),
    })

    const response = await POST(request as any)
    expect(response.status).toBe(400)
  })

  it('returns 400 when base URL is missing', async () => {
    const request = new Request('http://localhost/api/providers/openai-compatible/test', {
      method: 'POST',
      body: JSON.stringify({ apiKey: 'test-key' }),
    })

    const response = await POST(request as any)
    expect(response.status).toBe(400)
  })

  it('returns 400 for invalid URL', async () => {
    const request = new Request('http://localhost/api/providers/openai-compatible/test', {
      method: 'POST',
      body: JSON.stringify({ apiKey: 'test-key', baseUrl: 'not-a-valid-url' }),
    })

    const response = await POST(request as any)
    expect(response.status).toBe(400)
  })

  it('returns 400 for non-HTTPS URL', async () => {
    const request = new Request('http://localhost/api/providers/openai-compatible/test', {
      method: 'POST',
      body: JSON.stringify({ apiKey: 'test-key', baseUrl: 'http://api.example.com/v1' }),
    })

    const response = await POST(request as any)
    expect(response.status).toBe(400)
  })
})
