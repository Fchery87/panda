# Plan: Project Font Update

## Milestone 1: Swap Font Providers

What: Replace the current UI/code font providers and fallback stacks with Inter
and GeistMono while preserving existing CSS variables.

Acceptance criteria: `apps/web/app/layout.tsx`, `apps/web/app/globals.css`, and
`apps/web/tailwind.config.ts` consistently route sans text to Inter and mono
text to GeistMono.

Validation: `bun run typecheck && bun run lint && bun run format:check`

Status: [x] complete

## Milestone 2: Dependency Metadata

What: Add the required `geist` package to the web app dependency metadata and
lockfile.

Acceptance criteria: `apps/web/package.json` and `bun.lock` include the
dependency needed for `geist/font/mono`.

Validation: `bun install --lockfile-only`

Status: [x] complete
