import { describe, expect, it } from 'bun:test'
import {
  createWorkspacePlanTabRef,
  isGeneratedPlanArtifact,
  serializeGeneratedPlanArtifact,
  type GeneratedPlanArtifact,
} from './types'

describe('planning types helpers', () => {
  it('serializes generated artifacts into markdown when markdown is absent', () => {
    const artifact: GeneratedPlanArtifact = {
      chatId: 'chat-1',
      sessionId: 'session-1',
      title: 'Plan Title',
      summary: 'Short summary',
      markdown: '',
      sections: [
        { id: 's2', title: 'Implementation Plan', content: '1. Build the UI', order: 2 },
        { id: 's1', title: 'Goal', content: 'Ship the feature', order: 1 },
      ],
      acceptanceChecks: ['The plan is reviewable', 'The build contract is explicit'],
      status: 'ready_for_review',
      generatedAt: 123,
    }

    expect(serializeGeneratedPlanArtifact(artifact)).toBe(
      '---\nname: "Plan Title"\noverview: "Short summary"\nstatus: "ready_for_review"\nsessionId: "session-1"\ntodos:\n  - id: "s1"\n    content: "Goal"\n    status: "pending"\n  - id: "s2"\n    content: "Implementation Plan"\n    status: "pending"\nisProject: false\n---\n\n# Plan Title\n\nShort summary\n\n## Goal\nShip the feature\n\n## Implementation Plan\n1. Build the UI\n\n## Validation\n- [ ] The plan is reviewable\n- [ ] The build contract is explicit'
    )
  })

  it('falls back to structured serialization for empty markdown and keeps section order deterministic', () => {
    const artifact: GeneratedPlanArtifact = {
      chatId: 'chat-1',
      sessionId: 'session-1',
      title: 'Plan Title',
      summary: 'Short summary',
      markdown: '   ',
      sections: [
        { id: 'section-b', title: 'Second', content: 'two', order: 10 },
        { id: 'section-a', title: 'First', content: 'one', order: 10 },
        { id: 'section-c', title: 'Third', content: 'three', order: 20 },
      ],
      acceptanceChecks: ['Run lint', 'Review acceptance checks'],
      status: 'ready_for_review',
      generatedAt: 123,
    }

    expect(serializeGeneratedPlanArtifact(artifact)).toBe(
      '---\nname: "Plan Title"\noverview: "Short summary"\nstatus: "ready_for_review"\nsessionId: "session-1"\ntodos:\n  - id: "section-a"\n    content: "First"\n    status: "pending"\n  - id: "section-b"\n    content: "Second"\n    status: "pending"\n  - id: "section-c"\n    content: "Third"\n    status: "pending"\nisProject: false\n---\n\n# Plan Title\n\nShort summary\n\n## First\none\n\n## Second\ntwo\n\n## Third\nthree\n\n## Validation\n- [ ] Run lint\n- [ ] Review acceptance checks'
    )
  })

  it('adds plan frontmatter to existing artifact markdown when absent', () => {
    const artifact: GeneratedPlanArtifact = {
      chatId: 'chat-1',
      sessionId: 'session-1',
      title: 'Plan Title',
      summary: 'Short summary',
      markdown: '# Existing markdown',
      sections: [],
      acceptanceChecks: [],
      status: 'accepted',
      generatedAt: 123,
    }

    expect(serializeGeneratedPlanArtifact(artifact)).toBe(
      '---\nname: "Plan Title"\noverview: "Short summary"\nstatus: "accepted"\nsessionId: "session-1"\ntodos:\n  []\nisProject: false\n---\n\n# Existing markdown'
    )
  })

  it('preserves existing plan frontmatter when artifact markdown already has it', () => {
    const artifact: GeneratedPlanArtifact = {
      chatId: 'chat-1',
      sessionId: 'session-1',
      title: 'Plan Title',
      summary: 'Short summary',
      markdown: '---\nname: "Custom"\ntodos: []\nisProject: false\n---\n\n# Existing markdown',
      sections: [],
      acceptanceChecks: [],
      status: 'accepted',
      generatedAt: 123,
    }

    expect(serializeGeneratedPlanArtifact(artifact)).toBe(
      '---\nname: "Custom"\ntodos: []\nisProject: false\n---\n\n# Existing markdown'
    )
  })

  it('creates a stable workspace plan tab ref', () => {
    const artifact: GeneratedPlanArtifact = {
      chatId: 'chat-1',
      sessionId: 'session-1',
      title: 'Plan Title',
      summary: 'Short summary',
      markdown: '# Existing markdown',
      sections: [],
      acceptanceChecks: [],
      status: 'accepted',
      generatedAt: 123,
    }

    expect(createWorkspacePlanTabRef(artifact)).toEqual({
      kind: 'plan',
      id: 'session-1',
      chatId: 'chat-1',
      sessionId: 'session-1',
      title: 'Plan Title',
      status: 'accepted',
    })
  })

  it('recognizes generated plan artifacts structurally', () => {
    expect(
      isGeneratedPlanArtifact({
        chatId: 'chat-1',
        sessionId: 'session-1',
        title: 'Plan Title',
        summary: 'Short summary',
        markdown: '# Existing markdown',
        sections: [],
        acceptanceChecks: [],
        status: 'accepted',
        generatedAt: 123,
      })
    ).toBe(true)
    expect(
      isGeneratedPlanArtifact({
        chatId: 'chat-1',
        sessionId: 'session-1',
        title: 'Plan Title',
        summary: 'Short summary',
        markdown: '# Existing markdown',
        sections: [{ id: 's1', title: 'Goal', content: 'Ship the feature', order: '1' }],
        acceptanceChecks: [],
        status: 'accepted',
        generatedAt: 123,
      })
    ).toBe(false)
    expect(
      isGeneratedPlanArtifact({
        chatId: 'chat-1',
        sessionId: 'session-1',
        title: 'Plan Title',
        summary: 'Short summary',
        markdown: '# Existing markdown',
        sections: [],
        acceptanceChecks: ['ok', 123],
        status: 'accepted',
        generatedAt: 123,
      })
    ).toBe(false)
    expect(
      isGeneratedPlanArtifact({
        chatId: 'chat-1',
        sessionId: 'session-1',
        title: 'Plan Title',
        summary: 'Short summary',
        markdown: '# Existing markdown',
        sections: [],
        acceptanceChecks: [],
        status: 'draft',
        generatedAt: 123,
      })
    ).toBe(false)
    expect(isGeneratedPlanArtifact({})).toBe(false)
  })
})
