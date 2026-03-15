module.exports = [
"[project]/apps/web/hooks/useProjectSearch.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "useProjectSearch",
    ()=>useProjectSearch
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.bun/next@16.1.6+f27840211c12abb1/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
'use client';
;
const DEBOUNCE_MS = 220;
function useProjectSearch() {
    const [state, setState] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])({
        query: '',
        isLoading: false,
        error: null,
        engine: null,
        warnings: [],
        truncated: false,
        stats: null,
        matches: []
    });
    const debounceTimerRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(null);
    const abortControllerRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(null);
    const clearSearch = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])(()=>{
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
            debounceTimerRef.current = null;
        }
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }
        setState((prev)=>({
                ...prev,
                query: '',
                isLoading: false,
                error: null,
                engine: null,
                warnings: [],
                truncated: false,
                stats: null,
                matches: []
            }));
    }, []);
    const search = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])(async (query, options = {})=>{
        const trimmed = query.trim();
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
            debounceTimerRef.current = null;
        }
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }
        if (!trimmed) {
            setState((prev)=>({
                    ...prev,
                    query: '',
                    isLoading: false,
                    error: null,
                    engine: null,
                    warnings: [],
                    truncated: false,
                    stats: null,
                    matches: []
                }));
            return;
        }
        setState((prev)=>({
                ...prev,
                query: trimmed,
                isLoading: true,
                error: null
            }));
        await new Promise((resolve)=>{
            debounceTimerRef.current = setTimeout(()=>{
                debounceTimerRef.current = null;
                resolve();
            }, DEBOUNCE_MS);
        });
        const controller = new AbortController();
        abortControllerRef.current = controller;
        try {
            const response = await fetch('/api/search', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    type: 'text',
                    query: trimmed,
                    mode: options.mode ?? 'literal',
                    caseSensitive: options.caseSensitive ?? false,
                    includeGlobs: options.includeGlobs,
                    excludeGlobs: options.excludeGlobs,
                    paths: options.paths,
                    maxResults: options.maxResults,
                    maxMatchesPerFile: options.maxMatchesPerFile,
                    contextLines: options.contextLines,
                    timeoutMs: options.timeoutMs
                }),
                signal: controller.signal
            });
            if (!response.ok) {
                const payload = await response.json().catch(()=>null);
                throw new Error(payload?.error || 'Search failed');
            }
            const payload = await response.json();
            setState((prev)=>({
                    ...prev,
                    isLoading: false,
                    error: null,
                    engine: payload.engine,
                    warnings: payload.warnings,
                    truncated: payload.truncated,
                    stats: payload.stats,
                    matches: payload.matches
                }));
        } catch (error) {
            if (controller.signal.aborted) return;
            setState((prev)=>({
                    ...prev,
                    isLoading: false,
                    error: error instanceof Error ? error.message : 'Search failed',
                    engine: null,
                    warnings: [],
                    truncated: false,
                    stats: null,
                    matches: []
                }));
        } finally{
            if (abortControllerRef.current === controller) {
                abortControllerRef.current = null;
            }
        }
    }, []);
    return {
        state,
        search,
        clearSearch
    };
}
}),
"[project]/apps/web/hooks/useJobs.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>__TURBOPACK__default__export__,
    "useJobs",
    ()=>useJobs
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$logger$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/lib/logger.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.bun/next@16.1.6+f27840211c12abb1/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$convex$40$1$2e$32$2e$0$2b$b1ab299f0a400331$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$react$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/.bun/convex@1.32.0+b1ab299f0a400331/node_modules/convex/dist/esm/react/index.js [app-ssr] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$convex$40$1$2e$32$2e$0$2b$b1ab299f0a400331$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$react$2f$client$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.bun/convex@1.32.0+b1ab299f0a400331/node_modules/convex/dist/esm/react/client.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$convex$2f$_generated$2f$api$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/convex/_generated/api.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$sonner$40$2$2e$0$2e$7$2b$bf16f8eded5e12ee$2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.bun/sonner@2.0.7+bf16f8eded5e12ee/node_modules/sonner/dist/index.mjs [app-ssr] (ecmascript)");
'use client';
;
;
;
;
;
function useJobs(projectId) {
    // Query for job list (auto-updates via Convex subscription)
    const jobs = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$convex$40$1$2e$32$2e$0$2b$b1ab299f0a400331$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$react$2f$client$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useQuery"])(__TURBOPACK__imported__module__$5b$project$5d2f$convex$2f$_generated$2f$api$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["api"].jobs.list, {
        projectId
    });
    // Query for real-time log streaming of the most recent running job
    const runningJobs = jobs?.filter((job)=>job.status === 'running') || [];
    const latestRunningJob = runningJobs[0];
    // Real-time log subscription for the running job
    const streamingLogs = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$convex$40$1$2e$32$2e$0$2b$b1ab299f0a400331$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$react$2f$client$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useQuery"])(__TURBOPACK__imported__module__$5b$project$5d2f$convex$2f$_generated$2f$api$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["api"].jobs.streamLogs, latestRunningJob ? {
        jobId: latestRunningJob._id
    } : 'skip');
    // Mutations
    const createJobMutation = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$convex$40$1$2e$32$2e$0$2b$b1ab299f0a400331$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$react$2f$client$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMutation"])(__TURBOPACK__imported__module__$5b$project$5d2f$convex$2f$_generated$2f$api$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["api"].jobs.create);
    const createAndExecuteMutation = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$convex$40$1$2e$32$2e$0$2b$b1ab299f0a400331$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$react$2f$client$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMutation"])(__TURBOPACK__imported__module__$5b$project$5d2f$convex$2f$_generated$2f$api$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["api"].jobs.createAndExecute);
    const updateJobStatusMutation = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$convex$40$1$2e$32$2e$0$2b$b1ab299f0a400331$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$react$2f$client$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMutation"])(__TURBOPACK__imported__module__$5b$project$5d2f$convex$2f$_generated$2f$api$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["api"].jobs.updateStatus);
    const appendLogMutation = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$convex$40$1$2e$32$2e$0$2b$b1ab299f0a400331$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$react$2f$client$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMutation"])(__TURBOPACK__imported__module__$5b$project$5d2f$convex$2f$_generated$2f$api$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["api"].jobs.appendLog);
    const cancelJobMutation = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$convex$40$1$2e$32$2e$0$2b$b1ab299f0a400331$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$react$2f$client$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMutation"])(__TURBOPACK__imported__module__$5b$project$5d2f$convex$2f$_generated$2f$api$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["api"].jobs.cancel);
    const removeJobMutation = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$convex$40$1$2e$32$2e$0$2b$b1ab299f0a400331$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$react$2f$client$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMutation"])(__TURBOPACK__imported__module__$5b$project$5d2f$convex$2f$_generated$2f$api$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["api"].jobs.remove);
    const cleanupOldJobsMutation = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$convex$40$1$2e$32$2e$0$2b$b1ab299f0a400331$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$react$2f$client$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMutation"])(__TURBOPACK__imported__module__$5b$project$5d2f$convex$2f$_generated$2f$api$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["api"].jobs.cleanupOldJobs);
    /**
   * Create a new job (without auto-execution)
   */ const createJob = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])(async (input)=>{
        try {
            const jobId = await createJobMutation({
                projectId: input.projectId,
                type: input.type,
                command: input.command
            });
            __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$sonner$40$2$2e$0$2e$7$2b$bf16f8eded5e12ee$2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["toast"].success('Job created', {
                description: `Command: ${input.command}`
            });
            return jobId;
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to create job';
            __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$sonner$40$2$2e$0$2e$7$2b$bf16f8eded5e12ee$2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["toast"].error('Failed to create job', {
                description: message
            });
            throw error;
        }
    }, [
        createJobMutation
    ]);
    /**
   * Create a new job and execute it immediately
   */ const createAndExecute = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])(async (input)=>{
        try {
            const result = await createAndExecuteMutation({
                projectId: input.projectId,
                type: input.type,
                command: input.command,
                workingDirectory: input.workingDirectory
            });
            __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$sonner$40$2$2e$0$2e$7$2b$bf16f8eded5e12ee$2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["toast"].success('Job created and queued for execution', {
                description: `Command: ${input.command}`
            });
            return result;
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to create job';
            __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$sonner$40$2$2e$0$2e$7$2b$bf16f8eded5e12ee$2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["toast"].error('Failed to create job', {
                description: message
            });
            throw error;
        }
    }, [
        createAndExecuteMutation
    ]);
    /**
   * Update job status
   */ const updateJobStatus = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])(async (jobId, status, updates)=>{
        try {
            await updateJobStatusMutation({
                id: jobId,
                status,
                ...updates
            });
            return jobId;
        } catch (error) {
            __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$logger$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["appLog"].error('Failed to update job status:', error);
            throw error;
        }
    }, [
        updateJobStatusMutation
    ]);
    /**
   * Append a log line to a job
   */ const appendLog = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])(async (jobId, log)=>{
        try {
            await appendLogMutation({
                id: jobId,
                log
            });
            return jobId;
        } catch (error) {
            __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$logger$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["appLog"].error('Failed to append log:', error);
            throw error;
        }
    }, [
        appendLogMutation
    ]);
    /**
   * Cancel a running or queued job
   */ const cancelJob = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])(async (jobId)=>{
        try {
            await cancelJobMutation({
                id: jobId
            });
            await fetch('/api/jobs/cancel', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    jobId
                })
            });
            __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$sonner$40$2$2e$0$2e$7$2b$bf16f8eded5e12ee$2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["toast"].info('Job cancelled');
            return jobId;
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to cancel job';
            __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$sonner$40$2$2e$0$2e$7$2b$bf16f8eded5e12ee$2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["toast"].error('Failed to cancel job', {
                description: message
            });
            throw error;
        }
    }, [
        cancelJobMutation
    ]);
    /**
   * Delete a job
   */ const removeJob = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])(async (jobId)=>{
        try {
            await removeJobMutation({
                id: jobId
            });
            __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$sonner$40$2$2e$0$2e$7$2b$bf16f8eded5e12ee$2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["toast"].success('Job deleted');
            return jobId;
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to delete job';
            __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$sonner$40$2$2e$0$2e$7$2b$bf16f8eded5e12ee$2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["toast"].error('Failed to delete job', {
                description: message
            });
            throw error;
        }
    }, [
        removeJobMutation
    ]);
    /**
   * Clean up old completed jobs
   */ const cleanupOldJobs = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])(async (olderThanDays = 7)=>{
        try {
            const deletedCount = await cleanupOldJobsMutation({
                projectId,
                olderThanDays
            });
            __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$sonner$40$2$2e$0$2e$7$2b$bf16f8eded5e12ee$2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["toast"].success(`Cleaned up ${deletedCount} old jobs`);
            return deletedCount;
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to cleanup jobs';
            __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$sonner$40$2$2e$0$2e$7$2b$bf16f8eded5e12ee$2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["toast"].error('Failed to cleanup jobs', {
                description: message
            });
            throw error;
        }
    }, [
        cleanupOldJobsMutation,
        projectId
    ]);
    /**
   * Get job status badge color
   */ const getJobStatusColor = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])((status)=>{
        switch(status){
            case 'queued':
                return 'bg-zinc-600 text-zinc-300';
            case 'running':
                return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
            case 'completed':
                return 'bg-green-500/20 text-green-400 border-green-500/30';
            case 'failed':
                return 'bg-red-500/20 text-red-400 border-red-500/30';
            case 'cancelled':
                return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
            default:
                return 'bg-zinc-600 text-zinc-300';
        }
    }, []);
    /**
   * Check if any job is currently running
   */ const isAnyJobRunning = (jobs || []).some((job)=>job.status === 'running');
    return {
        // Data
        jobs: jobs || [],
        runningJobs,
        latestRunningJob,
        streamingLogs,
        isLoading: jobs === undefined,
        isAnyJobRunning,
        // Actions
        createJob,
        createAndExecute,
        updateJobStatus,
        appendLog,
        cancelJob,
        removeJob,
        cleanupOldJobs,
        // Helpers
        getJobStatusColor
    };
}
const __TURBOPACK__default__export__ = useJobs;
}),
"[project]/apps/web/hooks/useFileContent.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "useFileContent",
    ()=>useFileContent
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.bun/next@16.1.6+f27840211c12abb1/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
'use client';
;
function useFileContent(initialContent, onSave, debounceMs = 1000) {
    const [content, setContent] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(initialContent);
    const [savedContent, setSavedContent] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(initialContent);
    const [isDirty, setIsDirty] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const debounceRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(null);
    const contentRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(initialContent);
    const savedContentRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(initialContent);
    const onSaveRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(onSave);
    const fileVersionRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(0);
    const saveSeqRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(0);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        onSaveRef.current = onSave;
    }, [
        onSave
    ]);
    const scheduleSave = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])((nextContent, version)=>{
        const saveSeq = ++saveSeqRef.current;
        void Promise.resolve(onSaveRef.current?.(nextContent)).then(()=>{
            if (fileVersionRef.current !== version || saveSeq !== saveSeqRef.current) {
                return;
            }
            savedContentRef.current = nextContent;
            setSavedContent(nextContent);
            setIsDirty(contentRef.current !== nextContent);
        }).catch(()=>{
            if (fileVersionRef.current !== version) return;
            setIsDirty(true);
        });
    }, []);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        const previousContent = contentRef.current;
        const previousSaved = savedContentRef.current;
        const previousVersion = fileVersionRef.current;
        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
            debounceRef.current = null;
        }
        // Flush pending changes for the previously open file before switching.
        if (previousContent !== previousSaved && onSaveRef.current) {
            scheduleSave(previousContent, previousVersion);
        }
        fileVersionRef.current += 1;
        contentRef.current = initialContent;
        savedContentRef.current = initialContent;
        setContent(initialContent);
        setSavedContent(initialContent);
        setIsDirty(false);
    }, [
        initialContent,
        scheduleSave
    ]);
    const updateContent = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])((newContent)=>{
        contentRef.current = newContent;
        setContent(newContent);
        const hasChanges = newContent !== savedContentRef.current;
        setIsDirty(hasChanges);
        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
        }
        if (hasChanges && onSave) {
            const versionAtSchedule = fileVersionRef.current;
            debounceRef.current = setTimeout(()=>{
                scheduleSave(newContent, versionAtSchedule);
            }, debounceMs);
        }
    }, [
        onSave,
        debounceMs,
        scheduleSave
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        return ()=>{
            if (debounceRef.current) {
                clearTimeout(debounceRef.current);
            }
        };
    }, []);
    return {
        content,
        isDirty,
        updateContent,
        savedContent
    };
}
}),
"[project]/apps/web/hooks/useRunEventBuffer.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "groupBufferedRunEvents",
    ()=>groupBufferedRunEvents,
    "useRunEventBuffer",
    ()=>useRunEventBuffer
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.bun/next@16.1.6+f27840211c12abb1/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
'use client';
;
function groupBufferedRunEvents(entries) {
    const grouped = new Map();
    for (const entry of entries){
        const events = grouped.get(entry.runId);
        if (events) {
            events.push(entry.event);
        } else {
            grouped.set(entry.runId, [
                entry.event
            ]);
        }
    }
    for (const events of grouped.values()){
        events.sort((a, b)=>a.sequence - b.sequence);
    }
    return grouped;
}
function useRunEventBuffer({ appendRunEvents, onError, flushDelayMs = 400, retryDelayMs = 1000, flushThreshold = 10 }) {
    const [tracePersistenceStatus, setTracePersistenceStatus] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])('live');
    const runIdRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(null);
    const runSequenceRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(0);
    const runEventBufferRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])([]);
    const runEventFlushTimerRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(null);
    const runEventFlushPromiseRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(null);
    const runEventFlushAgainRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(false);
    const runEventFlushAgainForceRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(false);
    const tracePersistenceStatusRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])('live');
    const setTraceStatus = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])((next)=>{
        if (tracePersistenceStatusRef.current === next) return;
        tracePersistenceStatusRef.current = next;
        setTracePersistenceStatus(next);
    }, []);
    const beginRun = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])((runId)=>{
        runIdRef.current = runId;
        runSequenceRef.current = 0;
    }, []);
    const clearRun = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])(()=>{
        runIdRef.current = null;
        runSequenceRef.current = 0;
    }, []);
    const flushRunEventBuffer = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])(async (options)=>{
        if (runEventFlushTimerRef.current !== null) {
            clearTimeout(runEventFlushTimerRef.current);
            runEventFlushTimerRef.current = null;
        }
        if (runEventFlushPromiseRef.current) {
            runEventFlushAgainRef.current = true;
            if (options?.force) {
                runEventFlushAgainForceRef.current = true;
            }
            if (options?.force) {
                await runEventFlushPromiseRef.current;
                await flushRunEventBuffer({
                    ...options,
                    force: true
                });
            }
            return;
        }
        if (runEventBufferRef.current.length === 0) return;
        const doFlush = async ()=>{
            const pending = runEventBufferRef.current.splice(0, runEventBufferRef.current.length);
            if (pending.length === 0) return;
            const grouped = groupBufferedRunEvents(pending);
            try {
                for (const [runId, events] of grouped){
                    await appendRunEvents({
                        runId,
                        events
                    });
                }
                setTraceStatus('live');
            } catch (error) {
                runEventBufferRef.current = [
                    ...pending,
                    ...runEventBufferRef.current
                ];
                setTraceStatus('degraded');
                onError(`Failed to flush run event buffer${options?.reason ? ` (${options.reason})` : ''}`, error);
                if (runEventFlushTimerRef.current === null) {
                    runEventFlushTimerRef.current = setTimeout(()=>{
                        runEventFlushTimerRef.current = null;
                        void flushRunEventBuffer({
                            reason: 'retry'
                        });
                    }, retryDelayMs);
                }
            }
        };
        runEventFlushPromiseRef.current = doFlush().finally(()=>{
            runEventFlushPromiseRef.current = null;
        });
        await runEventFlushPromiseRef.current;
        if (runEventFlushAgainRef.current) {
            const pendingForce = runEventFlushAgainForceRef.current;
            runEventFlushAgainRef.current = false;
            runEventFlushAgainForceRef.current = false;
            if (runEventBufferRef.current.length > 0) {
                await flushRunEventBuffer({
                    ...options,
                    force: Boolean(options?.force) || pendingForce
                });
            }
        }
    }, [
        appendRunEvents,
        onError,
        retryDelayMs,
        setTraceStatus
    ]);
    const scheduleRunEventFlush = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])(()=>{
        if (runEventFlushTimerRef.current !== null) return;
        runEventFlushTimerRef.current = setTimeout(()=>{
            runEventFlushTimerRef.current = null;
            void flushRunEventBuffer({
                reason: 'timer'
            });
        }, flushDelayMs);
    }, [
        flushDelayMs,
        flushRunEventBuffer
    ]);
    const appendRunEvent = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])(async (event, options)=>{
        const runId = runIdRef.current;
        if (!runId) return;
        runSequenceRef.current += 1;
        runEventBufferRef.current.push({
            runId,
            event: {
                sequence: runSequenceRef.current,
                ...event
            }
        });
        if (runEventBufferRef.current.length >= flushThreshold || options?.forceFlush) {
            await flushRunEventBuffer({
                force: Boolean(options?.forceFlush),
                reason: options?.forceFlush ? 'force' : 'threshold'
            });
            return;
        }
        scheduleRunEventFlush();
    }, [
        flushRunEventBuffer,
        flushThreshold,
        scheduleRunEventFlush
    ]);
    return {
        tracePersistenceStatus,
        runIdRef,
        beginRun,
        clearRun,
        appendRunEvent,
        flushRunEventBuffer
    };
}
}),
"[project]/apps/web/hooks/useAgent.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>__TURBOPACK__default__export__,
    "useAgent",
    ()=>useAgent
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.bun/next@16.1.6+f27840211c12abb1/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$convex$40$1$2e$32$2e$0$2b$b1ab299f0a400331$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$react$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/.bun/convex@1.32.0+b1ab299f0a400331/node_modules/convex/dist/esm/react/index.js [app-ssr] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$convex$40$1$2e$32$2e$0$2b$b1ab299f0a400331$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$react$2f$client$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.bun/convex@1.32.0+b1ab299f0a400331/node_modules/convex/dist/esm/react/client.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$convex$2f$_generated$2f$api$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/convex/_generated/api.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$llm$2f$types$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/lib/llm/types.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$llm$2f$model$2d$metadata$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/lib/llm/model-metadata.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$llm$2f$token$2d$usage$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/lib/llm/token-usage.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$index$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/apps/web/lib/agent/index.ts [app-ssr] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$runtime$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/lib/agent/runtime.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$tools$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/lib/agent/tools.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$chat$2f$error$2d$messages$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/lib/chat/error-messages.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$components$2f$chat$2f$live$2d$run$2d$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/components/chat/live-run-utils.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$automationPolicy$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/lib/agent/automationPolicy.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$prompt$2d$library$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/lib/agent/prompt-library.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$plan$2d$progress$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/lib/agent/plan-progress.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$harness$2f$plugins$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/lib/agent/harness/plugins.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$logger$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/lib/logger.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$sonner$40$2$2e$0$2e$7$2b$bf16f8eded5e12ee$2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.bun/sonner@2.0.7+bf16f8eded5e12ee/node_modules/sonner/dist/index.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$context$2f$repo$2d$overview$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/lib/agent/context/repo-overview.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$session$2d$controller$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/lib/agent/session-controller.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$hooks$2f$useRunEventBuffer$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/hooks/useRunEventBuffer.ts [app-ssr] (ecmascript)");
/**
 * useAgent Hook
 *
 * Combines streaming chat with tool execution for AI agent functionality.
 * Manages agent runtime lifecycle, handles tool calls, and integrates
 * artifact queue with chat interface.
 *
 * @file apps/web/hooks/useAgent.ts
 */ 'use client';
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
function summarizeArgs(args) {
    if (!args) return undefined;
    const serialized = JSON.stringify(args);
    if (!serialized) return undefined;
    return serialized.length > 140 ? `${serialized.slice(0, 137)}...` : serialized;
}
function toFiniteNumber(value, fallback = 0) {
    const num = Number(value);
    return Number.isFinite(num) ? num : fallback;
}
function toOptionalFiniteNumber(value) {
    const num = Number(value);
    return Number.isFinite(num) ? num : undefined;
}
function logUseAgentError(message, error) {
    __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$logger$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["appLog"].error(`[useAgent] ${message}`, error);
}
function useAgent(options) {
    const { chatId, projectId, projectName, projectDescription, mode, provider, model = 'gpt-4o', architectBrainstormEnabled = false, planDraft, automationPolicy, onRunCreated } = options;
    const convex = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$convex$40$1$2e$32$2e$0$2b$b1ab299f0a400331$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$react$2f$client$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useConvex"])();
    const convexClient = convex;
    // Convex queries & mutations
    const currentUser = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$convex$40$1$2e$32$2e$0$2b$b1ab299f0a400331$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$react$2f$client$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useQuery"])(__TURBOPACK__imported__module__$5b$project$5d2f$convex$2f$_generated$2f$api$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["api"].users.getCurrent);
    const persistedMessages = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$convex$40$1$2e$32$2e$0$2b$b1ab299f0a400331$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$react$2f$client$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useQuery"])(__TURBOPACK__imported__module__$5b$project$5d2f$convex$2f$_generated$2f$api$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["api"].messages.list, chatId ? {
        chatId
    } : 'skip');
    const settings = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$convex$40$1$2e$32$2e$0$2b$b1ab299f0a400331$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$react$2f$client$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useQuery"])(__TURBOPACK__imported__module__$5b$project$5d2f$convex$2f$_generated$2f$api$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["api"].settings.get);
    const persistedModeUsage = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$convex$40$1$2e$32$2e$0$2b$b1ab299f0a400331$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$react$2f$client$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useQuery"])(__TURBOPACK__imported__module__$5b$project$5d2f$convex$2f$_generated$2f$api$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["api"].agentRuns.usageByChatMode, chatId ? {
        chatId,
        mode
    } : 'skip');
    const addMessage = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$convex$40$1$2e$32$2e$0$2b$b1ab299f0a400331$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$react$2f$client$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMutation"])(__TURBOPACK__imported__module__$5b$project$5d2f$convex$2f$_generated$2f$api$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["api"].messages.add);
    const createRun = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$convex$40$1$2e$32$2e$0$2b$b1ab299f0a400331$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$react$2f$client$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMutation"])(__TURBOPACK__imported__module__$5b$project$5d2f$convex$2f$_generated$2f$api$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["api"].agentRuns.create);
    const appendRunEvents = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$convex$40$1$2e$32$2e$0$2b$b1ab299f0a400331$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$react$2f$client$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMutation"])(__TURBOPACK__imported__module__$5b$project$5d2f$convex$2f$_generated$2f$api$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["api"].agentRuns.appendEvents);
    const completeRun = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$convex$40$1$2e$32$2e$0$2b$b1ab299f0a400331$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$react$2f$client$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMutation"])(__TURBOPACK__imported__module__$5b$project$5d2f$convex$2f$_generated$2f$api$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["api"].agentRuns.complete);
    const failRun = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$convex$40$1$2e$32$2e$0$2b$b1ab299f0a400331$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$react$2f$client$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMutation"])(__TURBOPACK__imported__module__$5b$project$5d2f$convex$2f$_generated$2f$api$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["api"].agentRuns.fail);
    const stopRun = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$convex$40$1$2e$32$2e$0$2b$b1ab299f0a400331$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$react$2f$client$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMutation"])(__TURBOPACK__imported__module__$5b$project$5d2f$convex$2f$_generated$2f$api$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["api"].agentRuns.stop);
    // Memory bank
    const memoryBankContent = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$convex$40$1$2e$32$2e$0$2b$b1ab299f0a400331$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$react$2f$client$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useQuery"])(__TURBOPACK__imported__module__$5b$project$5d2f$convex$2f$_generated$2f$api$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["api"].memoryBank.get, projectId ? {
        projectId: projectId
    } : 'skip');
    const updateMemoryBankMutation = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$convex$40$1$2e$32$2e$0$2b$b1ab299f0a400331$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$react$2f$client$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMutation"])(__TURBOPACK__imported__module__$5b$project$5d2f$convex$2f$_generated$2f$api$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["api"].memoryBank.update);
    // Session summaries for context handoffs
    const saveSessionSummaryMutation = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$convex$40$1$2e$32$2e$0$2b$b1ab299f0a400331$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$react$2f$client$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMutation"])(__TURBOPACK__imported__module__$5b$project$5d2f$convex$2f$_generated$2f$api$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["api"].sessionSummaries.save);
    // Project files for overview generation
    const projectFiles = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$convex$40$1$2e$32$2e$0$2b$b1ab299f0a400331$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$react$2f$client$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useQuery"])(__TURBOPACK__imported__module__$5b$project$5d2f$convex$2f$_generated$2f$api$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["api"].files.list, projectId ? {
        projectId: projectId
    } : 'skip');
    // Project overview - computed on-demand, not stored as file
    const projectOverviewContent = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMemo"])(()=>{
        if (!projectFiles || !projectName || projectFiles.length === 0) {
            return null;
        }
        try {
            const fileInfos = projectFiles.map((f)=>({
                    path: f.path,
                    content: f.content,
                    updatedAt: f.updatedAt
                }));
            const overview = (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$context$2f$repo$2d$overview$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["generateRepoOverview"])(fileInfos, projectName, projectDescription);
            return (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$context$2f$repo$2d$overview$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["formatOverviewForPrompt"])(overview);
        } catch (err) {
            __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$logger$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["appLog"].warn('[useAgent] Failed to generate project overview:', err);
            return null;
        }
    }, [
        projectFiles,
        projectName,
        projectDescription
    ]);
    // Artifact store
    const pendingArtifactRecords = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$convex$40$1$2e$32$2e$0$2b$b1ab299f0a400331$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$react$2f$client$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useQuery"])(__TURBOPACK__imported__module__$5b$project$5d2f$convex$2f$_generated$2f$api$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["api"].artifacts.list, chatId ? {
        chatId
    } : 'skip');
    const pendingArtifacts = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMemo"])(()=>(pendingArtifactRecords || []).filter((a)=>a.status === 'pending').map((a)=>({
                _id: a._id
            })), [
        pendingArtifactRecords
    ]);
    // Local state
    const [messages, setMessages] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])([]);
    const [input, setInput] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])('');
    const [status, setStatus] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])('idle');
    const [currentIteration, setCurrentIteration] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(0);
    const [toolCalls, setToolCalls] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])([]);
    const [progressSteps, setProgressSteps] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])([]);
    const planSteps = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMemo"])(()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$plan$2d$progress$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["parsePlanSteps"])(planDraft), [
        planDraft
    ]);
    const completedPlanStepIndexesRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])([]);
    const [error, setError] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const [providerModels, setProviderModels] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])([]);
    const [currentRunUsage, setCurrentRunUsage] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])();
    const [currentSpec, setCurrentSpec] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const [pendingSpec, setPendingSpec] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    // Refs for controlling the agent
    const abortControllerRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(null);
    const isRunningRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(false);
    const toolContextRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(null);
    const rafFlushRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(null);
    const runtimeRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(null);
    // Create artifact queue helpers
    const artifactQueue = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])({
        addFileArtifact: (path, content, originalContent)=>{
            // Legacy fallback only. Canonical artifact persistence happens via Convex in tool handlers.
            void path;
            void content;
            void originalContent;
        },
        addCommandArtifact: (command, cwd)=>{
            // Legacy fallback only. Canonical artifact persistence happens via Convex in tool handlers.
            void command;
            void cwd;
        }
    });
    // Get user ID from auth
    const userId = currentUser?._id ?? null;
    // Initialize tool context (will be populated when Convex client is available)
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        if (!userId) return;
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$harness$2f$plugins$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["registerDefaultPlugins"])();
        toolContextRef.current = (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$tools$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["createToolContext"])(projectId, chatId, userId, convexClient, artifactQueue.current, {
            files: {
                batchGet: __TURBOPACK__imported__module__$5b$project$5d2f$convex$2f$_generated$2f$api$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["api"].files.batchGet,
                list: __TURBOPACK__imported__module__$5b$project$5d2f$convex$2f$_generated$2f$api$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["api"].files.list
            },
            jobs: {
                create: __TURBOPACK__imported__module__$5b$project$5d2f$convex$2f$_generated$2f$api$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["api"].jobs.create,
                updateStatus: __TURBOPACK__imported__module__$5b$project$5d2f$convex$2f$_generated$2f$api$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["api"].jobs.updateStatus
            },
            artifacts: {
                create: __TURBOPACK__imported__module__$5b$project$5d2f$convex$2f$_generated$2f$api$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["api"].artifacts.create
            },
            memoryBank: {
                update: __TURBOPACK__imported__module__$5b$project$5d2f$convex$2f$_generated$2f$api$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["api"].memoryBank.update
            }
        });
    }, [
        projectId,
        chatId,
        convexClient,
        userId
    ]);
    // Stop the agent
    const getReasoningRuntimeSettings = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])(()=>{
        const providerType = provider?.config?.provider || 'openai';
        const capabilities = provider?.config?.capabilities ?? (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$llm$2f$types$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getDefaultProviderCapabilities"])(providerType);
        const providerKey = settings?.defaultProvider || providerType;
        const providerConfig = settings?.providerConfigs?.[providerKey] ?? {};
        const showReasoningPanel = providerConfig.showReasoningPanel !== false;
        const reasoningEnabled = Boolean(providerConfig.reasoningEnabled);
        const reasoningBudget = Number(providerConfig.reasoningBudget ?? 6000);
        const reasoningMode = String(providerConfig.reasoningMode ?? 'auto');
        let reasoning;
        if (capabilities.supportsReasoning && reasoningEnabled) {
            reasoning = {
                enabled: true,
                ...Number.isFinite(reasoningBudget) && reasoningBudget > 0 ? {
                    budgetTokens: reasoningBudget
                } : {}
            };
            if (reasoningMode === 'low' || reasoningMode === 'medium' || reasoningMode === 'high') {
                reasoning.effort = reasoningMode;
            }
        }
        return {
            showReasoningPanel,
            reasoning
        };
    }, [
        provider,
        settings
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        let cancelled = false;
        const loadProviderModels = async ()=>{
            if (!provider || typeof provider.listModels !== 'function') {
                setProviderModels([]);
                return;
            }
            try {
                const models = await provider.listModels();
                if (!cancelled) {
                    setProviderModels(Array.isArray(models) ? models : []);
                }
            } catch (error) {
                void error;
                if (!cancelled) {
                    setProviderModels([]);
                }
            }
        };
        void loadProviderModels();
        return ()=>{
            cancelled = true;
        };
    }, [
        provider
    ]);
    const providerType = provider?.config?.provider || 'openai';
    const contextWindowResolution = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMemo"])(()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$llm$2f$model$2d$metadata$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["resolveContextWindow"])({
            providerType,
            model,
            providerModels
        }), [
        providerType,
        model,
        providerModels
    ]);
    const sessionUsage = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMemo"])(()=>({
            promptTokens: toFiniteNumber(persistedModeUsage?.promptTokens),
            completionTokens: toFiniteNumber(persistedModeUsage?.completionTokens),
            totalTokens: toFiniteNumber(persistedModeUsage?.totalTokens)
        }), [
        persistedModeUsage
    ]);
    const usageMetrics = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMemo"])(()=>{
        const sessionWithCurrent = {
            promptTokens: sessionUsage.promptTokens + (currentRunUsage?.promptTokens ?? 0),
            completionTokens: sessionUsage.completionTokens + (currentRunUsage?.completionTokens ?? 0),
            totalTokens: sessionUsage.totalTokens + (currentRunUsage?.totalTokens ?? 0)
        };
        const context = (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$llm$2f$token$2d$usage$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["computeContextMetrics"])({
            usedTokens: sessionWithCurrent.totalTokens,
            contextWindow: contextWindowResolution.contextWindow
        });
        return {
            mode,
            session: sessionUsage,
            ...currentRunUsage ? {
                currentRun: currentRunUsage
            } : {},
            contextWindow: contextWindowResolution.contextWindow,
            usedTokens: context.usedTokens,
            remainingTokens: context.remainingTokens,
            usagePct: context.usagePct,
            contextSource: contextWindowResolution.source
        };
    }, [
        mode,
        sessionUsage,
        currentRunUsage,
        contextWindowResolution
    ]);
    const { tracePersistenceStatus, runIdRef, beginRun, clearRun, appendRunEvent, flushRunEventBuffer } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$hooks$2f$useRunEventBuffer$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRunEventBuffer"])({
        appendRunEvents,
        onError: logUseAgentError
    });
    // Stop the agent
    const stop = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])(()=>{
        if (pendingSpec) {
            runtimeRef.current?.resolveSpecApproval?.('cancel');
            setPendingSpec(null);
            setCurrentSpec(null);
        }
        const runId = runIdRef.current;
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        if (rafFlushRef.current !== null) {
            cancelAnimationFrame(rafFlushRef.current);
            rafFlushRef.current = null;
        }
        if (runId) {
            // Keep runId/sequence until sendMessage finalizes the stopped run so
            // trailing abort-unwind events can still be buffered and persisted.
            void flushRunEventBuffer({
                force: true,
                reason: 'stop'
            });
        }
        setStatus('idle');
    }, [
        flushRunEventBuffer,
        pendingSpec,
        runIdRef
    ]);
    // Clear messages
    const clear = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])(async ()=>{
        // Save session summary before clearing
        if (projectId && chatId && messages.length > 0) {
            try {
                const { generateStructuredSummary, formatSummaryForHandoff } = await __turbopack_context__.A("[project]/apps/web/lib/agent/context/session-summary.ts [app-ssr] (ecmascript, async loader)");
                const chatMessages = messages.map((msg)=>({
                        role: msg.role,
                        content: msg.content,
                        toolCalls: msg.toolCalls
                    }));
                const summary = generateStructuredSummary({
                    messages: chatMessages
                });
                const formattedSummary = formatSummaryForHandoff(summary);
                await saveSessionSummaryMutation({
                    projectId: projectId,
                    chatId: chatId,
                    summary: formattedSummary,
                    structured: summary,
                    tokenCount: formattedSummary.length / 4
                });
            } catch (err) {
                __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$logger$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["appLog"].warn('[useAgent] Failed to save session summary:', err);
            }
        }
        setMessages([]);
        setToolCalls([]);
        setProgressSteps([]);
        completedPlanStepIndexesRef.current = [];
        setError(null);
        setCurrentIteration(0);
        setCurrentRunUsage(undefined);
        setCurrentSpec(null);
        setPendingSpec(null);
    }, [
        projectId,
        chatId,
        messages,
        saveSessionSummaryMutation
    ]);
    const approvePendingSpec = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])((spec)=>{
        const nextSpec = spec ?? pendingSpec;
        if (!nextSpec) return;
        setPendingSpec(null);
        setCurrentSpec(nextSpec);
        setStatus('thinking');
        runtimeRef.current?.resolveSpecApproval?.('approve', nextSpec);
    }, [
        pendingSpec
    ]);
    const updatePendingSpecDraft = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])((spec)=>{
        setPendingSpec(spec);
        setCurrentSpec(spec);
    }, []);
    const cancelPendingSpec = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])(()=>{
        setPendingSpec(null);
        setCurrentSpec(null);
        runtimeRef.current?.resolveSpecApproval?.('cancel');
        setStatus('idle');
    }, []);
    // Handle input change
    const handleInputChange = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])((e)=>{
        setInput(e.target.value);
    }, []);
    // Hydrate local chat state from Convex when chat changes.
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        if (!persistedMessages || isRunningRef.current) return;
        const runtimeSettings = getReasoningRuntimeSettings();
        setCurrentRunUsage(undefined);
        const hydrated = persistedMessages.filter((msg)=>msg.role === 'user' || msg.role === 'assistant').map((msg)=>{
            const firstAnnotation = Array.isArray(msg.annotations) ? msg.annotations[0] : undefined;
            // Map stored and legacy modes consistently to the current 4-mode model.
            const hydratedMode = (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$prompt$2d$library$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["normalizeChatMode"])(firstAnnotation?.mode, mode);
            return {
                id: msg._id,
                role: msg.role,
                content: msg.content,
                createdAt: msg.createdAt,
                reasoningContent: runtimeSettings.showReasoningPanel && typeof firstAnnotation?.reasoningSummary === 'string' ? firstAnnotation.reasoningSummary : '',
                mode: hydratedMode,
                toolCalls: Array.isArray(firstAnnotation?.toolCalls) ? firstAnnotation?.toolCalls : [],
                annotations: {
                    mode: hydratedMode,
                    model: typeof firstAnnotation?.model === 'string' ? firstAnnotation.model : undefined,
                    provider: typeof firstAnnotation?.provider === 'string' ? firstAnnotation.provider : undefined,
                    tokenCount: toOptionalFiniteNumber(firstAnnotation?.tokenCount),
                    promptTokens: toOptionalFiniteNumber(firstAnnotation?.promptTokens),
                    completionTokens: toOptionalFiniteNumber(firstAnnotation?.completionTokens),
                    totalTokens: toOptionalFiniteNumber(firstAnnotation?.totalTokens),
                    tokenSource: firstAnnotation?.tokenSource === 'exact' || firstAnnotation?.tokenSource === 'estimated' ? firstAnnotation.tokenSource : undefined,
                    reasoningTokens: toOptionalFiniteNumber(firstAnnotation?.reasoningTokens),
                    contextWindow: toOptionalFiniteNumber(firstAnnotation?.contextWindow),
                    contextUsedTokens: toOptionalFiniteNumber(firstAnnotation?.contextUsedTokens),
                    contextRemainingTokens: toOptionalFiniteNumber(firstAnnotation?.contextRemainingTokens),
                    contextUsagePct: toOptionalFiniteNumber(firstAnnotation?.contextUsagePct),
                    contextSource: firstAnnotation?.contextSource === 'map' || firstAnnotation?.contextSource === 'provider' || firstAnnotation?.contextSource === 'fallback' ? firstAnnotation.contextSource : undefined
                }
            };
        });
        setMessages(hydrated);
    }, [
        chatId,
        persistedMessages,
        getReasoningRuntimeSettings,
        mode
    ]);
    // Main submit handler
    const sendMessageInternal = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])(async (rawContent, contextFiles, options)=>{
        const userContent = rawContent.trim();
        if (!userContent || isRunningRef.current) return;
        if (options?.clearInput !== false) {
            setInput('');
        }
        // Capture a snapshot of prior conversation for prompt building.
        // Note: we exclude tool messages here because our UI message shape
        // doesn't retain tool_call_id, which some providers require.
        // IMPORTANT: Claude Code-style mode separation.
        // When in Plan mode, don't include Build messages in context (and vice versa),
        // otherwise the model continues implementation even after switching modes.
        const previousMessagesSnapshot = messages.filter((m)=>(m.role === 'user' || m.role === 'assistant') && m.mode === mode).map((m)=>({
                role: m.role,
                content: m.content
            }));
        const estimatedPromptTokens = (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$llm$2f$token$2d$usage$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["estimatePromptTokens"])({
            providerType,
            model,
            messages: [
                ...previousMessagesSnapshot,
                {
                    role: 'user',
                    content: userContent
                }
            ]
        });
        let runUsage = {
            promptTokens: estimatedPromptTokens,
            completionTokens: 0,
            totalTokens: estimatedPromptTokens,
            source: 'estimated'
        };
        setCurrentRunUsage(runUsage);
        // Lock as running before any awaited work to prevent duplicate submits.
        isRunningRef.current = true;
        abortControllerRef.current = new AbortController();
        setStatus('thinking');
        setError(null);
        setProgressSteps([]);
        completedPlanStepIndexesRef.current = [];
        // Add user message to local state
        const userMessageId = `msg-${Date.now()}-user`;
        setMessages((prev)=>[
                ...prev,
                {
                    id: userMessageId,
                    role: 'user',
                    content: userContent,
                    mode,
                    createdAt: Date.now()
                }
            ]);
        // Persist user message to Convex
        try {
            await addMessage({
                chatId,
                role: 'user',
                content: userContent,
                annotations: [
                    {
                        mode,
                        model,
                        provider: provider?.config?.provider
                    }
                ]
            });
        } catch (err) {
            logUseAgentError('Failed to persist user message', err);
        }
        try {
            // Create prompt context
            if (!userId) {
                throw new Error('User not authenticated');
            }
            setCurrentSpec(null);
            const runId = await createRun({
                projectId,
                chatId,
                userId,
                mode,
                provider: provider?.config?.provider,
                model,
                userMessage: userContent
            });
            beginRun(runId);
            if (onRunCreated) {
                await onRunCreated({
                    runId,
                    approvedPlanExecution: Boolean(options?.approvedPlanExecution)
                });
            }
            let runFinalized = false;
            const finalizeRunCompleted = async (summary, usage)=>{
                if (!runIdRef.current || runFinalized) return;
                runFinalized = true;
                await flushRunEventBuffer({
                    force: true,
                    reason: 'complete'
                });
                await completeRun({
                    runId: runIdRef.current,
                    summary,
                    usage
                });
                clearRun();
            };
            const finalizeRunFailed = async (message)=>{
                if (!runIdRef.current || runFinalized) return;
                runFinalized = true;
                await flushRunEventBuffer({
                    force: true,
                    reason: 'fail'
                });
                await failRun({
                    runId: runIdRef.current,
                    error: message
                });
                clearRun();
            };
            const finalizeRunStopped = async ()=>{
                if (!runIdRef.current || runFinalized) return;
                runFinalized = true;
                await flushRunEventBuffer({
                    force: true,
                    reason: 'stop'
                });
                await stopRun({
                    runId: runIdRef.current
                });
                clearRun();
            };
            await appendRunEvent({
                type: 'run_started',
                content: userContent,
                status: 'running'
            });
            const promptContext = (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$session$2d$controller$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["buildAgentPromptContext"])({
                projectId,
                chatId,
                userId,
                projectName,
                projectDescription,
                mode,
                provider: provider?.config?.provider || 'openai',
                previousMessages: previousMessagesSnapshot.map((message)=>({
                        role: message.role === 'assistant' ? 'assistant' : 'user',
                        content: message.content
                    })),
                projectOverviewContent,
                projectFiles: projectFiles?.map((file)=>({
                        path: file.path,
                        content: file.content,
                        updatedAt: file.updatedAt
                    })),
                memoryBankContent,
                userContent,
                contextFiles,
                architectBrainstormEnabled
            });
            // Create runtime config with deduplication
            // Note: maxToolCallsPerIteration is set high to allow batch file generation
            // The AI should be able to generate as many files as needed in one iteration
            const runtimeConfig = (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$session$2d$controller$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["buildAgentRuntimeConfig"])({
                runId,
                mode,
                harnessSessionID: options?.harnessSessionID
            });
            // Get tool context
            if (!userId) {
                throw new Error('User not authenticated');
            }
            const toolContext = toolContextRef.current ?? (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$tools$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["createToolContext"])(projectId, chatId, userId, convexClient, artifactQueue.current, {
                files: {
                    batchGet: __TURBOPACK__imported__module__$5b$project$5d2f$convex$2f$_generated$2f$api$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["api"].files.batchGet,
                    list: __TURBOPACK__imported__module__$5b$project$5d2f$convex$2f$_generated$2f$api$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["api"].files.list
                },
                jobs: {
                    create: __TURBOPACK__imported__module__$5b$project$5d2f$convex$2f$_generated$2f$api$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["api"].jobs.create,
                    updateStatus: __TURBOPACK__imported__module__$5b$project$5d2f$convex$2f$_generated$2f$api$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["api"].jobs.updateStatus
                },
                artifacts: {
                    create: __TURBOPACK__imported__module__$5b$project$5d2f$convex$2f$_generated$2f$api$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["api"].artifacts.create
                },
                memoryBank: {
                    update: __TURBOPACK__imported__module__$5b$project$5d2f$convex$2f$_generated$2f$api$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["api"].memoryBank.update
                }
            });
            // Create agent runtime
            const runtimeSettings = getReasoningRuntimeSettings();
            const checkpointClient = convex;
            const checkpointStore = (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$session$2d$controller$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["createAgentCheckpointStore"])({
                client: checkpointClient,
                runId,
                chatId,
                projectId,
                harnessSessionID: options?.harnessSessionID
            });
            const runtime = (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$runtime$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["createAgentRuntime"])({
                provider,
                model,
                maxIterations: runtimeConfig.maxIterations,
                harnessCheckpointStore: checkpointStore,
                // Enable risk interrupts - PermissionDialog handles the UI
                harnessEnableRiskInterrupts: true,
                harnessSessionPermissions: automationPolicy ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$automationPolicy$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["buildHarnessSessionPermissions"])(automationPolicy) : undefined,
                ...runtimeSettings.reasoning ? {
                    reasoning: runtimeSettings.reasoning
                } : {}
            }, toolContext);
            runtimeRef.current = runtime;
            // Run the agent
            let assistantContent = '';
            let assistantReasoning = '';
            let assistantToolCalls = [];
            const assistantMessageId = `msg-${Date.now()}-assistant`;
            let pendingPaint = false;
            let replaceOnNextText = false;
            let rewriteNoticeShown = false;
            const buildUsageAnnotations = ()=>{
                const context = (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$llm$2f$token$2d$usage$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["computeContextMetrics"])({
                    usedTokens: sessionUsage.totalTokens + runUsage.totalTokens,
                    contextWindow: contextWindowResolution.contextWindow
                });
                return {
                    mode,
                    model,
                    provider: provider?.config?.provider,
                    tokenCount: runUsage.totalTokens,
                    promptTokens: runUsage.promptTokens,
                    completionTokens: runUsage.completionTokens,
                    totalTokens: runUsage.totalTokens,
                    tokenSource: runUsage.source,
                    contextWindow: contextWindowResolution.contextWindow,
                    contextUsedTokens: context.usedTokens,
                    contextRemainingTokens: context.remainingTokens,
                    contextUsagePct: context.usagePct,
                    contextSource: contextWindowResolution.source
                };
            };
            const schedulePaint = ()=>{
                if (pendingPaint) return;
                pendingPaint = true;
                rafFlushRef.current = requestAnimationFrame(()=>{
                    pendingPaint = false;
                    rafFlushRef.current = null;
                    setMessages((prev)=>{
                        const existingIndex = prev.findIndex((m)=>m.id === assistantMessageId);
                        if (existingIndex >= 0) {
                            const updated = [
                                ...prev
                            ];
                            updated[existingIndex] = {
                                ...updated[existingIndex],
                                content: assistantContent,
                                reasoningContent: runtimeSettings.showReasoningPanel ? assistantReasoning : '',
                                mode,
                                createdAt: updated[existingIndex].createdAt,
                                toolCalls: assistantToolCalls,
                                annotations: buildUsageAnnotations()
                            };
                            return updated;
                        }
                        return [
                            ...prev,
                            {
                                id: assistantMessageId,
                                role: 'assistant',
                                content: assistantContent,
                                reasoningContent: runtimeSettings.showReasoningPanel ? assistantReasoning : '',
                                mode,
                                createdAt: Date.now(),
                                toolCalls: assistantToolCalls,
                                annotations: buildUsageAnnotations()
                            }
                        ];
                    });
                });
            };
            for await (const event of runtime.run(promptContext, runtimeConfig)){
                // Check for abort
                if (abortControllerRef.current?.signal.aborted) {
                    break;
                }
                switch(event.type){
                    case 'thinking':
                    case 'status_thinking':
                        {
                            setStatus('thinking');
                            if (event.content) {
                                void appendRunEvent({
                                    type: 'status',
                                    content: event.content,
                                    status: 'thinking'
                                });
                            }
                            // Extract iteration number from content
                            const iterationMatch = event.content?.match(/Iteration (\d+)/);
                            if (iterationMatch) {
                                setCurrentIteration(parseInt(iterationMatch[1], 10));
                            }
                            break;
                        }
                    case 'retry':
                        {
                            // Handle stream retry events
                            if (event.content) {
                                void appendRunEvent({
                                    type: 'status',
                                    content: event.content,
                                    status: 'retrying'
                                });
                                // Add a progress step to show retry status
                                const step = {
                                    id: `progress-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                                    content: event.content,
                                    status: 'running',
                                    category: 'other',
                                    createdAt: Date.now()
                                };
                                setProgressSteps((prev)=>[
                                        ...prev,
                                        step
                                    ].slice(-30));
                            }
                            break;
                        }
                    case 'reset':
                        {
                            // Runtime requested that we reset the current assistant message
                            // (e.g. Plan Mode auto-rewrite).
                            // Keep the existing content visible to avoid the message "vanishing".
                            // We’ll replace it cleanly when the first rewrite text chunk arrives.
                            replaceOnNextText = true;
                            assistantToolCalls = [];
                            void appendRunEvent({
                                type: 'reset',
                                content: event.resetReason ?? 'rewrite'
                            });
                            if (!rewriteNoticeShown) {
                                rewriteNoticeShown = true;
                                setMessages((prev)=>{
                                    const existingIndex = prev.findIndex((m)=>m.id === assistantMessageId);
                                    if (existingIndex < 0) return prev;
                                    const updated = [
                                        ...prev
                                    ];
                                    const existing = updated[existingIndex];
                                    updated[existingIndex] = {
                                        ...existing,
                                        mode,
                                        toolCalls: [],
                                        content: (existing.content ? existing.content + '\n\n' : '') + '— Rewriting to match mode… —'
                                    };
                                    return updated;
                                });
                            }
                            break;
                        }
                    case 'text':
                        setStatus('streaming');
                        if (event.content) {
                            if (replaceOnNextText) {
                                replaceOnNextText = false;
                                assistantContent = '';
                                // Immediately clear the visible content so we replace instead of append.
                                setMessages((prev)=>{
                                    const existingIndex = prev.findIndex((m)=>m.id === assistantMessageId);
                                    if (existingIndex < 0) return prev;
                                    const updated = [
                                        ...prev
                                    ];
                                    updated[existingIndex] = {
                                        ...updated[existingIndex],
                                        content: '',
                                        reasoningContent: '',
                                        mode,
                                        toolCalls: []
                                    };
                                    return updated;
                                });
                            }
                            assistantContent += event.content;
                            runUsage = {
                                ...runUsage,
                                completionTokens: (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$llm$2f$token$2d$usage$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["estimateCompletionTokens"])({
                                    providerType,
                                    model,
                                    content: assistantContent
                                })
                            };
                            runUsage.totalTokens = runUsage.promptTokens + runUsage.completionTokens;
                            setCurrentRunUsage(runUsage);
                            // Paint at most once per animation frame to avoid render thrash
                            // while still feeling like true streaming.
                            schedulePaint();
                        }
                        break;
                    case 'progress_step':
                        {
                            if (event.content) {
                                const step = {
                                    id: `progress-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                                    content: event.content,
                                    status: event.progressStatus ?? 'running',
                                    category: event.progressCategory ?? 'other',
                                    details: event.progressToolName || event.progressToolCallId || event.progressArgs || event.progressDurationMs || event.progressError ? {
                                        toolName: event.progressToolName,
                                        toolCallId: event.progressToolCallId,
                                        argsSummary: summarizeArgs(event.progressArgs),
                                        durationMs: event.progressDurationMs,
                                        errorExcerpt: event.progressError?.slice(0, 160),
                                        targetFilePaths: (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$components$2f$chat$2f$live$2d$run$2d$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["extractTargetFilePaths"])(event.progressToolName, event.progressArgs),
                                        hasArtifactTarget: Boolean(event.progressHasArtifactTarget)
                                    } : undefined,
                                    ...(0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$plan$2d$progress$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["derivePlanProgressMetadata"])(planSteps, event.content, event.progressStatus ?? 'running', completedPlanStepIndexesRef.current) ?? {},
                                    createdAt: Date.now()
                                };
                                if (step.completedPlanStepIndexes) {
                                    completedPlanStepIndexesRef.current = step.completedPlanStepIndexes;
                                }
                                setProgressSteps((prev)=>[
                                        ...prev,
                                        step
                                    ].slice(-30));
                                void appendRunEvent({
                                    type: 'progress_step',
                                    content: step.content,
                                    status: step.status,
                                    progressCategory: step.category,
                                    progressToolName: step.details?.toolName,
                                    toolCallId: step.details?.toolCallId,
                                    progressHasArtifactTarget: step.details?.hasArtifactTarget,
                                    targetFilePaths: step.details?.targetFilePaths,
                                    toolName: step.details?.toolName,
                                    args: event.progressArgs,
                                    durationMs: step.details?.durationMs,
                                    error: step.details?.errorExcerpt,
                                    planStepIndex: step.planStepIndex,
                                    planStepTitle: step.planStepTitle,
                                    planTotalSteps: step.planTotalSteps,
                                    completedPlanStepIndexes: step.completedPlanStepIndexes
                                });
                            }
                            break;
                        }
                    case 'spec_pending_approval':
                        if (event.spec) {
                            setPendingSpec(event.spec);
                            setCurrentSpec(event.spec);
                            setStatus('idle');
                            void appendRunEvent({
                                type: event.type,
                                content: event.spec.intent.goal,
                                status: event.spec.status
                            });
                        }
                        break;
                    case 'spec_generated':
                        {
                            if (event.spec) {
                                setPendingSpec(null);
                                setCurrentSpec(event.spec);
                                void appendRunEvent({
                                    type: event.type,
                                    content: event.spec.intent.goal,
                                    status: event.spec.status
                                });
                            }
                            break;
                        }
                    case 'spec_verification':
                        {
                            setPendingSpec(null);
                            if (event.spec) {
                                setCurrentSpec(event.spec);
                            }
                            void appendRunEvent({
                                type: 'spec_verification',
                                content: event.verification?.passed ? 'Specification verified' : 'Specification failed',
                                status: event.verification?.passed ? 'verified' : 'failed'
                            });
                            break;
                        }
                    case 'reasoning':
                        if (runtimeSettings.showReasoningPanel && event.reasoningContent) {
                            assistantReasoning += event.reasoningContent;
                            schedulePaint();
                        }
                        break;
                    case 'tool_call':
                        setStatus('executing_tools');
                        if (event.toolCall) {
                            let parsedArgs;
                            try {
                                parsedArgs = JSON.parse(event.toolCall.function.arguments);
                            } catch (parseError) {
                                console.error('Failed to parse tool arguments:', parseError);
                                parsedArgs = {
                                    error: 'Failed to parse arguments',
                                    raw: event.toolCall.function.arguments
                                };
                            }
                            const toolInfo = {
                                id: event.toolCall.id,
                                name: event.toolCall.function.name,
                                args: parsedArgs,
                                status: 'pending'
                            };
                            assistantToolCalls.push(toolInfo);
                            setToolCalls((prev)=>[
                                    ...prev,
                                    toolInfo
                                ]);
                            void appendRunEvent({
                                type: 'tool_call',
                                toolCallId: toolInfo.id,
                                toolName: toolInfo.name,
                                args: toolInfo.args,
                                status: toolInfo.status
                            });
                            // Update assistant message with tool calls
                            setMessages((prev)=>{
                                const existingIndex = prev.findIndex((m)=>m.id === assistantMessageId);
                                if (existingIndex >= 0) {
                                    const updated = [
                                        ...prev
                                    ];
                                    updated[existingIndex] = {
                                        ...updated[existingIndex],
                                        mode,
                                        toolCalls: assistantToolCalls
                                    };
                                    return updated;
                                }
                                return prev;
                            });
                        }
                        break;
                    case 'tool_result':
                        if (event.toolResult) {
                            // Update tool call status
                            setToolCalls((prev)=>prev.map((tc)=>tc.id === event.toolResult.toolCallId ? {
                                        ...tc,
                                        status: event.toolResult.error ? 'error' : 'completed',
                                        result: {
                                            output: event.toolResult.output,
                                            error: event.toolResult.error,
                                            durationMs: event.toolResult.durationMs
                                        }
                                    } : tc));
                            // Update assistant message tool calls
                            assistantToolCalls = assistantToolCalls.map((tc)=>tc.id === event.toolResult.toolCallId ? {
                                    ...tc,
                                    status: event.toolResult.error ? 'error' : 'completed',
                                    result: {
                                        output: event.toolResult.output,
                                        error: event.toolResult.error,
                                        durationMs: event.toolResult.durationMs
                                    }
                                } : tc);
                            setMessages((prev)=>{
                                const existingIndex = prev.findIndex((m)=>m.id === assistantMessageId);
                                if (existingIndex >= 0) {
                                    const updated = [
                                        ...prev
                                    ];
                                    updated[existingIndex] = {
                                        ...updated[existingIndex],
                                        toolCalls: assistantToolCalls
                                    };
                                    return updated;
                                }
                                return prev;
                            });
                            void appendRunEvent({
                                type: 'tool_result',
                                toolCallId: event.toolResult.toolCallId,
                                toolName: event.toolResult.toolName,
                                output: event.toolResult.output,
                                error: event.toolResult.error,
                                durationMs: event.toolResult.durationMs,
                                status: event.toolResult.error ? 'error' : 'completed'
                            });
                        }
                        break;
                    case 'snapshot':
                        if (event.snapshot) {
                            const step = {
                                id: `snapshot-${event.snapshot.hash}`,
                                content: event.content ?? `Step ${event.snapshot.step} snapshot created`,
                                status: 'completed',
                                category: 'other',
                                createdAt: event.snapshot.timestamp
                            };
                            setProgressSteps((prev)=>[
                                    ...prev,
                                    step
                                ].slice(-30));
                            void appendRunEvent({
                                type: 'snapshot',
                                content: step.content,
                                status: 'completed',
                                snapshot: event.snapshot
                            });
                        }
                        break;
                    case 'complete':
                        setPendingSpec(null);
                        setStatus('complete');
                        isRunningRef.current = false;
                        if (event.usage) {
                            runUsage = {
                                promptTokens: toFiniteNumber(event.usage.promptTokens),
                                completionTokens: toFiniteNumber(event.usage.completionTokens),
                                totalTokens: toFiniteNumber(event.usage.totalTokens, toFiniteNumber(event.usage.promptTokens) + toFiniteNumber(event.usage.completionTokens)),
                                source: 'exact'
                            };
                        }
                        setCurrentRunUsage(runUsage);
                        // Persist assistant message to Convex
                        try {
                            const context = (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$llm$2f$token$2d$usage$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["computeContextMetrics"])({
                                usedTokens: sessionUsage.totalTokens + runUsage.totalTokens,
                                contextWindow: contextWindowResolution.contextWindow
                            });
                            const annotations = {
                                mode,
                                model,
                                provider: provider?.config?.provider,
                                tokenCount: runUsage.totalTokens,
                                promptTokens: runUsage.promptTokens,
                                completionTokens: runUsage.completionTokens,
                                totalTokens: runUsage.totalTokens,
                                tokenSource: runUsage.source,
                                contextWindow: contextWindowResolution.contextWindow,
                                contextUsedTokens: context.usedTokens,
                                contextRemainingTokens: context.remainingTokens,
                                contextUsagePct: context.usagePct,
                                contextSource: contextWindowResolution.source,
                                ...assistantToolCalls.length > 0 ? {
                                    toolCalls: assistantToolCalls
                                } : {}
                            };
                            if (assistantReasoning) {
                                annotations.reasoningSummary = assistantReasoning;
                                if (runUsage.completionTokens) {
                                    annotations.reasoningTokens = runUsage.completionTokens;
                                }
                            }
                            await addMessage({
                                chatId,
                                role: 'assistant',
                                content: assistantContent,
                                annotations: [
                                    annotations
                                ]
                            });
                            await appendRunEvent({
                                type: 'assistant_message',
                                content: assistantContent,
                                usage: event.usage,
                                status: 'completed'
                            }, {
                                forceFlush: true
                            });
                            await finalizeRunCompleted(assistantContent, event.usage);
                        } catch (err) {
                            logUseAgentError('Failed to persist assistant message', err);
                        }
                        break;
                    case 'error':
                        {
                            if (event.error === 'Specification approval cancelled') {
                                setStatus('idle');
                                setError(null);
                                setPendingSpec(null);
                                setCurrentSpec(null);
                                isRunningRef.current = false;
                                await appendRunEvent({
                                    type: 'spec_cancelled',
                                    content: 'Specification approval cancelled',
                                    status: 'stopped'
                                }, {
                                    forceFlush: true
                                });
                                await finalizeRunStopped();
                                break;
                            }
                            const userFacing = (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$chat$2f$error$2d$messages$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getUserFacingAgentError"])(event.error);
                            setStatus('error');
                            setError(userFacing.description);
                            isRunningRef.current = false;
                            await appendRunEvent({
                                type: 'error',
                                error: event.error || 'Unknown error',
                                status: 'failed'
                            }, {
                                forceFlush: true
                            });
                            await finalizeRunFailed(event.error || 'Unknown error');
                            __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$sonner$40$2$2e$0$2e$7$2b$bf16f8eded5e12ee$2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["toast"].error(userFacing.title, {
                                description: userFacing.description
                            });
                            break;
                        }
                }
            }
            // Reset status if still running (e.g., aborted)
            if (isRunningRef.current) {
                setStatus('idle');
                isRunningRef.current = false;
                await finalizeRunStopped();
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            if (message === 'Specification approval cancelled') {
                setStatus('idle');
                setError(null);
                setPendingSpec(null);
                setCurrentSpec(null);
                isRunningRef.current = false;
                await appendRunEvent({
                    type: 'spec_cancelled',
                    content: 'Specification approval cancelled',
                    status: 'stopped'
                }, {
                    forceFlush: true
                });
                if (runIdRef.current) {
                    await flushRunEventBuffer({
                        force: true,
                        reason: 'spec-cancel'
                    });
                    await stopRun({
                        runId: runIdRef.current
                    });
                    clearRun();
                }
                return;
            }
            const userFacing = (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$chat$2f$error$2d$messages$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getUserFacingAgentError"])(message);
            setStatus('error');
            setError(userFacing.description);
            isRunningRef.current = false;
            await appendRunEvent({
                type: 'error',
                error: message,
                status: 'failed'
            }, {
                forceFlush: true
            });
            if (runIdRef.current) {
                try {
                    await flushRunEventBuffer({
                        force: true,
                        reason: 'fail'
                    });
                    await failRun({
                        runId: runIdRef.current,
                        error: message
                    });
                } catch (runErr) {
                    logUseAgentError('Failed to finalize run failure', runErr);
                } finally{
                    clearRun();
                }
            }
            __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$sonner$40$2$2e$0$2e$7$2b$bf16f8eded5e12ee$2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["toast"].error(userFacing.title, {
                description: userFacing.description
            });
        }
    }, [
        messages,
        chatId,
        projectId,
        mode,
        provider,
        model,
        providerType,
        architectBrainstormEnabled,
        addMessage,
        beginRun,
        clearRun,
        createRun,
        appendRunEvent,
        completeRun,
        convex,
        convexClient,
        failRun,
        flushRunEventBuffer,
        stopRun,
        userId,
        runIdRef,
        getReasoningRuntimeSettings,
        sessionUsage.totalTokens,
        contextWindowResolution.contextWindow,
        contextWindowResolution.source,
        memoryBankContent,
        projectName,
        projectDescription,
        projectOverviewContent,
        projectFiles,
        planSteps,
        automationPolicy,
        onRunCreated
    ]);
    const sendMessage = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])(async (rawContent, contextFiles, options)=>{
        await sendMessageInternal(rawContent, contextFiles, {
            clearInput: true,
            approvedPlanExecution: options?.approvedPlanExecution
        });
    }, [
        sendMessageInternal
    ]);
    const resumeRuntimeSession = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])(async (sessionID)=>{
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$sonner$40$2$2e$0$2e$7$2b$bf16f8eded5e12ee$2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["toast"].info('Resuming previous run', {
            description: 'Panda is restoring the latest recoverable runtime checkpoint.'
        });
        await sendMessageInternal('Resume previous run', undefined, {
            clearInput: false,
            harnessSessionID: sessionID
        });
    }, [
        sendMessageInternal
    ]);
    const handleSubmit = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])(async (e)=>{
        e?.preventDefault();
        await sendMessage(input);
    }, [
        input,
        sendMessage
    ]);
    const runEvalScenario = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])(async (scenario)=>{
        if (!userId) {
            throw new Error('User not authenticated');
        }
        if (!provider) {
            throw new Error('Provider unavailable');
        }
        const toolContext = toolContextRef.current ?? (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$tools$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["createToolContext"])(projectId, chatId, userId, convexClient, artifactQueue.current, {
            files: {
                batchGet: __TURBOPACK__imported__module__$5b$project$5d2f$convex$2f$_generated$2f$api$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["api"].files.batchGet,
                list: __TURBOPACK__imported__module__$5b$project$5d2f$convex$2f$_generated$2f$api$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["api"].files.list
            },
            jobs: {
                create: __TURBOPACK__imported__module__$5b$project$5d2f$convex$2f$_generated$2f$api$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["api"].jobs.create,
                updateStatus: __TURBOPACK__imported__module__$5b$project$5d2f$convex$2f$_generated$2f$api$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["api"].jobs.updateStatus
            },
            artifacts: {
                create: __TURBOPACK__imported__module__$5b$project$5d2f$convex$2f$_generated$2f$api$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["api"].artifacts.create
            },
            memoryBank: {
                update: __TURBOPACK__imported__module__$5b$project$5d2f$convex$2f$_generated$2f$api$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["api"].memoryBank.update
            }
        });
        const runtimeSettings = getReasoningRuntimeSettings();
        const runtime = (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$runtime$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["createAgentRuntime"])({
            provider,
            model,
            maxIterations: 10,
            harnessEvalMode: scenario.evalMode ?? 'read_only',
            harnessSessionPermissions: automationPolicy ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$automationPolicy$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["buildHarnessSessionPermissions"])(automationPolicy) : undefined,
            ...runtimeSettings.reasoning ? {
                reasoning: runtimeSettings.reasoning
            } : {}
        }, toolContext);
        const scenarioMode = (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$prompt$2d$library$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["normalizeChatMode"])(typeof scenario.mode === 'string' ? scenario.mode : mode, mode);
        const textInput = typeof scenario.prompt === 'string' ? scenario.prompt : typeof scenario.input === 'string' ? scenario.input : JSON.stringify(scenario.input ?? '', null, 2);
        const promptContext = (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$session$2d$controller$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["buildAgentPromptContext"])({
            projectId,
            chatId,
            userId,
            projectName,
            projectDescription,
            mode: scenarioMode,
            provider: provider.config?.provider || 'openai',
            previousMessages: [],
            projectOverviewContent,
            projectFiles: projectFiles?.map((file)=>({
                    path: file.path,
                    content: file.content,
                    updatedAt: file.updatedAt
                })),
            memoryBankContent,
            userContent: textInput,
            architectBrainstormEnabled
        });
        const result = await runtime.runSync(promptContext);
        return {
            output: result.content,
            error: result.error,
            usage: result.usage
        };
    }, [
        userId,
        provider,
        projectId,
        chatId,
        convexClient,
        getReasoningRuntimeSettings,
        model,
        mode,
        memoryBankContent,
        architectBrainstormEnabled,
        projectName,
        projectDescription,
        projectOverviewContent,
        projectFiles,
        automationPolicy
    ]);
    // Cleanup on unmount
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        return ()=>{
            stop();
        };
    }, [
        stop
    ]);
    return {
        messages,
        input,
        setInput,
        status,
        isLoading: status === 'thinking' || status === 'streaming' || status === 'executing_tools',
        currentIteration,
        toolCalls,
        progressSteps,
        usageMetrics,
        currentSpec,
        pendingSpec,
        pendingArtifacts,
        memoryBank: memoryBankContent,
        updateMemoryBank: async (content)=>{
            if (!projectId) return;
            await updateMemoryBankMutation({
                projectId: projectId,
                content
            });
        },
        projectOverview: projectOverviewContent,
        sendMessage,
        runEvalScenario,
        handleSubmit,
        handleInputChange,
        stop,
        clear,
        approvePendingSpec,
        updatePendingSpecDraft,
        cancelPendingSpec,
        resumeRuntimeSession,
        error,
        tracePersistenceStatus
    };
}
const __TURBOPACK__default__export__ = useAgent;
}),
"[project]/apps/web/hooks/useSidebar.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "useSidebar",
    ()=>useSidebar
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.bun/next@16.1.6+f27840211c12abb1/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$hooks$2f$useShortcuts$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/hooks/useShortcuts.ts [app-ssr] (ecmascript)");
'use client';
;
;
const SECTION_KEY = 'panda:sidebar-section';
const FLYOUT_KEY = 'panda:sidebar-flyout-open';
function useSidebar() {
    const [activeSection, setActiveSection] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(()=>{
        if ("TURBOPACK compile-time truthy", 1) return 'explorer';
        //TURBOPACK unreachable
        ;
        const stored = undefined;
    });
    const [isFlyoutOpen, setIsFlyoutOpen] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(()=>{
        if ("TURBOPACK compile-time truthy", 1) return false;
        //TURBOPACK unreachable
        ;
        const stored = undefined;
    });
    // Persist activeSection to localStorage
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        localStorage.setItem(SECTION_KEY, activeSection);
    }, [
        activeSection
    ]);
    // Persist isFlyoutOpen to localStorage
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        localStorage.setItem(FLYOUT_KEY, String(isFlyoutOpen));
    }, [
        isFlyoutOpen
    ]);
    const shortcuts = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMemo"])(()=>[
            {
                id: 'toggle-sidebar',
                keys: 'mod+b',
                label: 'Toggle Sidebar',
                handler: ()=>setIsFlyoutOpen((prev)=>!prev),
                category: 'Navigation'
            }
        ], []);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$hooks$2f$useShortcuts$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useShortcuts"])(shortcuts);
    const handleSectionChange = (section)=>{
        if (section === activeSection && isFlyoutOpen) {
            setIsFlyoutOpen(false);
        } else {
            setActiveSection(section);
            setIsFlyoutOpen(true);
        }
    };
    const toggleFlyout = ()=>{
        setIsFlyoutOpen((prev)=>!prev);
    };
    return {
        activeSection,
        isFlyoutOpen,
        handleSectionChange,
        toggleFlyout
    };
}
}),
"[project]/apps/web/hooks/useAutoApplyArtifacts.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "useAutoApplyArtifacts",
    ()=>useAutoApplyArtifacts
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.bun/next@16.1.6+f27840211c12abb1/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$convex$40$1$2e$32$2e$0$2b$b1ab299f0a400331$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$react$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/.bun/convex@1.32.0+b1ab299f0a400331/node_modules/convex/dist/esm/react/index.js [app-ssr] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$convex$40$1$2e$32$2e$0$2b$b1ab299f0a400331$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$react$2f$client$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.bun/convex@1.32.0+b1ab299f0a400331/node_modules/convex/dist/esm/react/client.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$sonner$40$2$2e$0$2e$7$2b$bf16f8eded5e12ee$2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.bun/sonner@2.0.7+bf16f8eded5e12ee/node_modules/sonner/dist/index.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$convex$2f$_generated$2f$api$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/convex/_generated/api.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$automationPolicy$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/lib/agent/automationPolicy.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$artifacts$2f$executeArtifact$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/lib/artifacts/executeArtifact.ts [app-ssr] (ecmascript)");
'use client';
;
;
;
;
;
;
function useAutoApplyArtifacts(args) {
    const artifactRecords = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$convex$40$1$2e$32$2e$0$2b$b1ab299f0a400331$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$react$2f$client$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useQuery"])(__TURBOPACK__imported__module__$5b$project$5d2f$convex$2f$_generated$2f$api$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["api"].artifacts.list, args.chatId ? {
        chatId: args.chatId
    } : 'skip');
    const pendingArtifacts = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMemo"])(()=>{
        return (artifactRecords || []).filter((a)=>a.status === 'pending').map((record)=>{
            const action = (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$artifacts$2f$executeArtifact$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getPrimaryArtifactAction"])(record);
            if (!action) return null;
            return {
                id: record._id,
                action
            };
        }).filter(Boolean);
    }, [
        artifactRecords
    ]);
    const convex = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$convex$40$1$2e$32$2e$0$2b$b1ab299f0a400331$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$react$2f$client$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useConvex"])();
    const upsertFile = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$convex$40$1$2e$32$2e$0$2b$b1ab299f0a400331$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$react$2f$client$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMutation"])(__TURBOPACK__imported__module__$5b$project$5d2f$convex$2f$_generated$2f$api$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["api"].files.upsert);
    const createAndExecuteJob = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$convex$40$1$2e$32$2e$0$2b$b1ab299f0a400331$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$react$2f$client$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMutation"])(__TURBOPACK__imported__module__$5b$project$5d2f$convex$2f$_generated$2f$api$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["api"].jobs.createAndExecute);
    const updateJobStatus = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$convex$40$1$2e$32$2e$0$2b$b1ab299f0a400331$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$react$2f$client$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMutation"])(__TURBOPACK__imported__module__$5b$project$5d2f$convex$2f$_generated$2f$api$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["api"].jobs.updateStatus);
    const updateArtifactStatus = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$convex$40$1$2e$32$2e$0$2b$b1ab299f0a400331$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$react$2f$client$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMutation"])(__TURBOPACK__imported__module__$5b$project$5d2f$convex$2f$_generated$2f$api$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["api"].artifacts.updateStatus);
    const processingRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(new Set());
    const policy = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMemo"])(()=>{
        return args.policy ?? {
            autoApplyFiles: false,
            autoRunCommands: false,
            allowedCommandPrefixes: []
        };
    }, [
        args.policy
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        if (pendingArtifacts.length === 0) return;
        for (const artifact of pendingArtifacts){
            if (processingRef.current.has(artifact.id)) continue;
            const shouldApply = (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$automationPolicy$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["shouldAutoApplyArtifact"])(policy, artifact.action);
            if (!shouldApply) continue;
            processingRef.current.add(artifact.id);
            void (async ()=>{
                try {
                    const result = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$artifacts$2f$executeArtifact$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["applyArtifact"])({
                        artifactId: artifact.id,
                        action: artifact.action,
                        projectId: args.projectId,
                        convex,
                        upsertFile,
                        createAndExecuteJob,
                        updateJobStatus: (jobId, status, updates)=>updateJobStatus({
                                id: jobId,
                                status,
                                ...updates
                            }),
                        updateArtifactStatus
                    });
                    if (result.kind === 'file') {
                        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$sonner$40$2$2e$0$2e$7$2b$bf16f8eded5e12ee$2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["toast"].success('File applied', {
                            description: result.description
                        });
                    }
                } catch (error) {
                    __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$sonner$40$2$2e$0$2e$7$2b$bf16f8eded5e12ee$2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["toast"].error('Auto-apply failed', {
                        description: error instanceof Error ? error.message : String(error)
                    });
                } finally{
                    processingRef.current.delete(artifact.id);
                }
            })();
        }
    }, [
        pendingArtifacts,
        policy,
        args.projectId,
        convex,
        upsertFile,
        createAndExecuteJob,
        updateJobStatus,
        updateArtifactStatus
    ]);
}
}),
"[project]/apps/web/hooks/useProjectChatSession.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "useProjectChatSession",
    ()=>useProjectChatSession
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.bun/next@16.1.6+f27840211c12abb1/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$convex$40$1$2e$32$2e$0$2b$b1ab299f0a400331$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$react$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/.bun/convex@1.32.0+b1ab299f0a400331/node_modules/convex/dist/esm/react/index.js [app-ssr] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$convex$40$1$2e$32$2e$0$2b$b1ab299f0a400331$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$react$2f$client$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.bun/convex@1.32.0+b1ab299f0a400331/node_modules/convex/dist/esm/react/client.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$convex$2f$_generated$2f$api$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/convex/_generated/api.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$hooks$2f$useAutoApplyArtifacts$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/hooks/useAutoApplyArtifacts.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$automationPolicy$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/lib/agent/automationPolicy.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$prompt$2d$library$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/lib/agent/prompt-library.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$llm$2f$registry$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/lib/llm/registry.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$llm$2f$types$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/lib/llm/types.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$llm$2f$e2e$2d$provider$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/lib/llm/e2e-provider.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$logger$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/lib/logger.ts [app-ssr] (ecmascript)");
'use client';
;
;
;
;
;
;
;
;
;
;
function readAgentPolicyField(source, key) {
    if (!source || typeof source !== 'object') return undefined;
    return source[key];
}
function useProjectChatSession(args) {
    const [activeChatId, setActiveChatId] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const [chatMode, setChatMode] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])('architect');
    const [architectBrainstormEnabled, setArchitectBrainstormEnabled] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(process.env.NEXT_PUBLIC_ENABLE_ARCHITECT_BRAINSTORM === 'true');
    const [uiSelectedModel, setUiSelectedModel] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const [reasoningVariant, setReasoningVariant] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])('none');
    const [specTier, setSpecTier] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])('auto');
    const settings = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$convex$40$1$2e$32$2e$0$2b$b1ab299f0a400331$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$react$2f$client$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useQuery"])(__TURBOPACK__imported__module__$5b$project$5d2f$convex$2f$_generated$2f$api$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["api"].settings.get);
    const effectiveSettings = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$convex$40$1$2e$32$2e$0$2b$b1ab299f0a400331$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$react$2f$client$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useQuery"])(__TURBOPACK__imported__module__$5b$project$5d2f$convex$2f$_generated$2f$api$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["api"].settings.getEffective);
    const settingsRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(settings);
    settingsRef.current = settings;
    const settingsProviderVersion = settings?.updatedAt ?? null;
    const userAgentDefaults = readAgentPolicyField(settings, 'agentDefaults');
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        if (!args.chats || args.chats.length === 0) return;
        if (!activeChatId || !args.chats.some((chat)=>chat._id === activeChatId)) {
            setActiveChatId(args.chats[0]._id);
        }
    }, [
        args.chats,
        activeChatId
    ]);
    const activeChat = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMemo"])(()=>{
        if (!args.chats || args.chats.length === 0) return null;
        if (activeChatId) return args.chats.find((chat)=>chat._id === activeChatId) ?? args.chats[0];
        return args.chats[0];
    }, [
        args.chats,
        activeChatId
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        if (!activeChat?.mode) return;
        setChatMode((0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$prompt$2d$library$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["normalizeChatMode"])(activeChat.mode, 'architect'));
    }, [
        activeChat?._id,
        activeChat?.mode
    ]);
    const effectiveAutomationPolicy = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMemo"])(()=>{
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$automationPolicy$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["resolveEffectiveAgentPolicy"])({
            projectPolicy: args.projectAgentPolicy,
            userDefaults: userAgentDefaults,
            mode: chatMode
        });
    }, [
        args.projectAgentPolicy,
        userAgentDefaults,
        chatMode
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$hooks$2f$useAutoApplyArtifacts$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useAutoApplyArtifacts"])({
        projectId: args.projectId,
        chatId: activeChat?._id,
        policy: effectiveAutomationPolicy
    });
    const provider = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMemo"])(()=>{
        if ((0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$llm$2f$e2e$2d$provider$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["isE2ESpecApprovalModeEnabled"])()) {
            return (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$llm$2f$e2e$2d$provider$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["createE2EProvider"])();
        }
        void settingsProviderVersion;
        const latestSettings = settingsRef.current;
        if (!latestSettings) return null;
        const registry = (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$llm$2f$registry$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getGlobalRegistry"])();
        const defaultProviderId = latestSettings.defaultProvider || 'openai';
        const providerConfig = latestSettings.providerConfigs?.[defaultProviderId];
        if (!providerConfig?.enabled || !providerConfig.apiKey) {
            registry.removeProvider(defaultProviderId);
            return null;
        }
        const nextProviderConfig = {
            provider: providerConfig.provider || 'openai',
            auth: {
                apiKey: providerConfig.apiKey || '',
                baseUrl: providerConfig.baseUrl
            },
            defaultModel: providerConfig.defaultModel
        };
        const existingProvider = registry.getProvider(defaultProviderId);
        if (existingProvider) {
            const existingConfig = registry.getProviderConfig(defaultProviderId);
            const configChanged = existingConfig?.provider !== nextProviderConfig.provider || existingConfig?.auth?.apiKey !== nextProviderConfig.auth.apiKey || existingConfig?.auth?.baseUrl !== nextProviderConfig.auth.baseUrl || existingConfig?.defaultModel !== nextProviderConfig.defaultModel;
            if (configChanged) {
                registry.updateProviderConfig(defaultProviderId, nextProviderConfig);
                return registry.getProvider(defaultProviderId) ?? null;
            }
            return existingProvider;
        }
        try {
            return registry.createProvider(defaultProviderId, nextProviderConfig, true);
        } catch (error) {
            __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$logger$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["appLog"].error('Failed to create provider from settings:', error);
            return null;
        }
    }, [
        settingsProviderVersion
    ]);
    const selectedModel = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMemo"])(()=>{
        if (effectiveSettings?.effectiveModel) return effectiveSettings.effectiveModel;
        const selectedProviderId = settings?.defaultProvider || 'openai';
        const providerDefaultModel = settings?.providerConfigs?.[selectedProviderId]?.defaultModel;
        if (providerDefaultModel) return providerDefaultModel;
        if (settings?.defaultModel) return settings.defaultModel;
        if (provider?.config?.defaultModel) return provider.config.defaultModel;
        return 'gpt-4o';
    }, [
        effectiveSettings?.effectiveModel,
        settings?.defaultProvider,
        settings?.defaultModel,
        settings?.providerConfigs,
        provider
    ]);
    const availableModels = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMemo"])(()=>{
        if ((0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$llm$2f$e2e$2d$provider$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["isE2ESpecApprovalModeEnabled"])()) {
            return [
                {
                    id: 'e2e-spec-model',
                    name: 'E2E Spec Model',
                    provider: 'E2E',
                    providerKey: 'e2e'
                }
            ];
        }
        const providerConfigs = effectiveSettings?.providerConfigs;
        if (!providerConfigs) return [];
        const models = [];
        for (const [key, rawConfig] of Object.entries(providerConfigs)){
            const config = rawConfig;
            if (!config?.enabled) continue;
            const providerName = config.name || key;
            for (const modelId of config.availableModels ?? []){
                const withoutOrg = modelId.includes('/') ? modelId.split('/').slice(1).join('/') : modelId;
                const displayName = withoutOrg.split(':')[0];
                models.push({
                    id: modelId,
                    name: displayName,
                    provider: providerName,
                    providerKey: key
                });
            }
        }
        return models;
    }, [
        effectiveSettings?.providerConfigs
    ]);
    const supportsReasoning = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMemo"])(()=>{
        const providerType = settings?.defaultProvider || 'openai';
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$llm$2f$types$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getDefaultProviderCapabilities"])(providerType).supportsReasoning;
    }, [
        settings?.defaultProvider
    ]);
    return {
        settings,
        activeChatId,
        setActiveChatId,
        activeChat,
        chatMode,
        setChatMode,
        architectBrainstormEnabled,
        setArchitectBrainstormEnabled,
        uiSelectedModel,
        setUiSelectedModel,
        reasoningVariant,
        setReasoningVariant,
        specTier,
        setSpecTier,
        provider,
        selectedModel,
        availableModels,
        supportsReasoning,
        effectiveAutomationPolicy
    };
}
}),
"[project]/apps/web/hooks/useProjectMessageWorkflow.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "useProjectMessageWorkflow",
    ()=>useProjectMessageWorkflow
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.bun/next@16.1.6+f27840211c12abb1/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$sonner$40$2$2e$0$2e$7$2b$bf16f8eded5e12ee$2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.bun/sonner@2.0.7+bf16f8eded5e12ee/node_modules/sonner/dist/index.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$chat$2f$planDraft$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/lib/chat/planDraft.ts [app-ssr] (ecmascript)");
'use client';
;
;
;
function useProjectMessageWorkflow(args) {
    const { projectId, activeChat, chatMode, setChatMode, planDraft, providerAvailable, createChatMutation, updateChatMutation, sendAgentMessage, setActiveChatId, setMobilePrimaryPanel } = args;
    const [pendingMessage, setPendingMessage] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const pendingMessageDispatchRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(null);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        if (!pendingMessage || !activeChat || chatMode !== pendingMessage.mode) return;
        if (pendingMessageDispatchRef.current === pendingMessage.id) return;
        pendingMessageDispatchRef.current = pendingMessage.id;
        void sendAgentMessage(pendingMessage.content, undefined, {
            approvedPlanExecution: pendingMessage.approvedPlanExecution
        }).finally(()=>{
            setPendingMessage((current)=>current?.id === pendingMessage.id ? null : current);
            if (pendingMessageDispatchRef.current === pendingMessage.id) {
                pendingMessageDispatchRef.current = null;
            }
        });
    }, [
        activeChat,
        chatMode,
        pendingMessage,
        sendAgentMessage
    ]);
    const handleSendMessage = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])(async (content, mode, contextFiles, options)=>{
        const trimmed = content.trim();
        if (!trimmed) {
            __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$sonner$40$2$2e$0$2e$7$2b$bf16f8eded5e12ee$2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["toast"].error('Message is empty');
            return;
        }
        setChatMode(mode);
        setMobilePrimaryPanel('chat');
        const finalContent = mode === 'build' && planDraft.trim() && (options?.approvedPlanExecution || activeChat?.planStatus === 'executing') ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$chat$2f$planDraft$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["buildApprovedPlanExecutionMessage"])(planDraft, trimmed) : content;
        if (!activeChat) {
            try {
                const newChatId = await createChatMutation({
                    projectId,
                    title: trimmed.slice(0, 50),
                    mode
                });
                __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$sonner$40$2$2e$0$2e$7$2b$bf16f8eded5e12ee$2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["toast"].success('Chat created');
                setActiveChatId(newChatId);
                setPendingMessage({
                    id: `pending-${Date.now()}`,
                    content: finalContent,
                    mode,
                    approvedPlanExecution: options?.approvedPlanExecution
                });
            } catch (error) {
                void error;
                __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$sonner$40$2$2e$0$2e$7$2b$bf16f8eded5e12ee$2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["toast"].error('Failed to create chat');
            }
            return;
        }
        if (activeChat.mode !== mode) {
            await updateChatMutation({
                id: activeChat._id,
                mode
            });
        }
        if (!providerAvailable) {
            __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$sonner$40$2$2e$0$2e$7$2b$bf16f8eded5e12ee$2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["toast"].error('LLM provider not configured', {
                description: 'Please configure your LLM settings in the settings page.'
            });
            return;
        }
        await sendAgentMessage(finalContent, contextFiles, {
            approvedPlanExecution: options?.approvedPlanExecution
        });
    }, [
        activeChat,
        createChatMutation,
        planDraft,
        projectId,
        providerAvailable,
        sendAgentMessage,
        setActiveChatId,
        setChatMode,
        setMobilePrimaryPanel,
        updateChatMutation
    ]);
    const handleSuggestedAction = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])(async (prompt, targetMode)=>{
        const mode = targetMode ?? chatMode;
        if (targetMode) {
            if (activeChat && activeChat.mode !== targetMode) {
                void updateChatMutation({
                    id: activeChat._id,
                    mode: targetMode
                });
            }
            setChatMode(targetMode);
        }
        await handleSendMessage(prompt, mode);
    }, [
        activeChat,
        chatMode,
        handleSendMessage,
        setChatMode,
        updateChatMutation
    ]);
    const handleBuildFromPlan = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])(async ()=>{
        if (!activeChat) return;
        if (!(0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$chat$2f$planDraft$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["canBuildFromPlan"])(activeChat.planStatus, planDraft)) {
            __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$sonner$40$2$2e$0$2e$7$2b$bf16f8eded5e12ee$2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["toast"].error('Approve the current plan before building');
            return;
        }
        try {
            await updateChatMutation({
                id: activeChat._id,
                mode: 'build',
                planStatus: 'executing'
            });
            setChatMode('build');
            await handleSendMessage('Execute the approved plan. Use the plan as the primary contract, follow it step-by-step, and report progress against it.', 'build', undefined, {
                approvedPlanExecution: true
            });
        } catch (error) {
            __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$sonner$40$2$2e$0$2e$7$2b$bf16f8eded5e12ee$2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["toast"].error('Failed to start build from plan', {
                description: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }, [
        activeChat,
        planDraft,
        setChatMode,
        updateChatMutation,
        handleSendMessage
    ]);
    const handleModeChange = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])((nextMode)=>{
        setChatMode(nextMode);
        if (activeChat && activeChat.mode !== nextMode) {
            void updateChatMutation({
                id: activeChat._id,
                mode: nextMode
            });
        }
    }, [
        activeChat,
        setChatMode,
        updateChatMutation
    ]);
    return {
        handleSendMessage,
        handleSuggestedAction,
        handleBuildFromPlan,
        handleModeChange
    };
}
}),
"[project]/apps/web/hooks/useProjectPlanDraft.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "useProjectPlanDraft",
    ()=>useProjectPlanDraft
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.bun/next@16.1.6+f27840211c12abb1/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$sonner$40$2$2e$0$2e$7$2b$bf16f8eded5e12ee$2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.bun/sonner@2.0.7+bf16f8eded5e12ee/node_modules/sonner/dist/index.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$chat$2f$planDraft$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/lib/chat/planDraft.ts [app-ssr] (ecmascript)");
'use client';
;
;
;
function useProjectPlanDraft(args) {
    const { activeChat, chatMode, architectBrainstormEnabled, agentStatus, agentMessages, updateChatMutation } = args;
    const [planDraft, setPlanDraft] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])('');
    const [isSavingPlanDraft, setIsSavingPlanDraft] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const lastSavedPlanDraftRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])('');
    const planSaveTimerRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(null);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        const nextPlanDraft = activeChat?.planDraft ?? '';
        setPlanDraft(nextPlanDraft);
        lastSavedPlanDraftRef.current = nextPlanDraft;
    }, [
        activeChat?._id,
        activeChat?.planDraft
    ]);
    const persistPlanDraft = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])(async (nextPlanDraft, options)=>{
        const chatId = activeChat?._id;
        if (!chatId) return;
        const trimmed = nextPlanDraft.trim();
        const lastSaved = lastSavedPlanDraftRef.current.trim();
        if (trimmed === lastSaved) return;
        const source = options?.source ?? 'manual';
        const planStatus = source === 'generation' ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$chat$2f$planDraft$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getNextPlanStatusAfterGeneration"])({
            previousDraft: lastSavedPlanDraftRef.current,
            nextDraft: nextPlanDraft,
            currentStatus: activeChat?.planStatus
        }) ?? (trimmed ? 'awaiting_review' : 'idle') : (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$chat$2f$planDraft$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getNextPlanStatusAfterDraftChange"])({
            previousDraft: lastSavedPlanDraftRef.current,
            nextDraft: nextPlanDraft,
            currentStatus: activeChat?.planStatus
        });
        try {
            await updateChatMutation({
                id: chatId,
                planDraft: nextPlanDraft,
                planStatus,
                ...source === 'generation' ? {
                    planLastGeneratedAt: Date.now()
                } : {},
                ...source === 'generation' && options?.planSourceMessageId ? {
                    planSourceMessageId: options.planSourceMessageId
                } : {}
            });
            lastSavedPlanDraftRef.current = nextPlanDraft;
        } catch (error) {
            __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$sonner$40$2$2e$0$2e$7$2b$bf16f8eded5e12ee$2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["toast"].error('Failed to save plan draft', {
                description: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }, [
        activeChat?._id,
        activeChat?.planStatus,
        updateChatMutation
    ]);
    const handleSavePlanDraft = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])(async ()=>{
        setIsSavingPlanDraft(true);
        try {
            await persistPlanDraft(planDraft, {
                source: 'manual'
            });
        } finally{
            setIsSavingPlanDraft(false);
        }
    }, [
        persistPlanDraft,
        planDraft
    ]);
    const handleApprovePlan = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])(async ()=>{
        if (!activeChat || !(0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$chat$2f$planDraft$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["canApprovePlan"])(activeChat.planStatus, planDraft)) return;
        try {
            await updateChatMutation({
                id: activeChat._id,
                planStatus: 'approved',
                planApprovedAt: Date.now()
            });
            __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$sonner$40$2$2e$0$2e$7$2b$bf16f8eded5e12ee$2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["toast"].success('Plan approved');
        } catch (error) {
            __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$sonner$40$2$2e$0$2e$7$2b$bf16f8eded5e12ee$2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["toast"].error('Failed to approve plan', {
                description: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }, [
        activeChat,
        planDraft,
        updateChatMutation
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        if (!activeChat?._id) return;
        const trimmed = planDraft.trim();
        const lastSaved = lastSavedPlanDraftRef.current.trim();
        if (trimmed === lastSaved) return;
        if (planSaveTimerRef.current !== null) {
            window.clearTimeout(planSaveTimerRef.current);
            planSaveTimerRef.current = null;
        }
        planSaveTimerRef.current = window.setTimeout(()=>{
            void persistPlanDraft(planDraft);
        }, 750);
        return ()=>{
            if (planSaveTimerRef.current !== null) {
                window.clearTimeout(planSaveTimerRef.current);
                planSaveTimerRef.current = null;
            }
        };
    }, [
        activeChat?._id,
        planDraft,
        persistPlanDraft
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        const next = (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$chat$2f$planDraft$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["deriveNextPlanDraft"])({
            mode: chatMode,
            agentStatus,
            currentPlanDraft: planDraft,
            requireValidatedBrainstorm: architectBrainstormEnabled,
            messages: agentMessages.filter((message)=>message.role === 'user' || message.role === 'assistant').map((message)=>({
                    role: message.role,
                    mode: message.mode,
                    content: message.content
                }))
        });
        if (!next) return;
        if (planDraft.trim() !== lastSavedPlanDraftRef.current.trim()) return;
        setPlanDraft(next);
        if (planSaveTimerRef.current !== null) {
            window.clearTimeout(planSaveTimerRef.current);
            planSaveTimerRef.current = null;
        }
        const latestArchitectMessage = [
            ...agentMessages
        ].reverse().find((message)=>message.role === 'assistant' && message.mode === 'architect' && message.content.trim());
        void persistPlanDraft(next, {
            source: 'generation',
            planSourceMessageId: latestArchitectMessage?.id
        });
    }, [
        agentMessages,
        agentStatus,
        architectBrainstormEnabled,
        chatMode,
        persistPlanDraft,
        planDraft
    ]);
    return {
        planDraft,
        setPlanDraft,
        isSavingPlanDraft,
        handleSavePlanDraft,
        handleApprovePlan
    };
}
}),
"[project]/apps/web/hooks/useProjectWorkbenchFiles.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "useProjectWorkbenchFiles",
    ()=>useProjectWorkbenchFiles
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.bun/next@16.1.6+f27840211c12abb1/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$convex$40$1$2e$32$2e$0$2b$b1ab299f0a400331$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$react$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/.bun/convex@1.32.0+b1ab299f0a400331/node_modules/convex/dist/esm/react/index.js [app-ssr] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$convex$40$1$2e$32$2e$0$2b$b1ab299f0a400331$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$react$2f$client$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.bun/convex@1.32.0+b1ab299f0a400331/node_modules/convex/dist/esm/react/client.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$convex$2f$_generated$2f$api$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/convex/_generated/api.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$sonner$40$2$2e$0$2e$7$2b$bf16f8eded5e12ee$2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.bun/sonner@2.0.7+bf16f8eded5e12ee/node_modules/sonner/dist/index.mjs [app-ssr] (ecmascript)");
'use client';
;
;
;
;
function useProjectWorkbenchFiles(args) {
    const { projectId, files, selectedFilePath, setSelectedFilePath, setSelectedFileLocation, setCursorPosition, setOpenTabs, setMobilePrimaryPanel } = args;
    const upsertFileMutation = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$convex$40$1$2e$32$2e$0$2b$b1ab299f0a400331$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$react$2f$client$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMutation"])(__TURBOPACK__imported__module__$5b$project$5d2f$convex$2f$_generated$2f$api$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["api"].files.upsert);
    const deleteFileMutation = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$convex$40$1$2e$32$2e$0$2b$b1ab299f0a400331$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$react$2f$client$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMutation"])(__TURBOPACK__imported__module__$5b$project$5d2f$convex$2f$_generated$2f$api$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["api"].files.remove);
    const updateProjectMutation = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$convex$40$1$2e$32$2e$0$2b$b1ab299f0a400331$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$react$2f$client$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMutation"])(__TURBOPACK__imported__module__$5b$project$5d2f$convex$2f$_generated$2f$api$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["api"].projects.update);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        if (!projectId) return;
        updateProjectMutation({
            id: projectId,
            lastOpenedAt: Date.now()
        }).catch((error)=>{
            void error;
        });
    }, [
        projectId,
        updateProjectMutation
    ]);
    const handleFileSelect = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])((path, location)=>{
        setMobilePrimaryPanel('workspace');
        setSelectedFilePath(path);
        if (location) {
            setSelectedFileLocation({
                ...location,
                nonce: Date.now()
            });
            setCursorPosition({
                line: location.line,
                column: location.column
            });
        } else {
            setSelectedFileLocation(null);
            setCursorPosition(null);
        }
        setOpenTabs((prev)=>{
            if (prev.some((tab)=>tab.path === path)) return prev;
            return [
                ...prev,
                {
                    path
                }
            ];
        });
    }, [
        setCursorPosition,
        setMobilePrimaryPanel,
        setOpenTabs,
        setSelectedFileLocation,
        setSelectedFilePath
    ]);
    const handleTabClose = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])((path)=>{
        setOpenTabs((prev)=>{
            const next = prev.filter((tab)=>tab.path !== path);
            if (next.length === 0) {
                setSelectedFilePath(null);
            } else if (selectedFilePath === path) {
                const index = prev.findIndex((tab)=>tab.path === path);
                const nextTab = next[Math.min(index, next.length - 1)];
                setSelectedFilePath(nextTab?.path ?? null);
            }
            return next;
        });
    }, [
        selectedFilePath,
        setOpenTabs,
        setSelectedFilePath
    ]);
    const handleFileCreate = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])(async (path)=>{
        try {
            await upsertFileMutation({
                projectId,
                path,
                content: '',
                isBinary: false
            });
            __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$sonner$40$2$2e$0$2e$7$2b$bf16f8eded5e12ee$2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["toast"].success(`Created ${path}`);
            setSelectedFilePath(path);
            setSelectedFileLocation(null);
        } catch (error) {
            __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$sonner$40$2$2e$0$2e$7$2b$bf16f8eded5e12ee$2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["toast"].error('Failed to create file', {
                description: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }, [
        projectId,
        setSelectedFileLocation,
        setSelectedFilePath,
        upsertFileMutation
    ]);
    const handleFileRename = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])(async (oldPath, newPath)=>{
        try {
            const file = files?.find((candidate)=>candidate.path === oldPath);
            if (!file) {
                __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$sonner$40$2$2e$0$2e$7$2b$bf16f8eded5e12ee$2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["toast"].error('File not found');
                return;
            }
            await upsertFileMutation({
                id: file._id,
                projectId,
                path: newPath,
                content: file.content,
                isBinary: file.isBinary
            });
            __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$sonner$40$2$2e$0$2e$7$2b$bf16f8eded5e12ee$2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["toast"].success(`Renamed to ${newPath}`);
            if (selectedFilePath === oldPath) {
                setSelectedFilePath(newPath);
                setSelectedFileLocation(null);
            }
        } catch (error) {
            __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$sonner$40$2$2e$0$2e$7$2b$bf16f8eded5e12ee$2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["toast"].error('Failed to rename file', {
                description: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }, [
        files,
        projectId,
        selectedFilePath,
        setSelectedFileLocation,
        setSelectedFilePath,
        upsertFileMutation
    ]);
    const handleFileDelete = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])(async (path)=>{
        try {
            const file = files?.find((candidate)=>candidate.path === path);
            if (!file) {
                __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$sonner$40$2$2e$0$2e$7$2b$bf16f8eded5e12ee$2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["toast"].error('File not found');
                return;
            }
            await deleteFileMutation({
                id: file._id
            });
            __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$sonner$40$2$2e$0$2e$7$2b$bf16f8eded5e12ee$2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["toast"].success(`Deleted ${path}`);
            if (selectedFilePath === path) {
                setSelectedFilePath(null);
                setSelectedFileLocation(null);
            }
        } catch (error) {
            __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$sonner$40$2$2e$0$2e$7$2b$bf16f8eded5e12ee$2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["toast"].error('Failed to delete file', {
                description: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }, [
        deleteFileMutation,
        files,
        selectedFilePath,
        setSelectedFileLocation,
        setSelectedFilePath
    ]);
    const handleEditorSave = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])(async (filePath, content)=>{
        try {
            const file = files?.find((candidate)=>candidate.path === filePath);
            await upsertFileMutation({
                id: file?._id,
                projectId,
                path: filePath,
                content,
                isBinary: false
            });
            __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$sonner$40$2$2e$0$2e$7$2b$bf16f8eded5e12ee$2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["toast"].success(`Saved ${filePath}`);
        } catch (error) {
            __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$sonner$40$2$2e$0$2e$7$2b$bf16f8eded5e12ee$2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["toast"].error('Failed to save file', {
                description: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }, [
        files,
        projectId,
        upsertFileMutation
    ]);
    const handleEditorDirtyChange = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])((filePath, isDirty)=>{
        setOpenTabs((prev)=>{
            let changed = false;
            const next = prev.map((tab)=>{
                if (tab.path !== filePath) return tab;
                if (tab.isDirty === isDirty) return tab;
                changed = true;
                return {
                    ...tab,
                    isDirty
                };
            });
            return changed ? next : prev;
        });
    }, [
        setOpenTabs
    ]);
    return {
        handleFileSelect,
        handleTabClose,
        handleFileCreate,
        handleFileRename,
        handleFileDelete,
        handleEditorSave,
        handleEditorDirtyChange
    };
}
}),
"[project]/apps/web/hooks/useLayoutPersistence.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "useLayoutPersistence",
    ()=>useLayoutPersistence
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.bun/next@16.1.6+f27840211c12abb1/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
'use client';
;
const STORAGE_KEY = 'panda:layout-state';
const defaultState = {
    isChatPanelOpen: true
};
function useLayoutPersistence() {
    const [state, setState] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(()=>{
        if ("TURBOPACK compile-time truthy", 1) return defaultState;
        //TURBOPACK unreachable
        ;
    });
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        if ("TURBOPACK compile-time truthy", 1) return;
        //TURBOPACK unreachable
        ;
    }, [
        state
    ]);
    const setIsChatPanelOpen = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])((value)=>{
        setState((prev)=>({
                ...prev,
                isChatPanelOpen: typeof value === 'function' ? value(prev.isChatPanelOpen) : value
            }));
    }, []);
    return {
        isChatPanelOpen: state.isChatPanelOpen,
        setIsChatPanelOpen
    };
}
}),
"[project]/apps/web/hooks/useRuntimePreview.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "useRuntimePreview",
    ()=>useRuntimePreview
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.bun/next@16.1.6+f27840211c12abb1/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
'use client';
;
function useRuntimePreview() {
    const [previewUrl, setPreviewUrl] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const [previewState, setPreviewState] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])('idle');
    const [isPreviewOpen, setIsPreviewOpen] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const openPreview = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])((options)=>{
        if (options?.url !== undefined) {
            setPreviewUrl(options.url);
        }
        if (options?.state) {
            setPreviewState(options.state);
        }
        setIsPreviewOpen(true);
    }, []);
    const closePreview = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])(()=>{
        setIsPreviewOpen(false);
    }, []);
    return {
        previewUrl,
        setPreviewUrl,
        previewState,
        setPreviewState,
        isPreviewOpen,
        setIsPreviewOpen,
        openPreview,
        closePreview
    };
}
}),
"[project]/apps/web/hooks/useProjectWorkspaceUi.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "useProjectWorkspaceUi",
    ()=>useProjectWorkspaceUi
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.bun/next@16.1.6+f27840211c12abb1/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$hooks$2f$useLayoutPersistence$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/hooks/useLayoutPersistence.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$hooks$2f$useRuntimePreview$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/hooks/useRuntimePreview.ts [app-ssr] (ecmascript)");
'use client';
;
;
;
function useProjectWorkspaceUi() {
    const [isArtifactPanelOpen, setIsArtifactPanelOpen] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const { isChatPanelOpen, setIsChatPanelOpen } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$hooks$2f$useLayoutPersistence$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useLayoutPersistence"])();
    const [selectedFilePath, setSelectedFilePath] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const [selectedFileLocation, setSelectedFileLocation] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const [openTabs, setOpenTabs] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])([]);
    const [cursorPosition, setCursorPosition] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const [isMobileLayout, setIsMobileLayout] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const [isCompactDesktopLayout, setIsCompactDesktopLayout] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const [mobilePrimaryPanel, setMobilePrimaryPanel] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])('workspace');
    const [mobileUnreadCount, setMobileUnreadCount] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(0);
    const [isMobileKeyboardOpen, setIsMobileKeyboardOpen] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const [isChatInspectorOpen, setIsChatInspectorOpen] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const [chatInspectorTab, setChatInspectorTab] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])('run');
    const [isSpecDrawerOpen, setIsSpecDrawerOpen] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const [isSpecPanelOpen, setIsSpecPanelOpen] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const [isShareDialogOpen, setIsShareDialogOpen] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const runtimePreview = (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$hooks$2f$useRuntimePreview$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRuntimePreview"])();
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        const mobileMedia = window.matchMedia('(max-width: 1023px)');
        const compactDesktopMedia = window.matchMedia('(min-width: 1024px) and (max-width: 1279px)');
        const update = ()=>{
            setIsMobileLayout(mobileMedia.matches);
            setIsCompactDesktopLayout(compactDesktopMedia.matches);
        };
        update();
        mobileMedia.addEventListener('change', update);
        compactDesktopMedia.addEventListener('change', update);
        return ()=>{
            mobileMedia.removeEventListener('change', update);
            compactDesktopMedia.removeEventListener('change', update);
        };
    }, []);
    // Keyboard shortcuts moved to the shared shortcut registry.
    // Terminal toggle: Ctrl+` -> shortcut registry.
    // Sidebar toggle: Ctrl+B -> useSidebar.
    return {
        isArtifactPanelOpen,
        setIsArtifactPanelOpen,
        isChatPanelOpen,
        setIsChatPanelOpen,
        selectedFilePath,
        setSelectedFilePath,
        selectedFileLocation,
        setSelectedFileLocation,
        openTabs,
        setOpenTabs,
        cursorPosition,
        setCursorPosition,
        isMobileLayout,
        isCompactDesktopLayout,
        mobilePrimaryPanel,
        setMobilePrimaryPanel,
        mobileUnreadCount,
        setMobileUnreadCount,
        isMobileKeyboardOpen,
        setIsMobileKeyboardOpen,
        isChatInspectorOpen,
        setIsChatInspectorOpen,
        chatInspectorTab,
        setChatInspectorTab,
        isSpecDrawerOpen,
        setIsSpecDrawerOpen,
        isSpecPanelOpen,
        setIsSpecPanelOpen,
        isShareDialogOpen,
        setIsShareDialogOpen,
        previewUrl: runtimePreview.previewUrl,
        setPreviewUrl: runtimePreview.setPreviewUrl,
        previewState: runtimePreview.previewState,
        setPreviewState: runtimePreview.setPreviewState,
        isPreviewOpen: runtimePreview.isPreviewOpen,
        setIsPreviewOpen: runtimePreview.setIsPreviewOpen,
        openPreview: runtimePreview.openPreview,
        closePreview: runtimePreview.closePreview
    };
}
}),
"[project]/apps/web/hooks/useSpecDriftDetection.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>__TURBOPACK__default__export__,
    "useSpecDriftDetection",
    ()=>useSpecDriftDetection
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.bun/next@16.1.6+f27840211c12abb1/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$convex$40$1$2e$32$2e$0$2b$b1ab299f0a400331$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$react$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/.bun/convex@1.32.0+b1ab299f0a400331/node_modules/convex/dist/esm/react/index.js [app-ssr] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$convex$40$1$2e$32$2e$0$2b$b1ab299f0a400331$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$react$2f$client$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.bun/convex@1.32.0+b1ab299f0a400331/node_modules/convex/dist/esm/react/client.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$convex$2f$_generated$2f$api$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/convex/_generated/api.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$components$2f$ui$2f$SpecSyncToast$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/components/ui/SpecSyncToast.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$harness$2f$plugins$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/lib/agent/harness/plugins.ts [app-ssr] (ecmascript)");
/**
 * useSpecDriftDetection - Hook for managing spec drift detection in the UI
 *
 * Provides:
 * - Drift event listening via plugin hooks
 * - Toast notifications for drift detection
 * - Reconciliation flow management
 * - Integration with spec engine for refinement
 */ 'use client';
;
;
;
;
;
function useSpecDriftDetection(options = {}) {
    const { onDriftDetected, onReconciliationComplete } = options;
    const [state, setState] = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"]({
        pendingDrifts: new Map(),
        processingDrifts: new Set(),
        completedReconciliations: new Map()
    });
    // Convex mutations
    const createVersionMutation = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$convex$40$1$2e$32$2e$0$2b$b1ab299f0a400331$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$react$2f$client$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMutation"])(__TURBOPACK__imported__module__$5b$project$5d2f$convex$2f$_generated$2f$api$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["api"].specifications.createVersion);
    const markDriftedMutation = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$convex$40$1$2e$32$2e$0$2b$b1ab299f0a400331$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$react$2f$client$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMutation"])(__TURBOPACK__imported__module__$5b$project$5d2f$convex$2f$_generated$2f$api$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["api"].specifications.markDrifted);
    /**
   * Handle reconciliation of a drift report
   */ const handleReconcile = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"](async (report)=>{
        try {
            // Mark spec as drifted in database
            await markDriftedMutation({
                specId: report.specId,
                driftDetails: {
                    findings: report.findings,
                    modifiedFiles: report.modifiedFiles,
                    detectedAt: report.detectedAt,
                    severity: report.severity
                }
            });
            // Create new version (the actual refinement would happen server-side
            // or via the spec engine - here we just create the version chain)
            const result = await createVersionMutation({
                parentSpecId: report.specId
            });
            setState((prev)=>{
                const nextProcessing = new Set(prev.processingDrifts);
                nextProcessing.delete(report.specId);
                return {
                    ...prev,
                    processingDrifts: nextProcessing,
                    completedReconciliations: new Map(prev.completedReconciliations).set(report.specId, {
                        success: true,
                        newSpecId: result.newSpecId
                    })
                };
            });
            onReconciliationComplete?.(report.specId, true, result.newSpecId);
        } catch (error) {
            console.error('Reconciliation failed:', error);
            setState((prev)=>{
                const nextProcessing = new Set(prev.processingDrifts);
                nextProcessing.delete(report.specId);
                return {
                    ...prev,
                    processingDrifts: nextProcessing,
                    completedReconciliations: new Map(prev.completedReconciliations).set(report.specId, {
                        success: false
                    })
                };
            });
            onReconciliationComplete?.(report.specId, false);
        }
    }, [
        createVersionMutation,
        markDriftedMutation,
        onReconciliationComplete
    ]);
    /**
   * Show drift notification toast
   */ const notifyDrift = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"]((report)=>{
        // Don't show duplicate notifications for the same spec
        if (state.pendingDrifts.has(report.specId) || state.processingDrifts.has(report.specId)) {
            return;
        }
        // Add to pending
        setState((prev)=>({
                ...prev,
                pendingDrifts: new Map(prev.pendingDrifts).set(report.specId, report)
            }));
        // Show toast
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$components$2f$ui$2f$SpecSyncToast$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["showSpecSyncToast"])(report, // On update - trigger reconciliation
        async (driftReport)=>{
            setState((prev)=>{
                const nextPending = new Map(prev.pendingDrifts);
                nextPending.delete(driftReport.specId);
                return {
                    ...prev,
                    pendingDrifts: nextPending,
                    processingDrifts: new Set(prev.processingDrifts).add(driftReport.specId)
                };
            });
            // Trigger reconciliation
            await handleReconcile(driftReport);
        }, // On ignore - just clear from pending
        (driftReport)=>{
            setState((prev)=>{
                const nextPending = new Map(prev.pendingDrifts);
                nextPending.delete(driftReport.specId);
                return {
                    ...prev,
                    pendingDrifts: nextPending
                };
            });
        }, {
            duration: 15000
        } // 15 seconds to decide
        );
        // Call external handler
        onDriftDetected?.(report);
    }, [
        state.pendingDrifts,
        state.processingDrifts,
        onDriftDetected,
        handleReconcile
    ]);
    /**
   * Manually trigger drift detection for a spec
   */ const detectDrift = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"](async (spec, modifiedFiles)=>{
        // Import drift detection dynamically to avoid SSR issues
        const { createDriftReport } = await __turbopack_context__.A("[project]/apps/web/lib/agent/spec/drift-detection.ts [app-ssr] (ecmascript, async loader)");
        const report = createDriftReport(spec, modifiedFiles, 'Manual drift detection');
        if (report.hasDrift) {
            notifyDrift(report);
        }
        return report;
    }, [
        notifyDrift
    ]);
    /**
   * Clear all pending drifts
   */ const clearPendingDrifts = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"](()=>{
        setState((prev)=>({
                ...prev,
                pendingDrifts: new Map()
            }));
    }, []);
    /**
   * Check if a spec has pending drift
   */ const hasPendingDrift = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"]((specId)=>{
        return state.pendingDrifts.has(specId);
    }, [
        state.pendingDrifts
    ]);
    /**
   * Get pending drift for a spec
   */ const getPendingDrift = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"]((specId)=>{
        return state.pendingDrifts.get(specId);
    }, [
        state.pendingDrifts
    ]);
    // Set up plugin hook listener for drift detection
    __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"](()=>{
        // Register a plugin to listen for drift detection events
        const driftListenerPlugin = {
            name: 'drift-listener',
            version: '1.0.0',
            hooks: {
                'spec.drift.detected': async (_ctx, data)=>{
                    const report = data;
                    notifyDrift(report);
                    return data;
                }
            }
        };
        __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$harness$2f$plugins$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["plugins"].register(driftListenerPlugin);
        return ()=>{
            __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$harness$2f$plugins$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["plugins"].unregister('drift-listener');
        };
    }, [
        notifyDrift
    ]);
    return {
        // State
        pendingDrifts: Array.from(state.pendingDrifts.values()),
        processingDrifts: state.processingDrifts,
        completedReconciliations: state.completedReconciliations,
        // Actions
        notifyDrift,
        detectDrift,
        clearPendingDrifts,
        hasPendingDrift,
        getPendingDrift,
        // Counts
        pendingCount: state.pendingDrifts.size,
        processingCount: state.processingDrifts.size
    };
}
const __TURBOPACK__default__export__ = useSpecDriftDetection;
}),
];

//# sourceMappingURL=apps_web_hooks_23b6d54d._.js.map