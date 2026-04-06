# Production Readiness Audit — Panda Agent Harness

**Date:** 2026-04-04 **Auditor:** Principal Engineer Review **Scope:** 12 core
primitives of the agentic harness runtime

---

## 1. Primitive Scorecard

| #   | Primitive               | Status | Score   | Verdict                                                                              |
| --- | ----------------------- | ------ | ------- | ------------------------------------------------------------------------------------ |
| 1   | Tool Registry           | Yellow | **2**   | Exists but no schema validation on execution                                         |
| 2   | Permission Tiers        | Green  | **2.5** | Enforced with glob matching, risk tiers, and interrupts                              |
| 3   | Session Persistence     | Yellow | **2**   | Checkpoint store exists, Convex backend wired, but optional                          |
| 4   | Workflow State          | Yellow | **2**   | State machine in runtime loop, but in-memory only unless checkpoint store configured |
| 5   | Token Budgets           | Red    | **1**   | Token estimation is character-based heuristic; no hard enforcement                   |
| 6   | Streaming Events        | Green  | **2.5** | Well-typed event system with timeout/retry resilience                                |
| 7   | System Logging          | Red    | **0.5** | `appLog` is `console.error`/`console.warn` — no structured logging, no persistence   |
| 8   | Verification            | Yellow | **1.5** | Spec verification gates completion, but verifier is stubbed (keyword matching)       |
| 9   | Tool Pool Assembly      | Yellow | **2**   | Permission-filtered, plugin-extended, dedup-enabled; no runtime schema validation    |
| 10  | Transcript Compaction   | Yellow | **2**   | Compaction manager works, but token estimation is unreliable                         |
| 11  | Permission Audit Trails | Red    | **1**   | Events emitted to in-memory bus with 1000-event cap; no persistent audit log         |
| 12  | Agent Type System       | Green  | **2.5** | Typed agents with modes, permissions, step limits; YAML extension point              |

**Scoring Key:**

- 0 = absent
- 1 = flimsy or informal
- 2 = implemented but fragile
- 3 = robust and production-ready

---

## 2. Detailed Assessment

### 1. Tool Registry — Score: 2

**Exists?** Yes. `AGENT_TOOLS` array in `tools.ts`, plus `plugins.getTools()`
for custom tools.

**Enforced?** Tools are filtered by agent permission (`getToolsForAgent`). Fuzzy
matching repairs unknown tool names. But there is **no runtime argument
validation** — tool args are parsed from JSON and passed directly to executors.
A malformed but parseable JSON payload reaches the executor unchecked.

**What breaks?** LLM hallucinates a plausible tool argument structure that
doesn't match what the executor expects. The executor throws, the error is
caught, but the agent wasted a step.

**Tested?** Runtime tests exist (`runtime.test.ts`). Tool repair has no
dedicated tests. Tool executors are tested elsewhere but the
registry-to-executor handoff has minimal coverage.

**Fallback?** Fuzzy name matching + JSON repair. Graceful degradation to error
message fed back to LLM.

**Risk:** Moderate. Tool execution is not sandboxed. A tool executor crash in
`run_command` propagates up and is caught, but there's no timeout on individual
tool execution — a hung tool blocks the entire step indefinitely.

---

### 2. Permission Tiers — Score: 2.5

**Exists?** Yes. Three layers: (1) agent-level `Permission` on `AgentConfig`,
(2) session-level via `PermissionManager`, (3) risk-tier interrupts via
`onToolInterrupt`.

**Enforced?** Yes, in code. `executeToolCall` checks risk policy -> interrupts
-> merged permissions -> per-pattern allow/deny/ask. Denial results are fed back
to the LLM. Subagent depth is capped.

**What breaks?** If `onToolInterrupt` is not configured, the system **silently
approves** all risk-tier `ask` decisions (runtime.ts line 2224: "No interrupt
handler configured; proceeding to standard permissions"). This is a fail-open
posture.

**Tested?** Permission manager has tests for session scoping, timeout, and
intersection logic. Risk tier classification is untested in isolation.

**Fallback?** Timeout defaults to deny after 60 seconds. That's correct.

**Risk:** The fail-open on missing interrupt handler is a real problem. In build
mode, `write_files` and `run_command` are `allow` by default in the agent
config, so the risk interrupt is the only gate. If the UI component rendering
`PermissionDialog` doesn't mount, operations proceed unblocked.

---

### 3. Session Persistence — Score: 2

**Exists?** `CheckpointStore` interface with `InMemoryCheckpointStore` and
`ConvexCheckpointStore`. Checkpoints save at every step, on completion, and on
error.

**Enforced?** Only if `config.checkpointStore` is set. If it's `undefined`,
`saveCheckpoint` silently returns (runtime.ts line 2551). The system runs fine
without persistence — but a browser tab close loses all state.

**What breaks?** Mid-execution tab close or crash = entire session lost. No
recovery path unless Convex store is configured.

**Tested?** `InMemoryCheckpointStore` is used in runtime tests.
`ConvexCheckpointStore` does type validation on load. No crash-recovery
integration tests.

**Risk:** High. Whether the Convex checkpoint store is actually wired in
`useAgent.ts` determines whether this is real or decorative. The architecture
supports it but doesn't mandate it.

---

### 4. Workflow State — Score: 2

**Exists?** `RuntimeState` tracks step, completion, subagents, tool history,
abort controller, active spec.

**Enforced?** The `runLoop` is a proper state machine: step increment ->
compaction check -> execute step -> snapshot -> checkpoint. Terminal guards
exist (`isComplete` flag).

**What breaks?** Abort signal is attached to an `AbortController` but individual
tool executors receive `abortSignal` — there's no evidence they actually check
it during execution. A long-running `run_command` ignores abort.

**Tested?** Runtime loop tests exist for step limits, compaction triggers, and
plugin hooks. No test for mid-step abort.

**Risk:** If a user cancels and the runtime is in the middle of a `run_command`,
the command continues to run server-side. The runtime moves on but the side
effect persists.

---

### 5. Token Budgets — Score: 1

**Exists?** `estimateTokens` in `compaction.ts`:
`Math.ceil(charCount / 4 + wordCount * 0.3)`. Context limit is hardcoded:
`200000` for Anthropic, `128000` for others (runtime.ts line 497).

**Enforced?** Only for compaction threshold (90% of context limit triggers
compaction). No per-step token budget. No output length cap beyond
`maxTokens: 4096` in completion options.

**What breaks?** The heuristic token counter can be off by 2-3x. A message with
heavy JSON tool output is underestimated. Compaction triggers too late or too
early. Context overflow error triggers emergency compaction + retry, but only
once.

**Tested?** `context-budget.test.ts` exists separately. The heuristic in
`compaction.ts` is not tested against real tokenizer output.

**Risk:** High. In a long session with large tool outputs, the system will hit
context overflow from the provider, trigger one compaction retry, and then fail
hard. Cost tracking is also heuristic-based and inaccurate.

---

### 6. Streaming Events — Score: 2.5

**Exists?** Full `RuntimeEvent` type union with text, reasoning, tool_call,
tool_result, compaction, permission, interrupt, spec events. `EventBus` for
real-time subscriptions.

**Enforced?** Events are yielded from the async generator and consumed by
`useAgent.ts`. Stream resilience via `withTimeoutAndRetry` with configurable
idle timeout (120s default) and retry (3 attempts with backoff). Context
overflow triggers compaction + retry.

**What breaks?** If the LLM provider stream hangs beyond the idle timeout and
all retries exhaust, the step fails with an error. This is handled correctly.

**Tested?** Stream resilience is tested separately. Event type coverage in
runtime tests is good.

**Risk:** Low-moderate. The main gap is that event history is in-memory
(`maxHistorySize = 1000`). If the UI disconnects and reconnects, there's no
replay from durable storage.

---

### 7. System Logging — Score: 0.5

**Exists?** `appLog` is literally `console.error` and `console.warn` wrapped in
an object (9 lines of code in `lib/logger.ts`). Debug logging is behind
`NEXT_PUBLIC_PANDA_AGENT_HARNESS_DEBUG_LOGS` and `NEXT_PUBLIC_PANDA_SPEC_DEBUG`
env vars, using raw `console.log`.

**Enforced?** Not applicable. There's nothing to enforce.

**What breaks?** Everything is unobservable in production. No structured logs.
No correlation IDs. No log levels beyond error/warn. No log persistence. No
session-scoped log context. Permission decisions, tool executions, spec events —
all vanish when the browser tab closes.

**Tested?** No.

**Risk:** Critical. You cannot debug production issues. You cannot audit what
the agent did. You cannot correlate events across sessions. This is the single
biggest gap in the entire system.

---

### 8. Verification — Score: 1.5

**Exists?** Spec verification gates completion at runtime.ts:596-609. If
verification fails, the runtime emits `error` instead of `complete`.

**Enforced?** The gate is real — it blocks completion. But per documented known
gaps, the verifier in `verifier.ts` is **stubbed with keyword matching**. The
spec classifier in `classifier.ts` uses **heuristics instead of LLM
classification**.

**What breaks?** Verification passes or fails based on keyword matching, not
semantic understanding. A cosmetically-correct but functionally-wrong
implementation passes verification. A correct implementation with unexpected
naming fails.

**Tested?** `verifier.test.ts` and `classifier.test.ts` exist, but they test the
stubs.

**Risk:** High. Verification is safety-theater until the verifier uses actual
LLM judgment. The gate exists but the signal it produces is low-quality.

---

### 9. Tool Pool Assembly — Score: 2

**Exists?** `getToolsForAgent` merges `AGENT_TOOLS` +
`getTaskToolDefinitions()` + `plugins.getTools()`, deduplicates by name, and
filters by permission.

**Enforced?** Permission-based filtering is real. Tool deduplication within a
step is enforced. Max tool calls per step is enforced.

**What breaks?** A plugin can register a tool that shadows a built-in tool name.
The `Map` dedup uses last-write-wins, so plugin tools silently override built-in
tools. No warning is emitted.

**Tested?** Runtime tests verify tool filtering. Plugin tool override is not
tested.

**Risk:** Moderate. A malicious or buggy plugin can replace `write_files` with
an unrestricted version. There's no tool registration validation or conflict
detection.

---

### 10. Transcript Compaction — Score: 2

**Exists?** `CompactionManager` with configurable threshold (90%), target ratio
(50%), preserve-recent (4 messages). Uses an LLM `summarizeFn` for
summarization.

**Enforced?** Checked every step in `runLoop`. If context overflow occurs during
streaming, emergency compaction is triggered with one retry.

**What breaks?** Token estimation is unreliable (see #5). The summarization
prompt is generic. If the summarization LLM call itself fails, compaction
returns an error and the step continues without compaction — which means the
next step will also hit the threshold and try again, creating a retry loop.

**Tested?** Compaction logic is tested. The interaction between failed
compaction and the main loop is not.

**Risk:** Medium. A compaction failure in a context-exhausted session creates a
death spiral: can't compact, can't proceed, can't compact again.

---

### 11. Permission Audit Trails — Score: 1

**Exists?** Permission events are emitted to `EventBus` (`permission.requested`,
`permission.decided`). The bus has a 1000-event cap in-memory history.

**Enforced?** Events are emitted but not persisted. No durable audit log exists.
When the session ends, `cleanupSessionSingletons` clears session permissions.
The event bus history is global and not session-scoped, so it mixes across
sessions.

**What breaks?** You cannot answer "what did the agent get permission to do in
session X?" after the session ends. You cannot prove compliance. You cannot
reconstruct a permission decision chain.

**Tested?** Permission event emission is tested in `permissions.test.ts`.

**Risk:** High for any environment with compliance requirements. Even for
debugging, the lack of persistent audit trail means permission-related bugs are
unreproducible.

---

### 12. Agent Type System — Score: 2.5

**Exists?** Full type system: `AgentConfig`, `AgentMode` (primary/subagent/all),
`Permission` per agent, step limits, model configuration. Built-in agents +
YAML/Markdown extensibility. `AgentRegistry` with register/unregister.

**Enforced?** Agent lookup falls back to `build` if not found (runtime.ts line
286: `agents.get(userMessage.agent) ?? agents.get('build')!`). Mode filtering
works. Permission intersection for subagents is implemented.

**What breaks?** The fallback to `build` on unknown agent name is dangerous —
`build` has full write and command access. A typo in agent name silently
escalates to maximum privileges.

**Tested?** Built-in agent configs are statically defined. Registry operations
are tested in runtime tests.

**Risk:** Medium. The silent privilege escalation on agent name mismatch is a
design flaw.

---

## 3. Top 5 Production Failure Modes

1. **Invisible failures.** `appLog` is `console.log`. No structured logging, no
   persistence, no correlation. When something goes wrong in production, you
   will have zero telemetry. You'll be debugging by asking users "what did you
   see?"

2. **Token estimation drift causes context overflow death spiral.** The
   heuristic token counter (`charCount/4 + wordCount*0.3`) underestimates real
   token counts. Sessions with heavy tool output hit context overflow, trigger
   one emergency compaction, and if that's not enough, the session dies with no
   recovery.

3. **Verification is theater.** The spec verifier uses keyword matching. It will
   approve wrong implementations and reject correct ones. Users will either lose
   trust (false negatives) or develop false confidence (false positives).

4. **Permission fail-open on missing UI component.** If `onToolInterrupt` is not
   wired, risk-tier `ask` decisions auto-approve. If `PermissionDialog` doesn't
   render (race condition, component error boundary, SSR mismatch), the agent
   runs with full write and command access unblocked.

5. **Session state loss on unexpected termination.** If `ConvexCheckpointStore`
   is not configured (or if the Convex mutation fails silently), a browser crash
   or tab close during a multi-step build operation loses all state. The user's
   workspace may be in a partial state with no way to resume or roll back.

---

## 4. Top 5 Highest-Leverage Fixes (Ranked)

1. **Replace `appLog` with structured, persistent logging.** Add session IDs,
   tool names, permission decisions, step numbers, and timestamps to every log
   line. Ship to a log aggregator. Without this, you cannot operate, debug, or
   audit anything. This unblocks every other fix.

2. **Replace heuristic token estimation with actual tokenizer counts.** Use
   `tiktoken` or the provider's token counting API. Get accurate counts before
   hitting the provider. Fail before context overflow, not after.

3. **Wire the spec verifier to a real LLM judge.** The verification gate is
   already enforced in the runtime. The only missing piece is the verifier
   implementation. This is high leverage because the gate already exists — you
   just need a real signal.

4. **Make checkpoint store mandatory, not optional.** Remove the
   `if (!checkpointStore) return` guard in `saveCheckpoint`. Require a
   `CheckpointStore` in the `Runtime` constructor. Default to
   `ConvexCheckpointStore`.

5. **Fix the agent-name-fallback privilege escalation.** Replace
   `agents.get(userMessage.agent) ?? agents.get('build')!` with an explicit
   error when the agent name is unknown. Do not silently grant full access.

---

## 5. Remediation Plan

### Day One

- [ ] Replace `appLog` with a real logger (pino or winston) with JSON output,
      session-scoped context, and at minimum console transport with structured
      fields
- [ ] Change agent name fallback from silent `build` escalation to thrown error
- [ ] Add
      `if (!this.config.checkpointStore) throw new Error('CheckpointStore required')`
      to `Runtime` constructor
- [ ] Add timeout to individual tool execution (wrap executor call with
      `Promise.race` against a configurable deadline)

### Week One

- [ ] Integrate a real tokenizer (`tiktoken` or `@anthropic-ai/tokenizer`) and
      replace `estimateTokens`
- [ ] Persist permission decisions to Convex (add `permissionAuditLog` table,
      write on every `permission.decided` event)
- [ ] Add integration test for crash-recovery: save checkpoint -> kill runtime
      -> resume from checkpoint -> verify state
- [ ] Add validation that plugin-registered tools cannot shadow built-in tool
      names
- [ ] Add test for mid-step abort propagation to tool executors

### Month One

- [ ] Wire spec classifier to real LLM classification (replace heuristic stub)
- [ ] Wire spec verifier to real LLM judge (replace keyword matching stub)
- [ ] Implement persistent, session-scoped structured logging to an external
      service
- [ ] Add runbook for production incidents: how to inspect a session's audit
      trail, how to replay from checkpoint, how to force-terminate a stuck agent
- [ ] Load-test compaction under context pressure: verify compaction + retry
      doesn't death-spiral
- [ ] Add end-to-end test: user prompt -> spec generation -> tool execution ->
      verification -> completion, with simulated permission denials and tool
      failures

---

## 6. Executive Summary

This system has real engineering behind it. The permission model is
multi-layered and correctly intersects parent/child grants. The runtime loop is
a proper state machine with step limits, tool loop detection, stream resilience,
and checkpoint support. The plugin architecture is clean. The type system is
thorough.

**It is not production-ready.**

The three critical gaps are: **no observability** (logging is `console.log`),
**no reliable token accounting** (heuristic estimation that will drift under
load), and **verification that doesn't verify** (keyword matching posing as
semantic judgment). These aren't edge cases — they're the normal operating path.

The permission system has a fail-open posture when the UI interrupt handler is
missing. Session persistence is optional when it should be mandatory. Agent name
lookup silently escalates to maximum privileges on any mismatch. These are not
theoretical risks — they're one misconfigured component away from running
arbitrary commands without user consent.

The bones are good. The gaps are concentrated in operational maturity, not
architecture. The remediation plan is tractable. But shipping this today means
shipping a system you cannot observe, cannot audit, and cannot trust to verify
its own work.

---

## Evaluation Criteria Summary

| Criterion                 | Status                                              |
| ------------------------- | --------------------------------------------------- |
| Crash recovery            | Checkpoint architecture exists but not mandated     |
| State durability          | Optional Convex persistence; in-memory by default   |
| Permission safety         | Multi-layered but fail-open on missing UI handler   |
| Auditability              | No persistent audit trail                           |
| Observability             | Effectively absent                                  |
| Token and context control | Heuristic-based, unreliable under load              |
| Tool execution boundaries | Permission-gated, no execution timeout              |
| Reproducibility           | No durable event log to replay from                 |
| Failure containment       | Errors caught and surfaced, but no circuit breakers |
| Operational discipline    | No runbooks, no alerts, no dashboards               |

---

## Key Files Referenced

| File                                                    | Purpose                               |
| ------------------------------------------------------- | ------------------------------------- |
| `apps/web/lib/agent/harness/runtime.ts`                 | Core execution engine                 |
| `apps/web/lib/agent/harness/permissions.ts`             | Permission system (PermissionManager) |
| `apps/web/lib/agent/harness/types.ts`                   | Type definitions                      |
| `apps/web/lib/agent/harness/plugins.ts`                 | Plugin system                         |
| `apps/web/lib/agent/harness/compaction.ts`              | Context compaction                    |
| `apps/web/lib/agent/harness/checkpoint-store.ts`        | Checkpoint interface                  |
| `apps/web/lib/agent/harness/convex-checkpoint-store.ts` | Convex persistence                    |
| `apps/web/lib/agent/harness/agents.ts`                  | Agent registry                        |
| `apps/web/lib/agent/harness/event-bus.ts`               | Event system                          |
| `apps/web/lib/agent/harness/snapshots.ts`               | Git snapshots                         |
| `apps/web/lib/agent/harness/tool-repair.ts`             | Tool call repair                      |
| `apps/web/lib/agent/tools.ts`                           | Tool definitions                      |
| `apps/web/lib/agent/automationPolicy.ts`                | Automation policy                     |
| `apps/web/lib/logger.ts`                                | Logger (9 lines)                      |
| `apps/web/hooks/useAgent.ts`                            | Main agent hook                       |
