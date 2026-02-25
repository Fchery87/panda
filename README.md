# Panda.ai

> An AI-powered coding workbench for solo developers and small teams. Built with
> Next.js 16, Convex, shadcn/ui, and Framer Motion.

[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org)
[![Convex](https://img.shields.io/badge/Convex-Realtime-orange)](https://convex.dev)
[![shadcn/ui](https://img.shields.io/badge/shadcn%2Fui-Components-blue)](https://ui.shadcn.com)
[![Framer Motion](https://img.shields.io/badge/Framer%20Motion-Animations-pink)](https://framer.com/motion)
[![Bun](https://img.shields.io/badge/Bun-1.2.0-purple)](https://bun.sh)
[![Tests](https://img.shields.io/badge/Tests-Unit%20%2B%20E2E-brightgreen)](./apps/web)

## Overview

Panda.ai is a browser-based AI coding workbench that combines streaming chat
agents, code editing, file management, terminal integration, and real-time
collaboration in a unified interface. It enables developers to ask questions,
plan changes, write code, and build projects with AI assistance.

### Key Features

- **AI-Powered Chat** - Streaming chat across Ask, Plan, Code, and Build modes
- **Smart File Management** - Tree view with Framer Motion animations
- **Code Editor** - SSR-safe CodeMirror 6 with syntax highlighting
- **Diff Viewer** - Side-by-side code comparison
- **Integrated Terminal** - Real-time job execution with live streaming
- **Artifact System** - Queue-based apply/reject workflow for AI changes
- **Resizable Layout** - Customizable workbench panels
- **GitHub Integration** - Import public repositories directly
- **Settings Management** - LLM provider configuration & theme toggle
- **Panda Swarm** - Parallel sub-agent orchestration
- **Panda Oracle** - Semantic codebase search

## Tech Stack

| Layer           | Technology                                |
| --------------- | ----------------------------------------- |
| Framework       | Next.js 16 (App Router, TypeScript)       |
| Runtime         | React 19                                  |
| Database        | Convex (real-time backend + HTTP actions) |
| Authentication  | Convex Auth with Google OAuth             |
| UI Components   | shadcn/ui (30+ components)                |
| Styling         | Tailwind CSS 3.4 + brutalist theme        |
| Animations      | Framer Motion                             |
| Editor          | CodeMirror 6 (SSR-safe)                   |
| State           | Zustand (client) + Convex (server)        |
| Package Manager | Bun 1.2.0                                 |
| Monorepo        | TurboRepo 2.4                             |
| Testing         | Bun test runner + Playwright E2E          |

## Quick Start

### Prerequisites

- [Bun](https://bun.sh) 1.2.0+
- Node.js 20+
- Git

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd panda

# Install dependencies
bun install

# Initialize Convex backend
bunx convex dev --init

# Start development server
bun run dev
```

### Environment Variables

Create or update `.env.local`:

```env
# Convex (auto-generated after init)
NEXT_PUBLIC_CONVEX_URL=https://<your-project>.convex.cloud

# LLM Providers (at least one required)
OPENAI_API_KEY=sk-...
# or
OPENROUTER_API_KEY=sk-...

# Google OAuth (optional, for authentication)
AUTH_GOOGLE_ID=your-client-id.apps.googleusercontent.com
AUTH_GOOGLE_SECRET=your-client-secret
CONVEX_AUTH_SECRET=your-random-secret
```

## Development Commands

```bash
# Run all development (Convex + Next.js)
bun run dev

# Type checking
bun run typecheck

# Linting
bun run lint

# Formatting
bun run format:check

# Run unit tests
bun test

# Run E2E tests
cd apps/web && bun run test:e2e

# Build for production
bun run build
```

## Architecture

```
panda/
├── apps/web/                    # Next.js 16 frontend
│   ├── app/                     # App Router pages
│   │   ├── (dashboard)/         # Dashboard layouts
│   │   ├── settings/           # Settings page
│   │   └── page.tsx            # Landing page
│   ├── components/
│   │   ├── ui/                 # shadcn/ui components
│   │   ├── chat/               # Chat components
│   │   ├── workbench/          # Workbench panels
│   │   └── editor/             # CodeMirror editor
│   └── lib/
│       ├── llm/                # LLM provider registry
│       └── agent/              # Agent runtime
│           └── harness/        # OpenCode-style harness
├── convex/                      # Convex backend
│   ├── schema.ts               # 23-table schema
│   └── *.ts                    # Queries, mutations, actions
└── docs/                        # Documentation
```

## Database Schema (23 Tables)

| Table                | Purpose                        |
| -------------------- | ------------------------------ |
| `users`              | User accounts with admin roles |
| `projects`           | Code projects                  |
| `files`              | Project file contents          |
| `fileSnapshots`      | Version history                |
| `chats`              | Chat sessions (7 modes)        |
| `messages`           | Chat messages                  |
| `artifacts`          | AI-generated changes           |
| `jobs`               | Terminal command execution     |
| `agentRuns`          | Agent run tracking             |
| `agentRunEvents`     | Timeline events                |
| `checkpoints`        | Version snapshots              |
| `providerTokens`     | LLM OAuth tokens               |
| `sharedChats`        | Public sharing links           |
| `mcpServers`         | MCP server configs             |
| `subagents`          | Custom subagents               |
| `adminSettings`      | System configuration           |
| `userAnalytics`      | Usage tracking                 |
| `auditLog`           | Admin actions                  |
| `agentSessions`      | Harness sessions               |
| `messageParts`       | Structured messages            |
| `permissionRequests` | Pending permissions            |
| `gitSnapshots`       | Git undo snapshots             |

## Documentation

- [AGENTS.md](./AGENTS.md) - AI agent instructions
- [docs/AGENTIC_HARNESS.md](./docs/AGENTIC_HARNESS.md) - Agent harness docs
- [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md) - Deployment guide
- [docs/GOOGLE_OAUTH_SETUP.md](./docs/GOOGLE_OAUTH_SETUP.md) - OAuth setup
- [convex/README.md](./convex/README.md) - Backend documentation
- [DESIGN_SYSTEM_IMPLEMENTATION.md](./DESIGN_SYSTEM_IMPLEMENTATION.md) - Design
  system
- [PANDA_SWARM_DEVELOPMENT_LOG.md](./PANDA_SWARM_DEVELOPMENT_LOG.md) - Feature
  log

## License

MIT License
