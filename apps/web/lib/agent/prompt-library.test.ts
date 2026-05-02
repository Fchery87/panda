import { describe, expect, it } from 'bun:test'
import { getPromptForMode, normalizeChatMode } from './prompt-library'
import type { FormalSpecification } from './spec/types'

// Helper: extract all system message text from a getPromptForMode result
function getSystemText(
  mode: Parameters<typeof getPromptForMode>[0]['chatMode'],
  extra?: Partial<Parameters<typeof getPromptForMode>[0]>
) {
  const messages = getPromptForMode({
    projectId: 'p',
    chatId: 'c',
    userId: 'u',
    chatMode: mode,
    provider: 'openai',
    userMessage: 'help me',
    ...extra,
  })
  return messages
    .filter((m): m is { role: 'system'; content: string } => m.role === 'system')
    .map((m) => m.content)
    .join('\n\n')
}

describe('prompt-library — natural flow (INTENT RULES)', () => {
  it('ASK mode: instructs conversational responses, no planning preamble', () => {
    const text = getSystemText('ask')
    expect(text).toContain('INTENT RULES')
    expect(text).toContain('NEVER open with a plan')
    expect(text).toContain('No preamble')
  })

  it('ARCHITECT mode: structured plan only for explicit planning requests', () => {
    const text = getSystemText('plan')
    expect(text).toContain('INTENT RULES')
    expect(text).toContain('ONLY THEN produce planning content in markdown')
    expect(text).toContain('respond naturally in paragraphs')
    expect(text).toContain('Gather missing constraints')
    expect(text).toContain('execution-ready')
    expect(text).toContain('Headings may vary')
  })

  it('CODE mode: quiet execution — no planning preamble, all code via tools', () => {
    const text = getSystemText('code')
    expect(text).toContain('INTENT RULES')
    expect(text).toContain('Do NOT produce a planning preamble')
    expect(text).toContain('All code goes through tools')
  })

  it('BUILD mode: quiet execution mode, no clarifying questions upfront', () => {
    const text = getSystemText('build')
    expect(text).toContain('INTENT RULES')
    expect(text).toContain('Quiet Execution Mode')
    expect(text).toContain('Do NOT produce a planning preamble')
  })
})

describe('prompt-library — prompt system contract invariants', () => {
  it('states Ask Mode repository answers must inspect and cite project context', () => {
    const text = getSystemText('ask')

    expect(text).toContain('Use search_code or read_files')
    expect(text).toContain('Always cite file paths and line numbers')
    expect(text).toContain('read-only access, no file modifications')
  })

  it('keeps Plan Mode conversational unless planning is explicit', () => {
    const text = getSystemText('plan')

    expect(text).toContain('respond naturally in paragraphs')
    expect(text).toContain('ONLY THEN produce planning content in markdown')
    expect(text).toContain('Ask only the questions that materially change implementation')
  })

  it('keeps implementation modes quiet and prevents chat code output', () => {
    const codeText = getSystemText('code')
    const buildText = getSystemText('build')

    expect(codeText).toContain('Do NOT produce a planning preamble')
    expect(codeText).toContain('NEVER output code to the user in chat')
    expect(buildText).toContain('Quiet Execution Mode')
    expect(buildText).toContain('Do NOT produce a planning preamble')
    expect(buildText).toContain('NEVER output code to the user in chat')
  })

  it('includes shared implementation discipline for write-capable modes', () => {
    const codeText = getSystemText('code')
    const buildText = getSystemText('build')

    for (const text of [codeText, buildText]) {
      expect(text).toContain('Do not invent repository state')
      expect(text).toContain('After meaningful code changes')
      expect(text).toContain('strongest available validation gate')
    }
  })

  it('keeps active Spec before approved Plan when both are present', () => {
    const activeSpec: FormalSpecification = {
      id: 'spec-1',
      version: 1,
      tier: 'explicit',
      status: 'approved',
      intent: {
        goal: 'Preserve the formal prompt contract',
        rawMessage: 'Strengthen prompts',
        constraints: [],
        acceptanceCriteria: [],
      },
      plan: { steps: [], dependencies: [], risks: [], estimatedTools: [] },
      validation: { preConditions: [], postConditions: [], invariants: [] },
      provenance: { model: 'test', promptHash: 'hash', timestamp: 1, chatId: 'c' },
      createdAt: 1,
      updatedAt: 1,
    }

    const systemText = getSystemText('build', {
      activeSpec,
      approvedPlanExecution: {
        sessionId: 'plan-session-1',
        plan: {
          title: 'Prompt refactor plan',
          summary: 'Refactor prompt assembly',
          acceptanceChecks: ['Prompt tests pass'],
          sections: [{ id: 's1', title: 'Extract modules', content: 'Split prompts', order: 1 }],
        },
      },
    })

    expect(systemText).toContain('## Active Specification')
    expect(systemText).toContain('## Approved Plan Execution Context')
    expect(systemText.indexOf('## Active Specification')).toBeLessThan(
      systemText.indexOf('## Approved Plan Execution Context')
    )
    expect(systemText).toContain('Spec is the stronger execution contract')
  })

  it('preserves effective section order when provider embeds system prompt in user message', () => {
    const messages = getPromptForMode({
      projectId: 'p',
      chatId: 'c',
      userId: 'u',
      chatMode: 'build',
      provider: 'fireworks',
      userMessage: 'Implement the prompt contract.',
      projectOverview: 'Prompt System project overview',
      memoryBank: 'Prompt System memory',
    })

    expect(messages).toHaveLength(1)
    expect(messages[0].role).toBe('user')

    const text = messages[0].content
    expect(text).toContain('System:')
    expect(text).toContain('User:\nImplement the prompt contract.')
    expect(text.indexOf('## Implementation Discipline')).toBeLessThan(
      text.indexOf('## Project Overview')
    )
    expect(text.indexOf('## Project Overview')).toBeLessThan(text.indexOf('## Project Memory Bank'))
    expect(text.indexOf('## Project Memory Bank')).toBeLessThan(
      text.indexOf('User:\nImplement the prompt contract.')
    )
  })
})

describe('prompt-library — mode normalization', () => {
  it('keeps canonical modes intact', () => {
    expect(normalizeChatMode('plan', 'code')).toBe('plan')
    expect(normalizeChatMode('build', 'ask')).toBe('build')
  })

  it('falls back for legacy architect mode', () => {
    expect(normalizeChatMode('architect', 'code')).toBe('code')
  })

  it('falls back for unsupported modes', () => {
    expect(normalizeChatMode('discuss', 'code')).toBe('code')
    expect(normalizeChatMode('review', 'ask')).toBe('ask')
  })
})

describe('prompt-library — architect brainstorming protocol', () => {
  it('injects brainstorming protocol instructions when enabled', () => {
    const messages = getPromptForMode({
      projectId: 'p',
      chatId: 'c',
      userId: 'u',
      chatMode: 'plan',
      provider: 'openai',
      userMessage: 'help me plan',
      customInstructions: 'Architect brainstorming protocol: enabled',
    })

    const systemText = messages
      .filter((m): m is { role: 'system'; content: string } => m.role === 'system')
      .map((m) => m.content)
      .join('\n\n')

    expect(systemText).toContain('Brainstorm phase: discovery | options | validated_plan')
    expect(systemText).toContain('Ask exactly one clarifying question')
  })

  it('does not inject brainstorming protocol by default', () => {
    const messages = getPromptForMode({
      projectId: 'p',
      chatId: 'c',
      userId: 'u',
      chatMode: 'plan',
      provider: 'openai',
      userMessage: 'help me plan',
    })

    const systemText = messages
      .filter((m): m is { role: 'system'; content: string } => m.role === 'system')
      .map((m) => m.content)
      .join('\n\n')

    expect(systemText).not.toContain('Brainstorm phase: discovery | options | validated_plan')
  })

  it('allows concise direct answers for straightforward factual questions', () => {
    const messages = getPromptForMode({
      projectId: 'p',
      chatId: 'c',
      userId: 'u',
      chatMode: 'plan',
      provider: 'openai',
      userMessage: 'what model are you?',
    })

    const systemText = messages
      .filter((m): m is { role: 'system'; content: string } => m.role === 'system')
      .map((m) => m.content)
      .join('\n\n')

    expect(systemText).toContain('For straightforward factual questions')
    expect(systemText).toContain('answer directly in plain language')
  })

  it('injects planning session context for architect mode when provided', () => {
    const systemText = getSystemText('plan', {
      planningSession: {
        hasActiveSession: true,
        phase: 'validated_plan',
        hasDraftPlan: true,
      },
    })

    expect(systemText).toContain('## Planning Session Context')
    expect(systemText).toContain('Current phase: validated_plan')
    expect(systemText).toContain('Draft plan already exists: yes')
  })
})

describe('prompt-library — Panda skill injection', () => {
  it('injects ai-slop-cleaner guidance for cleanup requests', () => {
    const systemText = getSystemText('build', {
      userMessage: 'Cleanup this bloated AI-generated code path and remove dead code.',
    })

    expect(systemText).toContain('Activated Panda workflow skill: ai-slop-cleaner')
    expect(systemText).toContain(
      'Lock behavior with targeted regression tests before cleanup edits'
    )
    expect(systemText).toContain('Pass order')
  })

  it('does not inject ai-slop-cleaner guidance for unrelated build requests', () => {
    const systemText = getSystemText('build', {
      userMessage: 'Implement a new project switcher component.',
    })

    expect(systemText).not.toContain('Activated Panda workflow skill: ai-slop-cleaner')
  })

  it('does not inject Panda skills when skillProfile is off', () => {
    const systemText = getSystemText('build', {
      userMessage: 'Cleanup this bloated AI-generated code path and remove dead code.',
      skillProfile: 'off',
    })

    expect(systemText).not.toContain('Activated Panda workflow skill: ai-slop-cleaner')
  })

  it('injects stricter workflow wording under strict_workflow', () => {
    const systemText = getSystemText('build', {
      userMessage: 'Cleanup this bloated AI-generated code path and remove dead code.',
      skillProfile: 'strict_workflow',
    })

    expect(systemText).toContain('Profile: strict_workflow')
    expect(systemText).toContain('Do not start cleanup edits until behavior is protected')
  })

  it('injects matched custom skill guidance after core implementation discipline', () => {
    const systemText = getSystemText('build', {
      userMessage: 'Use the TDD workflow for this bug fix.',
      customSkills: [
        {
          id: 'skill_tdd',
          name: 'TDD Bugfix',
          description: 'Requires a failing test first.',
          triggerPhrases: ['tdd workflow'],
          applicableModes: ['build'],
          profile: 'strict_workflow',
          instructions: 'Write a failing test before implementation.',
          checklist: ['Confirm the test fails first', 'Implement the smallest fix'],
          requiredValidation: ['Run the targeted regression test'],
          autoActivationEnabled: true,
        },
      ],
    })

    expect(systemText).toContain('Activated Panda custom workflow skill: TDD Bugfix')
    expect(systemText).toContain('Write a failing test before implementation.')
    expect(systemText).toContain('Confirm the test fails first')

    expect(systemText.indexOf('## Implementation Discipline')).toBeGreaterThan(-1)
    expect(systemText.indexOf('## Panda Workflow Skills')).toBeGreaterThan(-1)
    expect(systemText.indexOf('## Implementation Discipline')).toBeLessThan(
      systemText.indexOf('## Panda Workflow Skills')
    )
  })

  it('does not inject custom skills blocked by custom skill policy', () => {
    const systemText = getSystemText('build', {
      userMessage: 'Use the TDD workflow for this bug fix.',
      customSkillPolicy: { allowUserSkills: false },
      customSkills: [
        {
          id: 'skill_tdd',
          name: 'TDD Bugfix',
          description: 'Requires a failing test first.',
          triggerPhrases: ['tdd workflow'],
          applicableModes: ['build'],
          profile: 'strict_workflow',
          instructions: 'Write a failing test before implementation.',
          autoActivationEnabled: true,
        },
      ],
    })

    expect(systemText).not.toContain('Activated Panda custom workflow skill: TDD Bugfix')
  })
})

describe('prompt-library — project overview integration', () => {
  it('includes project overview when provided', () => {
    const projectOverview = '## Project Overview\nStack: React, TypeScript\nTotal Files: 42'
    const messages = getPromptForMode({
      projectId: 'p',
      chatId: 'c',
      userId: 'u',
      chatMode: 'code',
      provider: 'openai',
      userMessage: 'help me',
      projectOverview,
    })

    const contextMessages = messages.filter(
      (m) => m.role === 'system' && m.content.includes('Project Overview')
    )
    expect(contextMessages.length).toBeGreaterThan(0)
    expect(contextMessages[0].content).toContain('## Project Overview')
    expect(contextMessages[0].content).toContain('Stack: React, TypeScript')
  })

  it('places overview before memory bank in output order', () => {
    const projectOverview = 'Project Overview Content'
    const memoryBank = 'Memory Bank Content'

    const messages = getPromptForMode({
      projectId: 'p',
      chatId: 'c',
      userId: 'u',
      chatMode: 'code',
      provider: 'openai',
      userMessage: 'help me',
      projectOverview,
      memoryBank,
    })

    const contextMessages = messages.filter(
      (m) => m.role === 'system' && m.content.includes('## Project')
    )
    expect(contextMessages.length).toBeGreaterThan(0)

    const content = contextMessages[0].content
    const overviewIndex = content.indexOf('## Project Overview')
    const memoryBankIndex = content.indexOf('## Project Memory Bank')

    expect(overviewIndex).toBeGreaterThan(-1)
    expect(memoryBankIndex).toBeGreaterThan(-1)
    expect(overviewIndex).toBeLessThan(memoryBankIndex)
  })

  it('omits overview section when not provided', () => {
    const messages = getPromptForMode({
      projectId: 'p',
      chatId: 'c',
      userId: 'u',
      chatMode: 'code',
      provider: 'openai',
      userMessage: 'help me',
    })

    const allContent = messages.map((m) => m.content).join('\n')
    expect(allContent).not.toContain('## Project Overview')
  })
})
