# Panda Code Search Core Tooling Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to
> implement this plan task-by-task.

**Goal:** Make code search a first-class, safe, and reliable core capability in
Panda for serious coding-agent workflows, with `ripgrep` as primary engine,
`git grep` and `grep` as degraded fallbacks, and `ast-grep` as complementary
structural search.

**Architecture:** Introduce a dedicated `search_code` agent tool and a
server-side search execution layer that enforces workspace boundaries,
denylisted paths, strict caps, and normalized JSON results. Keep fallback
routing in one engine selector module so all callers see the same output
contract regardless of backend (`rg`, `git grep`, `grep`). Add a separate
optional `search_code_ast` capability backed by `ast-grep` for syntax-aware
matching.

**Tech Stack:** Next.js 16 route handlers, existing Panda agent runtime/tooling
(`apps/web/lib/agent/*`), Node child process spawning, Convex jobs/artifacts
pipeline, Bun tests and Playwright.

## Why This Plan

Panda currently exposes `read_files`, `write_files`, and `run_command` tools,
but has no dedicated code-search tool. Search can be done only indirectly
through shell commands, which is inconsistent, hard to parse, and weak on safety
controls.

For Panda’s online browser-IDE model, a dedicated search tool should be core
infrastructure because it:

1. Improves agent precision and reduces unnecessary full-file reads.
2. Enables predictable, UI-friendly output and tighter safety enforcement.
3. Supports progressive capability growth (`text search` -> `AST search` ->
   optional indexed search).

## Recommendation Matrix (Latest Context)

### Primary recommendation

1. Use `ripgrep` (`rg`) as the default text search engine.

### Complementary recommendation

1. Add `ast-grep` for structure-aware searches and codemod-ready analysis; do
   not use it as a generic text-search replacement.

### Fallback recommendation

1. If `rg` is unavailable, use `git grep` in Git repositories.
2. If `git grep` is unavailable (or not in a repo), fall back to `grep` as last
   resort.

### “Is there something better than ripgrep?”

1. For non-indexed local repo search in IDE/agent flows, no clear general
   replacement is better than `ripgrep` today.
2. For very large multi-repo/monorepo indexed search, engines like
   Zoekt/Sourcegraph-style indexing can outperform on repeated global queries,
   but with significantly higher operational complexity.
3. Therefore: `rg` should be primary now; treat indexed search as a future scale
   phase, not MVP.

## Scope

### In scope

1. New first-class text search tool with normalized JSON response.
2. Safe execution controls (workspace-only, denylist, caps, timeout,
   cancellation hooks).
3. Engine fallback chain (`rg` -> `git grep` -> `grep`).
4. Complementary AST search surface using `ast-grep`.
5. Unit/integration tests and agent/runtime integration.

### Out of scope (phase 1)

1. Full distributed indexing cluster (Zoekt/Sourcegraph deployment).
2. Semantic/vector search replacement of lexical/AST search.
3. Cross-tenant global search.

## Proposed Public Interfaces

### Tool: `search_code`

Add to `apps/web/lib/agent/tools.ts`:

1. `name`: `search_code`
2. `description`: Search text patterns across project files with safe limits and
   structured output.
3. Parameters:
   - `query: string` (required)
   - `mode: 'literal' | 'regex'` (default `literal`)
   - `caseSensitive: boolean` (default `false`)
   - `includeGlobs?: string[]`
   - `excludeGlobs?: string[]`
   - `paths?: string[]` (relative only)
   - `maxResults?: number` (default 200, hard max 1000)
   - `maxMatchesPerFile?: number` (default 50, hard max 200)
   - `contextLines?: number` (default 0, hard max 3)
   - `timeoutMs?: number` (default 8000, hard max 15000)

### Tool: `search_code_ast`

Add optional second tool:

1. `name`: `search_code_ast`
2. Parameters:
   - `pattern: string` (required)
   - `language?: string`
   - `paths?: string[]`
   - `maxResults?: number`
   - `jsonStyle?: 'stream' | 'compact'`

### Normalized result contract (both tools)

```ts
interface SearchMatch {
  file: string
  line: number
  column: number
  endLine?: number
  endColumn?: number
  snippet: string
  submatches?: Array<{ start: number; end: number; text?: string }>
}

interface SearchResponse {
  engine: 'ripgrep' | 'git-grep' | 'grep' | 'ast-grep'
  query: string
  mode: 'literal' | 'regex' | 'ast'
  truncated: boolean
  stats: {
    durationMs: number
    filesScanned?: number
    filesMatched: number
    matchesReturned: number
  }
  warnings: string[]
  matches: SearchMatch[]
}
```

## Safety Model

### Hard controls (must-have)

1. Workspace confinement:
   - Resolve all input paths against project root and reject path traversal.
2. Denylist protected paths:
   - `.git/`, `.next/`, `node_modules/`, `.env*`, `*.pem`, `*.key`, `dist/`,
     `coverage/`, large generated dirs.
3. Strict resource limits:
   - process timeout, max output bytes, max match count, max per-file matches.
4. Engine allowlist only:
   - only run known executable patterns; no arbitrary shell composition for
     search tool.
5. JSON-only parsing path:
   - parse structured output, do not scrape colored/plain text output.
6. Redaction layer:
   - redact potential secret-like substrings in returned snippets when
     configured.

### Soft controls (recommended)

1. Cancellation token support from UI/agent runtime.
2. Server-side rate limiting per project/user for repeated expensive queries.
3. Telemetry counters for timeout rate, truncation rate, and fallback frequency.

## Engine Strategy

### Engine selection order

1. Prefer `rg` when available.
2. Use `git grep` if inside a git repo and `rg` unavailable.
3. Use `grep` last.

### Feature parity notes

1. `rg` should be the only engine with full behavior parity (best effort for
   others).
2. `git grep` and `grep` adapters must normalize missing fields and append
   warning strings in response.
3. Regex semantics differ by engine; expose this in warnings when fallback
   engine is used.

## Implementation Plan (Task-by-Task)

### Task 1: Add shared search types and validation

**Files:**

- Create: `apps/web/lib/agent/search/types.ts`
- Create: `apps/web/lib/agent/search/validate.ts`
- Test: `apps/web/lib/agent/search/validate.test.ts`

**Steps:**

1. Define `SearchRequest`, `SearchResponse`, and engine enums.
2. Implement request validation and clamping (max limits, defaults).
3. Add path normalization helper and traversal rejection.
4. Write validation tests for valid/invalid payloads.
5. Run: `bun test apps/web/lib/agent/search/validate.test.ts`

### Task 2: Build engine adapters (`rg`, `git grep`, `grep`, `ast-grep`)

**Files:**

- Create: `apps/web/lib/agent/search/engines/ripgrep.ts`
- Create: `apps/web/lib/agent/search/engines/gitGrep.ts`
- Create: `apps/web/lib/agent/search/engines/grep.ts`
- Create: `apps/web/lib/agent/search/engines/astGrep.ts`
- Create: `apps/web/lib/agent/search/engines/index.ts`
- Test: `apps/web/lib/agent/search/engines/engines.test.ts`

**Steps:**

1. Implement command builders (argument arrays, no shell interpolation).
2. Add availability checks (`which rg`, etc.) with memoized probing.
3. Parse outputs to normalized `SearchResponse` shape.
4. Add warning injection for capability gaps on fallback engines.
5. Test parse correctness and fallback ordering.

### Task 3: Add safe process runner for search

**Files:**

- Create: `apps/web/lib/agent/search/runner.ts`
- Modify: `apps/web/app/api/jobs/execute/route.ts` (reuse caps/constants if
  practical)
- Test: `apps/web/lib/agent/search/runner.test.ts`

**Steps:**

1. Implement spawn wrapper with timeout, byte caps, and non-zero exit handling.
2. Enforce cwd confinement and no-shell by default.
3. Return structured execution metadata (duration, timedOut, truncated).
4. Add tests for timeout and output truncation handling.

### Task 4: Add server API endpoint for search

**Files:**

- Create: `apps/web/app/api/search/route.ts`
- Create: `apps/web/lib/agent/search/service.ts`
- Test: `apps/web/app/api/search/route.test.ts`

**Steps:**

1. Add POST endpoint receiving `SearchRequest`.
2. Validate input, resolve project root, apply denylist and limits.
3. Select engine and execute via runner.
4. Return normalized JSON with warnings/stats.
5. Add route tests for reject/allow and fallback behavior.

### Task 5: Extend agent tool surface

**Files:**

- Modify: `apps/web/lib/agent/tools.ts`
- Modify: `apps/web/lib/agent/prompt-library.ts`
- Modify: `apps/web/lib/agent/runtime.ts`
- Test: `apps/web/lib/agent/runtime.progress.test.ts`
- Test: `apps/web/lib/agent/runtime.build-mode.test.ts`

**Steps:**

1. Add `search_code` and `search_code_ast` definitions in `AGENT_TOOLS`.
2. Extend `ToolContext` with `searchCode` and `searchCodeAst` handlers.
3. Implement tool execution cases and output formatting.
4. Update prompt guidance to prefer `search_code` before bulk reads.
5. Add runtime tests for search tool invocation and progress events.

### Task 6: Add UI integration for deterministic project search

**Files:**

- Create: `apps/web/hooks/useProjectSearch.ts`
- Create: `apps/web/components/workbench/ProjectSearchPanel.tsx`
- Modify: relevant workbench container (likely
  `apps/web/components/workbench/*`)
- Test: `apps/web/components/workbench/ProjectSearchPanel.test.tsx`

**Steps:**

1. Add hook for calling `/api/search` with debounce + cancel support.
2. Add filter controls (mode, case sensitivity, include/exclude globs).
3. Render grouped results with file/line/snippet.
4. Handle warnings (fallback engine, truncation, timeout) in UI.
5. Add component tests for success/error/loading states.

### Task 7: Add observability + policy controls

**Files:**

- Create: `apps/web/lib/agent/search/telemetry.ts`
- Modify: settings/policy surfaces if needed (`convex/settings.ts`,
  `apps/web/app/settings/page.tsx`)
- Test: `apps/web/lib/agent/search/telemetry.test.ts`

**Steps:**

1. Emit metrics: engine used, duration, timeout, truncated, fallback count.
2. Add optional project policy toggles (e.g., allow AST search, default caps).
3. Ensure sensitive query content is not logged raw.
4. Add tests for telemetry payload safety.

### Task 8: Verification and rollout

**Files:**

- Modify: `docs/plans` or `docs/*` for operator notes
- Optional: add runbook for fallback troubleshooting

**Steps:**

1. Run targeted tests for search modules and runtime integration.
2. Run full quality gate:
   - `bun run typecheck`
   - `bun run lint`
   - `bun run format:check`
   - `bun test`
3. Perform manual smoke tests in a sample project.
4. Gate release with feature flag if needed, then default-on once stable.

## Risk Register and Mitigations

1. Risk: Search leaks sensitive files.
   - Mitigation: hard denylist + root confinement + path validation + optional
     redaction.
2. Risk: Tenant resource abuse through broad queries.
   - Mitigation: strict caps, timeout, per-user rate limits, cancellation.
3. Risk: Engine mismatch causes inconsistent behavior.
   - Mitigation: single normalized contract + warnings + tests by engine.
4. Risk: Regex DoS / pathological patterns.
   - Mitigation: timeout, regex size/input limits, optional literal default.
5. Risk: Output overrun and UI hangs.
   - Mitigation: byte cap, max match cap, pagination-ready response.
6. Risk: Operational fragility when binaries are missing.
   - Mitigation: startup diagnostics, engine probing cache, explicit
     degraded-mode warnings.

## Acceptance Criteria

1. Panda exposes a first-class `search_code` tool and uses it in agent
   workflows.
2. Search executes only within project workspace and never returns denylisted
   path content.
3. Responses are normalized JSON regardless of engine backend.
4. Fallback works automatically (`rg` -> `git grep` -> `grep`) with user-visible
   warning metadata.
5. AST search is available as complementary capability via `search_code_ast`.
6. All new tests pass and full project quality gates remain green.
7. Search latency and truncation metrics are observable for ongoing tuning.

## Top Recommendations for Panda (Priority Order)

1. Ship `search_code` with `ripgrep` primary immediately; this is foundational
   for agent quality.
2. Add `ast-grep` in same milestone or immediately after for syntax-aware
   operations.
3. Keep fallback chain but clearly label degraded modes in both agent results
   and UI.
4. Treat indexed search (Zoekt-like) as Phase 2 only when usage metrics justify
   complexity.
5. Add policy controls and telemetry from day one to proactively manage
   safety/performance cons.

## External Research Notes (as of 2026-02-07)

1. `ripgrep` current releases are far ahead of the `0.7.1` docs reference
   (latest listed: `15.1.0`, with `15.0.0` released October 2025).
2. `ripgrep --json` is suitable for structured machine parsing and remains the
   best fit for local unindexed code search.
3. `ast-grep` provides mature JSON output and strong TypeScript/TSX structural
   search support.
4. `git grep` remains a practical Git-aware fallback with threading and useful
   match controls.
5. Indexed engines (Zoekt/Sourcegraph-style) are strong at large scale but add
   deployment and indexing complexity.

## References

1. ripgrep changelog:
   https://raw.githubusercontent.com/BurntSushi/ripgrep/master/CHANGELOG.md
2. ripgrep release 15.0.0:
   https://github.com/BurntSushi/ripgrep/releases/tag/15.0.0
3. ripgrep docs.rs latest: https://docs.rs/crate/ripgrep/latest/source/GUIDE.md
4. git grep docs: https://git-scm.com/docs/git-grep
5. ast-grep home: https://ast-grep.github.io/
6. ast-grep JSON mode: https://ast-grep.github.io/guide/tools/json.html
7. ast-grep CLI reference: https://ast-grep.github.io/reference/cli.html
8. Zoekt package/readme entry point:
   https://pkg.go.dev/github.com/sourcegraph/zoekt
