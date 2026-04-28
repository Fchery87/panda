import { describe, expect, test } from 'bun:test'
import fs from 'node:fs'
import path from 'node:path'

describe('provider token secret envelope', () => {
  test('provider mutations store token values through a secret envelope', () => {
    const providerSource = fs.readFileSync(path.resolve(import.meta.dir, 'providers.ts'), 'utf8')
    const schemaSource = fs.readFileSync(path.resolve(import.meta.dir, 'schema.ts'), 'utf8')

    expect(schemaSource).toContain('accessTokenEnvelope: v.string()')
    expect(schemaSource).toContain('refreshTokenEnvelope: v.optional(v.string())')
    expect(schemaSource).not.toContain('accessToken: v.string()')
    expect(schemaSource).not.toContain('refreshToken: v.optional(v.string())')

    expect(providerSource).toContain('sealProviderSecret(args.accessToken)')
    expect(providerSource).toContain('sealProviderSecret(args.refreshToken)')
    expect(providerSource).toContain('hasAccessToken: Boolean(tokenRecord.accessTokenEnvelope)')
    expect(providerSource).not.toContain('accessToken: args.accessToken')
    expect(providerSource).not.toContain('refreshToken: args.refreshToken')
  })
})
