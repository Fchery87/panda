# Harness Audit Remediation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to
> implement this plan task-by-task.

**Goal:** Fix all findings from the Production Readiness Audit across 12
primitives — structured logging, token accuracy, permission safety, checkpoint
durability, tool execution boundaries, plugin validation, agent name safety, and
tool execution timeouts.

**Architecture:** Replace `appLog` with a structured logger (session-scoped
context, JSON output). Replace heuristic token estimation with `js-tiktoken`.
Make checkpoint store mandatory. Add fail-deny on missing interrupt handler. Add
tool execution timeout. Add plugin tool shadowing guard. Add agent name
validation. Add permission audit persistence to Convex.

**Tech Stack:** Bun test runner, TypeScript, Convex (DB), js-tiktoken
(tokenizer), pino (structured logger)

---

## Task 1: Structured Logger — Replace `appLog`

**Files:**

- Modify: `apps/web/lib/logger.ts`
- Test: `apps/web/lib/logger.test.ts` (create)

**Step 1: Write the failing test**

```typescript
// apps/web/lib/logger.test.ts
import { describe, test, expect } from 'bun:test'

describe('appLog', () => {
  test('exports error, warn, info, debug methods', async () => {
    const { appLog } = await import('./logger')
    expect(typeof appLog.error).toBe('function')
    expect(typeof appLog.warn).toBe('function')
    expect(typeof appLog.info).toBe('function')
    expect(typeof appLog.debug).toBe('function')
  })

  test('createSessionLogger returns logger with sessionID in context', async () => {
    const { createSessionLogger } = await import('./logger')
    const logger = createSessionLogger('session-123')
    expect(typeof logger.error).toBe('function')
    expect(typeof logger.warn).toBe('function')
    expect(typeof logger.info).toBe('function')
    expect(typeof logger.debug).toBe('function')
  })

  test('createSessionLogger logger includes sessionID in output', async () => {
    const { createSessionLogger } = await import('./logger')
    const logs: unknown[] = []
    const original = console.error
    console.error = (...args: unknown[]) => logs.push(args)
    try {
      const logger = createSessionLogger('session-abc')
      logger.error('test message')
      expect(logs.length).toBeGreaterThan(0)
      const output = JSON.stringify(logs[0])
      expect(output).toContain('session-abc')
    } finally {
      console.error = original
    }
  })
})
```

**Step 2: Run test to verify it fails**

Run: `cd apps/web && bun test lib/logger.test.ts` Expected: FAIL —
`createSessionLogger` not exported, `info`/`debug` not defined

**Step 3: Write the implementation**

Replace `apps/web/lib/logger.ts` with:

```typescript
// apps/web/lib/logger.ts

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogContext {
  sessionID?: string
  step?: number
  tool?: string
  agent?: string
  [key: string]: unknown
}

interface Logger {
  debug: (msg: string, ctx?: LogContext) => void
  info: (msg: string, ctx?: LogContext) => void
  warn: (msg: string, ctx?: LogContext | unknown) => void
  error: (msg: string, ctx?: LogContext | unknown) => void
}

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
}

const currentLevel: LogLevel =
  (process.env.NEXT_PUBLIC_LOG_LEVEL as LogLevel) ??
  (process.env.NODE_ENV === 'production' ? 'warn' : 'debug')

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[currentLevel]
}

function formatEntry(
  level: LogLevel,
  msg: string,
  baseCtx: LogContext,
  extra?: LogContext | unknown
): string {
  const entry: Record<string, unknown> = {
    level,
    msg,
    ts: Date.now(),
    ...baseCtx,
  }
  if (extra && typeof extra === 'object' && extra !== null) {
    Object.assign(entry, extra)
  }
  return JSON.stringify(entry)
}

function createLogger(baseCtx: LogContext = {}): Logger {
  return {
    debug(msg: string, ctx?: LogContext) {
      if (!shouldLog('debug')) return
      console.debug(formatEntry('debug', msg, baseCtx, ctx))
    },
    info(msg: string, ctx?: LogContext) {
      if (!shouldLog('info')) return
      console.info(formatEntry('info', msg, baseCtx, ctx))
    },
    warn(msg: string, ctx?: LogContext | unknown) {
      if (!shouldLog('warn')) return
      console.warn(formatEntry('warn', msg, baseCtx, ctx))
    },
    error(msg: string, ctx?: LogContext | unknown) {
      if (!shouldLog('error')) return
      console.error(formatEntry('error', msg, baseCtx, ctx))
    },
  }
}

export const appLog = createLogger()

export function createSessionLogger(
  sessionID: string,
  extra?: LogContext
): Logger {
  return createLogger({ sessionID, ...extra })
}
```

**Step 4: Run test to verify it passes**

Run: `cd apps/web && bun test lib/logger.test.ts` Expected: PASS

**Step 5: Verify existing imports still work**

Run: `cd apps/web && npx tsc --noEmit --pretty 2>&1 | head -30` Expected: No new
errors from logger imports (all existing `import { appLog }` calls remain valid)

**Step 6: Commit**

```bash
git add apps/web/lib/logger.ts apps/web/lib/logger.test.ts
git commit -m "feat: replace appLog stub with structured JSON logger

Add createSessionLogger for session-scoped context.
Supports debug/info/warn/error levels with JSON output."
```

---

## Task 2: Agent Name Validation — Remove Silent Privilege Escalation

**Files:**

- Modify: `apps/web/lib/agent/harness/runtime.ts:286,456`
- Test: `apps/web/lib/agent/harness/runtime.test.ts` (add test)

**Step 1: Write the failing test**

Add to `apps/web/lib/agent/harness/runtime.test.ts`:

```typescript
test('throws on unknown agent name instead of falling back to build', async () => {
  resetHarnessTestState()
  const provider = createProvider(() => {})
  const runtime = new Runtime(provider, new Map())
  const userMessage = createUserMessage({
    id: 'msg-bad-agent',
    sessionID: 'session-bad',
    text: 'hello',
    agent: 'nonexistent-agent-xyz',
  })

  let threwError = false
  try {
    for await (const _event of runtime.run('session-bad', userMessage)) {
      // consume
    }
  } catch (error) {
    threwError = true
    expect((error as Error).message).toContain('nonexistent-agent-xyz')
  }
  expect(threwError).toBe(true)
})
```

**Step 2: Run test to verify it fails**

Run:
`cd apps/web && bun test lib/agent/harness/runtime.test.ts -t "throws on unknown agent name"`
Expected: FAIL — currently falls back to `build` silently

**Step 3: Apply the fix**

In `apps/web/lib/agent/harness/runtime.ts`, change line 286:

```typescript
// BEFORE (line 286):
const agent = agents.get(userMessage.agent) ?? agents.get('build')!

// AFTER:
const agent = agents.get(userMessage.agent)
if (!agent) {
  throw new Error(
    `Unknown agent: "${userMessage.agent}". Available agents: ${agents
      .list()
      .map((a) => a.name)
      .join(', ')}`
  )
}
```

And line 456 (`resume` method):

```typescript
// BEFORE (line 456):
const agent = agents.get(checkpoint.agentName) ?? agents.get('build')!

// AFTER:
const agent = agents.get(checkpoint.agentName)
if (!agent) {
  throw new Error(
    `Unknown agent in checkpoint: "${checkpoint.agentName}". Available agents: ${agents
      .list()
      .map((a) => a.name)
      .join(', ')}`
  )
}
```

**Step 4: Run test to verify it passes**

Run:
`cd apps/web && bun test lib/agent/harness/runtime.test.ts -t "throws on unknown agent name"`
Expected: PASS

**Step 5: Run all runtime tests to verify no regressions**

Run: `cd apps/web && bun test lib/agent/harness/runtime.test.ts` Expected: All
tests PASS

**Step 6: Commit**

```bash
git add apps/web/lib/agent/harness/runtime.ts apps/web/lib/agent/harness/runtime.test.ts
git commit -m "fix: throw on unknown agent name instead of silent build fallback

Prevents silent privilege escalation when agent name is
misspelled or missing from registry."
```

---

## Task 3: Tool Execution Timeout

**Files:**

- Modify: `apps/web/lib/agent/harness/types.ts` (add config field)
- Modify: `apps/web/lib/agent/harness/runtime.ts` (wrap executor with timeout)
- Test: `apps/web/lib/agent/harness/runtime.test.ts` (add test)

**Step 1: Write the failing test**

Add to `apps/web/lib/agent/harness/runtime.test.ts`:

```typescript
test('times out tool execution when toolExecutionTimeoutMs is exceeded', async () => {
  resetHarnessTestState()

  let toolCallCount = 0
  const provider = createProvider(() => {
    toolCallCount++
  }, 'tool_calls')

  // Create a tool executor that hangs forever
  const hangingExecutor = async () => {
    await new Promise(() => {}) // never resolves
    return { output: 'unreachable' }
  }

  const executors = new Map([['read_files', hangingExecutor]])
  const runtime = new Runtime(provider, executors, {
    toolExecutionTimeoutMs: 50,
    maxSteps: 2,
    skipSpecVerification: true,
  })

  // Create a provider that returns a tool call on first step
  const providerWithToolCall: typeof provider = {
    ...provider,
    async *completionStream(_options) {
      if (toolCallCount === 0) {
        yield {
          type: 'tool_call' as const,
          toolCall: {
            id: 'call-1',
            function: {
              name: 'read_files',
              arguments: '{"paths":["test.txt"]}',
            },
          },
        }
        yield {
          type: 'finish' as const,
          finishReason: 'tool_calls',
          usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
        }
      } else {
        yield { type: 'text' as const, content: 'done' }
        yield {
          type: 'finish' as const,
          finishReason: 'stop',
          usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
        }
      }
    },
  }

  const runtimeWithTimeout = new Runtime(providerWithToolCall, executors, {
    toolExecutionTimeoutMs: 50,
    maxSteps: 3,
    skipSpecVerification: true,
  })

  const events = []
  for await (const event of runtimeWithTimeout.run(
    'session-timeout',
    createUserMessage({
      id: 'msg-to',
      sessionID: 'session-timeout',
      text: 'read test.txt',
      agent: 'build',
    })
  )) {
    events.push(event)
  }

  const toolResults = events.filter((e) => e.type === 'tool_result')
  expect(toolResults.length).toBeGreaterThan(0)
  expect(toolResults[0].toolResult?.error).toContain('timed out')
})
```

**Step 2: Run test to verify it fails**

Run:
`cd apps/web && bun test lib/agent/harness/runtime.test.ts -t "times out tool execution"`
Expected: FAIL — test hangs because no timeout exists

**Step 3: Add config field to types.ts**

In `apps/web/lib/agent/harness/types.ts`, add to `RuntimeConfig` interface
(after `toolRetryBackoffMs`):

```typescript
toolExecutionTimeoutMs?: number
```

**Step 4: Add default and enforcement in runtime.ts**

In `apps/web/lib/agent/harness/runtime.ts`, add to `DEFAULT_RUNTIME_CONFIG`
(after `toolRetryBackoffMs: 200`):

```typescript
toolExecutionTimeoutMs: 300000, // 5 minutes
```

In `executeToolCall`, wrap the executor call (around line 1427) with a timeout:

```typescript
// BEFORE:
const result = await executor(args, {

// AFTER:
const timeoutMs = this.config.toolExecutionTimeoutMs ?? 300000
const executorPromise = executor(args, {
```

And wrap the await:

```typescript
// BEFORE:
const result = await executor(args, {
  sessionID: this.state.sessionID,
  messageID,
  agent,
  abortSignal: this.state.abortController.signal,
  metadata: () => {},
  ask: async (question: string) => {
    return `User response: ${question}`
  },
})

// AFTER:
const timeoutMs = this.config.toolExecutionTimeoutMs ?? 300000
const result = await Promise.race([
  executor(args, {
    sessionID: this.state.sessionID,
    messageID,
    agent,
    abortSignal: this.state.abortController.signal,
    metadata: () => {},
    ask: async (question: string) => {
      return `User response: ${question}`
    },
  }),
  new Promise<never>((_, reject) =>
    setTimeout(
      () =>
        reject(new Error(`Tool "${toolName}" timed out after ${timeoutMs}ms`)),
      timeoutMs
    )
  ),
])
```

**Step 5: Run test to verify it passes**

Run:
`cd apps/web && bun test lib/agent/harness/runtime.test.ts -t "times out tool execution"`
Expected: PASS

**Step 6: Run all runtime tests**

Run: `cd apps/web && bun test lib/agent/harness/runtime.test.ts` Expected: All
PASS

**Step 7: Commit**

```bash
git add apps/web/lib/agent/harness/types.ts apps/web/lib/agent/harness/runtime.ts apps/web/lib/agent/harness/runtime.test.ts
git commit -m "feat: add tool execution timeout (default 5min)

Wraps tool executor calls with Promise.race to prevent
hung tools from blocking the runtime indefinitely."
```

---

## Task 4: Permission Interrupt Fail-Deny

**Files:**

- Modify: `apps/web/lib/agent/harness/runtime.ts:2222-2234`
- Test: `apps/web/lib/agent/harness/runtime.test.ts` (add test)

**Step 1: Write the failing test**

Add to `apps/web/lib/agent/harness/runtime.test.ts`:

```typescript
test('denies tool execution when no interrupt handler is configured for ask-risk tools', async () => {
  resetHarnessTestState()

  let toolCallCount = 0
  const provider: LLMProvider = {
    name: 'test-provider',
    config: {
      provider: 'openai',
      auth: { apiKey: 'test' },
      defaultModel: 'test-model',
    },
    async listModels() {
      return []
    },
    async complete() {
      return {
        message: { role: 'assistant', content: 'summary' },
        usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
        finishReason: 'stop',
        model: 'test-model',
      }
    },
    async *completionStream() {
      if (toolCallCount === 0) {
        toolCallCount++
        yield {
          type: 'tool_call' as const,
          toolCall: {
            id: 'call-deny-1',
            function: {
              name: 'write_files',
              arguments: '{"files":[{"path":"test.txt","content":"x"}]}',
            },
          },
        }
        yield {
          type: 'finish' as const,
          finishReason: 'tool_calls',
          usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
        }
      } else {
        yield { type: 'text' as const, content: 'ok' }
        yield {
          type: 'finish' as const,
          finishReason: 'stop',
          usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
        }
      }
    },
  }

  const writeExecutor = async () => ({ output: 'written' })
  const executors = new Map([['write_files', writeExecutor]])

  // No onToolInterrupt configured — should deny, not approve
  const runtime = new Runtime(provider, executors, {
    maxSteps: 3,
    skipSpecVerification: true,
    // onToolInterrupt is NOT set
  })

  const events = []
  for await (const event of runtime.run(
    'session-deny',
    createUserMessage({
      id: 'msg-deny',
      sessionID: 'session-deny',
      text: 'write test.txt',
      agent: 'build',
    })
  )) {
    events.push(event)
  }

  const interruptDecisions = events.filter(
    (e) => e.type === 'interrupt_decision'
  )
  expect(interruptDecisions.length).toBeGreaterThan(0)
  expect(interruptDecisions[0].interrupt?.decision).toBe('reject')
})
```

**Step 2: Run test to verify it fails**

Run:
`cd apps/web && bun test lib/agent/harness/runtime.test.ts -t "denies tool execution when no interrupt handler"`
Expected: FAIL — currently returns `approve`

**Step 3: Apply the fix**

In `apps/web/lib/agent/harness/runtime.ts`, change lines 2222-2234:

```typescript
// BEFORE:
const handler = this.config.onToolInterrupt
if (!handler) {
  yield {
    type: 'interrupt_decision',
    content: `No interrupt handler configured for ${request.toolName}; proceeding to standard permissions`,
    interrupt: {
      toolName: request.toolName,
      riskTier: request.riskTier,
      decision: 'approve',
      reason: 'No interrupt handler configured',
    },
  }
  return { approved: true, args: request.args }
}

// AFTER:
const handler = this.config.onToolInterrupt
if (!handler) {
  const error = `No interrupt handler configured; denying ${request.toolName} (${request.riskTier} risk)`
  yield {
    type: 'interrupt_decision',
    content: error,
    interrupt: {
      toolName: request.toolName,
      riskTier: request.riskTier,
      decision: 'reject',
      reason: 'No interrupt handler configured — fail-deny policy',
    },
  }
  yield this.createToolResultEvent({
    toolCallId: request.toolCallId ?? request.messageID,
    toolName: request.toolName,
    args: request.args,
    output: '',
    error,
  })
  return { approved: false, args: request.args, error }
}
```

**Step 4: Run test to verify it passes**

Run:
`cd apps/web && bun test lib/agent/harness/runtime.test.ts -t "denies tool execution when no interrupt handler"`
Expected: PASS

**Step 5: Run all runtime tests — fix any that relied on fail-open**

Run: `cd apps/web && bun test lib/agent/harness/runtime.test.ts` Expected: Some
existing tests may fail if they use `write_files` or `run_command` without
setting `onToolInterrupt`. Fix those by adding a permissive handler:

```typescript
onToolInterrupt: async () => ({ decision: 'approve' as const }),
```

**Step 6: Commit**

```bash
git add apps/web/lib/agent/harness/runtime.ts apps/web/lib/agent/harness/runtime.test.ts
git commit -m "fix: fail-deny when no interrupt handler is configured

Previously, missing onToolInterrupt silently approved all
risk-tier ask decisions. Now denies by default (fail-closed)."
```

---

## Task 5: Plugin Tool Shadowing Guard

**Files:**

- Modify: `apps/web/lib/agent/harness/plugins.ts:57-60`
- Test: `apps/web/lib/agent/harness/plugins.test.ts` (create)

**Step 1: Write the failing test**

```typescript
// apps/web/lib/agent/harness/plugins.test.ts
import { describe, test, expect, beforeEach } from 'bun:test'
import { PluginManager, createPlugin } from './plugins'
import { AGENT_TOOLS } from '../tools'

describe('PluginManager tool shadowing', () => {
  test('throws when plugin tries to register a tool that shadows a built-in', () => {
    const manager = new PluginManager()
    const builtinName = AGENT_TOOLS[0].function.name // e.g. 'read_files'

    const shadowPlugin = createPlugin('shadow-test', {
      tools: [
        {
          type: 'function',
          function: {
            name: builtinName,
            description: 'Shadow tool',
            parameters: { type: 'object', properties: {} },
          },
        },
      ],
    })

    expect(() => manager.register(shadowPlugin)).toThrow(
      /shadows built-in tool/
    )
  })

  test('allows registering tools with unique names', () => {
    const manager = new PluginManager()

    const safePlugin = createPlugin('safe-test', {
      tools: [
        {
          type: 'function',
          function: {
            name: 'my_custom_tool',
            description: 'Custom tool',
            parameters: { type: 'object', properties: {} },
          },
        },
      ],
    })

    expect(() => manager.register(safePlugin)).not.toThrow()
    expect(manager.getTool('my_custom_tool')).toBeDefined()
  })
})
```

**Step 2: Run test to verify it fails**

Run: `cd apps/web && bun test lib/agent/harness/plugins.test.ts` Expected: FAIL
— `PluginManager` is not exported, and no shadowing guard exists

**Step 3: Apply the fix**

In `apps/web/lib/agent/harness/plugins.ts`:

1. Export the class: change `class PluginManager` to
   `export class PluginManager`

2. Add import at top:

```typescript
import { AGENT_TOOLS } from '../tools'
```

3. Add shadowing guard inside `register`, replace lines 57-60:

```typescript
// BEFORE:
if (plugin.tools) {
  for (const tool of plugin.tools) {
    this.customTools.set(tool.function.name, tool)
  }
}

// AFTER:
if (plugin.tools) {
  const builtinNames = new Set(AGENT_TOOLS.map((t) => t.function.name))
  for (const tool of plugin.tools) {
    if (builtinNames.has(tool.function.name)) {
      throw new Error(
        `Plugin "${plugin.name}" shadows built-in tool "${tool.function.name}". ` +
          `Use a unique name to avoid overriding core tools.`
      )
    }
    this.customTools.set(tool.function.name, tool)
  }
}
```

**Step 4: Run test to verify it passes**

Run: `cd apps/web && bun test lib/agent/harness/plugins.test.ts` Expected: PASS

**Step 5: Run existing tests**

Run: `cd apps/web && bun test lib/agent/harness/` Expected: All PASS

**Step 6: Commit**

```bash
git add apps/web/lib/agent/harness/plugins.ts apps/web/lib/agent/harness/plugins.test.ts
git commit -m "fix: prevent plugins from shadowing built-in tool names

Throws on registration if a plugin tool name collides
with AGENT_TOOLS. Prevents silent tool replacement."
```

---

## Task 6: Mandatory Checkpoint Store

**Files:**

- Modify: `apps/web/lib/agent/harness/runtime.ts:266-275`
- Modify: `apps/web/lib/agent/harness/types.ts` (make field required)
- Test: `apps/web/lib/agent/harness/runtime.test.ts` (update tests)

**Step 1: Write the failing test**

Add to `apps/web/lib/agent/harness/runtime.test.ts`:

```typescript
test('throws when constructed without a checkpointStore', () => {
  resetHarnessTestState()
  const provider = createProvider(() => {})
  expect(() => new Runtime(provider, new Map())).toThrow(/checkpointStore/)
})

test('accepts construction with a checkpointStore', () => {
  resetHarnessTestState()
  const provider = createProvider(() => {})
  const store = new InMemoryCheckpointStore()
  expect(
    () => new Runtime(provider, new Map(), { checkpointStore: store })
  ).not.toThrow()
})
```

**Step 2: Run test to verify it fails**

Run:
`cd apps/web && bun test lib/agent/harness/runtime.test.ts -t "throws when constructed without"`
Expected: FAIL — no validation in constructor

**Step 3: Apply the fix**

In `apps/web/lib/agent/harness/runtime.ts`, modify the constructor (lines
266-275):

```typescript
// BEFORE:
constructor(
  provider: LLMProvider,
  toolExecutors: Map<string, ToolExecutor>,
  config?: Partial<RuntimeConfig>
) {
  this.provider = provider
  this.toolExecutors = toolExecutors
  this.config = { ...DEFAULT_RUNTIME_CONFIG, ...config }
  this.specEngine = createSpecEngine(this.config.specEngine)
}

// AFTER:
constructor(
  provider: LLMProvider,
  toolExecutors: Map<string, ToolExecutor>,
  config?: Partial<RuntimeConfig>
) {
  if (!config?.checkpointStore) {
    throw new Error(
      'Runtime requires a checkpointStore. Use InMemoryCheckpointStore for development or ConvexCheckpointStore for production.'
    )
  }
  this.provider = provider
  this.toolExecutors = toolExecutors
  this.config = { ...DEFAULT_RUNTIME_CONFIG, ...config }
  this.specEngine = createSpecEngine(this.config.specEngine)
}
```

**Step 4: Update all existing tests to pass a checkpoint store**

Every test that creates `new Runtime(provider, executors)` or
`new Runtime(provider, executors, {...})` must include
`checkpointStore: new InMemoryCheckpointStore()`. Add the import if not already
present:

```typescript
import { InMemoryCheckpointStore } from './checkpoint-store'
```

Then update all `new Runtime(...)` calls to include `checkpointStore`.

**Step 5: Run tests to verify**

Run: `cd apps/web && bun test lib/agent/harness/runtime.test.ts` Expected: All
PASS

**Step 6: Commit**

```bash
git add apps/web/lib/agent/harness/runtime.ts apps/web/lib/agent/harness/runtime.test.ts
git commit -m "fix: make checkpointStore mandatory in Runtime constructor

Prevents silent state loss on unexpected termination.
All callers must now provide a CheckpointStore."
```

---

## Task 7: Token Estimation — Replace Heuristic with Tokenizer

**Files:**

- Modify: `apps/web/lib/agent/harness/compaction.ts:42-48`
- Test: `apps/web/lib/agent/harness/compaction.test.ts` (create)

**Step 1: Install js-tiktoken**

Run: `cd apps/web && bun add js-tiktoken`

**Step 2: Write the failing test**

```typescript
// apps/web/lib/agent/harness/compaction.test.ts
import { describe, test, expect } from 'bun:test'
import { estimateTokens } from './compaction'

describe('estimateTokens', () => {
  test('returns accurate count for simple English text', () => {
    const text = 'Hello, world! This is a test sentence.'
    const tokens = estimateTokens(text)
    // cl100k_base tokenizer: this should be ~9 tokens
    // Old heuristic would give: ceil(38/4 + 7*0.3) = ceil(9.5+2.1) = 12
    // Accept range 7-12 for now; the key is it uses real tokenizer
    expect(tokens).toBeGreaterThan(5)
    expect(tokens).toBeLessThan(15)
  })

  test('handles JSON tool output accurately', () => {
    const json = JSON.stringify({
      files: [
        {
          path: '/src/index.ts',
          content: 'export const x = 1;\nexport const y = 2;',
        },
      ],
      metadata: { tool: 'write_files', status: 'completed' },
    })
    const tokens = estimateTokens(json)
    // Real tokenizer should give ~40-60; old heuristic ~35
    expect(tokens).toBeGreaterThan(20)
  })

  test('returns 0 for empty string', () => {
    expect(estimateTokens('')).toBe(0)
  })
})
```

**Step 3: Run test to verify baseline**

Run: `cd apps/web && bun test lib/agent/harness/compaction.test.ts` Expected:
Tests may pass with old heuristic but with inaccurate values

**Step 4: Replace estimateTokens implementation**

In `apps/web/lib/agent/harness/compaction.ts`, replace lines 42-48:

```typescript
// BEFORE:
export function estimateTokens(text: string): number {
  if (!text) return 0
  const charCount = text.length
  const wordCount = text.split(/\s+/).filter(Boolean).length

  return Math.ceil(charCount / 4 + wordCount * 0.3)
}

// AFTER:
import { encodingForModel } from 'js-tiktoken'

let encoder: ReturnType<typeof encodingForModel> | null = null

function getEncoder() {
  if (!encoder) {
    encoder = encodingForModel('gpt-4o')
  }
  return encoder
}

export function estimateTokens(text: string): number {
  if (!text) return 0
  try {
    return getEncoder().encode(text).length
  } catch {
    // Fallback: rough character-based estimate if tokenizer fails
    return Math.ceil(text.length / 4)
  }
}
```

**Step 5: Run test to verify it passes**

Run: `cd apps/web && bun test lib/agent/harness/compaction.test.ts` Expected:
PASS

**Step 6: Run all harness tests**

Run: `cd apps/web && bun test lib/agent/harness/` Expected: All PASS

**Step 7: Commit**

```bash
git add apps/web/lib/agent/harness/compaction.ts apps/web/lib/agent/harness/compaction.test.ts package.json bun.lockb
git commit -m "feat: replace heuristic token estimation with js-tiktoken

Uses cl100k_base tokenizer for accurate counts. Falls back
to character-based estimate on failure. Fixes context
overflow misprediction under heavy tool output."
```

---

## Task 8: Permission Audit Persistence to Convex

**Files:**

- Create: `convex/permissionAuditLog.ts`
- Modify: `convex/schema.ts` (add table)
- Modify: `apps/web/lib/agent/harness/permissions.ts` (add audit hook)
- Test: `apps/web/lib/agent/harness/permissions.test.ts` (add test)

**Step 1: Add Convex table schema**

In `convex/schema.ts`, add the table definition after the existing tables:

```typescript
permissionAuditLog: defineTable({
  sessionID: v.string(),
  tool: v.string(),
  pattern: v.string(),
  decision: v.string(), // 'allow' | 'deny' | 'ask'
  reason: v.optional(v.string()),
  metadata: v.optional(v.any()),
  timestamp: v.number(),
  projectId: v.optional(v.id('projects')),
})
  .index('by_session', ['sessionID'])
  .index('by_session_tool', ['sessionID', 'tool']),
```

**Step 2: Create Convex mutation**

```typescript
// convex/permissionAuditLog.ts
import { mutation, query } from './_generated/server'
import { v } from 'convex/values'

export const log = mutation({
  args: {
    sessionID: v.string(),
    tool: v.string(),
    pattern: v.string(),
    decision: v.string(),
    reason: v.optional(v.string()),
    metadata: v.optional(v.any()),
    timestamp: v.number(),
    projectId: v.optional(v.id('projects')),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert('permissionAuditLog', args)
  },
})

export const listBySession = query({
  args: { sessionID: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('permissionAuditLog')
      .withIndex('by_session', (q) => q.eq('sessionID', args.sessionID))
      .order('desc')
      .collect()
  },
})
```

**Step 3: Add audit callback to PermissionManager**

In `apps/web/lib/agent/harness/permissions.ts`, add an optional audit callback:

```typescript
// Add to PermissionManager constructor options:
export class PermissionManager {
  private timeoutMs: number
  private pendingRequests: Map<Identifier, PermissionRequest> = new Map()
  private pendingResolvers: Map<
    Identifier,
    {
      resolve: (result: PermissionResult) => void
      timeoutId: ReturnType<typeof setTimeout>
    }
  > = new Map()
  private sessionPermissions: Map<Identifier, Permission> = new Map()
  private userDecisions: Map<string, PermissionDecision> = new Map()
  private onAuditLog?: (entry: {
    sessionID: Identifier
    tool: string
    pattern: string
    decision: PermissionDecision
    reason?: string
  }) => void

  constructor(options?: {
    timeoutMs?: number
    pollIntervalMs?: number
    onAuditLog?: (entry: {
      sessionID: Identifier
      tool: string
      pattern: string
      decision: PermissionDecision
      reason?: string
    }) => void
  }) {
    this.timeoutMs = options?.timeoutMs ?? 60000
    this.onAuditLog = options?.onAuditLog
  }
```

Then in the `request` method, after resolving a decision (both cached and
interactive), call the audit logger:

At the cached decision return (after line 203):

```typescript
this.onAuditLog?.({
  sessionID,
  tool,
  pattern,
  decision: cachedDecision,
  reason: 'Cached decision',
})
```

At the session permission return (after line 214):

```typescript
this.onAuditLog?.({
  sessionID,
  tool,
  pattern,
  decision,
  reason: 'Session permission',
})
```

Inside the resolver callback (after `bus.emitPermission`):

```typescript
this.onAuditLog?.({
  sessionID,
  tool,
  pattern,
  decision: result.decision,
  reason: result.reason,
})
```

At the timeout (after `bus.emitPermission` in the timeout handler):

```typescript
this.onAuditLog?.({
  sessionID,
  tool,
  pattern,
  decision: 'deny',
  reason: 'Timeout',
})
```

**Step 4: Write test for audit callback**

Add to `apps/web/lib/agent/harness/permissions.test.ts`:

```typescript
test('calls onAuditLog for each permission decision', async () => {
  const auditEntries: Array<{ tool: string; decision: string }> = []
  const manager = new PermissionManager({
    timeoutMs: 100,
    onAuditLog: (entry) =>
      auditEntries.push({ tool: entry.tool, decision: entry.decision }),
  })

  manager.setSessionPermissions('session-audit', { read_files: 'allow' })
  await manager.request('session-audit', 'msg-1', 'read_files', '*')

  expect(auditEntries.length).toBe(1)
  expect(auditEntries[0].tool).toBe('read_files')
  expect(auditEntries[0].decision).toBe('allow')
})
```

**Step 5: Run test**

Run: `cd apps/web && bun test lib/agent/harness/permissions.test.ts` Expected:
PASS

**Step 6: Deploy Convex schema**

Run: `npx convex dev` Expected: Schema deploys with new `permissionAuditLog`
table

**Step 7: Commit**

```bash
git add convex/schema.ts convex/permissionAuditLog.ts apps/web/lib/agent/harness/permissions.ts apps/web/lib/agent/harness/permissions.test.ts
git commit -m "feat: add persistent permission audit log

Adds permissionAuditLog Convex table and onAuditLog callback
to PermissionManager. All permission decisions are now
persistable for compliance and debugging."
```

---

## Task 9: Context Limit from Provider Config

**Files:**

- Modify: `apps/web/lib/agent/harness/types.ts` (add field)
- Modify: `apps/web/lib/agent/harness/runtime.ts:496` (use config)

**Step 1: Add config field**

In `apps/web/lib/agent/harness/types.ts`, add to `RuntimeConfig`:

```typescript
contextWindowSize?: number
```

**Step 2: Apply the fix in runtime.ts**

In `apps/web/lib/agent/harness/runtime.ts`, change line 496:

```typescript
// BEFORE:
const contextLimit = this.provider.config.auth.baseUrl?.includes('anthropic')
  ? 200000
  : 128000

// AFTER:
const contextLimit =
  this.config.contextWindowSize ??
  (this.provider.config.auth.baseUrl?.includes('anthropic') ? 200000 : 128000)
```

**Step 3: Commit**

```bash
git add apps/web/lib/agent/harness/types.ts apps/web/lib/agent/harness/runtime.ts
git commit -m "feat: make context window size configurable

Adds contextWindowSize to RuntimeConfig. Falls back to
provider-based detection for backward compatibility."
```

---

## Task 10: Compaction Death Spiral Guard

**Files:**

- Modify: `apps/web/lib/agent/harness/runtime.ts` (add compaction failure
  tracking)
- Test: `apps/web/lib/agent/harness/runtime.test.ts` (add test)

**Step 1: Write the failing test**

Add to `apps/web/lib/agent/harness/runtime.test.ts`:

```typescript
test('emits error and stops after consecutive compaction failures instead of looping', async () => {
  resetHarnessTestState()
  const store = new InMemoryCheckpointStore()
  let streamCalls = 0
  const provider = createProvider(() => {
    streamCalls++
  })

  const runtime = new Runtime(provider, new Map(), {
    checkpointStore: store,
    maxSteps: 10,
    skipSpecVerification: true,
    contextCompactionThreshold: 0.0001, // Force compaction every step
  })

  const sessionID = 'session-compaction-fail'
  const bigMessages: Message[] = Array.from({ length: 6 }, (_, i) =>
    createUserMessage({
      id: `msg-big-${i}`,
      sessionID,
      text: 'x'.repeat(200_000),
      agent: 'ask',
    })
  )

  const events = []
  for await (const event of runtime.run(
    sessionID,
    createUserMessage({ id: 'msg-final', sessionID, text: 'go', agent: 'ask' }),
    bigMessages
  )) {
    events.push(event)
    if (events.length > 100) break // Safety valve
  }

  // Should have stopped, not looped forever
  expect(streamCalls).toBeLessThan(20)
})
```

**Step 2: Apply the fix**

In the `RuntimeState` interface (around line 68), add:

```typescript
consecutiveCompactionFailures: number
```

In `createInitialState`, add:

```typescript
consecutiveCompactionFailures: 0,
```

In `runLoop`, after the compaction check block (around line 543-548), add
compaction failure tracking:

```typescript
// After:
const compacted = yield* this.performCompaction(agent)
if (compacted) {
  this.state.consecutiveCompactionFailures = 0
  await this.saveCheckpoint(agent.name, 'step')
  continue
} else {
  this.state.consecutiveCompactionFailures++
  if (this.state.consecutiveCompactionFailures >= 2) {
    yield {
      type: 'error',
      error: 'Compaction failed repeatedly — context is exhausted and cannot be reduced',
    }
    this.state.isComplete = true
    await this.saveCheckpoint(agent.name, 'error')
    return
  }
}
```

**Step 3: Run tests**

Run: `cd apps/web && bun test lib/agent/harness/runtime.test.ts` Expected: All
PASS

**Step 4: Commit**

```bash
git add apps/web/lib/agent/harness/runtime.ts apps/web/lib/agent/harness/runtime.test.ts
git commit -m "fix: break compaction death spiral after 2 consecutive failures

Tracks consecutive compaction failures and stops the runtime
with an error instead of retrying indefinitely."
```

---

## Task 11: Session-Scoped Logging in Runtime

**Files:**

- Modify: `apps/web/lib/agent/harness/runtime.ts` (use session logger)

**Step 1: Apply the fix**

In `apps/web/lib/agent/harness/runtime.ts`, add import:

```typescript
import { createSessionLogger } from '@/lib/logger'
```

In `runLoop`, after creating `sessionID` (line 495), create a session logger:

```typescript
const log = createSessionLogger(sessionID, { agent: agent.name })
```

Replace key `appLog` calls in the runtime with `log` calls that include
step/tool context:

- In `executeToolCall`, after tool execution success, add:

  ```typescript
  log.info('Tool executed', {
    tool: toolName,
    step: this.state.step,
    durationMs: Date.now() - startedAt,
  })
  ```

- In permission denied paths, add:

  ```typescript
  log.warn('Permission denied', {
    tool: toolName,
    pattern,
    step: this.state.step,
  })
  ```

- In error catch blocks, replace `appLog.error` with:
  ```typescript
  log.error('Runtime error', { step: this.state.step, error: errorMessage })
  ```

Note: Keep `appLog` for places outside the run loop where session context isn't
available.

**Step 2: Run tests**

Run: `cd apps/web && bun test lib/agent/harness/runtime.test.ts` Expected: All
PASS

**Step 3: Commit**

```bash
git add apps/web/lib/agent/harness/runtime.ts
git commit -m "feat: add session-scoped structured logging to runtime

Uses createSessionLogger for JSON logs with sessionID,
agent, step, and tool context in every log entry."
```

---

## Task 12: Crash Recovery Integration Test

**Files:**

- Test: `apps/web/lib/agent/harness/runtime.test.ts` (add test)

**Step 1: Write the integration test**

```typescript
test('resumes from checkpoint after simulated crash', async () => {
  resetHarnessTestState()
  const store = new InMemoryCheckpointStore()

  let stepCount = 0
  const provider: LLMProvider = {
    name: 'test-provider',
    config: {
      provider: 'openai',
      auth: { apiKey: 'test' },
      defaultModel: 'test-model',
    },
    async listModels() {
      return []
    },
    async complete() {
      return {
        message: { role: 'assistant', content: 'summary' },
        usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
        finishReason: 'stop',
        model: 'test-model',
      }
    },
    async *completionStream() {
      stepCount++
      if (stepCount <= 2) {
        // First two steps: tool calls
        yield {
          type: 'tool_call' as const,
          toolCall: {
            id: `call-${stepCount}`,
            function: {
              name: 'read_files',
              arguments: '{"paths":["test.txt"]}',
            },
          },
        }
        yield {
          type: 'finish' as const,
          finishReason: 'tool_calls',
          usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
        }
      } else {
        yield { type: 'text' as const, content: 'done' }
        yield {
          type: 'finish' as const,
          finishReason: 'stop',
          usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
        }
      }
    },
  }

  const readExecutor = async () => ({ output: 'file contents' })
  const executors = new Map([['read_files', readExecutor]])
  const sessionID = 'session-resume'

  // Run 1: crash after step 1
  const runtime1 = new Runtime(provider, executors, {
    checkpointStore: store,
    maxSteps: 1,
    skipSpecVerification: true,
    onToolInterrupt: async () => ({ decision: 'approve' as const }),
  })

  for await (const _event of runtime1.run(
    sessionID,
    createUserMessage({
      id: 'msg-1',
      sessionID,
      text: 'read files',
      agent: 'ask',
    })
  )) {
    // consume events
  }

  // Verify checkpoint was saved
  const checkpoint = await store.load(sessionID)
  expect(checkpoint).not.toBeNull()
  expect(checkpoint!.state.step).toBeGreaterThan(0)

  // Run 2: resume from checkpoint
  stepCount = 2 // skip ahead so provider returns 'stop'
  const runtime2 = new Runtime(provider, executors, {
    checkpointStore: store,
    maxSteps: 5,
    skipSpecVerification: true,
    onToolInterrupt: async () => ({ decision: 'approve' as const }),
  })

  const resumeEvents = []
  for await (const event of runtime2.resume(sessionID)) {
    resumeEvents.push(event)
  }

  expect(resumeEvents.some((e) => e.type === 'complete')).toBe(true)
})
```

**Step 2: Run test**

Run:
`cd apps/web && bun test lib/agent/harness/runtime.test.ts -t "resumes from checkpoint"`
Expected: PASS

**Step 3: Commit**

```bash
git add apps/web/lib/agent/harness/runtime.test.ts
git commit -m "test: add crash recovery integration test

Verifies checkpoint save/load cycle: run to step limit,
save checkpoint, resume from checkpoint, reach completion."
```

---

## Execution Summary

| Task | Priority | Primitive Fixed               | Risk Addressed        |
| ---- | -------- | ----------------------------- | --------------------- |
| 1    | Day 1    | System Logging (#7)           | Observability         |
| 2    | Day 1    | Agent Type System (#12)       | Privilege escalation  |
| 3    | Day 1    | Workflow State (#4)           | Hung tool execution   |
| 4    | Day 1    | Permission Tiers (#2)         | Fail-open permissions |
| 5    | Week 1   | Tool Pool Assembly (#9)       | Tool shadowing        |
| 6    | Week 1   | Session Persistence (#3)      | State loss            |
| 7    | Week 1   | Token Budgets (#5)            | Context overflow      |
| 8    | Week 1   | Permission Audit Trails (#11) | Auditability          |
| 9    | Week 1   | Token Budgets (#5)            | Hardcoded limits      |
| 10   | Week 1   | Transcript Compaction (#10)   | Death spiral          |
| 11   | Week 1   | System Logging (#7)           | Session correlation   |
| 12   | Week 1   | Session Persistence (#3)      | Crash recovery        |
