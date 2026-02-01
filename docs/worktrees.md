# Worktrees: Local Dev Setup

This repo uses Git worktrees under `.worktrees/`. Worktrees do **not** automatically share untracked files like `.env.local`, and each worktree has its own `node_modules`/Bun install state.

## `.env.local`

If you create a new worktree, copy your environment file into it:

```bash
# From the main repo root
cp .env.local .worktrees/<worktree-name>/.env.local
```

Without this, you’ll see errors like:
- `No address provided to ConvexReactClient` (missing `NEXT_PUBLIC_CONVEX_URL`)

## Convex

Run Convex from the **repo root of the worktree** (the directory that contains `package.json` and `convex/`):

```bash
cd .worktrees/<worktree-name>
bun install
bunx convex dev
```

Common failure mode:
- Running `bunx convex dev` from `.worktrees/` (the parent directory) → `Unable to read your package.json`

If you see:
- `Module not found: Can't resolve '@convex/_generated/api'`

…it means codegen didn’t run for that worktree. Starting `bunx convex dev` from the correct worktree root will generate `convex/_generated/*`.

