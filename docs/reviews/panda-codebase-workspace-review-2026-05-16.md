# Panda Codebase + Workspace Review

Date: 2026-05-16

## Scope

A first-party Go scan found no `go.mod`, `go.work`, or non-vendored `.go` files.
Panda is currently a TypeScript monorepo built on Next.js, Convex, Bun, and
Turborepo.

## Improvements Applied

- Workspace Home now presents workspace vitals, Workspace Map, Review Checklist,
  and Important Commands.
- Agent runtime split initiated:
  - `runtime-active-spec.ts` for active-spec prompt rendering
  - `runtime-config.ts` for runtime defaults
  - `runtime-types.ts` for public runtime event/tool types
- Command metadata source of truth added at `docs/development-commands.json`,
  rendered through `@/lib/product/development-commands`.
- Drift guard added: `bun run docs:commands:check`.
- Convex `.collect()` audit added at `docs/convex-collect-audit.json` with guard
  `bun run convex:collect:audit`.

## Remaining Refactors

1. Continue splitting `apps/web/lib/agent/harness/runtime.ts` by orchestration
   phase.
2. Replace high-risk Convex `.collect()` usage in admin, chats, messages,
   projects, and files.
3. Add a workspace route map that ties UI surfaces to source files and tests.
4. If Go becomes a real scope, add `go test ./...`, `gofmt`, `go vet`, and
   module vulnerability scanning to CI.
