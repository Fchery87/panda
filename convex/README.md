# Convex Backend - Panda

> This directory contains the Convex backend for Panda's web app.

## Database Schema

Panda.ai uses 28 tables in Convex for data persistence across auth, projects,
planning, execution, evals, admin, and sharing.

Backend changes must preserve the ownership, authorization, payload-shape, and
retention rules in
[docs/CONVEX_BACKEND_GOVERNANCE.md](../docs/CONVEX_BACKEND_GOVERNANCE.md) and
[docs/SECURITY_TRUST_BOUNDARIES.md](../docs/SECURITY_TRUST_BOUNDARIES.md).

### Core tables

| Table              | Purpose                                       |
| ------------------ | --------------------------------------------- |
| `users`            | User profiles and admin flags                 |
| `projects`         | Code projects and project policy state        |
| `files`            | Current file contents                         |
| `fileSnapshots`    | Version history for files                     |
| `chats`            | Chat sessions and active mode                 |
| `planningSessions` | Structured plan intake and approval flow      |
| `messages`         | Chat messages                                 |
| `artifacts`        | AI-generated file and command artifacts       |
| `jobs`             | Terminal command execution                    |
| `agentRuns`        | Agent run lifecycle tracking                  |
| `agentRunEvents`   | Persisted runtime events and timeline entries |

### Harness and runtime tables

| Table                       | Purpose                   |
| --------------------------- | ------------------------- |
| `sessionSummaries`          | Session handoff summaries |
| `harnessRuntimeCheckpoints` | Runtime resume snapshots  |
| `checkpoints`               | Versioned checkpoints     |
| `permissionAuditLog`        | Permission audit history  |

### Settings, providers, and sharing

| Table             | Purpose                               |
| ----------------- | ------------------------------------- |
| `settings`        | User preferences and provider configs |
| `providerTokens`  | OAuth tokens for LLM providers        |
| `subagents`       | Custom subagent definitions           |
| `mcpServers`      | MCP server configurations             |
| `adminSettings`   | Global system configuration           |
| `userAnalytics`   | Usage tracking                        |
| `auditLog`        | Administrative actions                |
| `sharedChats`     | Public sharing links                  |
| `chatAttachments` | Chat attachment metadata              |
| `evalSuites`      | Eval definitions                      |
| `evalRuns`        | Eval execution runs                   |
| `evalRunResults`  | Eval outputs and scores               |
| `specifications`  | Formal specs and spec history         |

## Ownership And Lifecycle Invariants

| Data area                                                                              | Owner                                              | Lifecycle rule                                                                           |
| -------------------------------------------------------------------------------------- | -------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Users and settings                                                                     | Current user, with selected admin-visible defaults | User settings persist until changed or account/project deletion workflows remove them.   |
| Projects, files, chats, messages, plans, specs, jobs, artifacts, runs, and attachments | Project owner                                      | Delete and cascade paths must preserve owner checks and avoid public projections.        |
| Provider tokens and private provider settings                                          | Current user or admin global settings              | Return metadata only; never return raw tokens or API keys to client or sharing surfaces. |
| MCP servers and subagents                                                              | Current user, subject to admin policy              | Treat command and URL configuration as executable risk.                                  |
| Admin settings and audit logs                                                          | Admin only                                         | Admin mutations should write redacted audit entries.                                     |
| Shared chats                                                                           | Public only through share ID projection            | Public output is a redacted, paginated projection, not the owner workspace.              |
| Runtime checkpoints and run events                                                     | Project owner                                      | Summaries are hot data; full payloads are lazy recovery or inspection data.              |
| Evals and analytics                                                                    | Project owner or admin scope                       | Results may include prompts/responses and should follow retention policy.                |

## Functions

Before adding or changing a function, classify the data owner, authorization
rule, query shape, and retention expectation in
[docs/CONVEX_BACKEND_GOVERNANCE.md](../docs/CONVEX_BACKEND_GOVERNANCE.md). For
trust boundaries, sharing, tokens, MCP, and telemetry rules, use
[docs/SECURITY_TRUST_BOUNDARIES.md](../docs/SECURITY_TRUST_BOUNDARIES.md).

### Projects (`projects.ts`)

- `create` - Create new project
- `list` - List user projects
- `get` - Get project by ID
- `update` - Update project metadata
- `delete` - Delete project and cascade

### Files (`files.ts`)

- `list` - List project files
- `get` - Get file content
- `upsert` - Create/update file
- `delete` - Delete file
- `batchGet` - Get multiple files

### Chats (`chats.ts`)

- `create` - Create new chat
- `list` - List project chats
- `get` - Get chat by ID
- `update` - Update chat title or mode
- `remove` - Delete a chat and cascade related state
- `fork` - Fork a chat up to a message boundary

### Planning (`planningSessions.ts`)

- `planningSessions.ts` - plan intake, answers, approval, execution state
- `specifications.ts` - formal spec records

### Messages (`messages.ts`)

- `list` - List chat messages
- `add` - Add new message
- `update` - Update message
- `delete` - Delete message

### Jobs (`jobs.ts`)

- `create` - Create job
- `list` - List project jobs
- `get` - Get job status
- `updateStatus` - Update job status
- `streamLogs` - Stream job logs

### Settings (`settings.ts`)

- `get` - Get user settings
- `getEffective` - Get resolved settings with effective defaults
- `update` - Update settings
- `updateProvider` - Update provider config
- `updateAgentDefaults` - Update auto-apply defaults

Provider configs store user-controlled values such as API keys, enabled state,
base URL overrides, selected defaults, and available model IDs. The web app
hydrates these saved configs with the live `models.dev` catalog at render time,
so Convex does not need to persist every newly discovered provider immediately.

### Artifacts and runs

- `artifacts.ts` - generated file/command artifact persistence
- `agentRuns.ts` - agent run lifecycle, event stream, and execution receipts
- `jobs.ts` - terminal job execution and logs
- `messages.ts` - persisted chat transcript and annotations
- `chatAttachments.ts` - attachment upload metadata and storage references
- `sessionSummaries.ts` - summarized handoff context
- `memoryBank.ts` - persistent project memory bank content
- `projectOverview.ts` - generated project summary content

### Agent Runs (`agentRuns.ts`)

- `create` - Create new run
- `complete` - Atomically mark a run completed with optional summary, usage, and
  typed receipt
- `fail` - Atomically mark a run failed with error and optional typed receipt
- `stop` - Atomically mark a running run stopped with optional typed receipt
- `listByChat` - List recent runs for a chat
- `listRecentSummariesByProject` - Return bounded run summaries for the session
  rail and background-work state
- `listEventSummariesByChat` - Return bounded run-event summaries for progress
  UI
- `getLatestReceiptByChat` - Return the latest run receipt metadata for the run
  inspector

Execution receipts are versioned Convex-validated records stored on `agentRuns`.
They include requested and resolved modes, routing decision metadata, bounded
context audit records, WebContainer/native execution summaries, approval audit
records, token counts, duration, and result status. Receipt builders must redact
secrets and cap arrays before writing to Convex.

The chat-first workspace reads run state through summary queries by default. The
session rail uses recent project-level run summaries plus recent chat summaries;
chat timeline and proof surfaces use bounded event summaries and receipt
metadata. Full run details, checkpoint payloads, file contents, and attachment
URLs should remain lazy detail fetches instead of project-boot subscriptions.

### Sharing and admin

- `sharing.ts` - share chats and resolve shared sessions
- `admin.ts` - admin console queries and mutations
- `github.ts` - repository import and GitHub integration
- `providers.ts` - provider token and integration helpers
- `subagents.ts` - custom subagent CRUD and access control
- `mcpServers.ts` - MCP server management
- `evals.ts` - eval suite and run orchestration

## Environment Variables

Required Convex environment variables:

```bash
# Authentication
AUTH_GOOGLE_ID=your-client-id
AUTH_GOOGLE_SECRET=your-client-secret
CONVEX_AUTH_SECRET=your-random-secret
CONVEX_SITE_URL=https://your-convex-site.convex.site

# LLM Providers
OPENAI_API_KEY=sk-...
OPENROUTER_API_KEY=sk-...
```

## Development

Run Convex dev server:

```bash
bun run convex:dev
# or
bunx convex dev
```

Deploy to production:

```bash
bun run convex:deploy
# or
bunx convex deploy
```

## See Also

- [README.md](../README.md) - Project overview
- [AGENTS.md](../AGENTS.md) - AI agent instructions
- [docs/README.md](../docs/README.md) - docs index and archive guidance
- [docs/ARCHITECTURE_CONTRACT.md](../docs/ARCHITECTURE_CONTRACT.md) - canonical
  vocabulary and source-of-truth map
- [docs/SECURITY_TRUST_BOUNDARIES.md](../docs/SECURITY_TRUST_BOUNDARIES.md) -
  authorization, redaction, sharing, token, and telemetry policy
- [docs/CONVEX_BACKEND_GOVERNANCE.md](../docs/CONVEX_BACKEND_GOVERNANCE.md) -
  Convex ownership, query-shape, retention, and legacy API rules
- [docs/AGENTIC_HARNESS.md](../docs/AGENTIC_HARNESS.md) - Agent harness docs
- [docs/CHAT_TRANSCRIPT_POLICY.md](../docs/CHAT_TRANSCRIPT_POLICY.md) - Chat and
  inspector boundary policy
- [docs/plans/2026-04-26-chat-first-workspace-ia.md](../docs/plans/2026-04-26-chat-first-workspace-ia.md) -
  Chat-first workspace IA and run proof surface contract
- [docs/LLM_PROVIDER_CATALOG.md](../docs/LLM_PROVIDER_CATALOG.md) - LLM provider
  catalog and settings hydration behavior
- [docs/DEPLOYMENT.md](../docs/DEPLOYMENT.md) - Deployment guide
