# Panda — Agent Orientation

Panda is a spec-native agentic IDE: a Next.js + Convex web application where AI
agents plan, write, and execute code inside a live browser-based runtime
(WebContainer). The agent harness (`apps/web/lib/agent/harness/`) orchestrates
multi-step runs across any capable LLM provider.

---

## Before You Touch Code

1. **Read `AGENTS.md`** — project conventions, design system, architecture, and
   the full execution model. This is the primary reference for all work.
2. **Read `convex/_generated/ai/guidelines.md`** — required before any changes
   to Convex queries, mutations, or schema. These rules override training data.
3. **Assess task scope** — one file or many? Short fix or multi-step feature?
   Scale your approach accordingly (see Execution Model below).

---

## Execution Model

Every task, regardless of size, follows the same loop:

```
Plan → Execute → Validate → Repair → Document → repeat
```

**For small tasks** (1–2 files, single purpose): run the validation gate at the
end, update a brief status note before finishing.

**For larger tasks** (>3 files, >10 steps, or parallel work streams): before
writing any code, create three working files in the repo root:

- `SPEC.md` — deliverables and constraints, frozen at the start. Never mutate
  mid-run.
- `PLAN.md` — named milestones, each with acceptance criteria and the exact
  validation command to run.
- `STATUS.md` — live audit log: what was done, decisions made, blockers, future
  work discovered mid-run.

Run the validation gate after every milestone:

```bash
bun run typecheck && bun run lint && bun test
```

Repair before advancing. Never proceed past a failing gate.

**Context limit**: the harness auto-compacts context when it approaches the
threshold. Before that happens, write progress and decisions to `STATUS.md` so
the compacted run can continue with full ground truth.

---

## Parallel Work (Vertical Tasks)

Use git worktrees (supported via `lib/agent/harness/snapshots.ts`) to isolate
concurrent work streams. Define the merge contract in `PLAN.md` before starting.
Each stream must pass its validation gate independently before merging.

---

## Where to Go Next

| Need                                      | File                                 |
| ----------------------------------------- | ------------------------------------ |
| Code conventions, design system, patterns | `AGENTS.md`                          |
| Convex backend rules                      | `convex/_generated/ai/guidelines.md` |
| Harness architecture                      | `docs/AGENTIC_HARNESS.md`            |
| Schema                                    | `convex/schema.ts`                   |

---

## Agent skills

### Issue tracker

Issues are tracked in GitHub Issues for `Fchery87/panda`. See `docs/agents/issue-tracker.md`.

### Triage labels

Triage uses the default canonical labels: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, and `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

This repo uses a single-context domain docs layout rooted at `CONTEXT.md`, with ADRs under `docs/adr/` when present. See `docs/agents/domain.md`.

---

<!-- convex-ai-start -->

This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read `convex/_generated/ai/guidelines.md`
first** for important guidelines on how to correctly use Convex APIs and
patterns. The file contains rules that override what you may have learned about
Convex from training data.

Convex agent skills for common tasks can be installed by running
`npx convex ai-files install`.

<!-- convex-ai-end -->
