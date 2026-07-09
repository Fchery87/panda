# Artifact Advisor Review & GitHub Sync Fixes

## Overview

Fixed two issues related to artifact handling and GitHub file synchronization:

1. **High Priority**: Advisor-gated artifacts being marked as `failed` instead of staying `pending`
2. **Medium Priority**: GitHub sync rejecting binary files without content

---

## Issue 1: Advisor-Gated Artifacts Marked as Failed

### Problem

When artifacts required advisor review but no approval was present, they were being marked as `failed` and dropped from the pending queue. This happened because:

- `useAutoApplyArtifacts.ts` and `useArtifactLifecycle.ts` always passed `DEFAULT_ARTIFACT_ADVISOR_POLICY` into `applyArtifact`
- `applyArtifact` in `executeArtifact.ts` would throw an error when advisor review was required but missing
- The error caused the artifact to be marked as `failed` (lines 105, 179-180 in `executeArtifact.ts`)

### Solution

**Modified**: `apps/web/lib/artifacts/artifactController.ts`

Added a check in the controller layer before calling `applyArtifact`:

```typescript
// Don't apply if advisor review is required but not approved
if (preflight?.required && (!matchedAdvisorReview || matchedAdvisorReview.status !== 'approved')) {
  // Stay pending - do not mark as failed
  return null
}
```

This prevents the execution path from even starting if advisor review is required but not approved, keeping the artifact in `pending` state.

### Tests Added

**Modified**: `apps/web/lib/artifacts/artifactController.test.ts`

Added 2 new tests:
- `defers gated artifacts without approved review instead of marking them failed`
- `defers gated artifacts with non-approved review instead of marking them failed`

### Validation

```bash
✅ artifactController.test.ts: 5 pass / 0 fail
✅ executeArtifact.test.ts: 10 pass / 0 fail
```

---

## Issue 2: GitHub Sync Rejecting Binary Files Without Content

### Problem

The guard at `convex/githubConnections.ts:530-531` rejected **all** new files without content:

```typescript
if (!existing && file.content === undefined) {
  throw new Error(`Cannot sync new GitHub file without content: ${file.path}`)
}
```

This broke syncs for:
- Binary files (which may be synced as metadata-only)
- Any upstream file payloads that intentionally omit content

### Solution

**Modified**: `convex/githubConnections.ts`

Changed the guard to allow binary files without content:

```typescript
if (!existing && file.content === undefined && !file.isBinary) {
  throw new Error(`Cannot sync new GitHub file without content: ${file.path}`)
}
```

Now:
- ✅ Binary files can be created without content
- ✅ Text files still require content (guard preserved)

### Tests Updated

**Modified**: `convex/files.persistence.test.ts`

Updated the test to verify the binary file exception:

```typescript
expect(githubConnectionsSource).toContain('!existing && file.content === undefined && !file.isBinary')
```

### Validation

```bash
✅ files.persistence.test.ts: 3 pass / 0 fail
```

---

## Files Changed

1. `apps/web/lib/artifacts/artifactController.ts` - Added advisor review check
2. `apps/web/lib/artifacts/artifactController.test.ts` - Added 2 new tests
3. `convex/githubConnections.ts` - Fixed binary file guard
4. `convex/files.persistence.test.ts` - Updated test assertion

---

## Impact Assessment

### Issue 1 Impact
- **Before**: Risky artifacts were marked failed and lost from the queue
- **After**: Risky artifacts stay pending until user approves via advisor review
- **User Experience**: Users now see pending artifacts in the review queue instead of them disappearing as failed

### Issue 2 Impact
- **Before**: GitHub sync aborted when encountering binary files without content
- **After**: Binary files sync successfully, text files still require content
- **User Experience**: GitHub repository imports work correctly for repos with binary assets

---

## Testing Summary

All affected tests pass:

| Test File | Status | Tests |
|-----------|--------|-------|
| artifactController.test.ts | ✅ Pass | 5/5 |
| executeArtifact.test.ts | ✅ Pass | 10/10 |
| files.persistence.test.ts | ✅ Pass | 3/3 |

**Total**: 18 tests passing, 0 failures

---

## Migration Notes

No migration required. Both fixes are backward compatible:

1. Existing artifacts in `failed` state remain unchanged
2. New artifacts with missing advisor reviews stay `pending`
3. GitHub sync behavior unchanged for text files
4. Binary file sync now works as originally intended by the schema

