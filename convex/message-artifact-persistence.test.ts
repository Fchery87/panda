import { describe, expect, test } from 'bun:test'
import fs from 'node:fs'
import path from 'node:path'

describe('message and artifact persistence', () => {
  test('uses explicit validators for message annotations and artifact actions', () => {
    const schemaSource = fs.readFileSync(path.resolve(import.meta.dir, 'schema.ts'), 'utf8')
    const messagesSource = fs.readFileSync(path.resolve(import.meta.dir, 'messages.ts'), 'utf8')
    const artifactsSource = fs.readFileSync(path.resolve(import.meta.dir, 'artifacts.ts'), 'utf8')
    const executeArtifactSource = fs.readFileSync(
      path.resolve(import.meta.dir, '../apps/web/lib/artifacts/executeArtifact.ts'),
      'utf8'
    )

    expect(schemaSource).not.toContain(
      'annotations: v.optional(v.array(v.record(v.string(), v.any())))'
    )
    expect(schemaSource).not.toContain('actions: v.array(v.record(v.string(), v.any()))')
    expect(schemaSource).toContain('export const MessageAnnotation = v.object({')
    expect(schemaSource).toContain('export const ArtifactAction = v.union(')

    expect(messagesSource).toContain('annotations: v.optional(v.array(MessageAnnotation))')
    expect(artifactsSource).toContain('actions: v.array(ArtifactAction)')
    expect(artifactsSource).toContain('actions: v.optional(v.array(ArtifactAction))')

    expect(executeArtifactSource).not.toContain('payload: Record<string, unknown>')
    expect(executeArtifactSource).toContain("type: 'file_write'")
    expect(executeArtifactSource).toContain("type: 'command_run'")
  })
})
