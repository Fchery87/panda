# Convex Backend - Panda

> This directory contains the Convex backend for Panda's web app.

## Database Schema

Panda.ai uses 38 tables in Convex for data persistence across auth, projects,
workbench state, delivery control, evals, and sharing.

### Core tables

| Table              | Purpose                                       |
| ------------------ | --------------------------------------------- |
| `users`            | User profiles and admin flags                 |
| `projects`         | Code projects and project policy state        |
| `files`            | Current file contents                         |
| `fileSnapshots`    | Version history for files                     |
| `chats`            | Chat sessions and plan state                  |
| `planningSessions` | Structured plan intake and approval flow      |
| `messages`         | Chat messages                                 |
| `artifacts`        | AI-generated file and command artifacts       |
| `jobs`             | Terminal command execution                    |
| `agentRuns`        | Agent run lifecycle tracking                  |
| `agentRunEvents`   | Persisted runtime events and timeline entries |

### Harness and delivery tables

| Table                       | Purpose                         |
| --------------------------- | ------------------------------- |
| `sessionSummaries`          | Session handoff summaries       |
| `harnessRuntimeCheckpoints` | Runtime resume snapshots        |
| `checkpoints`               | Versioned checkpoints           |
| `agentSessions`             | Harness session state           |
| `messageParts`              | Structured message parts        |
| `permissionRequests`        | Pending approvals               |
| `permissionAuditLog`        | Permission audit history        |
| `gitSnapshots`              | Git snapshots for undo          |
| `deliveryStates`            | Delivery control-plane state    |
| `deliveryTasks`             | Delivery tasks and evidence     |
| `reviewReports`             | Review findings and decisions   |
| `qaReports`                 | QA evidence and defects         |
| `shipReports`               | Ship readiness decisions        |
| `deliveryDecisions`         | Control-plane decisions         |
| `deliveryVerifications`     | Normalized verification log     |
| `orchestrationWaves`        | Delivery orchestration tracking |
| `browserSessions`           | Browser QA session metadata     |

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

## Functions

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
- `updatePlan` - Update plan draft and approval state

### Planning and delivery

- `planningSessions.ts` - plan intake, answers, approval, execution state
- `deliveryStates.ts` - delivery lifecycle source of truth
- `deliveryTasks.ts` - task tracking and evidence
- `reviewReports.ts` - review findings and decisions
- `qaReports.ts` - QA evidence and defects
- `shipReports.ts` - ship readiness and closure
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
- `update` - Update settings
- `updateProvider` - Update provider config
- `updateAgentDefaults` - Update auto-apply defaults

### Artifacts and runs

- `artifacts.ts` - generated file/command artifact persistence
- `agentRuns.ts` - agent run lifecycle and event stream
- `jobs.ts` - terminal job execution and logs

### Agent Runs (`agentRuns.ts`)

- `create` - Create new run
- `list` - List runs
- `get` - Get run
- `update` - Update run status
- `listEvents` - Get run events

### Sharing and admin

- `sharing.ts` - share chats and resolve shared sessions
- `admin.ts` - admin console queries and mutations
- `github.ts` - repository import and GitHub integration

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
- [docs/AGENTIC_HARNESS.md](../docs/AGENTIC_HARNESS.md) - Agent harness docs
- [docs/DEPLOYMENT.md](../docs/DEPLOYMENT.md) - Deployment guide
