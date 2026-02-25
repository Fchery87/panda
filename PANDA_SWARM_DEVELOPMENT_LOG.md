# Panda Evolution: Implementation Log (Feb 24, 2026)

This document summarizes the major feature implementations, architectural
refactors, and critical bug fixes completed today to evolve Panda from a serial
assistant to a parallel orchestration system.

## 1. Feature: Panda Swarm (Parallel Orchestration)

The core objective was to allow Panda to spawn multiple specialized sub-agents
simultaneously to handle complex tasks in parallel.

### [NEW] Specialized Sub-Agents

Implemented two new high-impact sub-agent templates in
[agents.ts](file:///home/nochaserz/Documents/Coding%20Projects/panda/apps/web/lib/agent/harness/agents.ts):

- **Dedicated Debugger**: Specialized in analyzing stack traces, server logs,
  and runtime exceptions.
- **Tech Writer**: Focused on generating and updating JSDoc/Markdown
  documentation.

### [MODIFY] Parallel Execution Engine

Refactored the core agent runtime to support concurrent execution:

- **`runtime.ts`**: Updated `processSubtasks` to use `Promise.all`. Subtasks now
  execute in parallel in the background, with the UI yielding `subagent_start`
  events for the entire "swarm" simultaneously.
- **Subagent Event Correlation**: `subagent_start` / `subagent_complete` events
  now include stable subtask IDs so UI progress can correctly reconcile parallel
  subagent runs.
- **`task-tool.ts`**: Updated the `task` tool schema and instructions. The LLM
  is now explicitly instructed to output multiple `task` calls in a single turn
  to trigger parallel execution.

---

## 2. Feature: Panda Oracle (Semantic Intelligence)

Introduced the groundwork for deep codebase understanding to reduce context
window saturation through targeted semantic retrieval.

### [NEW] Multi-Tier Search Engine (`oracle.ts`)

Implemented a "Symbol Hunter" logic in
[oracle.ts](file:///home/nochaserz/Documents/Coding%20Projects/panda/apps/web/lib/agent/harness/oracle.ts)
that powers the `search_codebase` tool:

- **Hybrid Retrieval**: Combines exact literal matches with fuzzy regex-based
  symbol definition discovery.
- **Smart Symbol Regex**: Dynamically generates regex patterns to identify
  class, function, and interface definitions (with escaped user tokens and
  case-insensitive search handled by the search engine flags).
- **Deduplication Logic**: Merges matches from different search tiers and ranks
  them by relevance to minimize LLM noise.
- **Harness Wiring**: `search_codebase` is now wired into the active harness
  adapter runtime (not just the legacy tool executor path).

### [NEW] Visual Checkpoint Explorer (`Timeline.tsx`)

Implemented a first-class UI component in
[Timeline.tsx](file:///home/nochaserz/Documents/Coding%20Projects/panda/apps/web/components/workbench/Timeline.tsx)
to provide high-fidelity progress tracking:

- **Event Filtering**: Surfaces critical `snapshot`, `file_write`, and persisted
  run events (`progress_step`, `tool_call`, `tool_result`, `error`, and
  `snapshot`) while hiding noisy internal agent thinking.
- **Visual Milestones**: Uses the `GitCommit` icon to demarcate system
  snapshots, allowing users to visually verify where checkpoints were created.
- **Timeline Labeling**: Falls back to a generic "Run Timeline" label when no
  snapshots exist, avoiding overclaiming checkpoint support in runs without
  snapshot events.

---

## 3. Critical Fixes & Hardening

### Security: Shell Operator Restrictions

- Found that the backend executor in `route.ts` blocked shell operators (`|`,
  `&&`, `>`, etc.).
- Hardened the `run_command` tool definition in `tools.ts` and the `debugger`
  sub-agent prompt to strictly forbid these operators, preventing execution
  failures.

### Context Optimization: Plan Draft De-duplication

- Fixed a bug in `page.tsx` where the "Plan Draft" was being appended to every
  single user message in Build/Code mode.
- Implementation now checks `agent.messages` history to ensure the plan is only
  injected once per conversation, preventing context pollution and LLM
  hallucinations.

### Feature Flag: Harness Activation

- Identified that the new architecture was gated behind an environment variable.
- Enabled the system by adding `NEXT_PUBLIC_PANDA_AGENT_HARNESS=1` to the local
  environment.

### Tool Discovery

- Fixed a hallucination issue where the LLM believed it lacked sub-agent
  capabilities.
- Manually updated hardcoded tool lists in `prompt-library.ts` and `agents.ts`
  system prompts to include the `task` tool.

### Permission Enforcement Consistency (Post-Review Remediation)

- Closed a read-only mode escalation path where `ask` mode could delegate via
  `task` to subagents with stronger permissions.
- `ask` mode now denies `task` by default.
- Delegated subagents now run with a least-privilege permission intersection
  (`parent ∩ child`), preventing subagent templates from exceeding the parent
  agent's permission ceiling.

### Verification Snapshot (Post-Review Remediation)

- Targeted Swarm/Oracle/Timeline regression tests added and passing.
- Repo typecheck passes.
- Repo lint passes with zero warnings.
- Repo unit/integration test suite passes.
- Scoped Prettier checks for touched files pass after formatting fixes.
- Repo-wide `prettier --check .` hangs in this environment (timed run terminated
  after 30s without reporting file-level failures).
- E2E execution is environment-blocked in this sandbox (Playwright Chromium
  launch fails with `sandbox_host_linux.cc` / `Operation not permitted`).

---

## 4. Current System Status

| Component            | Status        | Note                                                                 |
| :------------------- | :------------ | :------------------------------------------------------------------- |
| **Swarm Runtime**    | ✅ ACTIVE     | Enforced via `.env.local`                                            |
| **Parallel Tasks**   | ✅ ENABLED    | Stable subagent IDs for parallel progress correlation                |
| **Visual Timeline**  | ✅ FUNCTIONAL | Persisted run-event timeline (checkpoint-aware when snapshots exist) |
| **Safety Guards**    | ✅ HARDENED   | Shell operators blocked                                              |
| **Permission Model** | ✅ HARDENED   | `ask` denies `task`; delegated subagents use least privilege         |
| **Context Logic**    | ✅ OPTIMIZED  | No more duplicate plan injections                                    |
