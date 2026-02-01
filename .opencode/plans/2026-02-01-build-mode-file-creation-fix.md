# Build Mode File Creation Fix Plan

## Problem Summary

**Symptom**: In Build mode, the assistant starts thinking ("Iteration 1: Generating response..." appears), but then nothing happens:
- No text output in chat
- No tool calls shown
- No files created in explorer
- No artifacts queued

**Console shows**:
```
[useAgent] Event: thinking Iteration 1: Generating response...
[completionStream] Starting with model: glm-4.7
[completionStream] BaseURL: https://api.z.ai/api/coding/paas/v4
[completionStream] Tools: yes
```
Then silence - no more events.

## Root Cause Analysis

### Issue 1: No Error Handling in Streaming Loop
**Location**: `apps/web/lib/llm/providers/openai-compatible.ts:131-202`

The `completionStream` method has no try-catch around:
1. The `streamText()` call (line 142)
2. The streaming loop (lines 156-165)
3. The tool calls extraction (line 171)

If Z.ai returns an error, times out, or doesn't support the tool format, the generator silently fails.

### Issue 2: Z.ai Tool Support Unknown
**Location**: Multiple files

The user is using Z.ai's "coding" endpoint (`https://api.z.ai/api/coding/paas/v4`) with tools enabled. It's unclear if:
- Z.ai supports streaming with tools via OpenAI-compatible format
- The "coding" endpoint behaves differently than the standard API
- Tool calls are returned in a format the Vercel AI SDK can parse

### Issue 3: Missing Error Feedback
**Location**: `apps/web/lib/agent/runtime.ts:200-280`

The runtime consumes the stream but has no way to surface provider-level errors if the generator fails without yielding an 'error' chunk.

## Reproduction Steps

1. Open a project in the web app
2. Switch to Build mode
3. Send a message like "Create a simple React component"
4. Observe: "thinking" appears, then nothing
5. Check console: stream starts but yields no chunks

## Proposed Fixes

### Fix 1: Add Error Handling to completionStream (HIGH PRIORITY)

**File**: `apps/web/lib/llm/providers/openai-compatible.ts`

Add try-catch around the entire streaming operation and yield error chunks:

```typescript
async *completionStream(options: CompletionOptions): AsyncGenerator<StreamChunk> {
  try {
    // ... existing setup code ...
    
    const result = streamText({ ... });
    
    // Stream text deltas with error handling
    try {
      for await (const delta of result.textStream) {
        for (const chunk of splitForPerceivedStreaming(delta)) {
          yield { type: 'text', content: chunk };
        }
      }
    } catch (streamError) {
      yield {
        type: 'error',
        error: `Stream error: ${streamError instanceof Error ? streamError.message : String(streamError)}`,
      };
      return;
    }
    
    // Get final result with error handling
    try {
      const finalResult = await result;
      // ... tool calls and finish ...
    } catch (finalError) {
      yield {
        type: 'error',
        error: `Failed to complete: ${finalError instanceof Error ? finalError.message : String(finalError)}`,
      };
    }
  } catch (setupError) {
    yield {
      type: 'error',
      error: `Failed to start stream: ${setupError instanceof Error ? setupError.message : String(setupError)}`,
    };
  }
}
```

### Fix 2: Add Debug Logging to Trace Stream Events

**File**: `apps/web/lib/llm/providers/openai-compatible.ts`

Add detailed logging to understand what's happening:

```typescript
console.log('[completionStream] Starting with model:', options.model);
console.log('[completionStream] Messages count:', options.messages.length);
console.log('[completionStream] Tools provided:', options.tools?.length || 0);
console.log('[completionStream] First message preview:', options.messages[0]?.content?.slice(0, 100));
```

And in the loop:
```typescript
for await (const delta of result.textStream) {
  console.log('[completionStream] Received delta:', delta?.slice(0, 50));
  // ... rest of loop
}
```

### Fix 3: Add Z.ai-specific Tool Detection

**File**: `apps/web/lib/agent/runtime.ts`

Add a check for when the stream yields no content and no tool calls - this likely indicates an API issue:

```typescript
// After stream loop, check if we got nothing
if (!fullContent && pendingToolCalls.length === 0) {
  yield {
    type: 'error',
    error: 'Model produced no output. This may indicate the provider does not support tools or streaming.',
  };
  return;
}
```

### Fix 4: Consider Non-streaming Fallback for Z.ai with Tools

**File**: `apps/web/lib/llm/providers/openai-compatible.ts` (or `apps/web/lib/agent/runtime.ts`)

If Z.ai doesn't support streaming with tools, we could:
- Detect Z.ai provider
- Use `complete()` instead of `completionStream()` when tools are present
- Simulate streaming by yielding the full response in chunks

### Fix 5: Test Z.ai Without Tools

**Action**: Have user test Discuss mode (no tools) to verify Z.ai works at all.

If Discuss mode works but Build mode doesn't, the issue is definitely tool-related.

## Testing Plan

1. **Apply Fix 1 (error handling)** - This will at least show what's failing
2. **Test with logging** - Capture detailed logs of the Z.ai response
3. **Test Discuss mode** - Verify Z.ai works without tools
4. **If tools are the issue** - Implement non-streaming fallback or disable tools for Z.ai
5. **Verify files appear** - Once the model produces output, ensure files show in explorer

## Files to Modify

1. `apps/web/lib/llm/providers/openai-compatible.ts` - Add error handling and logging
2. `apps/web/lib/agent/runtime.ts` - Add empty response detection
3. `apps/web/hooks/useAgent.ts` - Ensure errors are displayed to user

## Success Criteria

- [ ] Error messages appear in UI when Z.ai fails
- [ ] Debug logs show what's happening with the stream
- [ ] If Z.ai + tools doesn't work, gracefully fallback or show clear message
- [ ] When working, files appear in explorer after Build mode completes
- [ ] Discuss mode continues to work normally

## Questions for User

1. Does Discuss mode work correctly with Z.ai?
2. Are you using the "Coding Plan" option in settings for Z.ai?
3. Have you tried with a different provider (OpenAI, OpenRouter) to compare?
4. What's the typical response time - does it hang indefinitely or just for a few seconds?

## Related Code References

- Provider: `apps/web/lib/llm/providers/openai-compatible.ts:131-202`
- Runtime: `apps/web/lib/agent/runtime.ts:170-280`
- Hook: `apps/web/hooks/useAgent.ts:380-450`
- Settings: `apps/web/app/settings/page.tsx:251-255`
