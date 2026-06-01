# Panda Mode Modernization + Cross-Mode Context Awareness Implementation Plan

Date: 2026-05-23  
Status: Draft for implementation  
Scope: Panda chat/agent runtime mode UX and context continuity across Ask, Plan,
Agent Guided, Agent Autopilot, and secondary Debug/Review/Docs actions

## 1. Executive Decision

Panda should stop presenting **Code** and **Build** as separate primary modes.

Final proposed user-facing UX:

```txt
Ask      Plan      Agent
                  ├─ Guided
                  └─ Autopilot
```

Optional secondary actions:

```txt
Debug
Review
Docs
```

Future:

```txt
Background Agent / Worktree Agent
```

Internal runtime compatibility can remain incremental:

```txt
Ask                → internal mode: ask
Plan               → internal mode: plan
Agent · Guided     → internal mode: code
Agent · Autopilot  → internal mode: build
```

This keeps the first implementation safer: modernize the UX and contracts first,
preserve existing runtime behavior, then progressively rename/refactor internals
later.

## 2. Problem Statement

Panda currently exposes four user-facing chat modes: `ask`, `plan`, `code`, and
`build`.

The current model has two issues:

1. **Mode taxonomy feels dated and ambiguous.**
   - `Code` and `Build` both sound like implementation modes.
   - Users cannot easily infer whether `Code` means “small edit,” “write code,”
     “approval-gated agent,” or “normal agent.”
   - `Build` can be confused with compiling/running a production build.

2. **Mode transitions can lose task context.**
   - User asks in **Ask** mode for an audit/review.
   - User switches to **Plan** mode and asks Panda to create a plan from the
     audit.
   - User switches to **Code** or **Build** and asks Panda to save/implement
     “this plan.”
   - Panda may lose the previous plan/audit and ask to search the codebase
     again.

This is not primarily an LLM reasoning failure. It is an application-level mode
taxonomy and handoff failure.

## 3. May 2026 Standards Summary

Current AI coding tools increasingly separate three concepts that Panda
currently collapses into one mode selector:

1. **Task phase** — ask, plan, act, debug, review, docs.
2. **Autonomy level** — manual, guided, autopilot, background/cloud.
3. **Execution environment** — current workspace, worktree, cloud sandbox,
   PR/issue workflow.

Observed 2026 patterns:

- Cursor-style systems commonly present **Ask / Plan / Agent / Debug**, with
  background/cloud agents as execution environments.
- Claude Code emphasizes **Plan mode** as structural read-only planning, then
  normal/accept-edits/high-autonomy execution through permission levels.
- GitHub Copilot and VS Code agents emphasize a default **Agent mode**, plus a
  dedicated **Plan agent** that creates reviewable plans.
- OpenCode exposes **Build** and **Plan** primary agents, plus configurable
  subagents like review/debug/docs.
- Gemini Code Assist centers on **Agent mode** with plans and tool approvals
  inside the agent loop.
- Windsurf/Cascade-style systems emphasize one agentic surface, workflows,
  memory, and task orchestration more than many top-level modes.

Conclusion:

> Ask and Plan are still current. The outdated part is presenting Code and Build
> as two peer primary modes. Panda should present one Agent mode with an
> autonomy selector.

## 4. Target Product Model

### 4.1 Primary modes

#### Ask

Purpose:

> Understand, explain, inspect, audit, and answer without changing project
> files.

Default permissions:

- read files
- search codebase
- inspect context
- no file writes
- no project-mutating commands

Examples:

- “Audit the workspace layout.”
- “Explain how the context chunking system works.”
- “Find why streaming is chunky.”
- “Review this code path.”

#### Plan

Purpose:

> Turn intent, findings, and constraints into a durable, reviewable
> implementation plan.

Default permissions:

- read/search project context
- ask clarifying questions
- write/update plan artifacts only, if implemented
- no application code edits
- no destructive commands

Examples:

- “Create a plan from your audit.”
- “Break this refactor into phases.”
- “Compare implementation approaches.”
- “Generate acceptance criteria.”

Plan output should become a durable artifact, not only chat text.

#### Agent

Purpose:

> Implement, verify, and iterate.

Agent mode has an autonomy selector.

##### Agent · Guided

Maps to current internal `code` mode.

Behavior:

- focused implementation
- asks before file writes
- asks before commands
- better for sensitive or production code
- uses spec engine where appropriate

##### Agent · Autopilot

Maps to current internal `build` mode.

Behavior:

- broader implementation
- auto-applies safe changes
- runs safe validation commands
- interrupts only for high-risk/destructive actions
- better for well-scoped implementation tasks

### 4.2 Secondary actions

Secondary actions should not be equal top-level primary modes at first. They
should be task templates, subagents, or command-style actions available inside
Ask/Plan/Agent.

#### Debug

Purpose:

> Hypothesis-driven bug investigation and fix loop.

Suggested flow:

```txt
hypothesize → inspect/reproduce → instrument if needed → patch → verify
```

Initial placement:

- secondary Agent action
- optional `/debug` command
- future dedicated task template

#### Review

Purpose:

> Review current diff, plan, implementation, or selected files.

Initial placement:

- secondary action
- optional `/review` command
- no primary button needed initially

#### Docs

Purpose:

> Generate or update documentation, changelogs, implementation notes, and plan
> files.

Initial placement:

- secondary Agent action
- optional `/docs` command
- may allow documentation-only writes

### 4.3 Future: Background Agent / Worktree Agent

Future capability:

```txt
Agent · Background
Agent · Worktree
```

Behavior:

- isolated branch/worktree/cloud environment
- long-running task execution
- returns diff/PR/artifacts
- user continues working in current workspace

This is explicitly future scope, not part of the immediate implementation unless
the team chooses to accelerate worktree support.

## 5. Confirmed Codebase Findings

### 5.1 Current mode contracts already map well internally

Current internal modes can be preserved initially:

```txt
ask   → Ask
plan  → Plan
code  → Agent · Guided
build → Agent · Autopilot
```

Relevant files:

```txt
apps/web/lib/agent/chat-modes.ts
apps/web/lib/agent/prompt-library.ts
apps/web/lib/agent/prompt-modules.ts
apps/web/lib/agent/permission/mode-rulesets.ts
```

### 5.2 Cross-mode history is intentionally filtered

`apps/web/lib/agent/context/session-summary.ts` contains
`buildPromptMessagesWithModeSummary()`, which keeps same-mode messages directly
and compresses other-mode messages into a heuristic summary.

For target implementation modes, prior `ask` and `plan` messages are not
included verbatim. If summary extraction does not detect a
decision/key-context/user-constraint pattern, the implementation mode can
receive no useful prior context.

A simulated Ask → Plan → Code/Build sequence produced an empty previous-message
snapshot for both current internal `code` and `build`.

### 5.3 Structured approved-plan handoff exists but only covers one path

`apps/web/hooks/useProjectMessageWorkflow.ts` can pass
`approvedPlanExecutionContext` into current Code/Build when there is an
executable `GeneratedPlanArtifact`.

`apps/web/lib/agent/prompt-modules.ts` then injects
`## Approved Plan Execution Context` for both current internal `code` and
`build`.

This works for approved structured plans, but not for normal Plan-mode assistant
output.

### 5.4 Plan source type exists but is underused

`convex/schema.ts` defines `ContextChunkSourceType` values including `message`
and `plan`.

`apps/web/lib/agent/context/context-pack.ts` knows how to format `plan` context
sections.

However, `convex/contextChunks.ts` currently indexes files, session summaries,
and specifications. It does not currently index chat messages or
planning-session generated plans as `message`/`plan` chunks.

### 5.5 Code mode must be treated as implementation mode

The previous review initially emphasized Build mode, but Code mode has the same
context-awareness risk.

Current internal `code` mode:

- uses `CODE_SYSTEM_PROMPT`;
- requires tool calls;
- receives approved-plan execution context when present;
- uses permission-gated edit/exec behavior;
- enables the spec engine;
- uses the same prompt history pipeline as Build.

Therefore the new context handoff system must target:

```txt
Agent · Guided    current internal code
Agent · Autopilot current internal build
```

## 6. Proposed Architecture

## 6.1 Mode contract modernization

Update Panda’s mode contract layer to separate user-facing mode, internal
runtime mode, autonomy, and task type.

Suggested types:

```ts
export type PrimaryMode = 'ask' | 'plan' | 'agent'
export type AgentAutonomy = 'guided' | 'autopilot'
export type SecondaryAction = 'debug' | 'review' | 'docs'

export type RuntimeChatMode = 'ask' | 'plan' | 'code' | 'build'

export interface ModeSelection {
  primaryMode: PrimaryMode
  autonomy?: AgentAutonomy
  secondaryAction?: SecondaryAction | null
}

export interface ModeContract {
  id: PrimaryMode
  label: string
  description: string
  defaultRuntimeMode: RuntimeChatMode
  allowedAutonomy?: AgentAutonomy[]
  defaultAutonomy?: AgentAutonomy
}
```

Runtime mapping:

```ts
function resolveRuntimeMode(selection: ModeSelection): RuntimeChatMode {
  if (selection.primaryMode === 'ask') return 'ask'
  if (selection.primaryMode === 'plan') return 'plan'
  if (selection.autonomy === 'autopilot') return 'build'
  return 'code'
}
```

Suggested files:

```txt
apps/web/lib/agent/chat-modes.ts
apps/web/lib/chat/chat-mode-surface.ts
apps/web/stores/chatSessionStore.ts
apps/web/components/chat/ChatInput.tsx
```

## 6.2 UI presentation

Replace the current four-peer mode selector with:

```txt
Ask | Plan | Agent
```

When Agent is selected, expose autonomy as a compact control:

```txt
Guided | Autopilot
```

Recommended labels:

- **Guided** — “Review edits and commands before they run.”
- **Autopilot** — “Let Panda apply safe changes and interrupt for risky
  actions.”

Secondary actions should appear as smaller commands/actions:

```txt
Debug | Review | Docs
```

Potential placements:

- command palette
- slash commands
- compact action menu near Agent selector
- contextual suggestions after Ask/Plan responses

## 6.3 Prompt and permission mapping

No immediate backend rewrite is required.

Initial mapping:

| User-facing selection | Runtime mode | Prompt                    | Permissions                    |
| --------------------- | ------------ | ------------------------- | ------------------------------ |
| Ask                   | `ask`        | `ASK_SYSTEM_PROMPT`       | read/search only               |
| Plan                  | `plan`       | `ARCHITECT_SYSTEM_PROMPT` | read/search/plan artifact only |
| Agent · Guided        | `code`       | `CODE_SYSTEM_PROMPT`      | ask for edit/exec              |
| Agent · Autopilot     | `build`      | `BUILD_SYSTEM_PROMPT`     | allow safe actions; ask risky  |

Later refactor target:

```ts
primaryMode: 'agent'
autonomy: 'guided' | 'autopilot'
runtimePhase: 'implement' | 'debug' | 'review' | 'docs'
```

## 6.4 New concept: Mode Handoff Packet

Add an explicit handoff object that can be injected into Agent-mode prompts.

```ts
export type HandoffKind =
  | 'latest_plan'
  | 'approved_plan'
  | 'latest_audit'
  | 'latest_assistant_output'
  | 'session_summary'

export interface ModeHandoffPacket {
  fromMode: 'ask' | 'plan' | 'code' | 'build' | null
  toMode: 'ask' | 'plan' | 'code' | 'build'
  kind: HandoffKind
  title: string
  content: string
  sourceMessageId?: string
  planningSessionId?: string
  confidence: 'high' | 'medium' | 'low'
  reason: string
}
```

Suggested file:

```txt
apps/web/lib/agent/context/mode-handoff.ts
```

## 6.5 Handoff resolver

Create a resolver that examines the current user request, target runtime mode,
previous messages, and active planning session.

Inputs:

```ts
resolveModeHandoff({
  targetMode,
  userContent,
  messages,
  activePlanningSession,
  approvedPlanExecutionContext,
})
```

Resolution rules:

1. If `approvedPlanExecutionContext` exists, prefer it as `approved_plan`.
2. If target mode is current internal `code` or `build` and the user refers to
   “this plan,” “the plan,” “above plan,” or “implement it,” use the latest
   Plan-mode assistant message or generated plan artifact.
3. If target mode is current internal `code` or `build` and the user refers to
   “your audit,” “the audit,” “findings,” or “recommendations,” use the latest
   Ask-mode assistant message.
4. If no referent language is present, include only a concise cross-mode
   summary.
5. If referent language is present but no source can be found, return an
   unresolved handoff result that can drive a user-facing clarification.

## 6.6 Prompt injection

Extend `PromptContext` with:

```ts
modeHandoff?: ModeHandoffPacket
```

Inject it in `apps/web/lib/agent/prompt-library.ts` as system context, not as a
synthetic user message.

Example:

```md
## Mode Handoff Context

Previous mode: plan Current mode: agent-guided Runtime mode: code Handoff kind:
latest_plan Confidence: high Reason: User referred to “this plan.”

### Handoff Content

# Context Awareness Fix Plan

...
```

## 6.7 Preserve approved structured plans

Do not remove `approvedPlanExecutionContext`.

Priority order:

1. Approved structured plan.
2. Current planning-session generated plan.
3. Latest Plan-mode assistant output.
4. Latest Ask-mode audit/findings.
5. Cross-mode summary.
6. Clarification if unresolved.

## 6.8 Index plans and messages into context chunks

Add Convex indexing support for:

- `message` chunks from chat messages;
- `plan` chunks from planning-session generated plans.

Suggested mutations in `convex/contextChunks.ts`:

```ts
indexMessages({ projectId, limit })
indexPlanningSessionPlans({ projectId, limit })
```

Then update the context-pack assembly in `useAgent.ts` to call these indexers
alongside existing file/summary/spec indexers.

## 6.9 Explicit runtime mode override

Prevent stale-mode sends by allowing send paths to carry the resolved runtime
mode immediately.

Proposed option:

```ts
type SendMessageOptions = {
  modeOverride?: RuntimeChatMode
  modeSelection?: ModeSelection
  ...
}
```

Then in `useAgent.sendMessageInternal()`:

```ts
const effectiveMode = options?.modeOverride ?? mode
```

Use `effectiveMode` for:

- routing decision;
- user message annotation;
- run creation;
- prompt bundle mode;
- runtime config;
- assistant annotations.

`useProjectMessageWorkflow.handleSendMessage()` should pass the requested target
runtime mode directly.

## 6.10 Clarifying preflight for unresolved references

If the user says “this plan” or “the audit” and the resolver cannot find a
source, Panda should not proceed with a vague Agent run.

Instead, fail fast with a clear clarification:

```txt
I could not identify which plan you want me to use. Choose one:
1. Latest Plan response
2. Approved structured plan
3. Search the codebase and create a new plan
```

## 7. Implementation Phases

### Phase 0 — Regression tests for current failures

Add focused tests before changing behavior.

Tests:

1. Ask → Plan → Agent Guided: “save this plan as markdown” includes latest
   Plan-mode assistant output in the runtime `code` prompt.
2. Ask → Plan → Agent Autopilot: “save this plan as markdown” includes latest
   Plan-mode assistant output in the runtime `build` prompt.
3. Ask → Agent Guided: “use your audit findings” includes latest Ask-mode
   assistant output.
4. Ask → Agent Autopilot: “use your audit findings” includes latest Ask-mode
   assistant output.
5. Approved structured plan takes precedence over inferred latest Plan-mode
   text.
6. If “this plan” is referenced and no plan exists, resolver returns unresolved.
7. Same-mode history remains preserved.
8. Cross-mode summaries still exist for non-referential context.

Suggested files:

```txt
apps/web/lib/agent/context/mode-handoff.test.ts
apps/web/hooks/useAgent-prompt-context.test.ts
apps/web/hooks/useProjectMessageWorkflow.handoff.test.ts
```

### Phase 1 — Mode taxonomy and UX contract

Implement the new user-facing model while preserving runtime compatibility.

Tasks:

1. Add `PrimaryMode`, `AgentAutonomy`, `ModeSelection`, and runtime mapping
   helpers.
2. Update mode surface labels to show `Ask | Plan | Agent`.
3. Add Agent autonomy selector: `Guided | Autopilot`.
4. Map Agent Guided to internal `code`.
5. Map Agent Autopilot to internal `build`.
6. Preserve existing persisted chat `mode` values for compatibility.
7. Add tests for runtime mapping and UI mode presentation.

Suggested files:

```txt
apps/web/lib/agent/chat-modes.ts
apps/web/lib/chat/chat-mode-surface.ts
apps/web/stores/chatSessionStore.ts
apps/web/components/chat/ChatInput.tsx
apps/web/components/projects/ProjectChatPanel.tsx
```

### Phase 2 — Secondary actions: Debug, Review, Docs

Add secondary actions as commands/templates, not primary modes.

Tasks:

1. Define secondary action metadata.
2. Add UI affordance in Agent menu or command palette.
3. Map Debug to Agent Guided by default with debug-specific instructions.
4. Map Review to Ask or Agent Guided depending on whether user wants edits.
5. Map Docs to Agent Guided with docs-focused prompt addendum.
6. Do not add Background/Worktree yet.

Suggested files:

```txt
apps/web/lib/agent/chat-modes.ts
apps/web/lib/agent/prompt-modules.ts
apps/web/components/chat/ChatInput.tsx
apps/web/stores/commandPaletteStore.ts
```

### Phase 3 — Add Mode Handoff resolver

Create:

```txt
apps/web/lib/agent/context/mode-handoff.ts
```

Include pure functions:

- `detectReferentialRequest()`
- `findLatestAssistantMessageByMode()`
- `resolveModeHandoff()`
- `formatModeHandoffForPrompt()`

Keep this independent of React and Convex for easy testing.

### Phase 4 — Wire resolver into prompt bundle

Update:

```txt
apps/web/hooks/useAgent-prompt-context.ts
apps/web/lib/agent/session-controller.ts
apps/web/lib/agent/prompt-library.ts
```

Flow:

1. `buildAgentPromptBundle()` receives mode selection/runtime mode, messages,
   and planning context.
2. It resolves `modeHandoff`.
3. `buildAgentPromptContext()` stores it on `PromptContext`.
4. `getPromptForMode()` injects the formatted handoff as system context.

### Phase 5 — Explicit runtime mode override

Update:

```txt
apps/web/hooks/useProjectMessageWorkflow.ts
apps/web/hooks/useAgent.ts
```

Ensure the requested target runtime mode is used immediately for runtime
construction instead of waiting for React state to re-render.

### Phase 6 — Index messages and plans

Update:

```txt
convex/contextChunks.ts
apps/web/hooks/useAgent.ts
apps/web/lib/agent/context/convex-adapter.ts
```

Add indexing for:

- `message` source type;
- `plan` source type.

Start conservative: index user/assistant text and generated plan artifacts, not
arbitrary attachments or large tool output.

### Phase 7 — Unresolved-handoff UX

Add a typed unresolved-handoff result and render it as an actionable in-chat
system message.

Example:

```txt
I found multiple possible plans. Which one should I use?
- Latest Plan response from 2 minutes ago
- Approved plan: Workspace Layout Refactor
- Start fresh from codebase search
```

### Phase 8 — Documentation and migration notes

Update:

```txt
docs/CHAT_MODE_ARCHITECTURE.md
docs/CHAT_TRANSCRIPT_POLICY.md
```

Add examples for:

- Ask → Plan → Agent Guided
- Ask → Plan → Agent Autopilot
- Plan → Agent Guided
- Plan → Agent Autopilot
- Debug secondary action
- Review secondary action
- Docs secondary action

## 8. Acceptance Criteria

The implementation is complete when:

1. The chat UI presents `Ask | Plan | Agent` as primary modes.
2. Agent mode exposes `Guided | Autopilot` autonomy.
3. Agent Guided maps to current internal `code` behavior.
4. Agent Autopilot maps to current internal `build` behavior.
5. Code and Build are no longer presented as peer primary modes in the main UX.
6. Debug, Review, and Docs exist as secondary actions/commands/templates.
7. Ask → Plan → Agent Guided preserves the latest relevant plan/audit context.
8. Ask → Plan → Agent Autopilot preserves the latest relevant plan/audit
   context.
9. “Save this plan as `.md`” causes Agent Guided/Autopilot to write the actual
   latest plan, not ask to rediscover it.
10. Approved structured plans remain the highest-priority handoff source.
11. Context handoff is injected as system/developer context, not as user
    transcript pollution.
12. Explicit mode override prevents stale-mode sends.
13. `contextChunks` can retrieve indexed plan/message chunks.
14. Regression tests cover Guided and Autopilot paths.
15. Existing focused tests continue to pass.

## 9. Risks and Mitigations

### Risk: UX migration confusion

Mitigation:

- Keep internal modes stable during first pass.
- Add tooltips explaining Guided and Autopilot.
- Optionally show legacy names in small helper text during migration: “Guided
  formerly Code,” “Autopilot formerly Build.”

### Risk: Token bloat from verbatim handoff content

Mitigation:

- Include full handoff content only when the user uses referential language.
- Otherwise use summary.
- Cap handoff content and prefer structured plan artifacts.

### Risk: Wrong referent selected

Mitigation:

- Use confidence levels.
- Ask clarification when multiple plausible plans/audits exist.
- Prefer approved structured artifacts over raw chat text.

### Risk: Privacy/sensitivity in message indexing

Mitigation:

- Start by indexing only user/assistant text, not attachments or tool output.
- Respect project ownership checks.
- Add source-type caps and omit sensitive content where detected.

### Risk: Over-coupling modes

Mitigation:

- Preserve mode permission boundaries.
- Handoff conveys task state, not tool permissions.
- Agent Guided/Autopilot still use their own rulesets and prompts.

## 10. Suggested File Changes

Likely new files:

```txt
apps/web/lib/agent/context/mode-handoff.ts
apps/web/lib/agent/context/mode-handoff.test.ts
```

Likely modified files:

```txt
apps/web/hooks/useAgent.ts
apps/web/hooks/useAgent-prompt-context.ts
apps/web/hooks/useProjectMessageWorkflow.ts
apps/web/lib/agent/chat-modes.ts
apps/web/lib/chat/chat-mode-surface.ts
apps/web/lib/agent/session-controller.ts
apps/web/lib/agent/prompt-library.ts
apps/web/lib/agent/prompt-modules.ts
apps/web/lib/agent/context/session-summary.ts
apps/web/stores/chatSessionStore.ts
apps/web/components/chat/ChatInput.tsx
apps/web/components/projects/ProjectChatPanel.tsx
convex/contextChunks.ts
docs/CHAT_MODE_ARCHITECTURE.md
docs/CHAT_TRANSCRIPT_POLICY.md
```

Likely expanded tests:

```txt
apps/web/hooks/useAgent-prompt-context.test.ts
apps/web/hooks/useProjectMessageWorkflow.test.ts
apps/web/lib/agent/context/session-summary.test.ts
apps/web/lib/agent/prompt-library.test.ts
apps/web/lib/agent/chat-modes.test.ts
apps/web/lib/chat/chat-mode-surface.test.ts
```

## 11. Implementation Order

Recommended order:

1. Add failing tests for mode mapping and cross-mode handoff.
2. Implement user-facing `Ask | Plan | Agent` contract and runtime mapping.
3. Add Agent autonomy selector: Guided/Autopilot.
4. Add secondary action metadata for Debug/Review/Docs.
5. Implement pure handoff resolver.
6. Add `modeHandoff` to `PromptContext` and prompt injection.
7. Wire resolver into `buildAgentPromptBundle()`.
8. Add explicit `modeOverride` to send path.
9. Add message/plan indexing.
10. Add unresolved-handoff UX.
11. Update docs.
12. Run focused tests.
13. Run full validation gate.

## 12. Non-goals

This plan does not attempt to:

- fully remove internal `code` and `build` runtime modes in the first pass;
- implement Background Agent / Worktree Agent immediately;
- add live preview/browser proofing;
- redesign the whole workspace layout;
- change provider streaming behavior;
- replace the planning-session system;
- solve all long-term memory concerns.

The immediate goal is to modernize Panda’s mode UX and make mode transitions
context-aware and durable enough for reliable Ask/Plan → Agent Guided/Autopilot
workflows.
