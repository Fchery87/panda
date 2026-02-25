# Convex Backend - Panda.ai

> This directory contains all Convex backend functions for Panda.ai.

## Database Schema

Panda.ai uses 23 tables in Convex for data persistence:

### Authentication

| Table               | Purpose                                          |
| ------------------- | ------------------------------------------------ |
| `accounts`          | OAuth account links (from @convex-dev/auth)      |
| `sessions`          | User sessions (from @convex-dev/auth)            |
| `verificationCodes` | Email/phone verification (from @convex-dev/auth) |
| `users`             | User profiles with admin roles                   |

### Core Data

| Table           | Purpose                                   |
| --------------- | ----------------------------------------- |
| `projects`      | Code projects with agent policies         |
| `files`         | Project file contents                     |
| `fileSnapshots` | Version history for files                 |
| `chats`         | Chat sessions (Ask/Plan/Code/Build modes) |
| `messages`      | Chat messages                             |
| `artifacts`     | AI-generated code changes                 |

### Execution

| Table            | Purpose                      |
| ---------------- | ---------------------------- |
| `jobs`           | Terminal command execution   |
| `agentRuns`      | Agent run lifecycle tracking |
| `agentRunEvents` | Persisted timeline events    |

### Agentic Harness

| Table                | Purpose                  |
| -------------------- | ------------------------ |
| `agentSessions`      | Harness session state    |
| `messageParts`       | Structured message parts |
| `permissionRequests` | Pending permissions      |
| `gitSnapshots`       | Git snapshots for undo   |

### User Features

| Table            | Purpose                             |
| ---------------- | ----------------------------------- |
| `settings`       | User preferences & provider configs |
| `providerTokens` | OAuth tokens for LLM providers      |
| `subagents`      | Custom subagent definitions         |
| `mcpServers`     | MCP server configurations           |

### Sharing & Admin

| Table           | Purpose                     |
| --------------- | --------------------------- |
| `sharedChats`   | Public sharing links        |
| `adminSettings` | Global system configuration |
| `userAnalytics` | Usage tracking              |
| `auditLog`      | Administrative actions      |

### Versioning

| Table         | Purpose                          |
| ------------- | -------------------------------- |
| `checkpoints` | Versioned snapshots for rollback |

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
- `updatePlan` - Update plan draft

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

### Agent Runs (`agentRuns.ts`)

- `create` - Create new run
- `list` - List runs
- `get` - Get run
- `update` - Update run status
- `listEvents` - Get run events

### Sharing (`sharing.ts`)

- `share` - Share chat
- `getShared` - Get shared chat
- `listShared` - List user's shared chats

### GitHub (`github.ts`)

- `importRepo` - Import GitHub repository

## Environment Variables

Required Convex environment variables:

```bash
# Authentication
AUTH_GOOGLE_ID=your-client-id
AUTH_GOOGLE_SECRET=your-client-secret
CONVEX_AUTH_SECRET=your-random-secret
SITE_URL=https://your-app.convex.site

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
- [AGENTIC_HARNESS.md](./AGENTIC_HARNESS.md) - Agent harness docs
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Deployment guide
