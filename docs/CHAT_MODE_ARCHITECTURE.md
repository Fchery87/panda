# Chat Mode Architecture — Plan / Build / Builder Hardening

**Status**: Proposal **Owner**: TBD **Last updated**: 2026-04-17

## 1. Context

Panda's chat panel exposes three user-facing modes — **Plan** (`architect`),
**Build** (`code`), and **Builder** (`build`). In practice the mode-switching
flow has several classes of defect that together make Build mode unreliable, and
in some provider/model combinations unusable. The goal of this document is to
define a target architecture that:

1. Makes the Plan → Build handoff atomic and correct.
2. Guarantees tool-call grammar safety across **any** provider and **any** model
   — verified, experimental, or novel.
3. Replaces opaque failures ("Interrupted: Timeout") with typed, actionable
   diagnostics.
4. Closes the known spec-engine integration gaps recorded in `MEMORY.md`.

The design draws lessons from Anthropic's production system prompt for Claude
Opus 4.6 (mode-aware rituals, strict tool-call grammar, output-location
discipline) and maps them onto Panda's concrete primitives.

## 2. Observed failures

A representative transcript (user request: "build flappy bird with a unique
twist", model: `kimi-k2.5` via crof.ai):

| #   | Symptom                                                                                            | Class                                                             |
| --- | -------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| 1   | Label remains **"Panda · Plan"** after the user approves the plan and the chat enters Build        | Mode-annotation staleness                                         |
| 2   | Assistant message contains raw XML: `</parameter>`, `</invoke>`, `</minimax:tool_call>`            | Tool-call grammar leakage                                         |
| 3   | `[code collapsed — use Build mode to execute]` placeholder appears **inside** a Build-mode message | Mode state leaking into renderers                                 |
| 4   | Run terminates with `Build Update · Needs attention · Interrupted: Timeout`                        | Watchdog with no actionable reason                                |
| 5   | Approved-plan preamble ("We are switching from Architect…") is injected into the **user** turn     | Pollutes conversation history, biases model toward planning voice |
| 6   | Agent narrates "Step 1: Create SPEC.md…" repeatedly without ever calling `write_files`             | No pre-flight capability check; narration loop undetected         |

Each symptom is traceable to at least one of six architectural weaknesses: mode
state captured in stale closures, no grammar-adapter layer, Plan-mode fence
rules applied by Build-mode renderers, non-typed termination reasons, the
handoff message being composed as user content, and no verification that the
selected model emits a parseable tool-call grammar.

## 3. Lessons from Opus 4.6 applied to Panda

| Opus 4.6 pattern                                                                | Panda application                                                                                                   |
| ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Skill-first ritual: "first order of business… read SKILL.md before any code"    | Build mode's first order of business is to read the approved plan and active spec **before** any `write_files` call |
| Explicit trigger table: "write a component" → create file; "summarize" → don't  | Per-mode intent→tool allowlist with positive and negative examples                                                  |
| Output-location discipline (`/home/claude` scratch vs `/mnt/user-data/outputs`) | Plan artifacts (plan.md, SPEC.md) vs committed repo files are distinct surfaces with distinct permissions           |
| Length-based chunking (<100 lines one-shot, >100 iterative)                     | Build mode chunks large writes across turns; Plan mode never emits code at all                                      |
| Strict, single-dialect tool-call grammar                                        | Grammar registry with explicit adapters; unknown tags are always errors, never leaked text                          |
| Interleaved thinking after tool results                                         | Spec verification runs as a post-tool reflection step                                                               |
| `reasoning_effort` scalar                                                       | `mode.depth` (quick / standard / deep) per chat                                                                     |
| Conversational vs report formatting                                             | Plan mode = conversational; Build mode = action log + diffs                                                         |
| Explicit self-check clause                                                      | Every mode has a pre-flight that verifies its own preconditions                                                     |

## 4. Architectural principles

1. **Single source of truth for mode.** Mode lives in the Convex chat record.
   Consumers read from a ref, never a captured prop closure.
2. **Fail-closed, not fail-open.** Unverified model? Unknown grammar? Missing
   plan? Block with a typed error. Silent degradation is forbidden.
3. **Whitelist-driven compatibility.** New models require a manifest entry. New
   grammars require an adapter module, fixture, and fuzz case.
4. **Provider-blind safety net.** The stream sanitizer runs regardless of
   provider and regardless of whether tool calls are expected. No
   provider-specific bypasses.
5. **Typed diagnostics.** Every termination, every error, every preflight
   failure has a stable code. UI renderers switch on the code and offer a CTA.
6. **Regression-proof by construction.** Every production leak or failure adds a
   fixture to the regression corpus before the fix lands.

## 5. Target architecture (seven components)

### 5.1 `ModeContract`

`apps/web/lib/agent/chat-modes.ts`

One declarative record per mode. Fields:

- `id: ChatMode`
- `surfaceLabel` — user-facing string ("Plan", "Build", "Builder")
- `intentTriggers` — positive and negative examples that route intent to this
  mode
- `toolAllowlist` / `toolDenylist` — canonical tool permissions
- `systemPromptBuilder(ctx) => string`
- `preflightChecks: PreflightCheck[]`
- `handoffRitual?: HandoffRitual` — the "first order of business" for this mode
- `outputFormat: 'conversational' | 'action-log'`
- `requiresToolCalls: boolean`

Every consumer (prompt builder, permission gate, UI label, event applier, fence
collapser) reads from this record — no more scattered conditionals across the
codebase.

### 5.2 `ModeContext`

`apps/web/hooks/useModeContext.ts`

Runtime-derived, ref-based mode context. Shape:

```ts
interface ModeContext {
  mode: ChatMode
  approvedPlanId: Id<'plans'> | null
  activeSpecId: Id<'specifications'> | null
  depth: 'quick' | 'standard' | 'deep'
}
```

`useAgent` and `useAgent-event-applier` read from a `useRef` that is refreshed
on every Convex chat-record change. The stale-closure race that produces "Panda
· Plan" labels on Build-mode messages is eliminated by construction.

### 5.3 `ModeTransitionRitual`

`apps/web/hooks/useProjectMessageWorkflow.ts`,
`apps/web/lib/agent/prompt-library.ts`

On plan approval:

1. Write `chat.mode = 'build'` to Convex and **await persistence**.
2. Persist approved plan to a `planArtifacts` record.
3. Enter Build mode with a synthetic **system** message (not user message)
   containing:
   - The approved plan
   - A pointer to the active spec (if any)
   - The "first order of business" ritual: read plan, identify step 1, call
     `write_files` before narrating
4. Run preflight (§5.5) before the first turn.

The "We are switching from Architect to Build…" preamble is **removed from the
user turn**. That content becomes a system/developer message.

### 5.4 `ToolCallParser` with grammar adapters

See §6 for the deep-dive. This is the largest component and the one with the
highest risk-reduction payoff.

### 5.5 `ModePreflight`

`apps/web/lib/agent/harness/preflight.ts`

Pre-turn synchronous check that asserts:

- Selected model has a capability manifest entry (§6.2).
- Model status is `verified` (or `experimental` with explicit user opt-in) for
  modes that require tool calls.
- Declared tool-call grammars have adapters registered.
- Write/execute permissions are re-derived for Build — **never inherited** from
  Plan.
- Approved plan + spec (if required) are present.

Fail-fast with a typed error rendered as an in-chat system card.

### 5.6 `Watchdog` with typed termination reasons

`apps/web/lib/agent/harness/runtime.ts`,
`apps/web/components/chat/RunStatus.tsx`

Terminate reasons become structured:

```ts
type TerminationReason =
  | { kind: 'completed' }
  | { kind: 'user-abort' }
  | { kind: 'step-budget-exhausted'; budget: number }
  | { kind: 'stream-idle'; idleMs: number }
  | { kind: 'no-tool-calls-in-build-mode'; narrationTurns: number }
  | { kind: 'network-timeout'; cause: string }
  | { kind: 'preflight-failed'; code: string }
  | { kind: 'tool-call-leak-detected'; grammarId: string }
```

The Build-mode watchdog is aggressive: two consecutive assistant turns of
narration in Build/Builder mode with zero `write_files` or `run_command`
invocations → abort with `no-tool-calls-in-build-mode`. The UI renders a
diagnostic card with CTAs (switch model, re-run with instructions, view
transcript).

### 5.7 `SpecInjector`

`apps/web/lib/agent/spec/injector.ts`

Closes the `MEMORY.md` gap:

- When a chat has an active spec, inject a compact spec summary into the
  Build-mode system prompt.
- After Build-mode completion, run spec verification. If verification fails,
  mark the run `needs-attention` with a typed reason, not generic timeout.
- Register the active spec for drift detection when it becomes active (the hook
  `registerActiveSpec` already exists; it is never called today).

## 6. M2 deep-dive — provider-agnostic tool-call safety

**Goal**: no matter which provider (Anthropic, OpenAI, Moonshot/Kimi, MiniMax,
DeepSeek, Hermes, Qwen, OpenRouter, crof.ai, Google, …) or which model, tool
calls either parse correctly or fail loudly. Raw tool-call syntax never reaches
the UI as display text under any condition.

### 6.1 Five layers

Each layer narrows the failure surface. All five must fail for a leak to reach
the UI; by construction that never happens silently.

#### L1 — Grammar Registry

`apps/web/lib/agent/harness/tool-call-grammars/`

One module per grammar:

```ts
interface ToolCallGrammar {
  id: string
  detect(text: string): DetectHit | null
  parse(text: string): ParsedToolCall[]
  strip(text: string): string
  examples: { good: string[]; malformed: string[] }
}
```

Grammars shipped on day one:

| id                       | Emitted by                                              |
| ------------------------ | ------------------------------------------------------- |
| `anthropic-native`       | Claude via SDK tool-use blocks                          |
| `anthropic-xml-fallback` | Claude emitting `<function_calls><invoke>...` in text   |
| `openai-native`          | GPT via `tool_calls` field in delta                     |
| `openai-text-json`       | Models emitting `{"name":"X","arguments":{...}}` inline |
| `minimax-xml`            | Kimi-k2.5, MiniMax direct                               |
| `hermes-tool-call`       | Hermes/Nous: `<tool_call>{...}</tool_call>`             |
| `qwen-xml`               | Qwen chat templates                                     |
| `deepseek-fim`           | `<｜tool▁calls▁begin｜>...`                             |
| `llama-python-tag`       | Llama 3.1+ `<\|python_tag\|>`                           |
| `unknown-suspicious`     | Safety-net detector for any novel tool-call-shaped tag  |

#### L2 — Model Capability Manifest

`apps/web/lib/agent/providers/model-capabilities.ts`

```ts
interface ModelCapability {
  providerId: string
  modelPattern: string | RegExp
  toolCallGrammars: GrammarId[]
  sdkHandlesToolCalls: 'yes' | 'no' | 'sometimes'
  status: 'verified' | 'experimental' | 'unverified'
  notes?: string
}
```

**Rule**: a model with no manifest entry cannot be selected for Build/Builder
mode. Ask and Plan modes allow unverified models because they don't need tool
calls. Adding a new model is a PR with a manifest entry — never a code change to
the parser.

#### L3 — Stream Sanitizer

`apps/web/lib/agent/harness/stream-sanitizer.ts`

Wraps every LLM stream. On each debounced text window:

1. Run all registered `detect()` functions plus the `unknown-suspicious`
   detector.
2. If a registered grammar hits **and** it's in the model's manifest → route
   through `parse()`, emit as structured tool call, strip from display text.
3. If a registered grammar hits but is **not** in the manifest → abort stream,
   emit `MODEL_LEAKED_UNDECLARED_GRAMMAR` with the grammar id and snippet.
4. If `unknown-suspicious` hits → abort stream, emit
   `MODEL_LEAKED_UNKNOWN_GRAMMAR`, log to telemetry. This is how novel grammars
   are discovered the first time any user hits them — instead of corrupting
   chats for months.
5. Clean path: text is emitted verbatim.

The sanitizer runs **regardless of provider**, so it catches models that "lie"
about their declared contract.

#### L4 — Preflight Gate

Described in §5.5. Before the first streamed turn and after every mode switch.

#### L5 — Typed Error Surface

`apps/web/lib/agent/harness/errors.ts`

```ts
type ModelCompatibilityError =
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
```

Rendered as an in-chat system card with diagnostic, model-switcher dropdown
filtered to verified models, and a "Report" button that captures the snippet for
telemetry.

### 6.2 Testing strategy (five tiers, all required to ship)

**Tier 1 — Grammar unit tests.** Every grammar module has `good` and `malformed`
example suites. Parsing `good` must succeed; parsing `malformed` must throw a
specific error, never silent-accept.

**Tier 2 — Sanitizer integration tests.** Table-driven: for each of (verified
grammar in manifest), (grammar not in manifest), (unknown grammar), (no tool
calls at all), feed a stubbed stream and assert exactly one of: structured
tool-call emitted, typed error raised, or clean text passed through. **Property
test**: text containing `<invoke`, `<tool_call`, `<function_calls`, or `<｜tool`
never reaches the UI as display text under any condition.

**Tier 3 — Real-stream regression corpus.** `fixtures/streams/` contains
captured byte streams from every (provider × model) combo the UI offers,
including the exact kimi-k2.5 transcript from the bug report. A CI job replays
each fixture and asserts (a) no grammar leaks to display text, (b) at least one
tool call is extracted for Build-mode fixtures, (c) the extracted calls match a
golden parse.

**Tier 4 — Fuzz.** A fuzzer interleaves tool-call-shaped substrings inside
normal prose, half-broken tags, nested grammars. Asserts no crash, and every
suspicious shape is either routed to a grammar or reported as an error.

**Tier 5 — CI gate.** A script walks the UI's model dropdown and fails the PR if
any entry lacks a manifest record. This is what prevents regressions as new
models are added.

### 6.3 Acceptance criteria

1. The bug-report transcript replays green: kimi-k2.5 either parses (we ship the
   `minimax-xml` adapter) or fails with a typed error and a model-switch CTA.
2. Selecting any unmanifested model and attempting Build mode produces a
   preflight error, not a silent run.
3. Any new provider/model works without changing parser code — only adding a
   manifest entry (and an adapter if the grammar is novel).
4. Fuzz suite passes: no input produces raw tool-call-shaped text in the
   rendered message body.
5. Telemetry captures every `LEAKED_UNKNOWN_GRAMMAR` hit with a sanitized
   snippet.

### 6.4 Long-term maintenance rules

- **New model = new manifest entry** (PR-enforced via CI).
- **New grammar = new adapter module + registry entry + fixture + fuzz case.**
- **Every production leak → fixture in Tier 3 corpus before the fix lands.**
- The sanitizer is **provider-blind by design**. If a provider needs special
  handling, it goes in a grammar adapter, never a sanitizer exception.

## 7. Implementation milestones

| Milestone                          | Scope                                                                                    | Priority | Estimate  |
| ---------------------------------- | ---------------------------------------------------------------------------------------- | -------- | --------- |
| M1 — Mode correctness              | `ModeContract` (§5.1), `ModeContext` (§5.2), `ModeTransitionRitual` (§5.3)               | P0       | ~1 day    |
| M2 — Tool-call grammar safety      | All of §6 plus the preflight grammar-check portion of §5.5                               | P0       | ~2–3 days |
| M3 — Watchdog + typed reasons      | `Watchdog` (§5.6)                                                                        | P1       | ~0.5 day  |
| M4 — Spec injection & verification | `SpecInjector` (§5.7)                                                                    | P1       | ~1 day    |
| M5 — Opus 4.6 polish               | Conversational-vs-action-log formatting per mode, `depth` scalar, intent-trigger tooltip | P2       | ~0.5 day  |

### 7.1 Bug coverage matrix

| Observed failure                                             | Fixed by                                                                      |
| ------------------------------------------------------------ | ----------------------------------------------------------------------------- |
| Label stuck on "Panda · Plan"                                | §5.2 (ref-based mode read)                                                    |
| Raw `</minimax:tool_call>` in chat                           | §6 (grammar adapters + sanitizer)                                             |
| `[code collapsed — use Build mode to execute]` in Build mode | §5.1 + §5.2 (collapser keyed off `ModeContract`, current mode read correctly) |
| "Interrupted: Timeout"                                       | §5.6 (typed termination reasons, narration-loop detector)                     |
| Plan preamble as user message                                | §5.3 (moved to system message)                                                |
| Permissions leaking Plan → Build                             | §5.1 + §5.5 (permissions re-derived; preflight asserts)                       |
| Narration without tool calls                                 | §5.6 (narration-loop watchdog)                                                |
| Spec gaps from `MEMORY.md`                                   | §5.7 (injection + verification + drift registration)                          |

## 8. File layout

```
apps/web/lib/agent/
  chat-modes.ts                         (§5.1 — update)
  prompt-library.ts                     (§5.3 — new BUILD_HANDOFF_SYSTEM_MESSAGE)
  harness/
    tool-call-grammars/
      index.ts                          (§6.1 — registry)
      types.ts
      anthropic-native.ts
      anthropic-xml-fallback.ts
      openai-native.ts
      openai-text-json.ts
      minimax-xml.ts
      hermes-tool-call.ts
      qwen-xml.ts
      deepseek-fim.ts
      llama-python-tag.ts
      unknown-suspicious.ts             (§6.1 — safety net)
    stream-sanitizer.ts                 (§6.1 — L3)
    preflight.ts                        (§5.5)
    errors.ts                           (§6.1 — L5)
    runtime.ts                          (§5.6 — expand termination reasons)
  providers/
    model-capabilities.ts               (§6.1 — L2 manifest)
  spec/
    injector.ts                         (§5.7)
apps/web/hooks/
  useModeContext.ts                     (§5.2 — new)
  useAgent.ts                           (§5.2 — update to consume ref)
  useAgent-event-applier.ts             (§5.2 — read mode from ref)
  useProjectMessageWorkflow.ts          (§5.3 — await mutation, build system message)
apps/web/components/
  chat/RunStatus.tsx                    (§5.6 — render typed reason)
  chat/ModelCompatibilityCard.tsx       (§6.1 — new, L5 renderer)
apps/web/lib/agent/harness/__tests__/
  grammars/*.test.ts                    (Tier 1)
  sanitizer.test.ts                     (Tier 2)
  regression-corpus.test.ts             (Tier 3)
  fuzz.test.ts                          (Tier 4)
apps/web/lib/agent/harness/__fixtures__/
  streams/<provider>-<model>.jsonl
scripts/
  check-model-manifest.ts               (Tier 5 CI gate)
```

## 9. Order of work for M2 (the heaviest milestone)

1. `tool-call-grammars/types.ts` + `tool-call-grammars/index.ts` — contract
   first
2. `minimax-xml.ts` + unit tests — highest-priority adapter; unblocks kimi-k2.5
3. `anthropic-native.ts`, `openai-native.ts`, `openai-text-json.ts` + tests
4. `unknown-suspicious.ts` safety net + fuzz suite
5. `stream-sanitizer.ts` + integration tests; wire into harness runtime
6. `model-capabilities.ts` manifest + seed entries for every model in the
   current dropdown
7. `preflight.ts` + wire into `useAgent.sendMessage`
8. `errors.ts` + `ModelCompatibilityCard` renderer
9. Remaining grammars (hermes, qwen, deepseek, llama)
10. CI gate script + regression corpus harness

## 10. Open questions

- **Depth scalar UX.** Should `mode.depth` be a per-chat toggle or a per-turn
  slider? Leaning per-chat with a "re-run deeper" shortcut on completion cards.
- **Experimental-model opt-in.** For `status: 'experimental'` models in Build
  mode, do we gate behind a one-time "I understand" acknowledgement, or allow
  freely with a warning banner?
- **Telemetry destination.** Sanitizer hits on `LEAKED_UNKNOWN_GRAMMAR` are
  high-signal. Do we surface in Convex (`agent_diagnostics` table) for local
  review, or ship to an external sink?
- **Parser performance.** Running all detectors on every debounced window is
  O(grammars × text). For typical chats this is trivial, but for long runs we
  may want a pre-filter that short-circuits when no tool-call-shaped characters
  (`<`, `{`, `｜`) are present in the window.

## 11. Non-goals

- Rewriting the spec engine. The spec wiring in §5.7 uses existing primitives
  (`FormalSpecification`, `specTrackingPlugin`, `useSpecifications`). Spec
  authoring UX is out of scope.
- Replacing the underlying LLM SDK. Panda stays on its current provider
  adapters; this work sits above the SDK layer.
- Multi-agent orchestration. The current single-agent-per-chat model is assumed.

## 12. Glossary

- **Mode** — Plan (`architect`) / Build (`code`) / Builder (`build`).
  User-facing labels diverge from internal enum values for historical reasons.
- **Grammar** — A syntactic convention used by an LLM to encode tool calls in
  its output.
- **Adapter** — A module that implements the `ToolCallGrammar` interface for one
  specific grammar.
- **Manifest entry** — A record in `model-capabilities.ts` declaring which
  grammars a given (provider × model) emits.
- **Sanitizer** — The provider-blind stream wrapper that enforces "no
  tool-call-shaped text reaches the UI."
- **Preflight** — Synchronous pre-turn verification of mode, model, permissions,
  and required artifacts.
- **Ritual** — A mandatory first-action sequence for a mode (e.g. Build's "read
  plan, identify step 1, call `write_files` before narrating").
