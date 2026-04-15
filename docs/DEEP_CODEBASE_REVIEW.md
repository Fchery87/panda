# Deep Codebase Review: LLM Providers & Chat Streaming Analysis

> **Date:** 2026-04-15 **Reviewer:** AI Codebase Audit **Scope:** All LLM
> provider wiring, model definitions, and chat panel streaming pipeline
> **Status:** Complete

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Part 1: LLM Provider Wiring Review](#part-1-llm-provider-wiring-review)
   - [Provider Registry Map](#provider-registry-map)
   - [Provider-by-Provider Analysis](#provider-by-provider-analysis)
   - [External API Verification (Exa)](#external-api-verification-exa)
   - [Provider Wiring Issues](#provider-wiring-issues)
3. [Part 2: Chat Streaming Diagnosis](#part-2-chat-streaming-diagnosis)
   - [Message Submission Flow](#message-submission-flow)
   - [Streaming Event Pipeline](#streaming-event-pipeline)
   - [Root Cause Analysis](#root-cause-analysis)
4. [Implementation Plan](#implementation-plan)

---

## Executive Summary

This review audited **10 LLM providers**, traced the full message submission
pipeline across **15+ files**, and identified the root causes behind the "no
streaming content visible" issue reported in Plan, Build, and Builder modes.

### Critical Findings

| #   | Finding                                                 | Severity | File(s)                                      |
| --- | ------------------------------------------------------- | -------- | -------------------------------------------- |
| 1   | crof.ai not explicitly wired in provider registry       | Medium   | `registry.ts`                                |
| 2   | Z.ai Coding Plan base URL not auto-detected             | Medium   | `registry.ts`, `zai-stream.ts`               |
| 3   | No LLM API keys in `.env.local` — all configured via UI | Info     | `.env.local`, `useProjectChatSession.ts`     |
| 4   | Build mode fence detection aborts stream and rewrites   | High     | `runtime.ts:714-727`                         |
| 5   | Architect mode silently drops fenced content            | Medium   | `runtime.ts:687-709`                         |
| 6   | No visual feedback in chat bubble during tool execution | High     | `useAgent-event-applier.ts`, `MessageBubble` |
| 7   | chatMessages useMemo can flash empty state              | Low      | `page.tsx:862-906`                           |

---

## Part 1: LLM Provider Wiring Review

### Provider Registry Map

All providers are registered through `ProviderRegistry`
(`apps/web/lib/llm/registry.ts`) which routes to provider-specific
implementations based on `config.provider` type.

| #   | Provider ID  | Label        | Registry Switch | Provider Class                                         | Base URL                                | API Key Env Var                       |
| --- | ------------ | ------------ | --------------- | ------------------------------------------------------ | --------------------------------------- | ------------------------------------- |
| 1   | `openai`     | OpenAI       | `openai`        | `OpenAICompatibleProvider`                             | Configurable                            | `OPENAI_API_KEY`                      |
| 2   | `openrouter` | OpenRouter   | `openrouter`    | `OpenAICompatibleProvider`                             | `https://openrouter.ai/api/v1`          | `OPENROUTER_API_KEY`                  |
| 3   | `together`   | Together.ai  | `together`      | `OpenAICompatibleProvider`                             | `https://api.together.xyz/v1`           | `TOGETHER_API_KEY`                    |
| 4   | `anthropic`  | Anthropic    | `anthropic`     | `AnthropicProvider`                                    | Configurable                            | `ANTHROPIC_API_KEY`                   |
| 5   | `zai`        | Z.ai         | `zai`           | `OpenAICompatibleProvider` + `zai-stream.ts`           | `https://api.z.ai/api/paas/v4`          | `ZAI_API_KEY` / `ZAI_CODING_PLAN_KEY` |
| 6   | `chutes`     | Chutes.ai    | `chutes`        | `ChutesProvider` (wraps `OpenAICompatibleProvider`)    | `https://llm.chutes.ai/v1`              | `CHUTES_API_KEY`                      |
| 7   | `deepseek`   | DeepSeek     | `deepseek`      | `DeepSeekProvider` (wraps `OpenAICompatibleProvider`)  | `https://api.deepseek.com/v1`           | `DEEPSEEK_API_KEY`                    |
| 8   | `groq`       | Groq         | `groq`          | `GroqProvider` (wraps `OpenAICompatibleProvider`)      | `https://api.groq.com/openai/v1`        | `GROQ_API_KEY`                        |
| 9   | `fireworks`  | Fireworks AI | `fireworks`     | `FireworksProvider` (wraps `OpenAICompatibleProvider`) | `https://api.fireworks.ai/inference/v1` | `FIREWORKS_API_KEY`                   |
| 10  | `crofai`     | crof.ai      | **MISSING**     | Falls to default `OpenAICompatibleProvider`            | `https://crof.ai/v1` (per docs)         | **Not defined**                       |

### Provider-by-Provider Analysis

#### 1. OpenAI (`openai`)

- **Implementation:** `OpenAICompatibleProvider` using `@ai-sdk/openai` + Vercel
  AI SDK `streamText`
- **Models defined:** `gpt-4o`, `gpt-4o-mini`, `gpt-4-turbo`, `gpt-3.5-turbo`
- **Capabilities:** Full streaming, function calling, vision, JSON mode, tool
  use
- **Status:** Fully wired and functional
- **Notes:** Default fallback provider in the system

#### 2. OpenRouter (`openrouter`)

- **Implementation:** `OpenAICompatibleProvider` with OpenRouter-specific model
  fetching from `/api/v1/models`
- **Models defined (static):** `qwen/qwen3-coder:free`,
  `moonshotai/kimi-dev-72b:free`, `deepseek/deepseek-coder:free`
- **Dynamic model fetch:** Fetches full model list from OpenRouter API with
  capability detection
- **Status:** Fully wired and functional

#### 3. Together.ai (`together`)

- **Implementation:** `OpenAICompatibleProvider` with Together-specific model
  fetching
- **Models defined (static):** Llama 3.1 70B/8B, Mixtral 8x22B, Qwen 2.5 72B
- **Dynamic model fetch:** Fetches from `https://api.together.xyz/v1/models`
- **Status:** Fully wired and functional

#### 4. Anthropic (`anthropic`)

- **Implementation:** Dedicated `AnthropicProvider` using `@ai-sdk/anthropic`
  with native reasoning support
- **Models defined:** `claude-opus-4-6`, `claude-sonnet-4-5`
- **Special handling:**
  - Reasoning support via `thinking` parameter with `budgetTokens` and `effort`
  - Cache token tracking (`cacheCreationInputTokens`, `cacheReadInputTokens`)
  - Hallucinated tool name repair
- **Status:** Fully wired and functional

#### 5. Z.ai (`zai`)

- **Implementation:** `OpenAICompatibleProvider` with special `zai-stream.ts`
  for tool streaming
- **Models defined:** `glm-4.7`, `glm-4.7-flashx`, `glm-4.7-flash`
- **Special handling:**
  - System messages are **filtered out** (Z.ai doesn't support `role: system`)
  - Custom `zaiCompletionStream()` handles `tool_stream=true` parameter
  - Tool calls are collected during streaming and yielded at the end (not
    incrementally)
- **Base URL issue:** Registry defaults to general endpoint
  (`https://api.z.ai/api/paas/v4`) but Coding Plan requires
  `https://api.z.ai/api/coding/paas/v4`
- **Status:** Functional but has a base URL dual-endpoint issue

#### 6. Chutes.ai (`chutes`)

- **Implementation:** `ChutesProvider` wraps `OpenAICompatibleProvider` with
  custom model fetching
- **Models defined:** DeepSeek-V3, Llama 3.1 70B/8B, Llama 3.2 11B Vision, Qwen
  2.5 72B
- **Special handling:**
  - Tool role messages are converted to assistant messages (Chutes doesn't
    support `role: tool`)
  - OAuth token refresh support with `TokenRefreshCallback`
  - API key validation endpoint
- **External verification (Exa):** Confirmed base URL `https://llm.chutes.ai/v1`
  is correct and OpenAI-compatible
- **Status:** Fully wired and functional

#### 7. DeepSeek (`deepseek`)

- **Implementation:** `DeepSeekProvider` wraps `OpenAICompatibleProvider` with
  reasoning capabilities
- **Models defined:** `deepseek-chat`, `deepseek-coder`, `deepseek-reasoner`
- **Capabilities:** Reasoning with `effort` control, reasoning summaries, tool
  streaming
- **Think tag processing:** `processChunkWithThinking()` in
  `reasoning-transform.ts` handles `<think/>` tags
- **Status:** Fully wired and functional

#### 8. Groq (`groq`)

- **Implementation:** `GroqProvider` wraps `OpenAICompatibleProvider` with no
  reasoning
- **Models defined:** `llama-3.3-70b-versatile`, `llama-3.1-8b-instant`,
  `mixtral-8x7b-32768`, `gemma2-9b-it`
- **Capabilities:** No reasoning support, ultra-fast inference
- **Status:** Fully wired and functional

#### 9. Fireworks AI (`fireworks`)

- **Implementation:** `FireworksProvider` wraps `OpenAICompatibleProvider` with
  no reasoning
- **Models defined:** Llama v3p3 70B, Llama v3p1 70B/8B, Qwen 2.5 72B, DeepSeek
  V3, Phi 4
- **Model filtering:** Only returns `type: 'text'` models from API
- **Status:** Fully wired and functional

#### 10. crof.ai (`crofai`)

- **Implementation:** Falls through to default `OpenAICompatibleProvider` (no
  explicit case in registry switch)
- **Models defined:** `kimi-k2.5`, `kimi-k2.5-lightning`, `glm-5.1`,
  `glm-5.1-precision`, `glm-5`, `glm-4.7`, `glm-4.7-flash`, `gemma-4-31b-it`,
  `minimax-m2.5`, `qwen3.5-397b-a17b`, `qwen3.5-9b`, `deepseek-v3.2`
- **External verification (Exa):** Confirmed crof.ai is OpenAI-compatible at
  `https://crof.ai/v1`
- **Issues:**
  - No explicit `case 'crofai':` in registry switch statement
  - No environment variable defined for API key
  - No base URL defined in provider definitions
  - No special handling for any crof.ai quirks
- **Status:** Functional (via fallback) but not properly wired

### External API Verification (Exa)

| Provider           | Expected Base URL                     | Verified  | Notes                                                |
| ------------------ | ------------------------------------- | --------- | ---------------------------------------------------- |
| Chutes.ai          | `https://llm.chutes.ai/v1`            | Confirmed | OpenAI-compatible, supports `/v1/chat/completions`   |
| Z.ai (General)     | `https://api.z.ai/api/paas/v4`        | Confirmed | Standard API endpoint                                |
| Z.ai (Coding Plan) | `https://api.z.ai/api/coding/paas/v4` | Confirmed | Dedicated coding endpoint, requires separate API key |
| crof.ai            | `https://crof.ai/v1`                  | Confirmed | OpenAI-compatible, drop-in replacement               |
| crof.ai (alt)      | `https://ai.nahcrof.com/v1`           | Confirmed | Alternative URL, same service                        |

### Provider Wiring Issues

#### Issue 1: crof.ai Missing from Registry Switch

**File:** `apps/web/lib/llm/registry.ts:57-82`

The `KNOWN_PROVIDERS` array in `types.ts` and the switch statement in
`registry.ts` do not include `'crofai'`. The provider definition exists in
`provider-definitions.ts` with 12 models, but:

- No `case 'crofai':` in the registry switch
- Falls through to `default: provider = new OpenAICompatibleProvider(config)` at
  line 81
- No environment variable for API key
- No base URL defined in provider definitions

**Impact:** Low — crof.ai is OpenAI-compatible so the fallback works. But no
provider-specific handling is possible (tool streaming quirks, model-specific
behavior).

**Fix location:** `apps/web/lib/llm/registry.ts:57-82` and
`apps/web/lib/llm/types.ts:15-26`

#### Issue 2: Z.ai Coding Plan Base URL

**Files:** `apps/web/lib/llm/registry.ts:343`,
`apps/web/lib/llm/providers/zai-stream.ts:207`

- `registry.ts:343`: `ZAI_BASE_URL || 'https://api.z.ai/api/paas/v4'` (general)
- `zai-stream.ts:207`: `config.baseUrl || 'https://api.z.ai/api/coding/paas/v4'`
  (coding)

Per Z.ai documentation (confirmed via Exa), Coding Plan subscribers MUST use the
coding endpoint. The registry creates with the general URL, and `zai-stream.ts`
hardcodes the coding URL as fallback. When users configure providers through the
settings UI, the `useCodingPlan` flag should trigger a baseUrl override.

**Impact:** Medium — Coding Plan users may get authentication errors at the
general endpoint.

**Fix location:** `apps/web/hooks/useProjectChatSession.ts:121-130`

#### Issue 3: All API Keys via Settings UI

**Files:** `apps/web/hooks/useProjectChatSession.ts:95-153`,
`apps/web/.env.local`

The `.env.local` files contain only Convex and Auth variables. All LLM API keys
must be configured through the Settings UI, stored in the Convex `settings`
table under `providerConfigs.{provider}.apiKey`.

The `createProviderFromEnv()` function in `registry.ts:266-417` supports
env-based keys, but `useProjectChatSession.ts` bypasses this entirely, creating
providers directly from stored settings.

**Impact:** Info — this is by design, but new users must complete settings
configuration before chat works.

---

## Part 2: Chat Streaming Diagnosis

### Message Submission Flow

The complete flow from user input to rendered content:

```
1. ChatInput.handleSend()
   File: apps/web/components/chat/ChatInput.tsx:188-307
   - Parses @-mentions, uploads attachments
   - Calls onSendMessage(message, mode, contextFiles, options)

2. useProjectMessageWorkflow.handleSendMessage()
   File: apps/web/hooks/useProjectMessageWorkflow.ts:266-445
   - Validates content, resolves workflow action
   - Creates chat if needed, queues pending message
   - Calls sendAgentMessage(content, contextFiles, options)

3. useAgent.sendMessageInternal()
   File: apps/web/hooks/useAgent.ts:491-1087
   - Normalizes content, locks as running
   - Builds previous messages snapshot (mode-filtered)
   - Estimates prompt tokens, creates user message in state
   - Persists user message to Convex via addMessage mutation
   - Creates agent run via createRun mutation

4. Prompt Context Building
   File: apps/web/lib/agent/session-controller.ts
   - Builds PromptContext with mode, history, files, memory bank
   - Includes project overview, plan draft, spec data

5. Runtime Creation
   File: apps/web/lib/agent/runtime.ts:489-882
   - Creates HarnessRuntime with provider, tool executors, config
   - Converts CompletionMessages to HarnessMessages
   - Resolves agent name from chat mode mapping

6. Event Streaming
   File: apps/web/hooks/useAgent.ts:807-980
   - Iterates runtime.run() as AsyncGenerator<AgentEvent>
   - Processes each event through applyNonTerminalAgentEvent()
   - Text events trigger schedulePaint() via requestAnimationFrame
   - Terminal events (complete/error) persist assistant message

7. UI Update
   File: apps/web/hooks/useAgent.ts:769-805
   - schedulePaint() batches updates via requestAnimationFrame
   - setMessages() updates assistant content, reasoning, toolCalls
   - React re-renders MessageList with virtualized rendering
```

### Streaming Event Pipeline

```
Provider Stream Chunks
    ↓
OpenAICompatibleProvider.completionStream() / AnthropicProvider.completionStream()
    ↓ (yields StreamChunk: text, reasoning, tool_call, error, finish)
HarnessRuntime
    ↓ (emits HarnessRuntimeEvent: step_start, text, tool_call, tool_result, step_finish, etc.)
HarnessAgentRuntimeAdapter.run()
    ↓ (maps to AgentEvent: status_thinking, text, tool_call, tool_result, reasoning, complete, error)
    ↓ (mode-specific filtering: build fence break, architect fence strip)
useAgent.sendMessageInternal()
    ↓ (applyNonTerminalAgentEvent processes non-terminal events)
    ↓ (schedulePaint batches state updates via rAF)
    ↓ (setMessages triggers React re-render)
MessageList → MessageBubble → rendered content
```

### Root Cause Analysis

#### Factor 1: Provider Not Configured (Most Likely Primary Cause)

**File:** `apps/web/hooks/useProjectChatSession.ts:95-153`

```typescript
if (!providerConfig?.enabled || !providerConfig.apiKey) {
  registry.removeProvider(defaultProviderId)
  return null
}
```

When `provider` is `null`, the workspace uses `FALLBACK_PROVIDER`
(`page.tsx:166-182`) which immediately yields an error:

```typescript
async *completionStream() {
  yield { type: 'error' as const, error: 'No LLM provider configured' }
}
```

**User experience:** Status briefly shows "thinking", then an error toast
appears. No content ever streams.

**Fix:** Pre-configure a default provider or show a clear setup wizard for new
users.

#### Factor 2: Build Mode Fence Break and Rewrite

**File:** `apps/web/lib/agent/runtime.ts:714-727`

````typescript
if (promptContext.chatMode === 'build') {
  const combined = attemptText + mapped.content
  const fenceIndex = combined.indexOf('```')
  if (fenceIndex !== -1) {
    fenceTriggered = true
    break // Stream aborts here
  }
}
````

When the model outputs a fenced code block in Build mode:

1. Stream breaks immediately at the fence marker
2. A "rewrite" message is shown: `— Rewriting to match mode… —`
3. A **new** HarnessRuntime is created with additional instructions
4. The rewrite runs from scratch, potentially taking several seconds
5. If the rewrite also outputs code, the cycle may repeat

**User experience:** Text streams briefly, then stops. A "Rewriting to match
mode..." notice appears. Then nothing visible happens during the rewrite.
Eventually, either tool calls execute (showing progress steps) or the response
completes.

**Fix:** Instead of breaking the stream, redirect code content into artifact
creation in real-time.

#### Factor 3: Architect/Plan Mode Silent Content Dropping

**File:** `apps/web/lib/agent/runtime.ts:687-709`

````typescript
if (promptContext.chatMode === 'architect') {
  let chunk = mapped.content
  let filtered = ''
  while (chunk.length > 0) {
    const markerIdx = chunk.indexOf('```')
    if (markerIdx === -1) {
      if (!inArchitectFence) filtered += chunk
      break
    }
    // ... silently drops fenced content
  }
  if (filtered) yield { ...mapped, content: filtered }
}
````

Content inside code fences is silently stripped. If the model's plan includes
code examples, architecture diagrams in code blocks, or implementation snippets,
they vanish without any indication to the user.

**User experience:** Text appears to stream normally, then stops mid-sentence
(at a fence opening), and may resume after the closing fence. The user sees gaps
in the response.

**Fix:** Replace fenced content with a placeholder like
`[Code example collapsed — click to expand]` rather than silently dropping it.

#### Factor 4: Tool Execution Shows No Chat Content

**File:** `apps/web/hooks/useAgent-event-applier.ts:327-358`

When a `tool_call` event arrives, status changes to `executing_tools` and
progress steps are added. But the assistant message bubble only shows whatever
text has accumulated in `assistantContent` — which may be empty if the model
went straight to tool calls.

**User experience:** After sending a message, the user sees progress steps (in
RunProgressPanel) but the main chat bubble remains empty. The `isStreaming`
indicator is active but no text content appears.

**Fix:** Show an inline "executing tools..." indicator directly in the assistant
message bubble during tool execution phases.

#### Factor 5: chatMessages useMemo Flash

**File:** `apps/web/app/(dashboard)/projects/[projectId]/page.tsx:862-906`

```typescript
if (!agent.isLoading && agent.messages.length === 0 && convexMessages?.length) {
  return mapConvexMessages(convexMessages)
}
return agent.messages
```

When the agent run completes:

- `agent.isLoading` transitions to `false`
- `agent.messages` may briefly be empty (cleared by some code paths)
- The fallback to `convexMessages` depends on Convex having persisted the
  messages
- There can be a brief flash where neither source has content

**Fix:** Add a transition guard that keeps agent messages visible until Convex
messages are confirmed available.

#### Factor 6: schedulePaint rAF Batching

**File:** `apps/web/hooks/useAgent.ts:769-805`

The `schedulePaint()` function batches all text updates within a single
animation frame via `requestAnimationFrame`. While this is performant, it means:

- Multiple text chunks arriving in the same frame are collapsed into one update
- The `setMessages()` call creates a new array copy each time (correct but
  potentially slow with many messages)
- If the component unmounts during streaming (e.g., user navigates away),
  pending rAF callbacks are lost

**Fix:** Consider using `queueMicrotask` or a more granular batching strategy
for perceived streaming speed.

---

## Implementation Plan

### Phase 1: Critical Fixes (Streaming Visibility)

These changes address the core "no content visible during streaming" issue.

#### Task 1.1: Add Visual Feedback During Tool Execution

**Files to modify:**

- `apps/web/hooks/useAgent-event-applier.ts` — emit a synthetic text event when
  entering tool execution
- `apps/web/components/chat/MessageBubble.tsx` — render a "running tools"
  indicator

**Approach:** When a `tool_call` event arrives and `assistantContent` is empty,
insert a synthetic text chunk like `— Executing tools… —` into the assistant
message. Clear this text when actual content arrives from the model.

#### Task 1.2: Fix Build Mode Rewrite UX

**Files to modify:**

- `apps/web/lib/agent/runtime.ts:714-727` — refactor fence detection

**Approach:** Instead of breaking the stream on fence detection, collect fenced
content and emit it as a special `artifact` event. The UI can render this as an
inline artifact card. Only trigger rewrite if no tools were called AND the
content is entirely code blocks.

#### Task 1.3: Replace Architect Mode Silent Drop with Collapsed Placeholder

**Files to modify:**

- `apps/web/lib/agent/runtime.ts:687-709` — replace content stripping with
  placeholder

**Approach:** Instead of `if (!inArchitectFence) filtered += chunk`, accumulate
fenced content and yield a placeholder:
`[Code collapsed — use Build mode to execute]`. This gives the user visibility
that content was generated.

#### Task 1.4: Add Transition Guard for chatMessages

**Files to modify:**

- `apps/web/app/(dashboard)/projects/[projectId]/page.tsx:862-906`

**Approach:** Add a `previousAgentMessages` ref that retains the last non-empty
agent messages. Use this as fallback when transitioning from streaming to idle,
preventing the empty flash.

### Phase 2: Provider Wiring Fixes

#### Task 2.1: Wire crof.ai in Provider Registry

**Files to modify:**

- `apps/web/lib/llm/types.ts:15-26` — add `'crofai'` to `KNOWN_PROVIDERS`
- `apps/web/lib/llm/registry.ts:57-82` — add `case 'crofai':`
- `apps/web/lib/llm/registry.ts:266-417` — add crof.ai env var block

**Approach:** Since crof.ai is OpenAI-compatible, the case can reuse
`OpenAICompatibleProvider` but with the correct base URL (`https://crof.ai/v1`).
Add `CROFAI_API_KEY` environment variable support.

#### Task 2.2: Auto-Detect Z.ai Coding Plan Endpoint

**Files to modify:**

- `apps/web/hooks/useProjectChatSession.ts:121-130`

**Approach:** When building `nextProviderConfig`, check if `useCodingPlan: true`
and the provider is `zai`. If so, override `baseUrl` to
`https://api.z.ai/api/coding/paas/v4`. This ensures Coding Plan users hit the
correct endpoint automatically.

### Phase 3: Provider Onboarding

#### Task 3.1: Add Provider Setup Guidance

**Files to modify:**

- `apps/web/app/(dashboard)/projects/[projectId]/page.tsx:377` — improve
  fallback provider UX

**Approach:** Instead of the silent `FALLBACK_PROVIDER` that yields errors,
detect when no provider is configured and show a prominent setup card in the
chat panel with a link to Settings. This guides new users through the required
configuration.

#### Task 3.2: Validate Provider Connection on Save

**Files to modify:**

- `apps/web/hooks/useSettingsForm.ts` or settings page component

**Approach:** When a user saves provider settings, make a test API call (e.g.,
list models) to validate the API key and base URL. Show success/error feedback
immediately rather than discovering issues at chat time.

### Phase 4: Streaming Polish

#### Task 4.1: Improve schedulePaint Granularity

**Files to modify:**

- `apps/web/hooks/useAgent.ts:769-805`

**Approach:** Replace `requestAnimationFrame` with a time-based flush (e.g.,
every 50ms) using `setTimeout`. This ensures text appears within 50ms of arrival
regardless of frame timing, improving perceived streaming speed.

#### Task 4.2: Add Streaming Token Counter

**Files to modify:**

- `apps/web/components/chat/MessageBubble.tsx`
- `apps/web/components/chat/ContextWindowIndicator.tsx`

**Approach:** Show a live token count indicator during streaming (e.g., "142
tokens…") in the message bubble footer. This gives the user continuous feedback
that content is being generated.

### Implementation Priority

| Phase   | Tasks   | Impact                          | Effort |
| ------- | ------- | ------------------------------- | ------ |
| Phase 1 | 1.1–1.4 | Fixes core streaming visibility | Medium |
| Phase 2 | 2.1–2.2 | Fixes provider wiring gaps      | Low    |
| Phase 3 | 3.1–3.2 | Improves new user experience    | Low    |
| Phase 4 | 4.1–4.2 | Streaming polish                | Low    |

### Files Reference Map

| File                                                     | Role                                                   |
| -------------------------------------------------------- | ------------------------------------------------------ |
| `apps/web/lib/llm/registry.ts`                           | Provider factory and singleton registry                |
| `apps/web/lib/llm/types.ts`                              | Provider types, capabilities, known providers          |
| `apps/web/lib/llm/provider-definitions.ts`               | Static provider/model definitions for UI               |
| `apps/web/lib/llm/provider-catalog.ts`                   | Dynamic catalog from models.dev                        |
| `apps/web/lib/llm/providers/openai-compatible.ts`        | OpenAI, OpenRouter, Together, Z.ai, crof.ai            |
| `apps/web/lib/llm/providers/anthropic.ts`                | Native Anthropic with reasoning                        |
| `apps/web/lib/llm/providers/zai-stream.ts`               | Z.ai custom streaming for tool_stream                  |
| `apps/web/lib/llm/providers/chutes.ts`                   | Chutes with OAuth, tool message conversion             |
| `apps/web/lib/llm/providers/deepseek.ts`                 | DeepSeek with reasoning                                |
| `apps/web/lib/llm/providers/groq.ts`                     | Groq with no reasoning                                 |
| `apps/web/lib/llm/providers/fireworks.ts`                | Fireworks with no reasoning                            |
| `apps/web/lib/llm/model-sync.ts`                         | Provider model synchronization                         |
| `apps/web/lib/agent/runtime.ts`                          | Agent runtime adapter (harness wrapper)                |
| `apps/web/lib/agent/chat-modes.ts`                       | Chat mode definitions (ask, architect, code, build)    |
| `apps/web/hooks/useAgent.ts`                             | Core hook: streaming, tool execution, state management |
| `apps/web/hooks/useAgent-event-applier.ts`               | Non-terminal event processing                          |
| `apps/web/hooks/useProjectChatSession.ts`                | Provider creation from settings                        |
| `apps/web/hooks/useProjectMessageWorkflow.ts`            | Message routing (create chat, send, plan execution)    |
| `apps/web/hooks/useProviderSettings.ts`                  | Reasoning settings, model resolution                   |
| `apps/web/hooks/useFreshProviderConfigs.ts`              | Dynamic model list refresh                             |
| `apps/web/components/chat/ChatInput.tsx`                 | Message input with mode/model selection                |
| `apps/web/components/chat/MessageList.tsx`               | Virtualized message rendering                          |
| `apps/web/components/projects/ProjectChatPanel.tsx`      | Chat panel composition                                 |
| `apps/web/app/(dashboard)/projects/[projectId]/page.tsx` | Workspace page (wiring hub)                            |
| `convex/settings.ts`                                     | User settings storage and admin defaults               |
| `convex/providers.ts`                                    | OAuth token management for providers                   |
