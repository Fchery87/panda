# Plan + Spec Unification - Final Model

## Single concept: Plan

A Plan is the user-facing approval surface. It is backed by `planningSessions`.

Lifecycle:

`intake -> drafting -> ready_for_review -> approved -> executing -> completed | failed | stale`

## Specifications become verification artifacts

- `specifications` is treated as a verification artifact store, not a separate approval system.
- A specification record stores pre/post-conditions, acceptance criteria, and drift signals.
- It is created automatically when a plan is generated.
- There is no separate user-facing spec approval gate.
- The old `tier: 'instant' | 'ambient' | 'explicit'` model is conceptually replaced by
  `verificationLevel: 'lightweight' | 'strict'`, derived from plan mode.

## UI consolidation

- Delete standalone approval surfaces for `SpecApproval`, `SpecPanel`, and `SpecBadge`.
- Keep verification results, but present them as plan verification output after execution.
- Approval flow becomes a single path:
  `PlanReview -> PlanApprove -> BuildFromPlan`

## Schema migration

- Add `verificationId?: v.id('specifications')` to `planningSessions`.
- Add `planningSessionId?: v.string()` to `specifications`.
- No destructive data migration is required; existing rows remain valid while UI stops surfacing spec approval separately.

## Code changes

- `useAgent` no longer drives a separate user-facing `spec_pending_approval` path when a planning session exists.
- `ProjectChatPanel` loses spec-only approval props and renders one unified plan approval surface.
- A unified `usePlanApproval` deriver becomes the single source of truth for plan review/build gating.
