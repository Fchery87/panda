(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/apps/web/lib/agent/spec/drift-detection.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * Drift Detection Plugin - SpecNative spec-code sync
 *
 * This plugin hooks into tool execution to detect when code changes
 * affect areas covered by active specifications. It triggers drift
 * detection events that can be handled by the UI to prompt users
 * for spec reconciliation.
 *
 * Solves Kiro's fatal flaw: specs that don't auto-update when code changes.
 */ __turbopack_context__.s([
    "DEFAULT_DRIFT_CONFIG",
    ()=>DEFAULT_DRIFT_CONFIG,
    "clearPendingDrift",
    ()=>clearPendingDrift,
    "createDriftDetectionPlugin",
    ()=>createDriftDetectionPlugin,
    "createDriftReport",
    ()=>createDriftReport,
    "getActiveSpecs",
    ()=>getActiveSpecs,
    "getPendingDrifts",
    ()=>getPendingDrifts,
    "registerActiveSpec",
    ()=>registerActiveSpec,
    "unregisterActiveSpec",
    ()=>unregisterActiveSpec
]);
// Import plugins for hook execution
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$harness$2f$plugins$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/lib/agent/harness/plugins.ts [app-client] (ecmascript)");
const DEFAULT_DRIFT_CONFIG = {
    enabled: true,
    minSeverity: 'low',
    throttleMs: 5000,
    maxNotificationsPerSession: 10,
    watchedTools: [
        'write_files',
        'edit_file',
        'apply_diff',
        'create_file',
        'delete_file'
    ]
};
/**
 * Global drift detection state
 */ const state = {
    activeSpecs: new Map(),
    lastNotificationTime: new Map(),
    notificationCount: new Map(),
    pendingDrifts: new Map()
};
function registerActiveSpec(spec) {
    state.activeSpecs.set(spec.id, spec);
}
function unregisterActiveSpec(specId) {
    state.activeSpecs.delete(specId);
    state.lastNotificationTime.delete(specId);
    state.pendingDrifts.delete(specId);
}
function getActiveSpecs() {
    return Array.from(state.activeSpecs.values());
}
function getPendingDrifts() {
    return Array.from(state.pendingDrifts.values());
}
function clearPendingDrift(specId) {
    state.pendingDrifts.delete(specId);
}
/**
 * Check if a file is covered by a specification
 */ function isFileCoveredBySpec(filePath, spec) {
    // Check dependencies
    for (const dep of spec.plan.dependencies){
        if (fileMatches(filePath, dep.path)) {
            return true;
        }
    }
    // Check step target files
    for (const step of spec.plan.steps){
        for (const target of step.targetFiles){
            if (fileMatches(filePath, target)) {
                return true;
            }
        }
    }
    // Check invariants
    for (const invariant of spec.validation.invariants){
        if (fileMatches(filePath, invariant.scope)) {
            return true;
        }
    }
    return false;
}
/**
 * File pattern matching
 */ function fileMatches(file, pattern) {
    // Exact match
    if (file === pattern) return true;
    // Glob-style pattern matching (simplified)
    if (pattern.includes('*')) {
        const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
        return regex.test(file);
    }
    // Directory prefix match
    if (pattern.endsWith('/')) {
        return file.startsWith(pattern);
    }
    // Check if file is in the pattern directory
    const patternDir = pattern.includes('/') ? pattern.slice(0, pattern.lastIndexOf('/') + 1) : '';
    if (patternDir && file.startsWith(patternDir)) {
        return true;
    }
    return false;
}
/**
 * Extract file paths from tool arguments
 */ function extractFilePaths(toolName, args) {
    const paths = [];
    switch(toolName){
        case 'write_files':
        case 'edit_file':
        case 'apply_diff':
            if (Array.isArray(args.paths)) {
                paths.push(...args.paths.map((p)=>String(p)));
            }
            if (Array.isArray(args.files)) {
                paths.push(...args.files.map((f)=>f.path || '').filter(Boolean));
            }
            if (typeof args.path === 'string') {
                paths.push(args.path);
            }
            if (typeof args.file_path === 'string') {
                paths.push(args.file_path);
            }
            break;
        case 'create_file':
            if (typeof args.path === 'string') {
                paths.push(args.path);
            }
            if (typeof args.file_path === 'string') {
                paths.push(args.file_path);
            }
            break;
        case 'delete_file':
            if (typeof args.path === 'string') {
                paths.push(args.path);
            }
            break;
    }
    return paths.filter(Boolean);
}
/**
 * Detect drift for a modified file against a specification
 */ function detectDriftForFile(filePath, spec, toolName) {
    const findings = [];
    // Check if file is covered by spec
    if (!isFileCoveredBySpec(filePath, spec)) {
        return findings;
    }
    // Find affected dependencies
    for (const dep of spec.plan.dependencies){
        if (fileMatches(filePath, dep.path)) {
            findings.push({
                type: 'dependency_change',
                filePath,
                description: `File with ${dep.access} access was modified via ${toolName}`,
                relatedConstraint: undefined,
                relatedCriterion: undefined,
                severity: dep.access === 'delete' ? 'high' : 'medium',
                suggestion: 'Review spec dependencies and update if access patterns changed'
            });
        }
    }
    // Check constraints
    for (const constraint of spec.intent.constraints){
        if (constraint.type === 'structural' && fileMatches(filePath, constraint.target)) {
            findings.push({
                type: 'constraint_violation',
                filePath,
                description: `Structural constraint may be affected: ${constraint.rule}`,
                relatedConstraint: constraint,
                relatedCriterion: undefined,
                severity: 'medium',
                suggestion: 'Verify structural constraint still holds after changes'
            });
        }
    }
    // Check invariants
    for (const invariant of spec.validation.invariants){
        if (fileMatches(filePath, invariant.scope)) {
            findings.push({
                type: 'invariant_breach',
                filePath,
                description: `Invariant scope was modified: ${invariant.description}`,
                relatedConstraint: undefined,
                relatedCriterion: undefined,
                severity: 'high',
                suggestion: `Verify invariant still holds: ${invariant.rule}`
            });
        }
    }
    return findings;
}
/**
 * Check if drift notification should be throttled
 */ function shouldThrottle(specId, config) {
    const now = Date.now();
    const lastTime = state.lastNotificationTime.get(specId) || 0;
    const count = state.notificationCount.get(specId) || 0;
    // Check max notifications
    if (count >= config.maxNotificationsPerSession) {
        return true;
    }
    // Check throttle interval
    if (now - lastTime < config.throttleMs) {
        return true;
    }
    return false;
}
/**
 * Update throttle state
 */ function updateThrottleState(specId) {
    const now = Date.now();
    state.lastNotificationTime.set(specId, now);
    state.notificationCount.set(specId, (state.notificationCount.get(specId) || 0) + 1);
}
function createDriftDetectionPlugin(config = {}) {
    const fullConfig = {
        ...DEFAULT_DRIFT_CONFIG,
        ...config
    };
    return {
        name: 'drift-detection',
        version: '1.0.0',
        hooks: {
            'tool.execute.after': async (ctx, data)=>{
                if (!fullConfig.enabled) {
                    return data;
                }
                const typedData = data;
                const { toolName, args } = typedData;
                // Only watch specific tools
                if (!fullConfig.watchedTools.includes(toolName)) {
                    return data;
                }
                // Skip if there was an error
                if (typedData.result.error) {
                    return data;
                }
                // Extract modified file paths
                const modifiedFiles = extractFilePaths(toolName, args);
                if (modifiedFiles.length === 0) {
                    return data;
                }
                // Check each active spec for drift
                for (const [specId, spec] of state.activeSpecs){
                    // Skip specs that are not in a state where drift matters
                    if (spec.status !== 'verified' && spec.status !== 'executing') {
                        continue;
                    }
                    const findings = [];
                    for (const filePath of modifiedFiles){
                        const fileFindings = detectDriftForFile(filePath, spec, toolName);
                        findings.push(...fileFindings);
                    }
                    if (findings.length === 0) {
                        continue;
                    }
                    // Calculate severity
                    const hasHigh = findings.some((f)=>f.severity === 'high');
                    const hasMedium = findings.some((f)=>f.severity === 'medium');
                    const severity = hasHigh ? 'high' : hasMedium ? 'medium' : 'low';
                    // Check minimum severity threshold
                    const severityLevels = {
                        low: 0,
                        medium: 1,
                        high: 2
                    };
                    if (severityLevels[severity] < severityLevels[fullConfig.minSeverity]) {
                        continue;
                    }
                    // Check throttle
                    if (shouldThrottle(specId, fullConfig)) {
                        continue;
                    }
                    // Create drift report
                    const driftReport = {
                        hasDrift: true,
                        specId,
                        modifiedFiles,
                        findings,
                        detectedAt: Date.now(),
                        severity
                    };
                    // Store as pending
                    state.pendingDrifts.set(specId, driftReport);
                    // Update throttle state
                    updateThrottleState(specId);
                    // Emit drift detected event via plugin system
                    // This will be picked up by the UI
                    await __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$harness$2f$plugins$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["plugins"].executeHooks('spec.drift.detected', ctx, driftReport);
                }
                return data;
            }
        }
    };
}
function createDriftReport(spec, modifiedFiles, reason) {
    const findings = [];
    for (const filePath of modifiedFiles){
        const fileFindings = detectDriftForFile(filePath, spec, 'manual');
        findings.push(...fileFindings);
    }
    // If no specific findings, create a generic one
    if (findings.length === 0) {
        findings.push({
            type: 'requirement_mismatch',
            filePath: modifiedFiles[0] || 'unknown',
            description: reason,
            severity: 'medium',
            suggestion: 'Review spec and update to reflect code changes'
        });
    }
    const hasHigh = findings.some((f)=>f.severity === 'high');
    const hasMedium = findings.some((f)=>f.severity === 'medium');
    const severity = hasHigh ? 'high' : hasMedium ? 'medium' : 'low';
    return {
        hasDrift: true,
        specId: spec.id,
        modifiedFiles,
        findings,
        detectedAt: Date.now(),
        severity
    };
}
;
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
]);

//# sourceMappingURL=apps_web_lib_agent_spec_drift-detection_ts_b61a1ed6._.js.map