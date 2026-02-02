# Panda.ai

> An AI-powered coding workbench for solo developers and small teams. Built with Next.js 16, Convex, shadcn/ui, and Framer Motion.

[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org)
[![Convex](https://img.shields.io/badge/Convex-Realtime-orange)](https://convex.dev)
[![shadcn/ui](https://img.shields.io/badge/shadcn%2Fui-Components-blue)](https://ui.shadcn.com)
[![Framer Motion](https://img.shields.io/badge/Framer%20Motion-Animations-pink)](https://framer.com/motion)
[![Bun](https://img.shields.io/badge/Bun-1.2.0-purple)](https://bun.sh)
[![Tests](https://img.shields.io/badge/Tests-13%20passing-brightgreen)](./apps/web/lib)

## Overview

Panda.ai is a browser-based AI coding workbench that combines streaming chat agents, code editing, file management, terminal integration, and real-time collaboration in a unified interface. It enables developers to discuss code changes, execute commands, and build projects with AI assistance.

## Project Health

**Validation Status:** ✅ Perfect (100/100)

| Check | Status | Details |
|-------|--------|---------|
| **TypeScript** | ✅ Pass | Strict type checking enabled |
| **Lint** | ✅ Pass | ESLint 9, no warnings |
| **Tests** | ✅ 13 passing | Bun test runner, 4 test files |
| **Build** | ✅ Pass | Next.js + Turbo pipeline |

*Last validated: 2026-02-01*

All validation checks are passing. The codebase is in excellent health.

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Framework** | Next.js 16+ (App Router, TypeScript) |
| **Runtime** | React 19 |
| **Database** | Convex (real-time backend with HTTP actions) |
| **Streaming** | Vercel AI SDK + Convex HTTP actions |
| **UI Components** | shadcn/ui (30+ components) |
| **Styling** | Tailwind CSS 3.4 |
| **Animations** | Framer Motion |
| **Layout** | react-resizable-panels |
| **Editor** | CodeMirror 6 (SSR-safe dynamic import) |
| **State Management** | Zustand (artifact queue) |
| **Package Manager** | Bun 1.2.0 |
| **Monorepo** | TurboRepo 2.4 |
| **Testing** | Bun native test runner + Playwright E2E |
| **Linting** | ESLint 9 + TypeScript ESLint |
| **Formatting** | Prettier 3 + Tailwind plugin |

## Features

### Core Features

- **AI-Powered Chat** - Streaming chat with Vercel AI SDK in discuss and build modes
- **Smart File Management** - Tree view with Framer Motion animations for file operations
- **Code Editor** - SSR-safe CodeMirror 6 with TypeScript and JavaScript support
- **Diff Viewer** - Side-by-side code comparison with syntax highlighting
- **Integrated Terminal** - Real-time job execution with live log streaming
- **Artifact System** - Queue-based apply/reject workflow for AI-generated changes
- **Resizable Layout** - Customizable workbench panels with persistent sizing
- **GitHub Integration** - Import repositories directly into projects
- **Settings Management** - LLM provider configuration, theme toggle, model selection

### UI Features

- 30+ shadcn/ui components (Button, Card, Dialog, Tabs, Tooltip, Sonner, etc.)
- Dark/light theme support with next-themes
- Toast notifications with Sonner
- Responsive design with Tailwind CSS
- Smooth animations with Framer Motion
- Context menus, toggle groups, and scroll areas

## Architecture

```
panda-ai/
├── apps/
│   └── web/                    # Next.js 16 frontend
│       ├── app/               # App Router pages
│       │   ├── (dashboard)/   # Dashboard layout group
│       │   ├── api/chat/      # Chat API routes
│       │   ├── settings/      # Settings page
│       │   ├── layout.tsx     # Root layout with providers
│       │   └── page.tsx       # Landing page
│       ├── components/
│       │   ├── ui/           # shadcn/ui components (30+)
│       │   ├── chat/         # Chat components
│       │   ├── workbench/    # Workbench panels
│       │   ├── editor/       # CodeMirror editor
│       │   ├── artifacts/    # Artifact panel
│       │   └── settings/     # Settings components
│       ├── lib/
│       │   ├── llm/          # LLM provider registry
│       │   ├── agent/        # Agent runtime & tools
│       │   └── diff.ts       # Diff computation
│       ├── hooks/            # Custom React hooks
│       ├── stores/           # Zustand stores
│       └── convex/           # Convex generated types
├── convex/                   # Convex backend
│   ├── schema.ts            # Database schema (9 tables)
│   ├── projects.ts          # Project CRUD
│   ├── files.ts             # File operations
│   ├── chats.ts             # Chat management
│   ├── messages.ts          # Message streaming
│   ├── jobs.ts              # Terminal job execution
│   ├── artifacts.ts         # Artifact transactions
│   ├── settings.ts          # User settings
│   ├── github.ts            # GitHub integration
│   └── llm.ts               # LLM streaming HTTP actions
├── package.json             # Root workspace config
├── turbo.json               # TurboRepo pipeline
└── README.md               # This file
```

### Database Schema (Convex)

| Table | Purpose |
|-------|---------|
| `users` | User accounts and profiles |
| `projects` | Project metadata and repos |
| `files` | File contents and paths |
| `fileSnapshots` | Version history |
| `chats` | Chat sessions (discuss/build modes) |
| `messages` | Chat messages with streaming |
| `artifacts` | AI-generated code changes |
| `jobs` | Terminal command executions |
| `settings` | User preferences |

## Setup Instructions

### Prerequisites

- [Bun](https://bun.sh) 1.2.0 or later
- Node.js 20+ (for Convex CLI compatibility)
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd panda-ai
   ```

2. **Install dependencies**
   ```bash
   bun install
   ```

3. **Initialize Convex backend**
   ```bash
   bunx convex dev --init
   ```
   This will:
   - Create a Convex project
   - Generate `.env.local` with `NEXT_PUBLIC_CONVEX_URL`
   - Deploy the schema

4. **Set up environment variables**
   
   The `.env.local` file is auto-generated in the root directory after Convex init:
   ```env
   # Convex (auto-generated after init)
   CONVEX_DEPLOYMENT=dev:...
   NEXT_PUBLIC_CONVEX_URL=https://<your-project>.convex.cloud
   CONVEX_SITE_URL=https://<your-project>.convex.site
   
   # LLM Providers (at least one required for AI features)
   OPENAI_API_KEY=sk-...
   # or
   OPENROUTER_API_KEY=sk-...
   # or
   TOGETHER_API_KEY=...
   
    # Optional: GitHub integration
    GITHUB_TOKEN=ghp_...
    ```
 
 ## Authentication
 
 Panda.ai uses Convex Auth with Google OAuth for authentication.
 
 ### Setup
 
 1. Create a project in [Google Cloud Console](https://console.cloud.google.com/)
 2. Configure OAuth 2.0 credentials
 3. Add authorized redirect URI: `https://your-deployment.convex.site/api/auth/callback/google`
 4. Copy client ID and secret to `.env.local`
 
 ### Environment Variables
 
 ```env
 AUTH_GOOGLE_ID=your-client-id.apps.googleusercontent.com
 AUTH_GOOGLE_SECRET=your-client-secret
 CONVEX_AUTH_SECRET=your-random-secret
 ```
 
 ## Development Workflow

### Start Development Server

```bash
bun run dev
```

This runs both:
- Convex dev server (`bunx convex dev`)
- Next.js dev server (`turbo run dev`)

### Build for Production

```bash
bun run build
```

### Type Checking

```bash
bun run typecheck
```

### Linting

Check for ESLint issues:
```bash
bun run lint
```

Auto-fix ESLint issues:
```bash
bun run lint:fix
```

### Formatting

Check Prettier formatting:
```bash
bun run format:check
```

Auto-format all files:
```bash
bun run format
```

Format specific file or directory:
```bash
bunx prettier --write apps/web/components/chat/ChatContainer.tsx
```

The project uses:
- **Prettier 3** for code formatting
- **Tailwind CSS Prettier plugin** for class sorting
- **Integration with ESLint** for consistent style

### Testing

#### Unit Tests (Bun)

Run all unit tests:
```bash
bun test
```

Run tests with coverage:
```bash
bun test --coverage
```

Run specific test file:
```bash
bun test apps/web/lib/agent/runtime.test.ts
```

Run tests in watch mode:
```bash
bun test --watch
```

#### E2E Tests (Playwright)

Run all E2E tests:
```bash
cd apps/web && bun run test:e2e
```

Run E2E tests with UI mode:
```bash
cd apps/web && bun run test:e2e:ui
```

Run E2E tests in debug mode:
```bash
cd apps/web && bun run test:e2e:debug
```

Run specific E2E test file:
```bash
cd apps/web && bunx playwright test e2e/homepage.spec.ts
```

Generate Playwright report:
```bash
cd apps/web && bunx playwright show-report
```

### Convex Commands

```bash
# Start Convex dev server only
bun run convex:dev

# Deploy to production
bun run convex:deploy
```

## TurboRepo Pipeline

The monorepo uses TurboRepo for task orchestration:

```json
{
  "tasks": {
    "build": { "dependsOn": ["^build"] },
    "dev": { "cache": false, "persistent": true },
    "lint": {},
    "typecheck": {}
  }
}
```

## Project Structure

### Key Directories

```
apps/web/
├── app/
│   ├── (dashboard)/projects/[projectId]/   # Project workbench
│   ├── settings/                           # Settings page
│   ├── api/chat/route.ts                   # Streaming chat API
│   ├── layout.tsx                          # Root layout
│   └── page.tsx                            # Landing page
├── components/
│   ├── ui/                                 # 30+ shadcn components
│   ├── chat/                               # ChatContainer, MessageList, etc.
│   ├── workbench/                          # FileTree, Terminal, Preview
│   ├── editor/                             # CodeMirrorEditor, EditorContainer
│   └── artifacts/                          # ArtifactPanel, ArtifactCard
├── lib/
│   ├── llm/                                # Provider registry & types
│   │   ├── types.ts
│   │   ├── base-provider.ts
│   │   ├── registry.ts
│   │   └── providers/
│   ├── agent/                              # Agent runtime
│   │   ├── runtime.ts
│   │   ├── tools.ts
│   │   └── prompt-library.ts
│   └── diff.ts                             # Diff computation utility
├── hooks/
│   └── useStreamingChat.ts                 # Vercel AI SDK integration
└── stores/
    └── artifactStore.ts                    # Zustand artifact queue
```

## Key Components

### Chat System
- **ChatContainer** - Main chat wrapper with mode toggle
- **MessageList** - Virtualized message rendering with streaming
- **MessageBubble** - Styled message with syntax highlighting
- **ChatInput** - Input with send button and file attachments
- **useStreamingChat** - Hook integrating Vercel AI SDK with Convex

### Workbench
- **Workbench** - Resizable panel layout (FileTree | Editor+Terminal | Preview)
- **FileTree** - Animated tree view with context menus
- **EditorContainer** - SSR-safe CodeMirror wrapper
- **CodeMirrorEditor** - Full-featured code editor
- **Terminal** - Real-time job output with Convex subscriptions
- **Preview** - Live preview panel
- **DiffViewer** - Code comparison with line-by-line diff

### Artifacts
- **ArtifactPanel** - Queue management UI
- **ArtifactCard** - Individual artifact with apply/reject
- **artifactStore** - Zustand store for queue state

### Settings
- **SettingsPage** - Provider, theme, and model configuration
- **ProviderCard** - Individual provider configuration
- **ThemeToggle** - Dark/light/system toggle
- **GitHubImportDialog** - Repository import interface

## Development Phases

This project was built in phases following a structured implementation plan:

| Phase | Description | Status |
|-------|-------------|--------|
| 1 | Monorepo setup, Next.js 16, shadcn/ui, Framer Motion, Convex init | ✅ Complete |
| 2 | Convex schema (9 tables), CRUD operations (35+ functions) | ✅ Complete |
| 3 | FileTree, CodeMirror editor, Resizable Workbench, DiffViewer | ✅ Complete |
| 4 | Chat UI components, streaming chat with Vercel AI SDK | ✅ Complete |
| 5 | Artifact transaction system, agent tools | ✅ Complete |
| 6 | Terminal with real-time job streaming | ✅ Complete |
| 7 | Settings page, GitHub import | ✅ Complete |
| 8 | Final integration, all components connected | ✅ Complete |

## CI/CD

GitHub Actions workflows are configured in `.github/workflows/`:

### Pull Request Validation (`pr-validation.yml`)

Automatically runs on every PR:

| Job | Description |
|-----|-------------|
| **quality-checks** | TypeScript, ESLint, Prettier, unit tests |
| **e2e-tests** | Playwright E2E tests |

Quality checks include:
- TypeScript strict checking
- ESLint with zero warnings
- Prettier format validation
- 13 unit tests via Bun

### Workflow Commands

The CI pipeline runs these commands:
```bash
bun run typecheck    # TypeScript validation
bun run lint         # ESLint check
bun run format:check # Prettier validation
bun test             # Unit tests
bun run test:e2e     # E2E tests
```

### Deployment

- **Frontend**: Vercel (Next.js 16)
- **Backend**: Convex (real-time database)
- **Triggers**: Auto-deploy on merge to main

## Contributing

1. Ensure all checks pass before committing:
   ```bash
   bun run typecheck && bun run lint && bun test
   ```

2. Follow the existing code style and brutalist design system (see AGENTS.md)

3. Write tests for new functionality

4. Update documentation as needed

## License

MIT License - feel free to use for personal or commercial projects.

## Documentation

- **AGENTS.md** - Comprehensive guide for AI agents working on this codebase including architecture, patterns, and quality standards
- **README.md** - This file - project overview and quick start

## Support

For issues or questions, please open a GitHub issue or reach out to the development team.

---

**Built with ❤️ using Next.js, Convex, shadcn/ui, and Framer Motion**
