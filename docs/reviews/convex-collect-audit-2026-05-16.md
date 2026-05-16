# Convex `.collect()` Audit

Date: 2026-05-16

Panda now has **0** production `.collect()` calls in `convex/**/*.ts`, excluding
tests and generated code.

The machine-readable policy is
[`docs/convex-collect-audit.json`](../convex-collect-audit.json), enforced by:

```bash
bun run convex:collect:audit
```

## What changed

- High-risk `admin`, `messages`, `chats`, `projects`, and `files` calls were
  replaced with bounded `.take(...)` reads.
- Remaining production `.collect()` calls in attachments, providers, planning
  sessions, subagents, evals, jobs, checkpoints, sharing, and artifacts were
  also replaced with bounded `.take(...)` reads.

## Follow-up

Bounded `.take(...)` is a bandwidth guard and compatibility step. For
user-growing interactive surfaces, prefer true cursor pagination or aggregate
tables when changing API contracts is acceptable.
