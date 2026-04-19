# Chat Mode Architecture Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to
> implement this plan task-by-task.

**Goal:** Implement `docs/CHAT_MODE_ARCHITECTURE.md` — atomic Plan→Build
handoff, provider-agnostic tool-call grammar safety, typed termination reasons,
and spec injection.

**Architecture:** Four milestones in dependency order: M1 (mode state
correctness) → M2 (grammar safety) → M3 (watchdog + typed reasons) → M4 (spec
injection). Each task is TDD: write failing test → run it → implement → pass →
commit.

**Tech Stack:** TypeScript, `bun:test` (`bun test <file>`), Next.js App Router,
Convex, harness runtime at `apps/web/lib/agent/harness/runtime.ts`.

**Before starting:** Read `docs/CHAT_MODE_ARCHITECTURE.md` sections §5 and §6
for the full design.

---

## M1 — Mode Correctness

### Task 1: Extend `ChatModeConfig` to `ModeContract` (§5.1)

**Files:**

- Modify: `apps/web/lib/agent/chat-modes.ts`
- Test: `apps/web/lib/agent/chat-modes.test.ts`

**Step 1: Write the failing test**

Create `apps/web/lib/agent/chat-modes.test.ts`:

```typescript
import { describe, expect, test } from 'bun:test'
import { CHAT_MODE_CONFIGS } from './chat-modes'

describe('ModeContract', () => {
  test('each mode declares requiresToolCalls', () => {
    for (const [id, cfg] of Object.entries(CHAT_MODE_CONFIGS)) {
      ;(expect(typeof cfg.requiresToolCalls).toBe('boolean'),
        `${id} missing requiresToolCalls`)
    }
  })

  test('ask and architect do not require tool calls', () => {
    expect(CHAT_MODE_CONFIGS.ask.requiresToolCalls).toBe(false)
    expect(CHAT_MODE_CONFIGS.architect.requiresToolCalls).toBe(false)
  })

  test('code and build require tool calls', () => {
    expect(CHAT_MODE_CONFIGS.code.requiresToolCalls).toBe(true)
    expect(CHAT_MODE_CONFIGS.build.requiresToolCalls).toBe(true)
  })

  test('each mode declares outputFormat', () => {
    const valid = new Set(['conversational', 'action-log'])
    for (const [id, cfg] of Object.entries(CHAT_MODE_CONFIGS)) {
      ;(expect(valid.has(cfg.outputFormat)).toBe(true),
        `${id} has invalid outputFormat`)
    }
  })

  test('build mode has a handoff ritual', () => {
    expect(CHAT_MODE_CONFIGS.code.handoffRitual).toBeDefined()
    expect(CHAT_MODE_CONFIGS.build.handoffRitual).toBeDefined()
  })
})
```

**Step 2: Run test — expect FAIL**

```bash
bun test apps/web/lib/agent/chat-modes.test.ts
```

Expected: `TypeError: cfg.requiresToolCalls is undefined`

**Step 3: Add new fields to `ChatModeConfig`**

In `apps/web/lib/agent/chat-modes.ts`, append to the `ChatModeConfig` interface:

```typescript
export interface HandoffRitual {
  systemMessage: string
}

export interface ChatModeConfig {
  description: string
  fileAccess: 'read-only' | 'read-write'
  surface: {
    label: string
    shortLabel: string
    description: string
    advanced: boolean
    primaryShortcut?: string
  }
  runtime: {
    agent: 'builder' | 'manager' | 'executive'
    legacyAgent: 'build' | 'code' | 'plan' | 'ask'
  }
  // ModeContract fields (§5.1)
  requiresToolCalls: boolean
  outputFormat: 'conversational' | 'action-log'
  handoffRitual?: HandoffRitual
}

export type ModeContract = ChatModeConfig
```

Then add the new fields to each entry in `CHAT_MODE_CONFIGS`:

```typescript
// ask:
requiresToolCalls: false,
outputFormat: 'conversational',

// architect:
requiresToolCalls: false,
outputFormat: 'conversational',

// code:
requiresToolCalls: true,
outputFormat: 'action-log',
handoffRitual: {
  systemMessage:
    'You are now in Build mode. Your FIRST action is to call write_files or run_command — never narrate what you plan to do without calling a tool. Read the approved plan, identify step 1, and execute it.',
},

// build:
requiresToolCalls: true,
outputFormat: 'action-log',
handoffRitual: {
  systemMessage:
    'You are now in Builder mode. Your FIRST action is to call write_files or run_command — never narrate what you plan to do without calling a tool.',
},
```

**Step 4: Run test — expect PASS**

```bash
bun test apps/web/lib/agent/chat-modes.test.ts
```

**Step 5: Commit**

```bash
git add apps/web/lib/agent/chat-modes.ts apps/web/lib/agent/chat-modes.test.ts
git commit -m "feat(modes): extend ChatModeConfig to ModeContract with requiresToolCalls, outputFormat, handoffRitual"
```

---

### Task 2: Create `useModeContext` hook (§5.2)

**Files:**

- Create: `apps/web/hooks/useModeContext.ts`
- Test: `apps/web/hooks/useModeContext.test.ts`

**Step 1: Write failing test**

Create `apps/web/hooks/useModeContext.test.ts`:

```typescript
import { describe, expect, test } from 'bun:test'
import { renderHook, act } from '@testing-library/react'
import { useModeContextRef, type ModeContext } from './useModeContext'

describe('useModeContextRef', () => {
  const base: ModeContext = {
    mode: 'architect',
    approvedPlanId: null,
    activeSpecId: null,
    depth: 'standard',
  }

  test('ref reflects initial context', () => {
    const { result } = renderHook(() => useModeContextRef(base))
    expect(result.current.current.mode).toBe('architect')
  })

  test('ref updates when context changes without re-render', () => {
    let ctx = { ...base }
    const { result, rerender } = renderHook(() => useModeContextRef(ctx))
    expect(result.current.current.mode).toBe('architect')
    ctx = { ...base, mode: 'code' }
    rerender()
    expect(result.current.current.mode).toBe('code')
  })
})
```

**Step 2: Run test — expect FAIL**

```bash
bun test apps/web/hooks/useModeContext.test.ts
```

Expected: `Cannot find module './useModeContext'`

**Step 3: Create `useModeContext.ts`**

```typescript
'use client'

import { useRef, useEffect } from 'react'
import type { Id } from '@convex/_generated/dataModel'
import type { ChatMode } from '@/lib/agent/chat-modes'

export interface ModeContext {
  mode: ChatMode
  approvedPlanId: Id<'plans'> | null
  activeSpecId: Id<'specifications'> | null
  depth: 'quick' | 'standard' | 'deep'
}

export function useModeContextRef(context: ModeContext) {
  const ref = useRef<ModeContext>(context)
  useEffect(() => {
    ref.current = context
  })
  return ref
}
```

**Step 4: Run test — expect PASS**

```bash
bun test apps/web/hooks/useModeContext.test.ts
```

**Step 5: Commit**

```bash
git add apps/web/hooks/useModeContext.ts apps/web/hooks/useModeContext.test.ts
git commit -m "feat(modes): add useModeContextRef hook — ref-based mode context to eliminate stale-closure bugs"
```

---

### Task 3: Fix plan→build handoff ritual (§5.3)

**Context:** In `useProjectMessageWorkflow.ts`, the plan-approval preamble is
injected as a _user_ message. The architecture says it must become a _system_
message. Find where `buildApprovedPlanExecutionMessage` is called and trace the
flow.

**Files:**

- Read: `apps/web/hooks/useProjectMessageWorkflow.ts` (full file)
- Read: `apps/web/lib/chat/planDraft.ts` (find
  `buildApprovedPlanExecutionMessage`)
- Read: `apps/web/lib/agent/prompt-library.ts` lines 274-310 (approved plan
  context builder)

**Step 1: Write failing test**

Create `apps/web/hooks/useProjectMessageWorkflow.handoff.test.ts`:

```typescript
import { describe, expect, test } from 'bun:test'
import { buildHandoffSystemMessage } from '@/lib/agent/prompt-library'
import type { GeneratedPlanArtifact } from '@/lib/planning/types'

describe('buildHandoffSystemMessage', () => {
  const fakePlan: GeneratedPlanArtifact = {
    sessionId: 'sess-1',
    status: 'approved',
    sections: [{ title: 'Setup', content: 'do stuff' }],
    acceptanceChecks: [],
  }

  test('returns a string', () => {
    const msg = buildHandoffSystemMessage({ plan: fakePlan })
    expect(typeof msg).toBe('string')
  })

  test('does not contain "switching from Architect"', () => {
    const msg = buildHandoffSystemMessage({ plan: fakePlan })
    expect(msg).not.toContain('switching from Architect')
  })

  test('contains the handoff ritual instruction', () => {
    const msg = buildHandoffSystemMessage({ plan: fakePlan })
    expect(msg).toContain('write_files')
  })

  test('contains plan content', () => {
    const msg = buildHandoffSystemMessage({ plan: fakePlan })
    expect(msg).toContain('Setup')
  })
})
```

**Step 2: Run test — expect FAIL**

```bash
bun test apps/web/hooks/useProjectMessageWorkflow.handoff.test.ts
```

Expected: `buildHandoffSystemMessage is not exported from prompt-library`

**Step 3: Add `buildHandoffSystemMessage` to `prompt-library.ts`**

In `apps/web/lib/agent/prompt-library.ts`, add:

```typescript
import { CHAT_MODE_CONFIGS } from './chat-modes'
import type { GeneratedPlanArtifact } from '../planning/types'

export function buildHandoffSystemMessage(args: {
  plan: GeneratedPlanArtifact
}): string {
  const ritual = CHAT_MODE_CONFIGS.code.handoffRitual?.systemMessage ?? ''
  const planText = args.plan.sections
    .map((s) => `## ${s.title}\n${s.content}`)
    .join('\n\n')

  return [ritual, '', '---', '## Approved Plan', planText].join('\n')
}
```

**Step 4: Run test — expect PASS**

```bash
bun test apps/web/hooks/useProjectMessageWorkflow.handoff.test.ts
```

**Step 5: Commit**

```bash
git add apps/web/lib/agent/prompt-library.ts apps/web/hooks/useProjectMessageWorkflow.handoff.test.ts
git commit -m "feat(modes): add buildHandoffSystemMessage — moves plan preamble from user to system message"
```

---

## M2 — Tool-Call Grammar Safety

### Task 4: Grammar types + registry (§6.1 — L1)

**Files:**

- Create: `apps/web/lib/agent/harness/tool-call-grammars/types.ts`
- Create: `apps/web/lib/agent/harness/tool-call-grammars/index.ts`

No tests needed for this task — pure type contracts. Tests come with each
adapter.

**Step 1: Create `types.ts`**

```typescript
// apps/web/lib/agent/harness/tool-call-grammars/types.ts

export interface DetectHit {
  start: number
  end: number
  confidence: 'high' | 'low'
}

export interface ParsedToolCall {
  name: string
  arguments: Record<string, unknown>
  id?: string
}

export type GrammarId =
  | 'anthropic-native'
  | 'anthropic-xml-fallback'
  | 'openai-native'
  | 'openai-text-json'
  | 'minimax-xml'
  | 'hermes-tool-call'
  | 'qwen-xml'
  | 'deepseek-fim'
  | 'llama-python-tag'
  | 'unknown-suspicious'
  | (string & {})

export interface ToolCallGrammar {
  id: GrammarId
  detect(text: string): DetectHit | null
  parse(text: string): ParsedToolCall[]
  strip(text: string): string
  examples: {
    good: string[]
    malformed: string[]
  }
}
```

**Step 2: Create `index.ts` (registry)**

```typescript
// apps/web/lib/agent/harness/tool-call-grammars/index.ts

import type { ToolCallGrammar, GrammarId } from './types'

const registry = new Map<GrammarId, ToolCallGrammar>()

export function registerGrammar(grammar: ToolCallGrammar): void {
  registry.set(grammar.id, grammar)
}

export function getGrammar(id: GrammarId): ToolCallGrammar | undefined {
  return registry.get(id)
}

export function getAllGrammars(): ToolCallGrammar[] {
  return [...registry.values()]
}

export function detectGrammar(
  text: string
): { grammar: ToolCallGrammar; hit: import('./types').DetectHit } | null {
  for (const grammar of registry.values()) {
    if (grammar.id === 'unknown-suspicious') continue // safety net checked last
    const hit = grammar.detect(text)
    if (hit) return { grammar, hit }
  }
  const safety = registry.get('unknown-suspicious')
  if (safety) {
    const hit = safety.detect(text)
    if (hit) return { grammar: safety, hit }
  }
  return null
}

export type {
  ToolCallGrammar,
  GrammarId,
  DetectHit,
  ParsedToolCall,
} from './types'
```

**Step 3: Commit**

```bash
git add apps/web/lib/agent/harness/tool-call-grammars/
git commit -m "feat(grammar): add ToolCallGrammar registry — types.ts + index.ts"
```

---

### Task 5: `minimax-xml` grammar adapter + tests (highest priority)

**Files:**

- Create: `apps/web/lib/agent/harness/tool-call-grammars/minimax-xml.ts`
- Test: `apps/web/lib/agent/harness/tool-call-grammars/minimax-xml.test.ts`

**Step 1: Write failing test**

```typescript
// apps/web/lib/agent/harness/tool-call-grammars/minimax-xml.test.ts
import { describe, expect, test } from 'bun:test'
import { minimaxXmlGrammar } from './minimax-xml'

const GOOD = `<minimax:tool_call>
<tool_name>write_files</tool_name>
<parameters>{"path": "src/app.ts", "content": "hello"}</parameters>
</minimax:tool_call>`

const MULTI = `Some text before.
${GOOD}
Some text after.`

const MALFORMED_NO_CLOSE = `<minimax:tool_call>
<tool_name>write_files</tool_name>
<parameters>{"path": "x"}`

describe('minimax-xml grammar', () => {
  test('detect returns hit on valid input', () => {
    const hit = minimaxXmlGrammar.detect(GOOD)
    expect(hit).not.toBeNull()
    expect(hit!.confidence).toBe('high')
  })

  test('detect returns null on plain text', () => {
    expect(minimaxXmlGrammar.detect('just some text')).toBeNull()
  })

  test('parse extracts tool call name and arguments', () => {
    const calls = minimaxXmlGrammar.parse(GOOD)
    expect(calls).toHaveLength(1)
    expect(calls[0].name).toBe('write_files')
    expect(calls[0].arguments).toEqual({ path: 'src/app.ts', content: 'hello' })
  })

  test('parse handles multiple tool calls in one text', () => {
    const two =
      GOOD +
      '\n' +
      GOOD.replace('write_files', 'run_command').replace(
        '{"path": "src/app.ts", "content": "hello"}',
        '{"command": "npm test"}'
      )
    const calls = minimaxXmlGrammar.parse(two)
    expect(calls).toHaveLength(2)
  })

  test('parse returns empty array for malformed (no closing tag)', () => {
    const calls = minimaxXmlGrammar.parse(MALFORMED_NO_CLOSE)
    expect(calls).toHaveLength(0)
  })

  test('strip removes tool call blocks from text', () => {
    const stripped = minimaxXmlGrammar.strip(MULTI)
    expect(stripped).not.toContain('<minimax:tool_call>')
    expect(stripped).toContain('Some text before.')
    expect(stripped).toContain('Some text after.')
  })

  test('examples.good all parse successfully', () => {
    for (const ex of minimaxXmlGrammar.examples.good) {
      expect(() => minimaxXmlGrammar.parse(ex)).not.toThrow()
      expect(minimaxXmlGrammar.detect(ex)).not.toBeNull()
    }
  })

  test('examples.malformed all parse to empty (never silent-accept)', () => {
    for (const ex of minimaxXmlGrammar.examples.malformed) {
      // malformed inputs must not throw but must also not yield valid calls
      const calls = minimaxXmlGrammar.parse(ex)
      expect(calls).toHaveLength(0)
    }
  })
})
```

**Step 2: Run test — expect FAIL**

```bash
bun test apps/web/lib/agent/harness/tool-call-grammars/minimax-xml.test.ts
```

**Step 3: Implement `minimax-xml.ts`**

```typescript
// apps/web/lib/agent/harness/tool-call-grammars/minimax-xml.ts
import type { ToolCallGrammar, DetectHit, ParsedToolCall } from './types'

const OPEN_RE = /<minimax:tool_call\b/
const FULL_RE = /<minimax:tool_call\b[^>]*>([\s\S]*?)<\/minimax:tool_call>/g
const NAME_RE = /<tool_name>([\s\S]*?)<\/tool_name>/
const PARAMS_RE = /<parameters>([\s\S]*?)<\/parameters>/

export const minimaxXmlGrammar: ToolCallGrammar = {
  id: 'minimax-xml',

  detect(text: string): DetectHit | null {
    const match = OPEN_RE.exec(text)
    if (!match) return null
    return { start: match.index, end: text.length, confidence: 'high' }
  },

  parse(text: string): ParsedToolCall[] {
    const results: ParsedToolCall[] = []
    FULL_RE.lastIndex = 0
    let match: RegExpExecArray | null
    while ((match = FULL_RE.exec(text)) !== null) {
      const inner = match[1]
      const nameMatch = NAME_RE.exec(inner)
      if (!nameMatch) continue
      const name = nameMatch[1].trim()
      let args: Record<string, unknown> = {}
      const paramsMatch = PARAMS_RE.exec(inner)
      if (paramsMatch) {
        try {
          args = JSON.parse(paramsMatch[1].trim())
        } catch {
          // malformed params → skip this call
          continue
        }
      }
      results.push({ name, arguments: args })
    }
    return results
  },

  strip(text: string): string {
    FULL_RE.lastIndex = 0
    return text.replace(FULL_RE, '').trim()
  },

  examples: {
    good: [
      `<minimax:tool_call>\n<tool_name>write_files</tool_name>\n<parameters>{"path":"x.ts","content":"hi"}</parameters>\n</minimax:tool_call>`,
      `<minimax:tool_call>\n<tool_name>run_command</tool_name>\n<parameters>{"command":"npm test"}</parameters>\n</minimax:tool_call>`,
    ],
    malformed: [
      `<minimax:tool_call>`,
      `<minimax:tool_call>\n<tool_name>write_files</tool_name>`,
      `<minimax:tool_call>\n<tool_name></tool_name>\n<parameters>not-json</parameters>\n</minimax:tool_call>`,
    ],
  },
}
```

**Step 4: Run test — expect PASS**

```bash
bun test apps/web/lib/agent/harness/tool-call-grammars/minimax-xml.test.ts
```

**Step 5: Register in index.ts**

In `apps/web/lib/agent/harness/tool-call-grammars/index.ts`, add at the bottom:

```typescript
import { minimaxXmlGrammar } from './minimax-xml'
registerGrammar(minimaxXmlGrammar)
```

**Step 6: Commit**

```bash
git add apps/web/lib/agent/harness/tool-call-grammars/
git commit -m "feat(grammar): add minimax-xml adapter — fixes kimi-k2.5 tool-call leakage"
```

---

### Task 6: Core grammar adapters (anthropic-xml-fallback, openai-text-json)

**Files:**

- Create:
  `apps/web/lib/agent/harness/tool-call-grammars/anthropic-xml-fallback.ts`
- Create: `apps/web/lib/agent/harness/tool-call-grammars/openai-text-json.ts`
- Test:
  `apps/web/lib/agent/harness/tool-call-grammars/anthropic-xml-fallback.test.ts`
- Test: `apps/web/lib/agent/harness/tool-call-grammars/openai-text-json.test.ts`

**Step 1: Write failing tests**

`anthropic-xml-fallback.test.ts` — Anthropic legacy `<function_calls><invoke>`
format:

```typescript
import { describe, expect, test } from 'bun:test'
import { anthropicXmlFallbackGrammar } from './anthropic-xml-fallback'

const GOOD = `<function_calls>
<invoke>
<tool_name>write_files</tool_name>
<parameters>{"path": "x.ts", "content": "hi"}</parameters>
</invoke>
</function_calls>`

describe('anthropic-xml-fallback grammar', () => {
  test('detects <function_calls> opening tag', () => {
    expect(anthropicXmlFallbackGrammar.detect(GOOD)).not.toBeNull()
  })

  test('detect returns null on plain text', () => {
    expect(anthropicXmlFallbackGrammar.detect('hello world')).toBeNull()
  })

  test('parses name and arguments', () => {
    const calls = anthropicXmlFallbackGrammar.parse(GOOD)
    expect(calls).toHaveLength(1)
    expect(calls[0].name).toBe('write_files')
    expect(calls[0].arguments.path).toBe('x.ts')
  })

  test('strips all function_calls blocks', () => {
    const stripped = anthropicXmlFallbackGrammar.strip(
      'before\n' + GOOD + '\nafter'
    )
    expect(stripped).not.toContain('<function_calls>')
    expect(stripped).toContain('before')
    expect(stripped).toContain('after')
  })

  test('examples.good all parse successfully', () => {
    for (const ex of anthropicXmlFallbackGrammar.examples.good) {
      const calls = anthropicXmlFallbackGrammar.parse(ex)
      expect(calls.length).toBeGreaterThan(0)
    }
  })
})
```

`openai-text-json.test.ts` — inline JSON tool call:

```typescript
import { describe, expect, test } from 'bun:test'
import { openaiTextJsonGrammar } from './openai-text-json'

const GOOD = `{"name":"write_files","arguments":{"path":"x.ts","content":"hi"}}`
const GOOD2 = `{"name": "run_command", "arguments": {"command": "npm test"}}`

describe('openai-text-json grammar', () => {
  test('detects inline JSON tool call', () => {
    expect(openaiTextJsonGrammar.detect(GOOD)).not.toBeNull()
  })

  test('does not detect plain JSON without name+arguments', () => {
    expect(openaiTextJsonGrammar.detect('{"foo":"bar"}')).toBeNull()
  })

  test('parses name and arguments', () => {
    const calls = openaiTextJsonGrammar.parse(GOOD)
    expect(calls).toHaveLength(1)
    expect(calls[0].name).toBe('write_files')
    expect(calls[0].arguments.path).toBe('x.ts')
  })

  test('strips the JSON blob from text', () => {
    const stripped = openaiTextJsonGrammar.strip('before ' + GOOD + ' after')
    expect(stripped).not.toContain('"name":"write_files"')
    expect(stripped).toContain('before')
    expect(stripped).toContain('after')
  })
})
```

**Step 2: Run tests — expect FAIL**

```bash
bun test apps/web/lib/agent/harness/tool-call-grammars/anthropic-xml-fallback.test.ts apps/web/lib/agent/harness/tool-call-grammars/openai-text-json.test.ts
```

**Step 3: Implement `anthropic-xml-fallback.ts`**

```typescript
import type { ToolCallGrammar, DetectHit, ParsedToolCall } from './types'

const OPEN_RE = /<function_calls>/
const BLOCK_RE = /<function_calls>([\s\S]*?)<\/function_calls>/g
const INVOKE_RE = /<invoke>([\s\S]*?)<\/invoke>/g
const NAME_RE = /<tool_name>([\s\S]*?)<\/tool_name>/
const PARAMS_RE = /<parameters>([\s\S]*?)<\/parameters>/

export const anthropicXmlFallbackGrammar: ToolCallGrammar = {
  id: 'anthropic-xml-fallback',

  detect(text: string): DetectHit | null {
    const match = OPEN_RE.exec(text)
    if (!match) return null
    return { start: match.index, end: text.length, confidence: 'high' }
  },

  parse(text: string): ParsedToolCall[] {
    const results: ParsedToolCall[] = []
    BLOCK_RE.lastIndex = 0
    let blockMatch: RegExpExecArray | null
    while ((blockMatch = BLOCK_RE.exec(text)) !== null) {
      INVOKE_RE.lastIndex = 0
      let invokeMatch: RegExpExecArray | null
      while ((invokeMatch = INVOKE_RE.exec(blockMatch[1])) !== null) {
        const inner = invokeMatch[1]
        const nameMatch = NAME_RE.exec(inner)
        if (!nameMatch) continue
        const name = nameMatch[1].trim()
        let args: Record<string, unknown> = {}
        const paramsMatch = PARAMS_RE.exec(inner)
        if (paramsMatch) {
          try {
            args = JSON.parse(paramsMatch[1].trim())
          } catch {
            continue
          }
        }
        results.push({ name, arguments: args })
      }
    }
    return results
  },

  strip(text: string): string {
    BLOCK_RE.lastIndex = 0
    return text.replace(BLOCK_RE, '').trim()
  },

  examples: {
    good: [
      `<function_calls>\n<invoke>\n<tool_name>write_files</tool_name>\n<parameters>{"path":"x.ts","content":"hi"}</parameters>\n</invoke>\n</function_calls>`,
    ],
    malformed: [
      `<function_calls>`,
      `<function_calls><invoke></invoke></function_calls>`,
    ],
  },
}
```

**Step 4: Implement `openai-text-json.ts`**

```typescript
import type { ToolCallGrammar, DetectHit, ParsedToolCall } from './types'

// Matches {"name":"X","arguments":{...}} optionally with spaces around colon
const DETECT_RE = /\{"name"\s*:\s*"[^"]+"\s*,\s*"arguments"\s*:/
const EXTRACT_RE =
  /\{"name"\s*:\s*"([^"]+)"\s*,\s*"arguments"\s*:\s*(\{[\s\S]*?\})\}/g

export const openaiTextJsonGrammar: ToolCallGrammar = {
  id: 'openai-text-json',

  detect(text: string): DetectHit | null {
    const match = DETECT_RE.exec(text)
    if (!match) return null
    return { start: match.index, end: text.length, confidence: 'high' }
  },

  parse(text: string): ParsedToolCall[] {
    const results: ParsedToolCall[] = []
    EXTRACT_RE.lastIndex = 0
    let match: RegExpExecArray | null
    while ((match = EXTRACT_RE.exec(text)) !== null) {
      const name = match[1]
      try {
        const args = JSON.parse(match[2])
        results.push({ name, arguments: args })
      } catch {
        /* skip malformed */
      }
    }
    return results
  },

  strip(text: string): string {
    EXTRACT_RE.lastIndex = 0
    return text.replace(EXTRACT_RE, '').trim()
  },

  examples: {
    good: [
      `{"name":"write_files","arguments":{"path":"x.ts","content":"hi"}}`,
      `{"name": "run_command", "arguments": {"command": "npm test"}}`,
    ],
    malformed: [`{"name":"write_files"}`, `{"foo":"bar"}`],
  },
}
```

**Step 5: Run tests — expect PASS**

```bash
bun test apps/web/lib/agent/harness/tool-call-grammars/anthropic-xml-fallback.test.ts apps/web/lib/agent/harness/tool-call-grammars/openai-text-json.test.ts
```

**Step 6: Register both in `index.ts`**

```typescript
import { anthropicXmlFallbackGrammar } from './anthropic-xml-fallback'
import { openaiTextJsonGrammar } from './openai-text-json'
registerGrammar(anthropicXmlFallbackGrammar)
registerGrammar(openaiTextJsonGrammar)
```

**Step 7: Commit**

```bash
git add apps/web/lib/agent/harness/tool-call-grammars/
git commit -m "feat(grammar): add anthropic-xml-fallback and openai-text-json adapters"
```

---

### Task 7: Safety-net detector (`unknown-suspicious`) + remaining adapters

**Files:**

- Create: `apps/web/lib/agent/harness/tool-call-grammars/unknown-suspicious.ts`
- Create: `apps/web/lib/agent/harness/tool-call-grammars/hermes-tool-call.ts`
- Create: `apps/web/lib/agent/harness/tool-call-grammars/deepseek-fim.ts`
- Test:
  `apps/web/lib/agent/harness/tool-call-grammars/unknown-suspicious.test.ts`

**Step 1: Write failing test**

```typescript
// unknown-suspicious.test.ts
import { describe, expect, test } from 'bun:test'
import { unknownSuspiciousGrammar } from './unknown-suspicious'

describe('unknown-suspicious grammar', () => {
  test('detects novel namespaced tool call tag', () => {
    expect(
      unknownSuspiciousGrammar.detect('<somemodel:tool_call>')
    ).not.toBeNull()
  })

  test('detects deepseek FIM delimiter', () => {
    expect(
      unknownSuspiciousGrammar.detect('\u{FFF0}tool_calls_begin\u{FFF0}')
    ).not.toBeNull()
  })

  test('detects <tool_call> generic tag', () => {
    expect(
      unknownSuspiciousGrammar.detect('<tool_call>{"name":"x"}</tool_call>')
    ).not.toBeNull()
  })

  test('returns low confidence', () => {
    const hit = unknownSuspiciousGrammar.detect('<somemodel:tool_call>')
    expect(hit?.confidence).toBe('low')
  })

  test('does not detect normal prose', () => {
    expect(
      unknownSuspiciousGrammar.detect('Hello, this is a normal message.')
    ).toBeNull()
    expect(
      unknownSuspiciousGrammar.detect(
        'Use <b>bold</b> and <em>italic</em> in HTML.'
      )
    ).toBeNull()
  })

  test('parse always returns empty (safety-net cannot parse unknown grammar)', () => {
    expect(
      unknownSuspiciousGrammar.parse(
        '<somemodel:tool_call>x</somemodel:tool_call>'
      )
    ).toHaveLength(0)
  })
})
```

**Step 2: Run test — expect FAIL**

```bash
bun test apps/web/lib/agent/harness/tool-call-grammars/unknown-suspicious.test.ts
```

**Step 3: Implement `unknown-suspicious.ts`**

```typescript
import type { ToolCallGrammar, DetectHit } from './types'

const PATTERNS = [
  /<\w[\w-]*:\w[\w-]*_call\b/, // namespaced: <foo:tool_call>, <bar:function_call>
  /<tool_call\b/, // generic <tool_call>
  /<function_call\b/, // generic <function_call>
  /\u{FFF0}tool_calls/u, // deepseek FIM unicode delimiter
  /<\|python_tag\|>/, // llama python tag
]

export const unknownSuspiciousGrammar: ToolCallGrammar = {
  id: 'unknown-suspicious',

  detect(text: string): DetectHit | null {
    for (const re of PATTERNS) {
      const match = re.exec(text)
      if (match)
        return { start: match.index, end: text.length, confidence: 'low' }
    }
    return null
  },

  parse(_text: string) {
    return []
  },

  strip(text: string): string {
    return text
  },

  examples: {
    good: [],
    malformed: [],
  },
}
```

**Step 4: Implement `hermes-tool-call.ts`** (Nous/Hermes `<tool_call>` format)

```typescript
import type { ToolCallGrammar, DetectHit, ParsedToolCall } from './types'

const OPEN_RE = /<tool_call>/
const FULL_RE = /<tool_call>([\s\S]*?)<\/tool_call>/g

export const hermesToolCallGrammar: ToolCallGrammar = {
  id: 'hermes-tool-call',

  detect(text: string): DetectHit | null {
    const match = OPEN_RE.exec(text)
    if (!match) return null
    return { start: match.index, end: text.length, confidence: 'high' }
  },

  parse(text: string): ParsedToolCall[] {
    const results: ParsedToolCall[] = []
    FULL_RE.lastIndex = 0
    let match: RegExpExecArray | null
    while ((match = FULL_RE.exec(text)) !== null) {
      try {
        const obj = JSON.parse(match[1].trim())
        if (typeof obj.name === 'string' && typeof obj.arguments === 'object') {
          results.push({ name: obj.name, arguments: obj.arguments ?? {} })
        }
      } catch {
        /* skip */
      }
    }
    return results
  },

  strip(text: string): string {
    FULL_RE.lastIndex = 0
    return text.replace(FULL_RE, '').trim()
  },

  examples: {
    good: [
      `<tool_call>{"name":"write_files","arguments":{"path":"x.ts","content":"hi"}}</tool_call>`,
    ],
    malformed: [
      `<tool_call>not json</tool_call>`,
      `<tool_call>{"name":"x"}</tool_call>`,
    ],
  },
}
```

**Step 5: Implement `deepseek-fim.ts`** (DeepSeek `<｜tool▁calls▁begin｜>`
format)

```typescript
import type { ToolCallGrammar, DetectHit, ParsedToolCall } from './types'

const OPEN_RE = /<｜tool▁calls▁begin｜>/
const FULL_RE = /<｜tool▁calls▁begin｜>([\s\S]*?)<｜tool▁calls▁end｜>/g
const CALL_RE = /<｜tool▁call▁begin｜>([\s\S]*?)<｜tool▁call▁end｜>/g

export const deepseekFimGrammar: ToolCallGrammar = {
  id: 'deepseek-fim',

  detect(text: string): DetectHit | null {
    const match = OPEN_RE.exec(text)
    if (!match) return null
    return { start: match.index, end: text.length, confidence: 'high' }
  },

  parse(text: string): ParsedToolCall[] {
    const results: ParsedToolCall[] = []
    FULL_RE.lastIndex = 0
    let blockMatch: RegExpExecArray | null
    while ((blockMatch = FULL_RE.exec(text)) !== null) {
      CALL_RE.lastIndex = 0
      let callMatch: RegExpExecArray | null
      while ((callMatch = CALL_RE.exec(blockMatch[1])) !== null) {
        try {
          const lines = callMatch[1].trim().split('\n')
          const nameLine = lines.find((l) => l.startsWith('▁'))
          const jsonLine = lines.find((l) => l.trim().startsWith('{'))
          if (!nameLine || !jsonLine) continue
          const name = nameLine.replace(/^▁/, '').trim()
          const args = JSON.parse(jsonLine)
          results.push({ name, arguments: args })
        } catch {
          /* skip */
        }
      }
    }
    return results
  },

  strip(text: string): string {
    FULL_RE.lastIndex = 0
    return text.replace(FULL_RE, '').trim()
  },

  examples: {
    good: [],
    malformed: [],
  },
}
```

**Step 6: Run tests — expect PASS**

```bash
bun test apps/web/lib/agent/harness/tool-call-grammars/unknown-suspicious.test.ts
```

**Step 7: Register all new adapters in `index.ts`**

```typescript
import { unknownSuspiciousGrammar } from './unknown-suspicious'
import { hermesToolCallGrammar } from './hermes-tool-call'
import { deepseekFimGrammar } from './deepseek-fim'
registerGrammar(hermesToolCallGrammar)
registerGrammar(deepseekFimGrammar)
registerGrammar(unknownSuspiciousGrammar)
```

**Step 8: Commit**

```bash
git add apps/web/lib/agent/harness/tool-call-grammars/
git commit -m "feat(grammar): add unknown-suspicious safety net, hermes-tool-call, deepseek-fim adapters"
```

---

### Task 8: `harness/errors.ts` — typed error surface (§6.1 — L5)

**Files:**

- Create: `apps/web/lib/agent/harness/errors.ts`

No behavior tests needed — pure types. The types are exercised by Tasks 9–12.

**Step 1: Create `errors.ts`**

```typescript
// apps/web/lib/agent/harness/errors.ts

export type ModelCompatibilityError =
  | { kind: 'UNMANIFESTED_MODEL'; providerId: string; modelId: string }
  | {
      kind: 'UNVERIFIED_MODEL'
      providerId: string
      modelId: string
      status: string
    }
  | {
      kind: 'LEAKED_UNDECLARED_GRAMMAR'
      grammarId: string
      snippet: string
      modelId: string
    }
  | { kind: 'LEAKED_UNKNOWN_GRAMMAR'; snippet: string; modelId: string }
  | { kind: 'PARSER_FAILED'; grammarId: string; snippet: string; cause: string }

export type TerminationReason =
  | { kind: 'completed' }
  | { kind: 'user-abort' }
  | { kind: 'step-budget-exhausted'; budget: number }
  | { kind: 'stream-idle'; idleMs: number }
  | { kind: 'no-tool-calls-in-build-mode'; narrationTurns: number }
  | { kind: 'network-timeout'; cause: string }
  | { kind: 'preflight-failed'; code: string }
  | { kind: 'tool-call-leak-detected'; grammarId: string }

export class HarnessError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message)
    this.name = 'HarnessError'
  }
}

export class PreflightError extends HarnessError {
  constructor(code: string, message: string) {
    super(message, code)
    this.name = 'PreflightError'
  }
}

export class GrammarLeakError extends HarnessError {
  constructor(public readonly compat: ModelCompatibilityError) {
    super(
      `Grammar leak: ${compat.kind}`,
      compat.kind,
      compat as unknown as Record<string, unknown>
    )
    this.name = 'GrammarLeakError'
  }
}
```

**Step 2: Commit**

```bash
git add apps/web/lib/agent/harness/errors.ts
git commit -m "feat(errors): add typed harness errors — ModelCompatibilityError, TerminationReason, HarnessError"
```

---

### Task 9: Model capability manifest (§6.1 — L2)

**Files:**

- Create: `apps/web/lib/agent/providers/model-capabilities.ts`
- Test: `apps/web/lib/agent/providers/model-capabilities.test.ts`

**Step 1: Write failing test**

```typescript
// model-capabilities.test.ts
import { describe, expect, test } from 'bun:test'
import {
  findCapability,
  isVerified,
  getGrammarsForModel,
  MODEL_CAPABILITIES,
} from './model-capabilities'

describe('model-capabilities manifest', () => {
  test('findCapability returns entry for known model', () => {
    const cap = findCapability('anthropic', 'claude-sonnet-4-6')
    expect(cap).not.toBeNull()
    expect(cap!.status).toBe('verified')
  })

  test('findCapability returns null for unknown model', () => {
    expect(findCapability('anthropic', 'nonexistent-model-xyz')).toBeNull()
  })

  test('isVerified returns true for claude models', () => {
    expect(isVerified('anthropic', 'claude-sonnet-4-6')).toBe(true)
  })

  test('isVerified returns false for unmanifested model', () => {
    expect(isVerified('unknown-provider', 'mystery-model')).toBe(false)
  })

  test('getGrammarsForModel returns grammar list for minimax model', () => {
    const grammars = getGrammarsForModel('openai-compatible', 'kimi-k2.5')
    expect(grammars).toContain('minimax-xml')
  })

  test('every manifest entry has at least one grammar', () => {
    for (const entry of MODEL_CAPABILITIES) {
      expect(entry.toolCallGrammars.length).toBeGreaterThan(0)
    }
  })
})
```

**Step 2: Run test — expect FAIL**

```bash
bun test apps/web/lib/agent/providers/model-capabilities.test.ts
```

**Step 3: Create `model-capabilities.ts`**

```typescript
// apps/web/lib/agent/providers/model-capabilities.ts
import type { GrammarId } from '../harness/tool-call-grammars/types'

export type ModelStatus = 'verified' | 'experimental' | 'unverified'

export interface ModelCapability {
  providerId: string
  modelPattern: string | RegExp
  toolCallGrammars: GrammarId[]
  sdkHandlesToolCalls: 'yes' | 'no' | 'sometimes'
  status: ModelStatus
  notes?: string
}

export const MODEL_CAPABILITIES: ModelCapability[] = [
  // Anthropic — SDK handles tool calls natively; XML fallback for edge cases
  {
    providerId: 'anthropic',
    modelPattern: /^claude-/,
    toolCallGrammars: ['anthropic-native', 'anthropic-xml-fallback'],
    sdkHandlesToolCalls: 'yes',
    status: 'verified',
  },
  // OpenAI — SDK handles tool calls natively
  {
    providerId: 'openai',
    modelPattern: /^gpt-/,
    toolCallGrammars: ['openai-native', 'openai-text-json'],
    sdkHandlesToolCalls: 'yes',
    status: 'verified',
  },
  // Kimi / MiniMax via openai-compatible endpoint
  {
    providerId: 'openai-compatible',
    modelPattern: /^kimi-/,
    toolCallGrammars: ['minimax-xml', 'openai-text-json'],
    sdkHandlesToolCalls: 'no',
    status: 'experimental',
    notes:
      'kimi-k2.5 emits minimax-xml in text stream; does not use SDK tool_calls field',
  },
  // DeepSeek
  {
    providerId: 'openai-compatible',
    modelPattern: /^deepseek-/,
    toolCallGrammars: ['deepseek-fim', 'openai-text-json'],
    sdkHandlesToolCalls: 'sometimes',
    status: 'experimental',
  },
  // Hermes / Nous
  {
    providerId: 'openai-compatible',
    modelPattern: /hermes/i,
    toolCallGrammars: ['hermes-tool-call'],
    sdkHandlesToolCalls: 'no',
    status: 'experimental',
  },
]

function matches(pattern: string | RegExp, modelId: string): boolean {
  if (typeof pattern === 'string') return modelId === pattern
  return pattern.test(modelId)
}

export function findCapability(
  providerId: string,
  modelId: string
): ModelCapability | null {
  return (
    MODEL_CAPABILITIES.find(
      (c) => c.providerId === providerId && matches(c.modelPattern, modelId)
    ) ?? null
  )
}

export function isVerified(providerId: string, modelId: string): boolean {
  const cap = findCapability(providerId, modelId)
  return cap?.status === 'verified'
}

export function getGrammarsForModel(
  providerId: string,
  modelId: string
): GrammarId[] {
  return findCapability(providerId, modelId)?.toolCallGrammars ?? []
}
```

**Step 4: Run test — expect PASS**

```bash
bun test apps/web/lib/agent/providers/model-capabilities.test.ts
```

**Step 5: Commit**

```bash
git add apps/web/lib/agent/providers/
git commit -m "feat(manifest): add model-capabilities manifest with Anthropic, OpenAI, Kimi, DeepSeek, Hermes entries"
```

---

### Task 10: Stream sanitizer (§6.1 — L3)

**Files:**

- Create: `apps/web/lib/agent/harness/stream-sanitizer.ts`
- Test: `apps/web/lib/agent/harness/stream-sanitizer.test.ts`

**Step 1: Write failing tests**

```typescript
// stream-sanitizer.test.ts
import { describe, expect, test } from 'bun:test'
import { sanitizeText } from './stream-sanitizer'
import { minimaxXmlGrammar } from './tool-call-grammars/minimax-xml'
import { unknownSuspiciousGrammar } from './tool-call-grammars/unknown-suspicious'
import { registerGrammar } from './tool-call-grammars/index'

// Ensure grammars are registered
registerGrammar(minimaxXmlGrammar)
registerGrammar(unknownSuspiciousGrammar)

const MINIMAX_CALL = `<minimax:tool_call>
<tool_name>write_files</tool_name>
<parameters>{"path":"x.ts","content":"hi"}</parameters>
</minimax:tool_call>`

describe('sanitizeText', () => {
  test('clean text passes through unchanged', () => {
    const result = sanitizeText('hello world', {
      providerId: 'anthropic',
      modelId: 'claude-sonnet-4-6',
      declaredGrammars: ['anthropic-native'],
    })
    expect(result.kind).toBe('clean')
    if (result.kind === 'clean') expect(result.text).toBe('hello world')
  })

  test('detects minimax-xml in text when grammar is declared', () => {
    const result = sanitizeText(MINIMAX_CALL, {
      providerId: 'openai-compatible',
      modelId: 'kimi-k2.5',
      declaredGrammars: ['minimax-xml'],
    })
    expect(result.kind).toBe('extracted')
    if (result.kind === 'extracted') {
      expect(result.toolCalls).toHaveLength(1)
      expect(result.toolCalls[0].name).toBe('write_files')
      expect(result.cleanText).not.toContain('<minimax:tool_call>')
    }
  })

  test('reports LEAKED_UNDECLARED_GRAMMAR when minimax-xml found but not declared', () => {
    const result = sanitizeText(MINIMAX_CALL, {
      providerId: 'anthropic',
      modelId: 'claude-sonnet-4-6',
      declaredGrammars: ['anthropic-native'],
    })
    expect(result.kind).toBe('error')
    if (result.kind === 'error') {
      expect(result.error.kind).toBe('LEAKED_UNDECLARED_GRAMMAR')
    }
  })

  test('reports LEAKED_UNKNOWN_GRAMMAR for novel tool-call-shaped tag', () => {
    const result = sanitizeText(
      '<novelvendor:tool_call>x</novelvendor:tool_call>',
      {
        providerId: 'anthropic',
        modelId: 'claude-sonnet-4-6',
        declaredGrammars: ['anthropic-native'],
      }
    )
    expect(result.kind).toBe('error')
    if (result.kind === 'error') {
      expect(result.error.kind).toBe('LEAKED_UNKNOWN_GRAMMAR')
    }
  })

  // Property: tool-call-shaped text NEVER reaches clean output
  test('property: no tool-call-shaped text in clean output under any condition', () => {
    const suspiciousInputs = [
      MINIMAX_CALL,
      '<function_calls><invoke><tool_name>x</tool_name></invoke></function_calls>',
      '<tool_call>{"name":"x","arguments":{}}</tool_call>',
      '<novelvendor:tool_call>stuff</novelvendor:tool_call>',
    ]
    for (const input of suspiciousInputs) {
      const result = sanitizeText(input, {
        providerId: 'anthropic',
        modelId: 'claude-sonnet-4-6',
        declaredGrammars: ['anthropic-native'],
      })
      if (result.kind === 'clean') {
        // clean result must not contain tool-call-shaped patterns
        expect(result.text).not.toMatch(
          /<\w[\w-]*:\w[\w-]*_call|<function_calls>|<tool_call>/
        )
      }
      // error or extracted results are fine — they're not passed to display
    }
  })
})
```

**Step 2: Run test — expect FAIL**

```bash
bun test apps/web/lib/agent/harness/stream-sanitizer.test.ts
```

**Step 3: Implement `stream-sanitizer.ts`**

```typescript
// apps/web/lib/agent/harness/stream-sanitizer.ts
import { detectGrammar, getGrammar } from './tool-call-grammars/index'
import type { ParsedToolCall, GrammarId } from './tool-call-grammars/types'
import type { ModelCompatibilityError } from './errors'

export interface SanitizeOptions {
  providerId: string
  modelId: string
  declaredGrammars: GrammarId[]
}

export type SanitizeResult =
  | { kind: 'clean'; text: string }
  | { kind: 'extracted'; cleanText: string; toolCalls: ParsedToolCall[] }
  | { kind: 'error'; error: ModelCompatibilityError }

export function sanitizeText(
  text: string,
  opts: SanitizeOptions
): SanitizeResult {
  const detected = detectGrammar(text)
  if (!detected) {
    return { kind: 'clean', text }
  }

  const { grammar, hit } = detected
  const snippet = text.slice(hit.start, Math.min(hit.start + 200, text.length))

  if (grammar.id === 'unknown-suspicious') {
    return {
      kind: 'error',
      error: { kind: 'LEAKED_UNKNOWN_GRAMMAR', snippet, modelId: opts.modelId },
    }
  }

  if (!opts.declaredGrammars.includes(grammar.id)) {
    return {
      kind: 'error',
      error: {
        kind: 'LEAKED_UNDECLARED_GRAMMAR',
        grammarId: grammar.id,
        snippet,
        modelId: opts.modelId,
      },
    }
  }

  try {
    const toolCalls = grammar.parse(text)
    const cleanText = grammar.strip(text)
    return { kind: 'extracted', cleanText, toolCalls }
  } catch (err) {
    return {
      kind: 'error',
      error: {
        kind: 'PARSER_FAILED',
        grammarId: grammar.id,
        snippet,
        cause: err instanceof Error ? err.message : String(err),
      },
    }
  }
}
```

**Step 4: Run test — expect PASS**

```bash
bun test apps/web/lib/agent/harness/stream-sanitizer.test.ts
```

**Step 5: Commit**

```bash
git add apps/web/lib/agent/harness/stream-sanitizer.ts apps/web/lib/agent/harness/stream-sanitizer.test.ts
git commit -m "feat(sanitizer): add stream-sanitizer — provider-blind tool-call leak detection and extraction"
```

---

### Task 11: Preflight checks (§5.5)

**Files:**

- Create: `apps/web/lib/agent/harness/preflight.ts`
- Test: `apps/web/lib/agent/harness/preflight.test.ts`

**Step 1: Write failing test**

```typescript
// preflight.test.ts
import { describe, expect, test } from 'bun:test'
import { runPreflight } from './preflight'

describe('runPreflight', () => {
  test('passes for verified model in ask mode', () => {
    const result = runPreflight({
      providerId: 'anthropic',
      modelId: 'claude-sonnet-4-6',
      chatMode: 'ask',
      hasApprovedPlan: false,
    })
    expect(result.ok).toBe(true)
  })

  test('fails for unmanifested model in build mode', () => {
    const result = runPreflight({
      providerId: 'unknown-provider',
      modelId: 'mystery-model',
      chatMode: 'code',
      hasApprovedPlan: true,
    })
    expect(result.ok).toBe(false)
    expect(result.error?.code).toBe('UNMANIFESTED_MODEL')
  })

  test('fails for experimental model in build mode without opt-in', () => {
    const result = runPreflight({
      providerId: 'openai-compatible',
      modelId: 'kimi-k2.5',
      chatMode: 'code',
      hasApprovedPlan: true,
      allowExperimental: false,
    })
    expect(result.ok).toBe(false)
    expect(result.error?.code).toBe('UNVERIFIED_MODEL')
  })

  test('passes for experimental model in build mode with opt-in', () => {
    const result = runPreflight({
      providerId: 'openai-compatible',
      modelId: 'kimi-k2.5',
      chatMode: 'code',
      hasApprovedPlan: true,
      allowExperimental: true,
    })
    expect(result.ok).toBe(true)
  })

  test('fails for code mode when no approved plan', () => {
    const result = runPreflight({
      providerId: 'anthropic',
      modelId: 'claude-sonnet-4-6',
      chatMode: 'code',
      hasApprovedPlan: false,
    })
    expect(result.ok).toBe(false)
    expect(result.error?.code).toBe('MISSING_APPROVED_PLAN')
  })

  test('ask mode does not require approved plan', () => {
    const result = runPreflight({
      providerId: 'anthropic',
      modelId: 'claude-sonnet-4-6',
      chatMode: 'ask',
      hasApprovedPlan: false,
    })
    expect(result.ok).toBe(true)
  })
})
```

**Step 2: Run test — expect FAIL**

```bash
bun test apps/web/lib/agent/harness/preflight.test.ts
```

**Step 3: Implement `preflight.ts`**

```typescript
// apps/web/lib/agent/harness/preflight.ts
import { findCapability } from '../providers/model-capabilities'
import { CHAT_MODE_CONFIGS } from '../chat-modes'
import type { ChatMode } from '../chat-modes'

export interface PreflightOptions {
  providerId: string
  modelId: string
  chatMode: ChatMode
  hasApprovedPlan: boolean
  allowExperimental?: boolean
}

export type PreflightResult =
  | { ok: true }
  | { ok: false; error: { code: string; message: string } }

export function runPreflight(opts: PreflightOptions): PreflightResult {
  const modeConfig = CHAT_MODE_CONFIGS[opts.chatMode]

  if (modeConfig.requiresToolCalls) {
    const cap = findCapability(opts.providerId, opts.modelId)

    if (!cap) {
      return {
        ok: false,
        error: {
          code: 'UNMANIFESTED_MODEL',
          message: `Model "${opts.modelId}" from provider "${opts.providerId}" has no capability manifest entry. Add it to apps/web/lib/agent/providers/model-capabilities.ts before using Build or Builder mode.`,
        },
      }
    }

    if (
      cap.status === 'unverified' ||
      (cap.status === 'experimental' && !opts.allowExperimental)
    ) {
      return {
        ok: false,
        error: {
          code: 'UNVERIFIED_MODEL',
          message: `Model "${opts.modelId}" (status: ${cap.status}) is not verified for Build mode. Enable experimental models or switch to a verified model.`,
        },
      }
    }

    if (opts.chatMode === 'code' && !opts.hasApprovedPlan) {
      return {
        ok: false,
        error: {
          code: 'MISSING_APPROVED_PLAN',
          message:
            'Build mode requires an approved plan. Complete the planning phase first.',
        },
      }
    }
  }

  return { ok: true }
}
```

**Step 4: Run test — expect PASS**

```bash
bun test apps/web/lib/agent/harness/preflight.test.ts
```

**Step 5: Commit**

```bash
git add apps/web/lib/agent/harness/preflight.ts apps/web/lib/agent/harness/preflight.test.ts
git commit -m "feat(preflight): add pre-turn validation — blocks unmanifested/unverified models and missing plan"
```

---

### Task 12: Wire sanitizer + preflight into harness runtime

**Files:**

- Modify: `apps/web/lib/agent/harness/runtime.ts`

**Context:** Open `runtime.ts`. Find the `executeStep` method (~line 843).
Inside `processStreamWithResilience`, the `case 'text':` branch appends to
`fullContent`. After the stream loop ends, around line 1038, `fullContent` is
used to create a `TextPart`.

**Step 1: Import new modules** at top of `runtime.ts`

```typescript
import { sanitizeText } from './stream-sanitizer'
import { runPreflight } from './preflight'
import { getGrammarsForModel } from '../providers/model-capabilities'
import { GrammarLeakError } from './errors'
```

**Step 2: Add preflight call in `runLoop`**

Find the beginning of `runLoop` (before the main step loop). Add:

```typescript
// Run preflight before first step
const preflightResult = runPreflight({
  providerId: this.provider.name,
  modelId: agent.model ?? this.provider.config.defaultModel ?? '',
  chatMode: (this.config.chatMode as ChatMode) ?? 'ask',
  hasApprovedPlan: Boolean(this.config.deliveryContextPack?.approvedPlanId),
  allowExperimental: this.config.allowExperimentalModels ?? false,
})
if (!preflightResult.ok) {
  yield {
    type: 'error',
    error: `Preflight failed [${preflightResult.error.code}]: ${preflightResult.error.message}`,
  }
  return
}
```

**Step 3: Add sanitizer call after stream loop**

Find the section after the stream `for await` loop ends, before
`if (fullContent) { ... }` (~line 1038). Add:

```typescript
if (fullContent) {
  const declaredGrammars = getGrammarsForModel(this.provider.name, completionOptions.model)
  const sanitized = sanitizeText(fullContent, {
    providerId: this.provider.name,
    modelId: completionOptions.model,
    declaredGrammars,
  })

  if (sanitized.kind === 'error') {
    yield { type: 'error', error: `Grammar leak detected: ${sanitized.error.kind} — ${JSON.stringify(sanitized.error)}` }
    return { finishReason: 'error', messageID }
  }

  if (sanitized.kind === 'extracted') {
    fullContent = sanitized.cleanText
    // Extracted tool calls are emitted as pending tool calls
    for (const tc of sanitized.toolCalls) {
      pendingToolCalls.push({
        id: `extracted_${tc.name}_${Date.now()}`,
        name: tc.name,
        arguments: tc.arguments,
      })
    }
  }
}
```

**Step 4: Run existing tests to check for regressions**

```bash
bun test apps/web/lib/agent/harness/runtime.test.ts
bun test apps/web/lib/agent/harness/permissions.test.ts
```

Expected: all existing tests still PASS.

**Step 5: Commit**

```bash
git add apps/web/lib/agent/harness/runtime.ts
git commit -m "feat(runtime): wire stream-sanitizer and preflight into executeStep — no raw grammar leaks to UI"
```

---

### Task 13: `ModelCompatibilityCard` component (§6.1 — L5)

**Files:**

- Create: `apps/web/components/chat/ModelCompatibilityCard.tsx`

No tests for this UI component — visual validation only.

**Step 1: Create `ModelCompatibilityCard.tsx`**

```tsx
// apps/web/components/chat/ModelCompatibilityCard.tsx
'use client'

import type { ModelCompatibilityError } from '@/lib/agent/harness/errors'

interface Props {
  error: ModelCompatibilityError
  onSwitchModel?: () => void
  onReport?: (error: ModelCompatibilityError) => void
}

const MESSAGES: Record<
  ModelCompatibilityError['kind'],
  (e: ModelCompatibilityError) => string
> = {
  UNMANIFESTED_MODEL: (e) =>
    `Model "${(e as { modelId: string }).modelId}" has no capability entry. It cannot be used in Build mode.`,
  UNVERIFIED_MODEL: (e) =>
    `Model "${(e as { modelId: string }).modelId}" is ${(e as { status: string }).status} and blocked in Build mode.`,
  LEAKED_UNDECLARED_GRAMMAR: (e) =>
    `Model emitted tool-call syntax (${(e as { grammarId: string }).grammarId}) not in its declared grammar list. The run was aborted to prevent corrupted output.`,
  LEAKED_UNKNOWN_GRAMMAR: (_e) =>
    `Model emitted an unknown tool-call syntax. The run was aborted. This may be a new model grammar not yet registered.`,
  PARSER_FAILED: (e) =>
    `Tool-call parsing failed (${(e as { grammarId: string }).grammarId}): ${(e as { cause: string }).cause}`,
}

export function ModelCompatibilityCard({
  error,
  onSwitchModel,
  onReport,
}: Props) {
  const message =
    MESSAGES[error.kind]?.(error) ??
    'An unknown model compatibility error occurred.'

  return (
    <div className="rounded-lg border border-orange-200 bg-orange-50 p-4 text-sm dark:border-orange-900 dark:bg-orange-950">
      <p className="font-medium text-orange-900 dark:text-orange-100">
        Model Compatibility Issue
      </p>
      <p className="mt-1 text-orange-800 dark:text-orange-200">{message}</p>
      <div className="mt-3 flex gap-2">
        {onSwitchModel && (
          <button
            onClick={onSwitchModel}
            className="rounded bg-orange-100 px-3 py-1 text-xs font-medium text-orange-900 hover:bg-orange-200 dark:bg-orange-900 dark:text-orange-100 dark:hover:bg-orange-800"
          >
            Switch Model
          </button>
        )}
        {onReport && (
          <button
            onClick={() => onReport(error)}
            className="rounded bg-transparent px-3 py-1 text-xs font-medium text-orange-700 hover:bg-orange-100 dark:text-orange-300 dark:hover:bg-orange-900"
          >
            Report Issue
          </button>
        )}
      </div>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add apps/web/components/chat/ModelCompatibilityCard.tsx
git commit -m "feat(ui): add ModelCompatibilityCard — renders typed grammar leak errors with model-switch CTA"
```

---

## M3 — Watchdog + Typed Termination Reasons

### Task 14: Narration-loop watchdog (§5.6)

**Context:** The architecture says: "two consecutive assistant turns of
narration in Build/Builder mode with zero `write_files` or `run_command`
invocations → abort with `no-tool-calls-in-build-mode`." This lives in the
runtime's main run loop.

**Files:**

- Modify: `apps/web/lib/agent/harness/runtime.ts`
- Test: `apps/web/lib/agent/harness/runtime.narration-watchdog.test.ts`

**Step 1: Write failing test**

Create `apps/web/lib/agent/harness/runtime.narration-watchdog.test.ts`. This
test uses the existing `Runtime` mock/stub patterns from `runtime.test.ts`. Look
at how `runtime.test.ts` stubs the provider before writing this test. The key
assertion is that after 2 consecutive narration-only steps in build mode, the
runtime emits an error event with message containing
`no-tool-calls-in-build-mode`.

```typescript
import { describe, expect, test } from 'bun:test'

// Import test helpers from existing runtime.test.ts pattern.
// Read runtime.test.ts first to understand how to create a mock runtime.
// Then write a test that:
// 1. Creates runtime with chatMode: 'code'
// 2. Provider returns 2 consecutive text-only responses (no tool calls)
// 3. Asserts that the runtime emits error 'no-tool-calls-in-build-mode'
```

Read `apps/web/lib/agent/harness/runtime.test.ts` to understand the mock
provider pattern, then implement this test.

**Step 2: Add narration counter to runtime state**

In `RuntimeState` (find the interface in `runtime.ts`), add:

```typescript
consecutiveNarrationTurns: number
```

Initialize to `0` in `createInitialState`.

**Step 3: Add watchdog logic after each step**

In the main run loop, after executing a step and before the next iteration,
check:

```typescript
const isBuilding = this.config.chatMode === 'code' || this.config.chatMode === 'build'
const hadToolCalls = pendingToolCalls.length > 0 || stepHadToolCalls
if (isBuilding) {
  if (!hadToolCalls) {
    this.state.consecutiveNarrationTurns++
    if (this.state.consecutiveNarrationTurns >= 2) {
      yield {
        type: 'error',
        error: JSON.stringify({ kind: 'no-tool-calls-in-build-mode', narrationTurns: this.state.consecutiveNarrationTurns }),
      }
      return
    }
  } else {
    this.state.consecutiveNarrationTurns = 0
  }
}
```

**Step 4: Run tests**

```bash
bun test apps/web/lib/agent/harness/runtime.narration-watchdog.test.ts
bun test apps/web/lib/agent/harness/runtime.test.ts
```

**Step 5: Commit**

```bash
git add apps/web/lib/agent/harness/runtime.ts apps/web/lib/agent/harness/runtime.narration-watchdog.test.ts
git commit -m "feat(watchdog): abort build mode after 2 consecutive narration turns with no tool calls"
```

---

### Task 15: `RunStatus` component (§5.6)

**Files:**

- Create: `apps/web/components/chat/RunStatus.tsx`

**Step 1: Create `RunStatus.tsx`**

```tsx
// apps/web/components/chat/RunStatus.tsx
'use client'

import type { TerminationReason } from '@/lib/agent/harness/errors'

interface Props {
  reason: TerminationReason
  onRetry?: () => void
  onSwitchModel?: () => void
  onViewTranscript?: () => void
}

const LABELS: Record<TerminationReason['kind'], string> = {
  completed: 'Completed',
  'user-abort': 'Stopped',
  'step-budget-exhausted': 'Step limit reached',
  'stream-idle': 'Connection timed out',
  'no-tool-calls-in-build-mode': 'Narration loop detected',
  'network-timeout': 'Network timeout',
  'preflight-failed': 'Cannot start',
  'tool-call-leak-detected': 'Grammar leak aborted',
}

const DETAILS: Partial<
  Record<TerminationReason['kind'], (r: TerminationReason) => string>
> = {
  'step-budget-exhausted': (r) =>
    `Reached the ${(r as { budget: number }).budget}-step limit.`,
  'stream-idle': (r) =>
    `No response for ${Math.round((r as { idleMs: number }).idleMs / 1000)}s.`,
  'no-tool-calls-in-build-mode': (r) =>
    `Agent narrated for ${(r as { narrationTurns: number }).narrationTurns} turns without calling a tool. Try switching to a verified model or re-stating the task.`,
  'preflight-failed': (r) =>
    `Pre-flight check failed: ${(r as { code: string }).code}`,
  'network-timeout': (r) => `Network error: ${(r as { cause: string }).cause}`,
}

export function RunStatus({
  reason,
  onRetry,
  onSwitchModel,
  onViewTranscript,
}: Props) {
  if (reason.kind === 'completed') return null

  const label = LABELS[reason.kind] ?? 'Unknown issue'
  const detail = DETAILS[reason.kind]?.(reason)

  return (
    <div className="rounded-md border border-yellow-200 bg-yellow-50 p-3 text-sm dark:border-yellow-900 dark:bg-yellow-950">
      <p className="font-medium text-yellow-900 dark:text-yellow-100">
        {label}
      </p>
      {detail && (
        <p className="mt-0.5 text-yellow-800 dark:text-yellow-200">{detail}</p>
      )}
      <div className="mt-2 flex gap-2">
        {onRetry && (
          <button
            onClick={onRetry}
            className="rounded bg-yellow-100 px-3 py-1 text-xs font-medium text-yellow-900 hover:bg-yellow-200 dark:bg-yellow-900 dark:text-yellow-100"
          >
            Re-run
          </button>
        )}
        {onSwitchModel && (
          <button
            onClick={onSwitchModel}
            className="rounded bg-yellow-100 px-3 py-1 text-xs font-medium text-yellow-900 hover:bg-yellow-200 dark:bg-yellow-900 dark:text-yellow-100"
          >
            Switch model
          </button>
        )}
        {onViewTranscript && (
          <button
            onClick={onViewTranscript}
            className="rounded bg-transparent px-3 py-1 text-xs font-medium text-yellow-700 hover:bg-yellow-100 dark:text-yellow-300"
          >
            View transcript
          </button>
        )}
      </div>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add apps/web/components/chat/RunStatus.tsx
git commit -m "feat(ui): add RunStatus component — renders typed termination reasons with actionable CTAs"
```

---

## M4 — Spec Injection & Verification

### Task 16: `spec/injector.ts` (§5.7)

**Files:**

- Create: `apps/web/lib/agent/spec/injector.ts`
- Test: `apps/web/lib/agent/spec/injector.test.ts`

**Step 1: Read these files first** to understand the existing spec types:

- `apps/web/lib/agent/spec/types.ts` — `FormalSpecification` interface
- `apps/web/lib/agent/spec/lifecycle-manager.ts` — `SpecLifecycleManager`

**Step 2: Write failing test**

```typescript
// injector.test.ts
import { describe, expect, test } from 'bun:test'
import { buildSpecSystemMessage, registerActiveSpecForDrift } from './injector'
import type { FormalSpecification } from './types'

const fakeSpec: FormalSpecification = {
  id: 'spec-1',
  tier: 'explicit',
  status: 'approved',
  constraints: ['Must not break existing tests', 'Must use TypeScript'],
  acceptanceCriteria: ['All tests pass', 'No TypeScript errors'],
  executionPlan: ['Step 1: Write types', 'Step 2: Implement'],
  createdAt: Date.now(),
}

describe('buildSpecSystemMessage', () => {
  test('returns string with constraints', () => {
    const msg = buildSpecSystemMessage(fakeSpec)
    expect(typeof msg).toBe('string')
    expect(msg).toContain('Must not break existing tests')
  })

  test('includes acceptance criteria', () => {
    const msg = buildSpecSystemMessage(fakeSpec)
    expect(msg).toContain('All tests pass')
  })

  test('includes execution plan', () => {
    const msg = buildSpecSystemMessage(fakeSpec)
    expect(msg).toContain('Step 1: Write types')
  })
})

describe('registerActiveSpecForDrift', () => {
  test('does not throw for a valid spec', () => {
    expect(() => registerActiveSpecForDrift(fakeSpec)).not.toThrow()
  })
})
```

**Step 3: Run test — expect FAIL**

```bash
bun test apps/web/lib/agent/spec/injector.test.ts
```

**Step 4: Implement `injector.ts`**

```typescript
// apps/web/lib/agent/spec/injector.ts
import type { FormalSpecification } from './types'
import { registerActiveSpec } from './drift-detection'

export function buildSpecSystemMessage(spec: FormalSpecification): string {
  const lines: string[] = [
    '## Active Specification',
    '',
    '### Constraints (must not violate)',
    ...spec.constraints.map((c) => `- ${c}`),
    '',
    '### Acceptance Criteria (must satisfy)',
    ...spec.acceptanceCriteria.map((c) => `- ${c}`),
    '',
    '### Execution Plan',
    ...spec.executionPlan.map((s, i) => `${i + 1}. ${s}`),
    '',
    'Every action you take must advance this spec. Do not modify files that conflict with the constraints above.',
  ]
  return lines.join('\n')
}

export function registerActiveSpecForDrift(spec: FormalSpecification): void {
  registerActiveSpec(spec)
}
```

**Step 5: Run test — expect PASS**

```bash
bun test apps/web/lib/agent/spec/injector.test.ts
```

**Step 6: Commit**

```bash
git add apps/web/lib/agent/spec/injector.ts apps/web/lib/agent/spec/injector.test.ts
git commit -m "feat(spec): add spec injector — buildSpecSystemMessage and registerActiveSpecForDrift"
```

---

### Task 17: Wire spec injector into runtime and session controller

**Files:**

- Modify: `apps/web/lib/agent/session-controller.ts`
- Modify: `apps/web/lib/agent/harness/runtime.ts` (spec injection into system
  prompt)

**Context:** Read `apps/web/lib/agent/session-controller.ts` in full. Look at
`buildAgentPromptContext` — it already injects `activeSpec` into the
`PromptContext`. The gap is that `buildHandoffSystemMessage` and
`buildSpecSystemMessage` are not included in the system messages passed to the
harness.

Look at `apps/web/lib/agent/prompt-library.ts` function `getPromptForMode` to
see how the system prompt is assembled. Find where `approvedPlanExecution`
context is injected and add spec injection there too.

**Step 1: In `prompt-library.ts`, inject spec message when active spec exists**

Find `getPromptForMode` and locate where the system messages are assembled.
After the approved plan section, add:

```typescript
if (context.activeSpec) {
  const { buildSpecSystemMessage } = await import('./spec/injector')
  systemMessages.push({
    role: 'system',
    content: buildSpecSystemMessage(context.activeSpec),
  })
}
```

**Step 2: In `session-controller.ts`, call `registerActiveSpecForDrift` when
spec is active**

In `buildAgentRuntimeConfig` or at the callsite, after resolving the active
spec:

```typescript
if (
  activeSpec &&
  (activeSpec.status === 'approved' || activeSpec.status === 'executing')
) {
  const { registerActiveSpecForDrift } = await import('./spec/injector')
  registerActiveSpecForDrift(activeSpec)
}
```

**Step 3: Run spec tests**

```bash
bun test apps/web/lib/agent/spec/
bun test apps/web/lib/agent/session-controller.test.ts
```

**Step 4: Commit**

```bash
git add apps/web/lib/agent/prompt-library.ts apps/web/lib/agent/session-controller.ts
git commit -m "feat(spec): wire spec injector into prompt assembly and drift registration — closes MEMORY.md gaps"
```

---

## CI Gate

### Task 18: CI gate script — enforce manifest coverage (Tier 5)

**Files:**

- Create: `scripts/check-model-manifest.ts`

**Step 1: Create the script**

```typescript
#!/usr/bin/env bun
// scripts/check-model-manifest.ts
// Fails if any model in the provider config lacks a manifest entry.
// Run: bun run scripts/check-model-manifest.ts

import { MODEL_CAPABILITIES } from '../apps/web/lib/agent/providers/model-capabilities'

// Add the full list of models your UI exposes here.
// This list should mirror the model dropdown options.
const UI_MODELS: { providerId: string; modelId: string }[] = [
  { providerId: 'anthropic', modelId: 'claude-sonnet-4-6' },
  { providerId: 'anthropic', modelId: 'claude-opus-4-7' },
  { providerId: 'anthropic', modelId: 'claude-haiku-4-5-20251001' },
  { providerId: 'openai', modelId: 'gpt-4o' },
  { providerId: 'openai-compatible', modelId: 'kimi-k2.5' },
  // Add more as the dropdown grows
]

let failures = 0

for (const { providerId, modelId } of UI_MODELS) {
  const found = MODEL_CAPABILITIES.some(
    (c) =>
      c.providerId === providerId &&
      (typeof c.modelPattern === 'string'
        ? c.modelPattern === modelId
        : c.modelPattern.test(modelId))
  )
  if (!found) {
    console.error(`FAIL: No manifest entry for ${providerId}/${modelId}`)
    failures++
  }
}

if (failures > 0) {
  console.error(
    `\n${failures} model(s) lack manifest entries. Add them to apps/web/lib/agent/providers/model-capabilities.ts`
  )
  process.exit(1)
} else {
  console.log(`OK: All ${UI_MODELS.length} UI models have manifest entries.`)
}
```

**Step 2: Run the script**

```bash
bun run scripts/check-model-manifest.ts
```

Expected: `OK: All N UI models have manifest entries.`

**Step 3: Commit**

```bash
git add scripts/check-model-manifest.ts
git commit -m "feat(ci): add check-model-manifest script — enforces manifest coverage for all UI model entries"
```

---

## Final Verification

Run the full test suite to confirm no regressions:

```bash
bun test apps/web/lib/agent/harness/
bun test apps/web/lib/agent/spec/
bun test apps/web/lib/agent/
```

Then run the CI gate:

```bash
bun run scripts/check-model-manifest.ts
```

---

## Bug Coverage Matrix (per §7.1)

| Observed failure                   | Closed by                                                    |
| ---------------------------------- | ------------------------------------------------------------ |
| Label stuck on "Panda · Plan"      | Task 2 (ref-based useModeContextRef)                         |
| Raw `</minimax:tool_call>` in chat | Tasks 5, 10, 12 (minimax-xml + sanitizer + wire)             |
| `[code collapsed]` in Build mode   | Task 1 (ModeContract + requiresToolCalls flag for collapser) |
| "Interrupted: Timeout"             | Task 14, 15 (narration watchdog + RunStatus)                 |
| Plan preamble as user message      | Task 3 (buildHandoffSystemMessage → system message)          |
| Narration without tool calls       | Task 14 (narration-loop watchdog)                            |
| Spec gaps from MEMORY.md           | Tasks 16, 17 (injector + drift registration)                 |
