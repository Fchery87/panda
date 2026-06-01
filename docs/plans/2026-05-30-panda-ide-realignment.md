# Panda IDE Realignment Implementation Plan (Cursor-like, contract-reconciled)

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to
> implement this plan task-by-task.

**Goal:** Make Panda an editor-centric, Cursor-like single-user in-browser IDE —
a persistent editor+chat split, standard IDE vocabulary, and an on-demand
inspector rail — by **surgically amending the three contract areas that block
that feel** while preserving the security, Convex-governance, and
transcript-trace contracts that are already correct (and that Cursor itself
honors).

**Architecture:** Product identity = **(a) single-user, browser-first IDE that
leans into WebContainer, with the existing server-backed execution kept as
fallback** (canonical positioning is "browser-first with server fallback" — do
NOT remove the fallback). Convex stays the realtime state brain. No
remote-runner fabric, no multi-tenancy, and **no R2/KMS in this realignment
phase**; however, do not deepen dependence on Convex for cold payloads, and
preserve seams for future object-storage offload. The layout shifts from a
"focus-mode toggle" to a **mode-aware, always-visible editor+chat split**. After
the core realignment, the plan adds Cursor-inspired agent-platform capabilities
(Project Rules, user-configurable Hooks, Continual Learning, deep branch review,
Review Canvas) — each one **incorporated into an existing Panda subsystem, not
layered on top**.

## 🧩 Integration Principle (non-negotiable for Phases G–K)

The approved Cursor-inspired features must **extend existing Panda primitives**,
not introduce parallel systems. Every new phase below names the exact existing
file/table/contract it builds on. If an implementation would create a second
hook engine, a second memory store, a second review engine, or a second diff
surface, **stop and reroute through the existing one.** Specifically:

- Rules flow through the **existing prompt-composition path**
  (`prompt-library.ts`) and the canonical **Context** surface — not a new
  injector.
- Hooks register into the **existing `PluginManager`/`HookType`** infra
  (`harness/plugins.ts`, `types.ts`) under the **existing layered Harness
  Policy** — not a new hook runtime.
- Continual Learning reuses the **existing memory bank**
  (`api.memoryBank.update`, `tools.ts:1354`) + `sessionSummaries` + the
  `compaction.ts` summarizer — not a new memory store.
- Deep review composes **existing advisor reviews + subagents + workflow
  chains + GitHub** + Phase F isolation — not a new review engine.
- Review Canvas is an enhanced mode of the **existing Review Diff**
  (`DiffTab.tsx`) — not a new surface.

## 🎨 Design & Mode Constraints (from AGENTS.md + CHAT_MODE_ARCHITECTURE.md)

- **Cursor-like = IA/workflow, NOT visual restyle.** Keep the **brutalist design
  system** (`rounded-none`, `font-mono`, `shadow-sharp-*`, `surface-1/2`, Framer
  Motion) per AGENTS.md. Reconcile with the user's approved palette feedback
  (warm-white canvas + deep violet + lavender). Do **not** import Cursor's
  soft/rounded aesthetic.
- **Mode surface is `Ask · Plan · Agent(Guided/Autopilot)`**, not four peers.
  Runtime map: `Guided→code`, `Autopilot→build`. Layout/labels key off this
  surface.
- **Route through the `ModeContract` SSOT**
  (`apps/web/lib/agent/chat-modes.ts`): add a layout/emphasis hint to the
  per-mode record rather than scattering new mode conditionals. This is the
  integration path for Phase B (layout) and Phase G (rules via
  `systemPromptBuilder`).
- **Auto mode-switching exists** (deterministic routing) — the layout must
  follow the _resolved_ mode gracefully.
- **Subagents are delegated children of one parent run**
  (single-agent-per-chat). Never add subagents to the mode selector. Phases F/J
  operate within this model.
- **Validation:** for Convex-touching phases also run `npx convex dev --once`.
  **Execute this plan in a git worktree** (existing root `SPEC/PLAN/STATUS` are
  owned by an in-progress task).

**Tech Stack:** Next.js App Router · React 19 · Zustand · Convex · WebContainer
· react-resizable-panels · Tailwind · Bun (pkg mgr + app test runner) · Vitest +
convex-test + @edge-runtime/vm (Convex tests only).

## 🔎 Codebase Audit Updates (2026-05-30 review)

This plan was reviewed against the current Panda codebase before implementation.
Apply these corrections while executing it:

- **Mode surface is only partially wired.** `chat-modes.ts` defines
  `PrimaryModeSurface` and `resolveRuntimeMode`, but the live selector still
  routes through `getPrimaryChatModeSurfaceOptions()` → `getPrimaryChatModes()`
  → `['ask', 'plan', 'code']`. Add **Phase B0** before layout work so the
  visible selector truly becomes `Ask · Plan · Agent(Guided/Autopilot)`.
- **Layout still ignores runtime mode.** `ProjectWorkspaceLayoutView` receives
  `chatMode` but currently renames it `_chatMode` and uses `workspaceFocusMode`
  to hide/show chat vs workbench. Phase B must consume the resolved `chatMode`
  through `ModeContract.layout`.
- **Stale path corrections:** `SidebarRail` lives at
  `apps/web/components/sidebar/SidebarRail.tsx` (not `components/layout`), and
  `WorkspaceRuntimeProvider` lives at
  `apps/web/components/projects/WorkspaceRuntimeProvider.tsx` (not
  `components/workspace`).
- **Visible vocabulary and internal IDs are separate.** Rename visible labels
  now (`Proof`→`Run`, `Project Files`→`Explorer`, etc.), but persisted/internal
  IDs like `rightPanelTab: 'proof'` may remain stable unless a dedicated
  migration is included.
- **Subagent isolation is already partially implemented.** The repo already has
  `SubagentIsolationMode`, `maxConcurrentSubagents`,
  `maxConcurrentMutatingSubagents`, `patch-proposal`, serialization of mutating
  children, and `snapshots.ts`; Phase F should complete this system rather than
  restart it.
- **Convex usage guardrail:** Phases G–K must not add hot live queries over full
  rule/hook/event/file payloads. Use metadata projections, lazy bounded content
  reads, compact summaries, and owner-only/raw-evidence inspection paths.

---

## ⚠️ Authority & Process Rules (read before touching anything)

1. **The Architecture Contract is active authority.** Code may not diverge from
   it until the doc is amended. Therefore **Phase A (contract amendments) MUST
   land before the code phases that depend on it.**
2. **Validation gate is `bun run validate:web`** =
   `docs:commands:check && convex:collect:audit && typecheck && lint && format:check && test:web && build`.
   Run it after every task. `bun run convex:codegen:ci` runs automatically in
   `pretypecheck`/`prebuild`.
3. **Convex hard rules** (`convex/_generated/ai/guidelines.md` +
   `CONVEX_BACKEND_GOVERNANCE.md`): no new production `.collect()` (CI ceiling
   is `docs/convex-collect-audit.json`); use `.take()`/pagination; hot/cold
   split; declare ownership class + index for every new query. **Convex tests
   use Vitest + convex-test + @edge-runtime/vm, NOT `bun test`.**
4. **Do NOT edit root `SPEC.md` / `PLAN.md` / `STATUS.md`** — they belong to an
   in-progress task (workflow orchestration, Milestone 9). This plan lives in
   `docs/plans/`.
5. **Pre-reads before UI work:** `AGENTS.md` (design system),
   `docs/CHAT_MODE_ARCHITECTURE.md` (the ask/plan/code/build mode system that
   the mode-aware layout depends on), `docs/WORKBENCH.md`,
   `docs/CHAT_TRANSCRIPT_POLICY.md`.

## Contracts we KEEP (do NOT challenge — already correct, Cursor honors equivalents)

- `SECURITY_TRUST_BOUNDARIES.md` — auth at backend boundary, redaction, token
  masking, sharing projections. **Unchanged.**
- `CONVEX_BACKEND_GOVERNANCE.md` — ownership classes, no `.collect()`, hot/cold,
  pagination, retention. **Unchanged.**
- `CHAT_TRANSCRIPT_POLICY.md` **core rule** — full raw trace stays in the
  inspector; only compact tool chips + plan checklist render inline (already
  shipped in `TranscriptEventRow.tsx`). **Unchanged.** (Only its _vocabulary_ is
  touched in Phase A.)

## Already shipped — explicitly OUT of scope (do not rebuild)

- Inline tool chips + plan checklist (`TranscriptEventRow.tsx`).
- Operational-data retention (6-hourly worker +
  `api.admin.cleanupOperationalDataNow`).
- Provider-token masking policy (verify compliance only).

---

# PHASE A — Contract Amendments (docs first; unblocks the code)

**Goal:** Amend exactly three areas so the editor-centric design becomes the
sanctioned architecture. Docs-only; no runtime change. Gate each with
`bun run docs:commands:check` + `format:check`.

### Task A1: Amend the layout paradigm in the Architecture Contract & Workbench doc

**Files:** `docs/ARCHITECTURE_CONTRACT.md`, `docs/WORKBENCH.md`,
`docs/revise/05_PHASE_5_LAYOUT_FOCUS_MODES.md` (add a "superseded-by" follow-up
note). **Change:** Replace "focus modes are the primary workspace navigation"
with: _"Code mode presents a persistent editor+chat split as the default layout.
Focus/maximize is an optional affordance, not the primary navigation."_ Encode
the mode-aware mapping as canonical:

```
ask → chat dominant   plan → plan/context dominant
code → editor+chat split (default)   build → workbench dominant
```

Keep the Surface Ownership table (Chat = intent + compact summaries;
Proof/Changes/Context = inspector). Mark the change "supersedes Phase 5
focus-mode-primary direction; see plan 2026-05-30."

### Task A2: Amend the canonical vocabulary

**Files:** `docs/ARCHITECTURE_CONTRACT.md` (Runtime Terms + Source-of-Truth
map), `docs/CHAT_TRANSCRIPT_POLICY.md`, `docs/WORKBENCH.md`, `docs/DESIGN.md`
current-UI sections, `docs/README.md` current-UI sections,
`docs/development-commands.json`. **Decision — final term map:**

- `Proof` → **`Run`** (run evidence/trace/recovery).
- `Work Surface` → **`Editor`**.
- `Find Context` → **`Search`**, `Source Review` → **`Source Control`**,
  `Agent Runs` → **`Runs`**, `Project Files` → **`Explorer`**.
- Keep `Changes` and `Context` (already standard enough). Update active/current
  product docs so the contract is internally consistent; historical plans may
  retain old terms if clearly historical. This legalizes the Phase C visible
  code rename.

### Task A3: Amend rail-default policy

**Files:** `docs/WORKBENCH.md`. **Change:** State that the right inspector rail
(`Run`/`Changes`/`Context`) is **on-demand and collapsed by default in code
mode**, opened by explicit user action or by an event that needs review (e.g.
pending changes). Content ownership rules are unchanged.

**Phase A acceptance:** `bun run docs:commands:check && bun run format:check`
green; contracts read consistently with an editor-centric, Cursor-like layout
and the new vocabulary; no code changed yet.

---

# PHASE B — Mode Selector + Mode-Aware Editor+Chat Split (the core Cursor feel)

**Goal:** First make the live selector match the product contract
(`Ask · Plan · Agent(Guided/Autopilot)`), then make editor and chat **both
visible** in Agent · Guided (`code`). Layout defaults follow the resolved
runtime mode through the `ModeContract` SSOT. This replaces
`workspaceFocusMode === 'chat' ? chatPanel : workbench`
(`ProjectWorkspaceLayout.tsx`) with a mode-aware split. Layout emphasis is read
from a hint on the per-mode `chat-modes.ts` record (do not scatter new mode
conditionals). The layout must follow auto mode-switches.

### Task B0: Wire the modern primary mode surface into the live selector

**Why first:** The repo already defines `PrimaryModeSurface`, `ModeSelection`,
`resolveRuntimeMode`, and `getPrimaryModeSurfaces()`, but the live selector
still uses `getPrimaryChatModeSurfaceOptions()` over `getPrimaryChatModes()`
(`['ask', 'plan', 'code']`). That makes Guided appear as a primary mode and
duplicates it under Agent autonomy.

**Files:**

- Modify: `apps/web/components/chat/AgentSelector.tsx`
- Modify: `apps/web/lib/chat/chat-mode-surface.ts`
- Modify: `apps/web/lib/agent/chat-modes.ts` only if small API additions are
  needed
- Tests: `apps/web/components/chat/AgentSelector.test.ts`,
  `apps/web/lib/agent/chat-modes.test.ts`

**Change:**

- Render primary modes from `getPrimaryModeSurfaces()` as `Ask`, `Plan`,
  `Agent`.
- Render Agent autonomy from `getAgentAutonomyOptions()` as `Guided` → `code`,
  `Autopilot` → `build`.
- Use `resolveRuntimeMode()` / `modeSelectionFromRuntimeMode()` for conversion,
  while keeping persisted runtime `ChatMode` values for compatibility.
- Keep secondary actions (`Debug`, `Review`, `Docs`) as task templates/addenda,
  not top-level modes.

**Gate + commit:** targeted selector tests, then `bun run validate:web` →
`feat(chat): wire ask-plan-agent mode selector surface`.

### Task B1: Add mode layout hints to `ModeContract` and consume `chatMode` in workspace layout

**Files:**

- Modify: `apps/web/lib/agent/chat-modes.ts` (add `layout`/`emphasis` metadata
  per runtime mode)
- Modify: `apps/web/components/projects/ProjectWorkspaceLayout.tsx` (desktop
  branch; stop renaming `chatMode` to `_chatMode`)
- Modify: `apps/web/stores/workspaceUiStore.ts` (add chat-dock state; keep
  `workspaceFocusMode` — it is load-bearing for `WORKBENCH.md` File Opening
  Rules — but repurpose it to drive emphasis/maximize/default sizing, not panel
  hiding)
- Tests: `apps/web/components/projects/project-workspace-layout.test.tsx`,
  `apps/web/components/projects/project-chat-wiring.test.ts`, and the
  source-based contract tests listed in `WORKBENCH.md` Validation Checklist.

**Layout mapping (canonical):**

```ts
ask   → chat dominant
plan  → plan/context dominant
code  → editor + chat split (Guided default)
build → workbench dominant with chat available (Autopilot)
```

**Step 1 (failing test):** assert editor region AND chat dock render
simultaneously in `code` mode (testids `workspace-editor-region`,
`workspace-chat-dock`). **Step 2:** run, verify fail
(`cd apps/web && bun test components/projects/project-workspace-layout.test.tsx -t simultaneously`).
**Step 3:** Add `isChatDockOpen`/`chatDockSide` to `workspaceUiStore` (bump
persist `version`; migrate persisted `workspaceFocusMode:'chat'` to a safe
workbench/chat-dock-open state). Restructure the desktop center into a
mode-aware horizontal `PanelGroup`: **editor/workbench region | chat dock |
on-demand inspector**. Map mode → default sizes from
`CHAT_MODE_CONFIGS[chatMode].layout`. **Do not delete `workspaceFocusMode`** —
File Opening Rules (`useProjectWorkbenchFiles`, `usePlanArtifactSync`) still set
focus to `workbench`; it now adjusts emphasis, not visibility. **Step 4:**
update old tests that currently preserve hidden-chat behavior. In particular,
replace assertions in `project-chat-wiring.test.ts` that require
`workspaceFocusMode === 'chat' ? chatPanel : workbench`. **Step 5:** run, verify
pass; update the `WORKBENCH.md`-listed contract tests to the new structure
(replace assertions, don't delete them). **Step 6:** `bun run validate:web` →
commit
`feat(workspace): mode-aware editor+chat split as the default code-mode layout`.

### Task B2: Consolidate the redundant "Sessions" nav

`Sessions` appears in both the focus strip and
`apps/web/components/sidebar/SidebarRail.tsx`. Keep it in the rail; reduce the
horizontal strip to a small, unobtrusive focus/maximize/emphasis switcher (per
amended A1), not a competing primary nav. Test + gate + commit.

**Phase B acceptance:** The live selector shows `Ask · Plan · Agent` with
Guided/Autopilot under Agent; opening a code-mode project shows editor and chat
side-by-side, resizable; inspector collapsed by default; mode switches adjust
emphasis through `ModeContract.layout`; `bun run validate:web` green.

---

# PHASE C — Vocabulary Rename (code), authorized by Phase A2

**Only after A2 is merged.** Rename visible code labels + tests + any
`development-commands.json` strings. Keep persisted/internal IDs stable unless
this phase explicitly includes a migration.

**Final visible term map:**

- `Proof` → **`Run`** (run evidence/trace/recovery)
- `Work Surface` → **`Editor`**
- `Find Context` → **`Search`**
- `Source Review` → **`Source Control`**
- `Agent Runs` → **`Runs`**
- `Project Files` → **`Explorer`**

**Files to grep/update:**

- `apps/web/components/workbench/Workbench.tsx` (`CENTER_TABS`)
- `apps/web/components/sidebar/SidebarRail.tsx` (`NAV_ITEMS`)
- `apps/web/components/sidebar/SidebarFlyout.tsx`
- `apps/web/components/workbench/WorkbenchRightPanel.tsx` (visible `Proof` label
  → `Run`; internal `proof` tab ID may remain)
- `apps/web/components/projects/ProjectWorkspaceLayout.tsx` (focus/mobile
  labels)
- `apps/web/components/workbench/WorkspaceHome.tsx`, `DiffTab.tsx`,
  `execution-session-inspector-view-model.ts`, `TranscriptEventRow.tsx` where
  labels are user-visible
- Marketing/product surfaces if they describe current UI:
  `apps/web/app/page.tsx`, `apps/web/app/education/page.tsx`,
  `apps/web/lib/product/capabilities.ts`
- Tests asserting old labels (grep first):
  `grep -rn "Work Surface\|Proof\|Find Context\|Source Review\|Agent Runs\|Project Files" apps/web --include='*.test.*'`

**Rule:** update active/current docs and user-visible UI. Historical plans may
retain old terminology if marked historical; do not churn every archived plan
unless it is currently linked as product authority.

Gate (`docs:commands:check` will catch command-string drift) + commit.

---

# PHASE D — Demote inspector rail to on-demand (authorized by A3)

The store already defaults `isRightPanelOpen: false`, so this phase is about
**mode-aware and event-aware rail policy**, not simply flipping a default. In
code mode the inspector (`Run`/`Changes`/`Context`) is collapsed by default and
opens only by explicit user action or review-needed events.

**Required policy:**

- User toggle opens/closes the inspector and is respected.
- Pending generated changes may open `Changes` when review is required.
- Run failures, blocked permissions, recovery/checkpoint events, or validation
  failures may open `Run`.
- Plan-review actions may open `Context`.
- Ask/Plan/Code/Build sizing/emphasis still comes from `ModeContract.layout`.

**Keep all content** (`Run`/`Changes`/`Context`) and surface-ownership rules.
Move genuinely-sensitive bits (raw reasoning, eval bodies, planningDebug) to
lazy/owner-only per `SECURITY_TRUST_BOUNDARIES.md` (verify they already comply).
Test + gate + commit.

---

# PHASE E — Decompose god-objects (EXTEND existing program, don't duplicate)

**This work is already planned** in `docs/PANDA_CLEANUP_REFACTOR_PROGRAM.md` §F
("workspace god-object into focused ownership zones") + Phase 7 (`useAgent`
decomposition). **Execute its unchecked items**, do not write a competing
design.

- Split `apps/web/components/projects/WorkspaceRuntimeProvider.tsx` (1120 L,
  ~300 ctx values) into feature-scoped stores/hooks (file workspace, chat
  runtime, run telemetry, plan lifecycle, execution session) — **one seam per
  commit**.
- Split `apps/web/components/projects/ProjectChatInspector.tsx` (1341 L) into
  `components/chat/inspector/*` per exported component. Each seam: move → update
  consumers → delete from mega-context → `bun run validate:web` → commit. Update
  `PANDA_CLEANUP_REFACTOR_PROGRAM.md` checkboxes as you go.

**Implementation status:** Phase E realignment seams are complete when
`ProjectChatInspector.tsx` is reduced to an inspector shell, exported inspector
content lives under `apps/web/components/chat/inspector/*`, and
`WorkspaceRuntimeProvider.tsx` delegates shell UI state, runtime file mounting,
local import, shell hotkeys, execution-session focus actions, layout prop
assembly, and `WorkspaceRuntimeContext` value assembly to focused hooks. The
larger future split of `WorkspaceRuntimeContext` and the `useAgent` Phase 7
runtime decomposition remain tracked in `PANDA_CLEANUP_REFACTOR_PROGRAM.md` as
post-realignment cleanup unless explicitly pulled forward.

---

# PHASE F — WebContainer-local parallel sessions + worktrees (COMPLETE existing isolation system)

**The design already exists** in
`docs/plans/2026-05-23-panda-subagents-v2-architecture.md` §12 (isolation modes
`shared-readonly | snapshot | worktree | patch-proposal`) and its **Phase 3
"Concurrency and Mutation Safety"** has **unchecked `[ ]`** items. The current
repo already has partial implementation: `SubagentIsolationMode`,
`maxConcurrentSubagents`, `maxConcurrentMutatingSubagents`, `patch-proposal`,
mutating-subagent serialization, `apps/web/lib/agent/harness/snapshots.ts`, and
`apps/web/lib/webcontainer/fs-sync.ts`. This phase completes those seams; do not
restart from scratch. Preserve single-parent-agent-per-chat: subagents are
delegated children, not peer modes.

**Tasks:**

- Add/complete `apps/web/lib/agent/harness/isolation.ts` as the strategy
  boundary for `shared-readonly | snapshot | worktree | patch-proposal`.
- Complete real **WebContainer `snapshot` isolation** using
  `apps/web/lib/webcontainer/fs-sync.ts`; children must mutate isolated state
  and merge/patch back only after success/review.
- Keep `patch-proposal` for mutating children when true workspace isolation is
  unavailable.
- Raise `maxConcurrentMutatingSubagents` above `1` only when selected isolation
  is not `shared-readonly` and tests prove concurrent mutation safety.
- Remove or narrow the serialization fallback only after snapshot/worktree
  isolation passes.
- Surface concurrent/historical sessions by extending the existing run-tree UI
  (`apps/web/components/sidebar/session-rail.ts`, `ActiveAgentsPane`,
  `SubagentPanel`) into a multi-session view.

**TDD:** extend existing tests (`runtime-concurrency-config.test.ts`,
`subagent-isolation.test.ts`, `subagent-patch-proposal.test.ts`) and add
`subagent-mutation-guard.test.ts`. Gate + commit per item; check the boxes in
the subagents-v2 doc.

---

# PHASE G — Project Rules (extend prompt-composition + Context, do NOT build a new injector)

**Goal:** User-authored, checked-in, glob-scoped rules that auto-attach to the
system prompt when relevant — Panda's analog of `.cursor/rules/*.mdc`,
integrated into the same path that already injects the memory bank and prompt
RULES.

**Integration targets (existing):** `apps/web/lib/agent/prompt-library.ts`
(composes `memoryBank` + RULES into the system prompt);
`apps/web/stores/editorContextStore.ts` (active file/selection is the glob-match
anchor, but resolve matches upstream and pass bounded rules into `PromptContext`
rather than importing the store directly into prompt-library); the
**files/fileMetadata** model (rules live as workspace files; metadata hot,
content lazy); the canonical **Context** inspector surface.

**Boundary vs Custom Skills (document, don't duplicate):** Rules = always-on /
path-scoped _constraints_; Skills = explicitly invoked _workflows_. Do not
reimplement one as the other.

**Tasks:**

- **G0 (docs-first):** Amend `ARCHITECTURE_CONTRACT.md` Source-of-Truth map +
  `WORKBENCH.md` so **Context owns plan/memory/evals/specs/`rules`**. Gate
  `docs:commands:check`.
- **G1:** Define rule source = `.panda/rules/*.md` with frontmatter
  `{ description, globs?, alwaysApply? }`, read through the existing workbench
  file path (`fileMetadata`/tree hot, content lazy per Convex governance). TDD a
  parser. Enforce max rule size, max matched rules, and invalid-frontmatter
  diagnostics.
- **G2:** Resolve matching rules upstream from prompt composition (alwaysApply +
  glob-match against active file/selection), then pass bounded rule
  summaries/content into `PromptContext`. In `prompt-library.ts`, render them
  into the **same** system-prompt composition path as memory bank/skills —
  bounded/summarized, redaction-respecting. TDD prompt composition.
- **G3:** Surface rules read-only in the **Context** inspector + a
  settings/editor flow reusing `customSkills` editor patterns. Gate
  (`bun run validate:web`) + commit per task.

# PHASE H — User-Configurable Agent-Loop Hooks (expose the EXISTING HookType infra)

**Goal:** Let the project owner observe/block/modify the agent loop, mapped onto
Panda's existing internal hook stages — not a second hook engine, and
browser-safe (no arbitrary host shell).

**Integration targets (existing):** `apps/web/lib/agent/harness/plugins.ts`
(`PluginManager`, `executeHooks`, priority/order), `harness/types.ts`
(`HookType`: `tool.execute.before/after`, `permission.ask`,
`validation.post-write`, `session.start/end`, `llm.request/response`,
`compaction.before/after`); the **layered Harness Policy** (admin ceiling → user
→ session, per `SECURITY_TRUST_BOUNDARIES.md`); the command-family classifier;
`permissionAuditLog`.

**Safety model (identity (a)):** User hooks are **declarative match→action**
rules (match tool name / command-family / path glob →
`allow | deny | ask | transform`) plus an optional **WebContainer** command
(never host shell). Blocking reuses the same path as advisor enforcement /
`permission.ask`. Decisions write to `permissionAuditLog`. Hooks compose
**under** the admin ceiling (a user hook may only make policy stricter, never
looser).

**Tasks:**

- **H0 (docs-first):** Amend `SECURITY_TRUST_BOUNDARIES.md` "Harness Policy And
  Command Governance" to document user hooks, the declarative action set, the
  browser-only execution boundary, and audit requirements. Gate
  `docs:commands:check`.
- **H0.5 (runtime audit before UI):** Audit which `HookType` stages are actually
  emitted by the runtime (`tool.execute.before/after`,
  `permission.ask/decision`, `validation.post-write`, `session.start/end`,
  `llm.request/response`, `compaction.before/after`). Add missing
  emissions/tests before exposing user config.
- **H1:** Hook config source = `.panda/hooks.json` (checked-in, shareable)
  resolved against owner-scoped settings; validate against the admin ceiling on
  read. TDD the loader + ceiling enforcement.
- **H2:** Register user-hook handlers **into the existing `PluginManager`** for
  the mapped `HookType` stages; reuse `executeHooks` ordering. TDD that a
  `deny`/`ask` user hook blocks `tool.execute.before` exactly like advisor
  enforcement. Convex tests via Vitest/convex-test.
- **H3:** Settings UI to author/test hooks (reuse MCP/subagents settings
  patterns); show effective admin ceiling, browser/WebContainer-only command
  boundary, execution timeout/output caps, and audit-log destination. Gate +
  commit per task.

# PHASE I — Continual Learning (extend the memory bank, reuse the summarizer)

**Goal:** Opt-in post-session distillation that proposes high-signal memory
bullets — using the existing memory bank and summarizer, with user approval and
full redaction compliance.

**Integration targets (existing):** `api.memoryBank.update` (`tools.ts:1354`) +
prompt injection (`prompt-library.ts:313`); `sessionSummaries` table;
`compaction.ts` `SUMMARIZATION_PROMPT` / summarizer path; `MemoryBankEditor`;
the **Context** inspector.

**Tasks:**

- **I1:** After a run completes, run a bounded distillation (reuse the existing
  summarizer LLM path) to propose 0–N high-signal bullets. Read bounded
  summaries/receipts first, not full raw event streams by default. Enforce max
  events, max bytes/tokens, max proposed bullets, `CHAT_TRANSCRIPT_POLICY`
  redaction + "do not fabricate"; never write raw reasoning/secrets. TDD the
  distiller with redaction cases.
- **I2:** Surface proposals as **approve-to-commit** edits in
  `MemoryBankEditor`; on approval write through the existing
  `api.memoryBank.update` (bounded, no unbounded growth; enforce max memory-bank
  size). TDD approval→persist. Gate + commit.

# PHASE J — Deep Branch/PR Review (compose advisor + subagents + workflow chains + GitHub)

**Goal:** A rubric-based, multi-subagent branch/PR audit with optional
merge-ready PR flow — built from existing primitives + Phase F isolation, not a
new review engine. **Expose it as a "Review" task template (a secondary action),
NOT a new primary mode** — consistent with `CHAT_MODE_ARCHITECTURE.md`
(Debug/Review/Docs are task templates that attach a workflow addendum to an
Agent run).

**Integration targets (existing):** `advisorReviews` / `advisorReviewRequests`
(+ `AdvisorReviewsPanel`); the subagent task-tool + Phase F snapshot isolation
(parallel mutating-safe); `workflowChains` (orchestration record);
`githubPullRequests` / `githubCommits`; the **Run/Changes** inspector.

**Tasks:**

- **J1:** Define review as a `workflowChains` template that fans out rubric
  subagents (security / correctness / quality) in **parallel via Phase F
  isolation**, each emitting compact `advisorReviews`. TDD the chain template +
  aggregation.
- **J2:** Aggregate findings into the existing advisor surface + Changes
  inspector; optional merge-ready PR via the existing GitHub integration.
  Persist compact summaries separately from raw child evidence; do not subscribe
  the UI to full child `agentRunEvents` for background review lanes. Gate +
  commit. (Prereq: Phase F.)

# PHASE K — Review Canvas (enhanced mode of the EXISTING Review Diff)

**Goal:** Group changes by importance, separate boilerplate from core logic, add
TOC navigation — as a mode of the canonical Review Diff, not a new surface.

**Integration targets (existing):** `apps/web/components/workbench/DiffTab.tsx`,
`artifact-preview.ts`, the **Changes** inspector, FileTree change badges.
`WORKBENCH.md`: "Review Diff is the primary generated-change review surface" —
extend it, don't replace it.

**Tasks:**

- **K1:** Add a grouping/importance classifier over the existing pending-diff
  entries (heuristics: file role, churn size, generated-vs-core). Operate on
  existing pending-diff metadata first and lazily inspect full content only when
  needed. TDD classification.
- **K2:** Render a "canvas" view mode in `DiffTab` (grouped sections + TOC +
  jump-to-file via the existing `onOpenFile` path); keep per-hunk accept/reject
  wiring. Gate + commit.

**Phases G–K acceptance:** each new capability is reachable through its existing
host surface (Context / Harness Policy / memory bank / advisor reviews / Review
Diff), passes `bun run validate:web`, adds zero new `.collect()`, and introduces
no parallel subsystem.

---

## Recommended Implementation Order

1. **A1/A2/A3** — contract cleanup and rail/default vocabulary authority.
2. **B0** — wire the live selector to `Ask · Plan · Agent(Guided/Autopilot)`.
3. **B1** — add `ModeContract.layout` and ship editor+chat split.
4. **B2** — remove redundant Sessions focus-strip nav.
5. **C** — visible vocabulary rename, with stable internal IDs unless explicitly
   migrated.
6. **D** — mode-aware/event-aware inspector rail policy.
7. **E** — god-object decomposition seams.
8. **F** — complete WebContainer subagent isolation and safe concurrent
   sessions.
9. **G** — Project Rules.
10. **H** — user-configurable hooks.
11. **I** — continual learning.
12. **J** — deep branch/PR review.
13. **K** — Review Canvas.

## Cross-Cutting Convex Payload Guardrails

For every phase, and especially G–K:

- No hot/live query should return full rule, hook, event, file, checkpoint, or
  child-run payloads.
- List views use metadata projections (`fileMetadata`, compact run/advisor
  summaries, status rows) and lazy content reads.
- Content reads must be explicit, owner-authorized, bounded, and preferably tied
  to an inspect/open action.
- Child/subagent fanout must persist compact summaries separately from raw
  evidence.
- UI panels should not subscribe to full `agentRunEvents` for background
  subagents or deep review lanes.
- Rule/hook/memory/review prompt injection must enforce max count, max
  bytes/tokens, redaction, and summarization where needed.
- Maintain the no-new-production-`.collect()` ceiling and update
  `docs/convex-collect-audit.json` only through the existing audit process.

## Cross-Cutting Reminders

- Amend docs (Phase A, and the G0/H0 doc steps) before the code that depends on
  them — contract is active authority.
- **Integration over layering:** every Phase G–K item extends a named existing
  primitive; reject parallel systems in review.
- `bun run validate:web` is the gate; Convex tests use Vitest/convex-test;
  **zero new `.collect()`**.
- Don't reintroduce prop-builder hooks or page-owned workspace state.
- Don't touch root `SPEC.md`/`PLAN.md`/`STATUS.md`.
- Keep the server-backed execution fallback intact (browser-first ≠
  browser-only).
- One task = one green commit.
