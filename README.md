# Panda.ai

> An AI-powered coding workbench for solo developers and small teams. Built with Next.js 16, Convex, shadcn/ui, and Framer Motion.

[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org)
[![Convex](https://img.shields.io/badge/Convex-Realtime-orange)](https://convex.dev)
[![shadcn/ui](https://img.shields.io/badge/shadcn%2Fui-Components-blue)](https://ui.shadcn.com)
[![Framer Motion](https://img.shields.io/badge/Framer%20Motion-Animations-pink)](https://framer.com/motion)

## Overview

Panda.ai is a browser-based AI coding workbench that combines streaming chat agents, code editing, file management, terminal integration, and real-time collaboration in a unified interface. It enables developers to discuss code changes, execute commands, and build projects with AI assistance.

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Framework** | Next.js 16+ (App Router, TypeScript) |
| **Database** | Convex (real-time backend with HTTP actions) |
| **Streaming** | Vercel AI SDK + Convex HTTP actions |
| **UI Components** | shadcn/ui (30+ components) |
| **Styling** | Tailwind CSS 3.4 |
| **Animations** | Framer Motion |
| **Layout** | react-resizable-panels |
| **Editor** | CodeMirror 6 (SSR-safe dynamic import) |
| **State Management** | Zustand (artifact queue) |
| **Package Manager** | bun 1.2.0 |
| **Monorepo** | TurboRepo |

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

- [bun](https://bun.sh) 1.2.0 or later
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
   
   Create `.env.local` in `apps/web/`:
   ```env
   # Convex (auto-generated after init)
   NEXT_PUBLIC_CONVEX_URL=https://<your-project>.convex.cloud
   
   # LLM Providers (at least one required)
   OPENAI_API_KEY=sk-...
   # or
   OPENROUTER_API_KEY=sk-...
   # or
   TOGETHER_API_KEY=...
   
   # Optional: GitHub integration
   GITHUB_TOKEN=ghp_...
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

```bash
bun run lint
```

### Convex Commands

```bash
# Start Convex dev server only
bun run convex:dev

# Deploy to production
bun run convex:deploy
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

This project was built in 8 phases over 17 commits:

| Phase | Description | Commits |
|-------|-------------|---------|
| 1 | Monorepo setup, Next.js 16, shadcn/ui, Framer Motion, Convex init | 0ea9783, 170687f, 3fee9bd |
| 2 | Convex schema (9 tables), CRUD operations (35+ functions) | f48421c, e4ce142 |
| 3 | FileTree, CodeMirror editor, Resizable Workbench, DiffViewer | 8cba543, 27c28d8, 534645e, 064197e |
| 4 | Chat UI components, streaming chat with Vercel AI SDK | 2d64e53, 8d0e0b0 |
| 5 | Artifact transaction system, agent tools | 25e4e99, 8ddc4f7 |
| 6 | Terminal with real-time job streaming | 43ecb84 |
| 7 | Settings page, GitHub import | fc6fa30 |
| 8 | Final integration, all components connected | 1d60bd3, 81a40ae |

## Git Log Summary

```
81a40ae feat: complete Panda.ai v0.1 with Next.js 16, shadcn/ui, Framer Motion, streaming chat
1d60bd3 feat: integrate all workbench components with Convex, Chat, and ArtifactPanel
fc6fa30 feat: add settings page and GitHub import
43ecb84 feat: add terminal with real-time job streaming
8ddc4f7 feat: add agent tools with artifact integration
25e4e99 feat: add artifact transaction system with apply/reject
8d0e0b0 feat: add streaming chat with Vercel AI SDK and Convex HTTP actions
2d64e53 feat: add chat UI with shadcn components
064197e feat: add diff viewer component
534645e feat: add resizable workbench layout
27c28d8 feat: add SSR-safe CodeMirror editor
8cba543 feat: add FileTree component with animations
e4ce142 feat: add Convex CRUD with real-time subscriptions
f48421c feat: define Convex schema
3fee9bd feat: initialize Convex backend
170687f feat: add shadcn/ui components and Framer Motion
0ea9783 chore: initialize monorepo structure with bun
```

## License

MIT License - feel free to use for personal or commercial projects.

## Support

For issues or questions, please open a GitHub issue or reach out to the development team.

---

**Built with ❤️ using Next.js, Convex, shadcn/ui, and Framer Motion**
