# Panda Product System And Page Design Brief

> Reader: a product designer, design tool, or design agent creating a complete
> Panda project layout and visual system from product context.
>
> Post-read action: generate a full Panda app map, screen set, navigation model,
> layout system, and design direction without inspecting the source repository.

## What Panda Is

Panda is a browser-first AI coding workbench with server-backed fallback. It is
not a generic chatbot, project-management dashboard, or conventional IDE clone.
It is an operational workspace for serious code work where a user can keep one
active project, one active work thread, the relevant code context, the agent's
plan, the execution proof, and the changed work visible in one browser session.

The product promise is simple: keep the work in one place. A user can open a
project, inspect files, ask Panda questions, generate a plan, approve that plan,
execute the work with oversight, inspect the resulting files and diffs, recover
paused runs, and share the active thread.

Panda is designed for technically fluent users who want AI help but still want
control. The interface should feel calm, precise, and operational rather than
magical or theatrical. The core emotional tone is high-trust technical focus.

## Core Product Principles

1. Browser-first execution with server fallback: project work prefers an
   in-browser runtime when available, but command execution remains usable when
   browser isolation or WebContainer boot fails.
2. Chat-first direction: the chat thread is where the user states intent and
   guides the agent.
3. Session-first workspace: the current execution session is the organizing unit
   for objective, state, proof, changed work, and next action.
4. Review before execution: structured plans and risky actions require explicit
   review or approval.
5. Persistent project memory: chats, files, plans, runs, settings, specs,
   receipts, and checkpoints persist through Convex.
6. Provider-agnostic AI: Panda supports multiple LLM providers and model
   catalogs instead of being tied to one vendor.
7. Bounded transparency: the UI shows useful summaries by default and opens
   deeper proof, run events, receipts, and changed work on demand.
8. Durable recovery: runs can save checkpoints so interrupted execution can be
   resumed.
9. Public sharing is a redacted projection: shared chat pages are read-only
   views, not owner workspaces.

## Target Users

1. Solo builders who want to plan, code, test, and review inside a browser
   workspace.
2. Small teams who want shared AI coding threads with visible plans and
   reviewable output.
3. Open-source contributors who want browser-native project work without local
   setup.
4. Power users who manage multiple chats, runs, subagents, custom skills, and
   provider configurations.
5. Admins who need platform controls, analytics, user management, audit history,
   and security settings.

## Visual System Direction

Panda uses a strict brutalist technical aesthetic.

Design attributes:

1. Sharp corners, no soft rounded cards.
2. Monospace labels, controls, badges, metadata, and navigation markers.
3. Thin borders, hard panel divisions, and precise grid alignment.
4. Directional sharp shadows for elevated public marketing surfaces.
5. Dot-grid backgrounds on public and workspace home surfaces.
6. Calm neutral surfaces with a restrained primary accent.
7. Dense but legible operational UI, closer to an instrument panel than a social
   feed.
8. Clear status chips for plan, run, approval, runtime, provider, and
   changed-work states.
9. Motion is functional: reveal panels, signal streaming, and clarify
   transitions without spectacle.

The design should avoid generic AI gradients, soft glassmorphism, cute assistant
mascots, and dashboard chrome that makes the app feel bureaucratic. Panda should
feel like a premium technical workbench: austere, confident, and recoverable.

## Core Workflow

1. Orient: the user opens a project, scans the file tree or project search, and
   selects relevant files.
2. Direct: the user uses chat to ask, plan, code, or build with selected model
   and context.
3. Plan: Panda generates a reviewable implementation plan with acceptance checks
   and relevant context.
4. Approve: the user accepts the plan or edits/reviews it before execution.
5. Execute: Panda runs through the approved work, writes files, runs commands,
   and records progress.
6. Inspect: the user reviews changed work, diffs, artifacts, terminal output,
   run proof, and preview.
7. Recover or continue: the user resumes from checkpoint, starts a new chat,
   shares the thread, or continues the session.

## Canonical Modes

Panda has exactly four user-facing modes.

| Mode  | Meaning               | Tool posture                                     | Primary use                    |
| ----- | --------------------- | ------------------------------------------------ | ------------------------------ |
| Ask   | Read-only Q&A         | No writes or command execution                   | Explain, inspect, answer       |
| Plan  | Planning and review   | Read-only by default                             | Clarify, scope, produce a plan |
| Code  | Direct implementation | Write and command capable                        | Focused code changes           |
| Build | Full execution        | Strongest write, command, and proof expectations | Execute larger approved work   |

Design implication: the mode selector is not decorative. It changes trust level,
permissions, status copy, and user expectations. The UI should make the active
mode visible near the composer and in session/run proof surfaces.

## Primary Information Architecture

Panda is organized into these product regions:

1. Public site: landing, education, login, shared chat, error states,
   maintenance.
2. Authenticated dashboard: project list and settings.
3. Project workbench: the main coding surface for one project.
4. Admin console: user management, analytics, system controls, security audit.
5. API/backend surfaces: LLM provider testing, model catalog,
   git/search/jobs/LSP endpoints, Convex persistence.

## Page Inventory

### Landing Page

Purpose: introduce Panda as a browser-native AI coding workbench and route users
to the workbench or education guide.

Primary content:

1. Public navigation with brand and education link.
2. Hero headline: plan, review, and execute in the browser.
3. Value signals: saved plans, recoverable runs, shared memory.
4. Terminal-style product mockup showing plan, build, and review states.
5. Feature grid covering review before execution, operational workspace,
   recoverable runs, approvals, memory, and sharing.
6. Workflow section: orient, plan, execute, inspect.
7. Audience section: solo developers, small teams, contributors, power users.
8. Footer.

Design notes: this page should sell operational clarity. Use a large typographic
hero, austere technical mockup, dot-grid background, and restrained accent
color.

### Education Page

Purpose: explain how Panda works and teach the mental model before a user enters
the workbench.

Primary content:

1. Hero explaining one workbench, one active thread, clear review points.
2. Mental model card: Explorer selects context, Workspace holds active work,
   Chat directs the agent, Operational Rail reviews state.
3. Three promises: transparent, reviewable, recoverable.
4. Interface map: Explorer, Workspace, Chat Panel, Operational Rail.
5. Detail cards for file tree, project search, editor, timeline, terminal,
   message list, composer, plan review, permission requests, sharing, run tab,
   context tab, changes tab, preview tab.
6. Workflow guide from context selection to sharing and verification.
7. FAQ for installation, interrupted runs, code review, memory, providers,
   sharing.

Design notes: this should be more diagrammatic than marketing-heavy. It is the
best source for a product tour layout.

### Login Page

Purpose: authenticate users and explain why sign-in is needed.

Primary content:

1. Centered Panda logo.
2. Sign-in headline and access-state message.
3. Auth provider button.
4. Error card for failed sign-in.
5. Short explanation that sign-in unlocks projects, plan review, and agent
   build.
6. Links back to Home and Education.

States:

1. Auth loading.
2. Authenticated redirect.
3. Unauthenticated sign-in.
4. Registration disabled or maintenance messaging.
5. Auth error.

### Maintenance Page

Purpose: block normal app usage when system maintenance is enabled.

Design notes: should be a sparse status page with operational copy, brand mark,
and a clear return/check-again path.

### Not Found And Error Pages

Purpose: provide graceful fallback for invalid routes or runtime exceptions.

Design notes: keep these technical and calm. Avoid playful empty states. Include
plain next actions such as return home, return to projects, or retry.

### Projects Page

Purpose: authenticated hub for creating, searching, opening, and deleting code
projects.

Primary content:

1. Dashboard header with app-level navigation.
2. Project search input.
3. New Project dialog.
4. Project list rows/cards with name, optional description, created date, and
   last-opened recency.
5. Delete confirmation flow.
6. Empty/loading/error states.

Design notes: this is a utilitarian project switcher. It should support quick
selection and project creation without becoming a dashboard. The key action is
opening the next project.

### Project Workbench Page

Purpose: the main Panda product surface. One project is loaded into a
full-screen workspace with file context, chat, agent execution, review,
terminal, and status surfaces.

Top bar:

1. Brand icon and project name.
2. File breadcrumb when a file is selected.
3. Command palette entry.
4. Branch/repository status, selected model, runtime/dev server state, agent
   status, right-panel toggle.
5. Theme toggle, user menu, more actions, share action, clear local workspace.
6. Optional focus strip showing current objective, status label, and
   primary/secondary next actions.

Left rail and flyout:

1. Files: file tree with create, rename, delete, open, and outline support.
2. Search: project-wide search panel.
3. Git/source control: repository status and changed files.
4. Agents: active/background agent sessions.
5. Tasks/history: chat/session history and run status.
6. Deploy: placeholder for deploy and preview settings.

Center workspace:

1. Session tab: workspace home, file editor, or plan artifact.
2. Diff tab: changed-work review.
3. File tabs for open files and dirty state.
4. Editor with CodeMirror, syntax support, selection context, save handling,
   inline chat, and contextual chat.
5. Plan artifact tab with generated plan summary, acceptance checks, approve
   action, and Build from Plan action.
6. Pending artifact overlay to apply or reject AI-generated file writes.
7. Workspace home showing objective, session state, quick actions, session
   timeline, composer prompt, recent files, pending diffs, active runs, and next
   move.

Right panel:

1. Chat: message list, streaming assistant output, chat actions, mode/model
   controls, file mentions, attachments, reasoning variant, stop/retry, plan
   review action, share/history actions.
2. Run inspector: live steps, persisted run events, execution receipt, status,
   snapshots, recovery checkpoints, subagent activity, spec/plan context.
3. Changes inspector: generated artifacts and changed work for review.
4. Context inspector: plan, project memory, eval scenarios, planning
   intake/debug context.
5. Preview inspector: browser or app runtime preview when available.

Bottom dock:

1. Terminal for project commands.
2. Agent Events panel for agent/runtime event output.
3. Collapsed and expanded states with resizable height.

Status bar:

1. Selected file path.
2. Cursor position.
3. Connection and streaming state.
4. Spec engine state.
5. WebContainer/runtime status.

Mobile workbench:

1. Bottom navigation switches between Session, Chat, Proof, and Preview.
2. Keyboard-aware layout hides mobile panel navigation while composing.
3. Workspace, chat, and proof are mutually focused rather than squeezed into
   desktop panes.

Important workbench states:

1. No file selected: workspace home.
2. File selected: editor surface.
3. Plan generated: plan artifact tab and context rail.
4. Plan awaiting review: approval actions become prominent.
5. Build executing: streaming progress, run proof, agent events, stop action.
6. Risky permission request: approval dialog overlays the shell.
7. Changed work pending: diff badges, pending artifact overlay, changes rail.
8. Run interrupted: recoverable checkpoint banner.
9. No LLM provider configured: settings CTA in chat panel.
10. Browser runtime unsupported: server fallback remains available and status
    copy explains runtime state.

### Settings Page

Purpose: user-level configuration for language, appearance, LLM providers,
automation, MCP servers, subagents, custom skills, and advanced permissions.

Navigation tabs:

1. General.
2. LLM Providers.
3. Automation.
4. Advanced.

General content:

1. Language preference.
2. Default provider and model behavior.
3. Appearance theme: light, dark, system.

LLM Providers content:

1. Provider cards with enabled/disabled state.
2. API key or OAuth connection controls.
3. Available model lists.
4. OpenAI-compatible provider support.
5. Provider catalog modal powered by live provider metadata.
6. Refresh/test model actions.

Automation content:

1. Agent default policy.
2. Auto-apply file settings.
3. Auto-run command settings.
4. Allowed command prefixes.
5. MCP server editor.
6. Subagent editor.
7. Custom skill editor.

Advanced content:

1. Permission controls.
2. Provider override policy when admins set global defaults.
3. Unsaved changes warning and leave confirmation.

Design notes: settings should feel like configuration, not onboarding. Use left
side navigation on desktop and horizontal tabs on mobile.

### Shared Chat Page

Purpose: public read-only projection of a shared Panda conversation.

Primary content:

1. Shared chat metadata.
2. Redacted transcript messages.
3. Plan/run history at a safe summary level when included.
4. Not-found state for invalid or private share links.

Design notes: this should not expose owner-only workspace controls. It should
feel like a clean artifact view of a work thread, not an editable project.

### Admin Console Layout

Purpose: admin-only shell for platform operation.

Navigation:

1. Dashboard.
2. User Management.
3. Analytics.
4. System Controls.
5. Security.
6. Back to App.

Access states:

1. Loading admin check.
2. Access denied for non-admin users.
3. Admin role shown in sidebar.

### Admin Dashboard Page

Purpose: overview and routing hub for administrative tools.

Primary content:

1. System overview metrics.
2. Route cards for User Management, Analytics, System Controls, and Security.
3. Short descriptions of each admin tool.

### Admin User Management Page

Purpose: search, inspect, and administer users.

Primary content:

1. Search and filters: all users, admins, banned, active.
2. Paginated user list.
3. User detail pane with identity, projects, chats, provider/activity
   indicators.
4. Grant/revoke admin action.
5. Ban/unban action.
6. Delete user action.
7. Confirmation dialogs for dangerous actions.

### Admin Analytics Page

Purpose: platform usage and provider/model analytics.

Primary content:

1. Date range filters.
2. Overview metrics: users, active users, projects, chats, messages.
3. Provider analytics.
4. Top model usage.
5. Progress bars and compact metric cards.

### Admin System Controls Page

Purpose: system-wide configuration and feature governance.

Subsections:

1. Features: user overrides, MCP, subagents, skills, maintenance mode.
2. LLM Config: global default provider/model and prompt enhancement model.
3. Access: registration and access policy.
4. Limits: max projects, chats, custom subagents, custom skills.

Important states:

1. Unsaved settings.
2. Save in progress.
3. Maintenance mode warning.
4. Confirmation for maintenance-sensitive changes.

### Admin Security Page

Purpose: audit logs and security overview.

Primary content:

1. Filters by actor, action, resource, from date, to date.
2. Audit log list.
3. Admin actions tab.
4. Settings changes tab.
5. Security overview tab.
6. Action badges for grants, revokes, bans, unbans, deletions, and settings
   updates.

## Main Feature Set

### Projects And Files

Panda stores projects and project files persistently. The workbench loads file
metadata on boot and loads full content only when needed. Users can create,
rename, delete, open, edit, and save files. File snapshots and checkpoints allow
diff, restore, and recovery workflows.

### Chat And Messages

Each project can have multiple chat threads. Messages support user, assistant,
and system roles. Message annotations can include mode, model, provider, token
usage, reasoning summary, attachments, tool calls, and context-window metadata.

### Planning Sessions

Planning is a first-class workflow. A planning session asks structured intake
questions, records answers, generates a plan artifact, stores plan sections and
acceptance checks, and tracks status from intake through review, acceptance,
execution, completion, failure, or staleness.

### Specs And Verification

Specifications formalize goals, constraints, acceptance criteria, plan steps,
dependencies, risks, preconditions, postconditions, invariants, provenance, and
verification results. Specs can be attached to planning sessions and runs.

### Agent Runs And Proof

Agent runs record lifecycle, mode, provider, model, status, user message,
summary, typed termination reason, token usage, and execution receipt. Run
events record progress, tool calls, file targets, output summaries, errors,
snapshots, plan-step progress, and applied skills. Receipts summarize what
happened without turning the transcript into an unbounded log.

### Artifacts And Changed Work

Artifacts represent AI-generated actions such as file writes and command runs.
They move through pending, in-progress, completed, failed, or rejected states.
The UI surfaces these as changed work, pending overlays, and diff review.

### Runtime And Terminal

The browser runtime can mount project files and run commands in a WebContainer
when supported. When unsupported or failed, Panda falls back to server-backed
execution. Jobs track command type, status, logs, output, error, and timing.

### Provider Catalog And Model Selection

Panda hydrates provider and model selectors from live provider metadata while
preserving user credentials and enabled state. Supported provider experiences
include built-in providers, OpenAI-compatible endpoints, model refresh, provider
testing, and admin defaults. Tool-capable modes require model capability checks.

### Custom Skills And Subagents

Users can define Custom Skills as workflow guidance with trigger phrases,
applicable modes, profile, instructions, checklist, validation, and
auto-activation settings. Users can define Custom Subagents with prompts, model
preferences, capability presets, attached skills, and permission policies.
Skills guide work; Subagents execute delegated work.

### MCP Servers

Users can configure MCP servers using stdio or SSE transports when admin policy
allows it. MCP tools are treated as high-risk execution configuration and remain
owner-scoped.

### Memory Bank

Project memory stores durable instructions and context so future runs stay
aligned without repeated explanation.

### Evals

Eval suites, eval runs, and eval results support repeatable checks against
prompts, expected behavior, scores, outputs, errors, tags, and timing. The UI
surfaces evals in the context/inspector rail.

### Sharing

Users can create public share links for chat sessions. Shared output is
read-only and redacted. It must not expose raw run events, tool arguments,
command output, checkpoints, receipts, provider settings, private files, signed
URLs, or private memory.

### Admin And Governance

Admins can manage users, analytics, system settings, provider defaults, feature
flags, access policy, limits, and security audit logs. Admin mutations write
audit records.

## Backend Domain Model For Design

Important persisted objects to represent in designs:

1. User: identity, avatar, admin/banned state.
2. Project: name, description, owner, repo URL, last opened, automation policy.
3. File: path, content, binary flag, updated time.
4. File snapshot: versioned content for restore/checkpoint.
5. Chat: project thread, title, mode, timestamps.
6. Planning session: intake, answers, generated plan, acceptance checks, status.
7. Message: transcript item with annotations, attachments, tool calls, and
   usage.
8. Artifact: generated file writes and command runs.
9. Settings: user preferences, provider configs, theme, defaults, permissions.
10. Job: terminal/build/test/lint/format/deploy command execution.
11. Agent run: execution lifecycle and receipt.
12. Run event: progress and proof event.
13. Runtime checkpoint: resumable harness state.
14. Checkpoint: user-visible snapshot of changed files.
15. Provider token: owner-scoped provider OAuth credential metadata.
16. Shared chat: public share record.
17. MCP server: user-defined tool server configuration.
18. Subagent: user-defined delegated worker.
19. Custom skill: user-defined workflow guidance.
20. Admin settings: global policy and limits.
21. User analytics: per-user usage counters.
22. Audit log: admin/security event record.
23. Eval suite, run, and result: repeatable agent quality checks.
24. Specification: formal execution contract and verification state.
25. Chat attachment: file/image metadata backed by storage.

## Navigation Model

Public navigation:

1. Home.
2. Education.
3. Login or Open Workbench.

Authenticated app navigation:

1. Projects.
2. Settings.
3. Project workbench.
4. User menu.
5. Command palette.

Project workbench navigation:

1. Top bar for project identity, global search, runtime/model/status controls.
2. Left rail for files, search, source control, agents, history/tasks, deploy.
3. Center workbench tabs for Work Surface and Review Diff.
4. File tabs inside the Work Surface; every explicit file click opens here.
5. Right support rail for Proof, Changes, and Context. Changes navigates to
   Review Diff; it is not a competing editor.
6. Bottom dock for Terminal and Agent Events.
7. Mobile bottom nav for Work, Chat, Proof, and Changes. Panda does not rely on
   a live-preview destination.

Admin navigation:

1. Dashboard.
2. User Management.
3. Analytics.
4. System Controls.
5. Security.
6. Back to App.

## Screen Set To Generate

A complete design project should include at least these screens:

1. Landing page desktop.
2. Landing page mobile.
3. Education/product tour page.
4. Login page.
5. Maintenance page.
6. Projects list with populated projects.
7. Projects empty state.
8. New Project dialog.
9. Project workbench idle/home state.
10. Project workbench with file editor open.
11. Project workbench with chat active and provider configured.
12. Project workbench no-provider state.
13. Project workbench plan awaiting review.
14. Project workbench build executing.
15. Project workbench permission request overlay.
16. Project workbench changed-work diff review.
17. Project workbench recoverable checkpoint state.
18. Project workbench mobile Session view.
19. Project workbench mobile Chat view.
20. Project workbench mobile Proof view.
21. Settings General.
22. Settings LLM Providers.
23. Settings Automation.
24. Settings Advanced.
25. Shared chat public page.
26. Shared chat not found/private state.
27. Admin dashboard.
28. Admin user management list and detail.
29. Admin analytics overview.
30. Admin system controls.
31. Admin security audit log.
32. Global error/not-found states.

## Component Families

Reusable component families implied by the product:

1. App shell: public nav, dashboard header, workbench top bar, admin sidebar.
2. Navigation: rail icons, flyout sections, tabs, mobile bottom tabs,
   breadcrumbs.
3. Status: badges, chips, runtime indicators, plan status, run status, provider
   status.
4. Workbench panels: file tree, search, source control, active agents, history,
   deploy placeholder.
5. Editor: file tabs, code editor, inline chat, dirty state, content loading.
6. Chat: message list, message bubble, markdown, composer, mode selector, model
   selector, attachments, action bar.
7. Planning: intake surface, plan panel, plan artifact tab, plan verification.
8. Run proof: progress panel, timeline rows, receipts, token ledger, snapshots,
   subagent panel.
9. Review: artifact panel, diff viewer, pending artifact overlay.
10. Runtime: terminal, agent events, preview placeholder, WebContainer status.
11. Settings: provider cards, connection controls, catalog modal, automation
    policy, MCP editor, subagent editor, custom skill editor.
12. Admin: metric cards, data lists, filters, audit log rows, confirmation
    dialogs.
13. Feedback: alerts, toasts, loading guards, empty states, destructive
    confirmations.

## Status And State Vocabulary

Designs should include clear visual treatments for these states:

1. Planning session: intake, generating, ready for review, accepted, executing,
   completed, failed, stale.
2. Agent run: running, completed, failed, stopped.
3. Runtime: idle, booting, ready, unsupported, error.
4. Artifacts: pending, in progress, completed, failed, rejected.
5. Jobs: queued, running, completed, failed, cancelled.
6. Eval runs: running, completed, failed, cancelled.
7. Specs: draft, validated, approved, executing, verified, drifted, failed,
   archived.
8. Share: private by default, public only through explicit share link.
9. Admin user: active, admin, banned, deleted pending confirmation.
10. Settings: clean, dirty, saving, saved, failed.

## Data Sensitivity And Trust Boundaries

Designs must respect Panda's trust model.

Never expose in public/shared views:

1. Provider tokens or API keys.
2. Raw command output.
3. Raw tool arguments.
4. Private file contents.
5. Checkpoint payloads.
6. Raw receipts or run event internals.
7. Signed attachment URLs.
8. Private memory.
9. Admin data.

Owner-only surfaces may inspect sensitive detail when necessary, but should do
so through explicit panels, bounded summaries, and clear labels. Admin-only
surfaces must be visually distinct and should emphasize auditability.

## Design Tool Prompt Summary

Use this compressed prompt when importing the product into a design tool:

Panda is a browser-first AI coding workbench with server fallback. Design a
brutalist, high-trust technical app where users open projects, browse files,
chat with an AI agent, review plans, approve builds, inspect changed work,
recover interrupted runs, configure providers, and share redacted chat threads.
The main workbench is a full-screen operational shell: top bar with project,
search, model, runtime, agent, and share controls; left rail for files, search,
git, agents, history, and deploy; center session canvas with workspace home,
file editor, plan artifact, and diff; right panel with chat plus Run, Changes,
Context, and Preview inspectors; bottom dock for terminal and agent events;
mobile tabs for Session, Chat, Proof, Preview. Include public landing,
education, login, projects, settings, shared chat, admin dashboard, user
management, analytics, system controls, security audit, and error states. Style:
sharp corners, monospace controls, thin borders, dot grid, restrained primary
accent, dense operational status chips, no generic AI gradients.
