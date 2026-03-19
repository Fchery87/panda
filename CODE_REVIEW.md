# Code Review: Panda Agentic IDE

**Date:** March 18, 2026
**Scope:** Full codebase
**Profile:** Perfectionist validation
**Health Score:** 82/100

---

## Executive Summary

Panda is a well-structured Next.js + Convex agentic IDE with strong **type safety** and **security foundations**, but has **two critical test failures**, **51 linting warnings**, and significant **gaps in the specification system persistence and error handling**.

**Verdict:** ❌ **Not production-ready. Critical issues must be resolved before merging.**

---

## Validation Results

| Check | Status | Details |
|-------|--------|---------|
| TypeScript | ✅ PASS | 0 type errors (24.6s) |
| Linting | ⚠️ WARNINGS | 51 warnings (0 errors, mostly unused imports) |
| Build | ✅ PASS | Production build clean (4m2s) |
| Format | ✅ PASS | All files properly formatted |
| Tests | ❌ FAIL | 557 pass, **2 fail** |
| Security Audit | ⏳ PENDING | Dependency check in progress |

---

## Critical Issues

### 1. **Test Failure: Spec Approval Lifecycle Broken**
**File:** `apps/web/lib/agent/runtime.harness-adapter.test.ts:950`
**Severity:** CRITICAL
**Status:** Blocking

The explicit spec approval flow doesn't emit a `complete` event after resuming execution:

```
Expected: true
Received: false
```

**Impact:** Users cannot verify specs are enforced; feature is broken.

**Fix:** Debug `runtime.ts` lines 560-590 to ensure the approval resume path yields the `complete` event.

---

### 2. **Test Timeout: Fenced Code Rewrite Mechanism**
**File:** `apps/web/lib/agent/runtime.harness-adapter.test.ts` (skipped test)
**Severity:** CRITICAL
**Status:** Blocking

The safeguard against leaking fenced code blocks into the chat times out after 5 seconds, indicating a deadlock or performance issue in the rewrite loop.

**Impact:** The feature that prevents implementation code from appearing in the UI is unreliable.

**Fix:** Trace the rewrite logic in `runtime.ts` ~1300-1350, add timeout handling, break into smaller tests.

---

### 3. **Spec Persistence Layer Not Wired**
**File:** `apps/web/lib/agent/harness/plugins.ts` + `hooks/useAgent.ts`
**Severity:** CRITICAL
**Status:** Known gap (documented in memory)

The spec system generates and emits events, but **never calls Convex mutations** to persist specs:

- ✅ Plugin emits `spec_generated`, `spec_pending_approval`, `spec_verification`
- ✅ UI listens to these events
- ✅ DB schema exists (`convex/specifications` table)
- ❌ Runtime calls `api.specifications.*` — **missing**

Specifications are ephemeral and lost when the session ends.

**Impact:** Specs cannot be reviewed, shared, or tracked. Entire feature is non-functional.

**Fix:** Wire event handlers in `useAgent.ts` to call `mutations.specifications.create()`, `updateVerification()`, etc.

**Effort:** 2-3 hours

---

### 4. **Drift Detection Plugin Disabled by Default**
**File:** `apps/web/lib/agent/runtime.ts:L232, engine.ts:L83`
**Severity:** HIGH
**Status:** Configuration issue

```typescript
enableDriftDetection: false  // ← Disabled
```

The drift detection plugin is registered but disabled by default. Spec constraints are never validated against code changes.

**Fix:** Change to `true` and ensure `registerActiveSpec()` is called when spec becomes active.

---

### 5. **LLM Classification & Verification Stubbed**
**Files:** `spec/classifier.ts`, `spec/verifier.ts`
**Severity:** HIGH

Both use **heuristic fallbacks** instead of real LLM integration:

```typescript
// verifier.ts line 303
try {
  const llmResult = JSON.parse(jsonMatch[0])
} catch {
  // Falls back to keyword matching
  return keywords.some(k => output.includes(k))
}
```

Spec classification and verification are imprecise. Complex criteria cannot be reliably evaluated.

**Fix:** Implement proper LLM provider integration. Effort: 4-5 hours.

---

## High Priority Issues

### 6. **Unused Imports & Variables (Linting)**
**Severity:** HIGH (blocks merge)
**Count:** 51 warnings

Key files:
- `useAgent.ts`: 14 warnings (unused imports, missing React Hook dependencies)
- `CodeMirrorEditor.tsx`: 4 warnings
- `ChatInput.tsx`: 4 warnings
- `lsp-completion.ts`: 5 warnings (including unused eslint-disable)

**Impact:** Harder to reason about code; missing React Hook dependencies could cause subtle bugs.

**Fix:**
1. Run `turbo run lint -- --fix` (auto-fixes 3)
2. Manually remove 50+ unused imports/variables
3. Add missing dependencies to useCallback hooks

**Effort:** 1-2 hours

---

### 7. **React Hook Missing Dependencies**
**File:** `useAgent.ts:414, 452, 1404`
**Severity:** HIGH

Three `useCallback` hooks missing dependencies:

```typescript
useCallback(handleApproval, [
  // Missing: setCurrentSpec, setPendingSpec
  // This could cause stale closures
])
```

**Fix:** Add missing deps to each useCallback, or refactor if it causes infinite loops.

---

## Medium Priority Issues

### 8. **RegExp DoS Vulnerability**
**File:** `api/search/replace/route.ts:L48`
**Severity:** MEDIUM

Arbitrary user-supplied regex patterns without validation:

```typescript
const pattern = new RegExp(body.searchText, flags)  // ← No complexity check
```

A regex like `(a+)+b` could cause exponential backtracking (ReDoS).

**Fix:** Validate regex complexity, timeout handler, rate limiting.

---

### 9. **Inconsistent JSON Parsing Error Handling**
**Files:** `runtime.ts`, `classifier.ts`, `verifier.ts`
**Severity:** MEDIUM

Multiple locations call `JSON.parse()` without consistent error handling. Some have fallbacks, others don't.

**Fix:** Create a utility `safeJSONParse<T>(str, fallback): T` and use consistently.

---

### 10. **String.replace() Doesn't Handle Capture Groups**
**File:** `api/search/replace/route.ts:L52-55`
**Severity:** MEDIUM

```typescript
const newContent = content.replace(pattern, (...args) => {
  replacements++
  return body.replaceText  // ← Ignores matched groups
})
```

Capture group references like `$1`, `$2` won't work.

**Fix:** Check if `replaceText` contains `$N` and use capture groups from `args`, or document limitation.

---

## Code Quality Summary

| Aspect | Grade | Notes |
|--------|-------|-------|
| Type Safety | A | 0 type errors, comprehensive interfaces |
| Testing | B | 99% pass rate, but 2 critical failures |
| Linting | C | 51 warnings (mostly unused code) |
| Security | B | Good input validation, but RegExp DoS and JSON parsing gaps |
| Error Handling | C | Inconsistent try-catch patterns |
| Documentation | C | Code is readable, but spec system underdocumented |
| Architecture | B | Good separation of concerns, but missing persistence layer |

---

## Security Assessment

**Overall:** ⚠️ **Adequate with gaps**

**Strengths:**
- ✅ Command injection prevention (SSRF patterns, meta-char filtering in `route.ts:44-55`)
- ✅ Path traversal prevention (all file operations validate `startsWith(cwd)`)
- ✅ Authentication checks on all protected APIs (`isAuthenticatedNextjs()`)
- ✅ Error message redaction (sensitive LLM errors sanitized)

**Weaknesses:**
- ❌ RegExp DoS vulnerability in replace endpoint
- ❌ JSON parsing without consistent error handling
- ⚠️ Tool permission system depends on correct event bus wiring (untested)

---

## Checklist Review

### Requirement Coverage
- ✅ Spec-native execution architecture
- ✅ Multi-step agent reasoning with tools
- ⚠️ Specification persistence (not wired)
- ⚠️ Spec approval flow (test failure)
- ❌ Drift detection (disabled by default)

### Contract & Schema Alignment
- ✅ TypeScript strict mode enforced
- ✅ Convex schema matches usage
- ⚠️ `specifications` table exists but mutations not called

### Error Handling & Cleanup
- ⚠️ Inconsistent JSON parsing fallbacks
- ✅ Process cleanup in job execution (registerJobProcess/cleanupJobProcess)
- ⚠️ Tool timeout handling needs improvement

### Authentication & Authorization
- ✅ All APIs check `isAuthenticatedNextjs()`
- ✅ Permission system integrated
- ⚠️ Permission event bus not fully tested

### Concurrency & Race Conditions
- ⚠️ Spec state transitions not atomic (pending, approved, executing)
- ⚠️ Checkpoint store may have race conditions under rapid updates

### Performance
- ✅ Context compaction implemented
- ✅ Token usage tracking in place
- ⚠️ No observability into when compaction is triggered

### Test Adequacy
- ⚠️ 99% pass rate but 2 critical failures in spec system
- ✅ Good coverage of command execution and tool calling
- ❌ Missing tests for: spec persistence, drift detection enabled

### Observability
- ✅ Structured logging (`appLog` utility)
- ⚠️ Missing metrics for spec events, compaction frequency
- ⚠️ LLM fallback heuristics not logged

### Documentation & Migration Impact
- ⚠️ Spec system underdocumented
- ❌ No CHANGELOG entry for spec system
- ⚠️ Migration plan for spec table schema missing

---

## Merge Readiness

### Blockers (Must Fix)
1. ❌ Fix test: Spec approval lifecycle (CRITICAL)
2. ❌ Fix test: Fenced code rewrite timeout (CRITICAL)
3. ❌ Remove/fix 51 linting warnings (blocks CI)
4. ⚠️ Wire spec persistence (optional MVP, but recommended)

### Can Merge With Caveats
- Document that drift detection is opt-in (disabled by default)
- Document that spec classifier/verifier use heuristic fallbacks
- Add issue tickets for the 3 medium-priority items

### Recommendations

**Before Merge:**
1. Fix the 2 test failures (1-2 days)
2. Clean up linting warnings (1-2 hours)
3. Consider wiring spec persistence (2-3 hours) — **recommended**

**After Merge (Roadmap):**
1. Enable drift detection and test thoroughly
2. Implement real LLM classification and verification
3. Add comprehensive spec system documentation
4. Add metrics/observability for spec lifecycle

---

## Final Verdict

**Status:** ❌ **DO NOT MERGE**

**Reason:** 2 critical test failures block production readiness. Linting warnings prevent CI/CD. Spec persistence not wired means core feature is non-functional.

**Timeline to Production:** 2-3 days (fix tests + warnings + optionally wire persistence)

**Risk if merged as-is:** Spec approval feature broken; specs lost on session end; latent concurrency bugs in checkpoint store.

