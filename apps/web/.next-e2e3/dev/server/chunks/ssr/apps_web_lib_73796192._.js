module.exports = [
"[project]/apps/web/lib/agent/plan-progress.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "derivePlanProgressMetadata",
    ()=>derivePlanProgressMetadata,
    "parsePlanSteps",
    ()=>parsePlanSteps
]);
function normalizePlanText(value) {
    return value.toLowerCase().replace(/[`*_#:-]/g, ' ').replace(/\s+/g, ' ').trim();
}
function tokenizePlanText(value) {
    return normalizePlanText(value).split(' ').map((token)=>token.replace(/(ed|ing|es|s)$/i, '')).filter((token)=>token.length >= 4);
}
function hasMeaningfulTokenOverlap(a, b) {
    const aTokens = tokenizePlanText(a);
    const bTokens = new Set(tokenizePlanText(b));
    return aTokens.filter((token)=>bTokens.has(token)).length >= 2;
}
function parsePlanSteps(planDraft) {
    const content = planDraft?.trim();
    if (!content) return [];
    const implementationMatch = content.match(/##\s+Implementation Plan\s*\n([\s\S]*?)(?:\n##\s+|$)/i);
    const section = implementationMatch?.[1] ?? content;
    return section.split('\n').map((line)=>line.trim()).filter((line)=>/^\d+\.\s+/.test(line)).map((line)=>line.replace(/^\d+\.\s+/, '').trim()).filter(Boolean);
}
function findMatchingPlanStepIndex(planSteps, progressContent, completedStepIndexes) {
    const normalizedProgress = normalizePlanText(progressContent);
    if (!normalizedProgress) return -1;
    const candidateIndexes = planSteps.map((step, index)=>({
            step,
            index
        })).filter(({ index })=>!completedStepIndexes.includes(index));
    const exactCandidate = candidateIndexes.find(({ step })=>{
        const normalizedPlanStep = normalizePlanText(step);
        return normalizedProgress.includes(normalizedPlanStep) || normalizedPlanStep.includes(normalizedProgress) || hasMeaningfulTokenOverlap(normalizedProgress, normalizedPlanStep);
    });
    return exactCandidate?.index ?? -1;
}
function derivePlanProgressMetadata(planSteps, progressContent, progressStatus, completedStepIndexes) {
    if (planSteps.length === 0) return null;
    const matchedStepIndex = findMatchingPlanStepIndex(planSteps, progressContent, completedStepIndexes);
    const nextCompletedStepIndexes = matchedStepIndex >= 0 && progressStatus === 'completed' ? [
        ...new Set([
            ...completedStepIndexes,
            matchedStepIndex
        ])
    ].sort((a, b)=>a - b) : completedStepIndexes.slice().sort((a, b)=>a - b);
    return {
        ...matchedStepIndex >= 0 ? {
            planStepIndex: matchedStepIndex,
            planStepTitle: planSteps[matchedStepIndex]
        } : {},
        planTotalSteps: planSteps.length,
        completedPlanStepIndexes: nextCompletedStepIndexes
    };
}
}),
"[project]/apps/web/lib/agent/harness/identifier.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ascending",
    ()=>ascending,
    "compare",
    ()=>compare,
    "parseTimestamp",
    ()=>parseTimestamp,
    "random",
    ()=>random
]);
/**
 * Identifier - Generate unique, sortable identifiers
 *
 * Uses ascending identifiers that sort lexicographically by time
 */ let counter = 0;
const MAX_COUNTER = 36 ** 6;
function ascending(prefix = '') {
    const timestamp = Date.now().toString(36).padStart(9, '0');
    const random = Math.random().toString(36).slice(2, 8);
    counter = (counter + 1) % MAX_COUNTER;
    const sequence = counter.toString(36).padStart(4, '0');
    return `${prefix}${timestamp}${sequence}${random}`;
}
function random(length = 16) {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for(let i = 0; i < length; i++){
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}
function parseTimestamp(id) {
    try {
        const timestampPart = id.slice(0, 9);
        return parseInt(timestampPart, 36);
    } catch (error) {
        void error;
        return null;
    }
}
function compare(a, b) {
    return a.localeCompare(b);
}
}),
"[project]/apps/web/lib/logger.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "appLog",
    ()=>appLog
]);
const appLog = {
    error: (...args)=>{
        console.error(...args);
    },
    warn: (...args)=>{
        console.warn(...args);
    }
};
}),
"[project]/apps/web/lib/agent/harness/event-bus.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "bus",
    ()=>bus
]);
/**
 * Event Bus - Real-time event publishing and subscription
 *
 * Provides a centralized event system for:
 * - Session/message/part updates
 * - Tool execution events
 * - Permission requests
 * - Compaction events
 * - Error handling
 */ var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$logger$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/lib/logger.ts [app-ssr] (ecmascript)");
;
class EventBus {
    subscriptions = new Map();
    eventHistory = [];
    maxHistorySize = 1000;
    /**
   * Subscribe to events
   */ subscribe(handler, options) {
        const id = `sub_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        this.subscriptions.set(id, {
            id,
            handler,
            filter: options?.filter
        });
        if (options?.replayHistory) {
            for (const event of this.eventHistory){
                if (!options.filter || options.filter(event)) {
                    handler(event);
                }
            }
        }
        return ()=>{
            this.subscriptions.delete(id);
        };
    }
    /**
   * Subscribe to specific event types
   */ on(types, handler, options) {
        const typeSet = new Set(Array.isArray(types) ? types : [
            types
        ]);
        return this.subscribe(handler, {
            filter: (event)=>{
                if (!typeSet.has(event.type)) return false;
                return options?.filter ? options.filter(event) : true;
            }
        });
    }
    /**
   * Publish an event to all subscribers
   */ emit(type, sessionID, payload) {
        const event = {
            type,
            sessionID,
            timestamp: Date.now(),
            payload
        };
        this.eventHistory.push(event);
        if (this.eventHistory.length > this.maxHistorySize) {
            this.eventHistory = this.eventHistory.slice(-this.maxHistorySize);
        }
        for (const subscription of this.subscriptions.values()){
            try {
                if (!subscription.filter || subscription.filter(event)) {
                    subscription.handler(event);
                }
            } catch (error) {
                __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$logger$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["appLog"].error('[EventBus] Handler error:', error);
            }
        }
    }
    /**
   * Emit session event
   */ emitSession(sessionID, action, payload) {
        this.emit(`session.${action}`, sessionID, payload);
    }
    /**
   * Emit message event
   */ emitMessage(sessionID, action, payload) {
        this.emit(`message.${action}`, sessionID, payload);
    }
    /**
   * Emit part event
   */ emitPart(sessionID, action, payload) {
        this.emit(`part.${action}`, sessionID, payload);
    }
    /**
   * Emit tool event
   */ emitTool(sessionID, status, payload) {
        this.emit(`tool.${status}`, sessionID, payload);
    }
    /**
   * Emit compaction event
   */ emitCompaction(sessionID, status, payload) {
        this.emit(`compaction.${status}`, sessionID, payload);
    }
    /**
   * Emit permission event
   */ emitPermission(sessionID, status, payload) {
        this.emit(`permission.${status}`, sessionID, payload);
    }
    /**
   * Emit error event
   */ emitError(sessionID, error) {
        this.emit('error', sessionID, error);
    }
    /**
   * Get event history
   */ getHistory(options) {
        let events = [
            ...this.eventHistory
        ];
        if (options?.sessionID) {
            events = events.filter((e)=>e.sessionID === options.sessionID);
        }
        if (options?.types) {
            const typeSet = new Set(options.types);
            events = events.filter((e)=>typeSet.has(e.type));
        }
        if (options?.since) {
            events = events.filter((e)=>e.timestamp >= options.since);
        }
        if (options?.limit) {
            events = events.slice(-options.limit);
        }
        return events;
    }
    /**
   * Clear event history
   */ clearHistory() {
        this.eventHistory = [];
    }
    /**
   * Get subscription count
   */ getSubscriptionCount() {
        return this.subscriptions.size;
    }
}
const bus = new EventBus();
}),
"[project]/apps/web/lib/agent/harness/permissions.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * Permission System - Granular access control for tools
 *
 * Implements allow/deny/ask patterns with glob matching
 * for file paths and command patterns
 */ __turbopack_context__.s([
    "DEFAULT_PERMISSIONS",
    ()=>DEFAULT_PERMISSIONS,
    "PermissionManager",
    ()=>PermissionManager,
    "checkPermission",
    ()=>checkPermission,
    "intersectPermissionDecisions",
    ()=>intersectPermissionDecisions,
    "intersectPermissions",
    ()=>intersectPermissions,
    "mergePermissions",
    ()=>mergePermissions,
    "permissions",
    ()=>permissions
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$harness$2f$identifier$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/lib/agent/harness/identifier.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$harness$2f$event$2d$bus$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/lib/agent/harness/event-bus.ts [app-ssr] (ecmascript)");
;
;
/**
 * Wildcard pattern matching
 */ function matchPattern(pattern, value) {
    if (pattern === '*') return true;
    if (pattern === value) return true;
    const regexPattern = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.');
    try {
        return new RegExp(`^${regexPattern}$`, 'i').test(value);
    } catch (error) {
        void error;
        return false;
    }
}
function checkPermission(permissions, tool, pattern) {
    const patterns = Object.keys(permissions).sort((a, b)=>{
        const aHasPath = a.includes(':');
        const bHasPath = b.includes(':');
        if (aHasPath !== bHasPath) {
            return aHasPath ? -1 : 1;
        }
        const aSpecificity = (a.match(/\*/g) || []).length;
        const bSpecificity = (b.match(/\*/g) || []).length;
        return aSpecificity - bSpecificity;
    });
    for (const permPattern of patterns){
        const [permTool, permPath] = permPattern.split(':', 2);
        if (!matchPattern(permTool, tool)) continue;
        if (permPath && pattern) {
            if (matchPattern(permPath, pattern)) {
                return permissions[permPattern] ?? 'ask';
            }
        } else if (!permPath) {
            return permissions[permPattern] ?? 'ask';
        }
    }
    if (pattern) {
        return checkPermission(permissions, tool);
    }
    return 'ask';
}
function mergePermissions(base, override) {
    return {
        ...base,
        ...override
    };
}
function intersectPermissionDecisions(parent, child) {
    if (parent === 'deny' || child === 'deny') return 'deny';
    if (parent === 'allow' && child === 'allow') return 'allow';
    return 'ask';
}
function intersectPermissions(parent, child) {
    const merged = {};
    const keys = new Set([
        ...Object.keys(parent),
        ...Object.keys(child)
    ]);
    for (const key of keys){
        const [tool, pattern] = key.split(':', 2);
        const parentDecision = checkPermission(parent, tool, pattern || undefined);
        const childDecision = checkPermission(child, tool, pattern || undefined);
        merged[key] = intersectPermissionDecisions(parentDecision, childDecision);
    }
    return merged;
}
const DEFAULT_PERMISSIONS = {
    build: {
        read_files: 'allow',
        list_directory: 'allow',
        write_files: 'allow',
        run_command: 'allow',
        search_codebase: 'allow',
        search_code: 'allow',
        search_code_ast: 'allow',
        update_memory_bank: 'allow',
        task: 'allow',
        question: 'deny'
    },
    plan: {
        read_files: 'allow',
        list_directory: 'allow',
        search_codebase: 'allow',
        search_code: 'allow',
        search_code_ast: 'allow',
        write_files: 'deny',
        run_command: 'ask',
        update_memory_bank: 'allow',
        task: 'allow'
    },
    ask: {
        read_files: 'allow',
        list_directory: 'allow',
        search_codebase: 'allow',
        search_code: 'allow',
        search_code_ast: 'allow',
        write_files: 'deny',
        run_command: 'deny',
        task: 'deny'
    }
};
class PermissionManager {
    timeoutMs;
    pollIntervalMs;
    pendingRequests = new Map();
    sessionPermissions = new Map();
    userDecisions = new Map();
    constructor(options){
        this.timeoutMs = options?.timeoutMs ?? 60000;
        this.pollIntervalMs = options?.pollIntervalMs ?? 100;
    }
    /**
   * Request permission for a tool execution
   */ async request(sessionID, messageID, tool, pattern, metadata) {
        const id = (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$harness$2f$identifier$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["ascending"])('perm_');
        const request = {
            sessionID,
            messageID,
            tool,
            pattern,
            metadata
        };
        const decisionKey = `${sessionID}:${tool}:${pattern}`;
        const cachedDecision = this.userDecisions.get(decisionKey);
        if (cachedDecision) {
            return {
                granted: cachedDecision === 'allow',
                decision: cachedDecision,
                reason: 'Cached decision'
            };
        }
        const sessionPerms = this.sessionPermissions.get(sessionID) ?? {};
        const decision = checkPermission(sessionPerms, tool, pattern);
        if (decision !== 'ask') {
            return {
                granted: decision === 'allow',
                decision
            };
        }
        this.pendingRequests.set(id, request);
        __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$harness$2f$event$2d$bus$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["bus"].emitPermission(sessionID, 'requested', {
            id,
            request
        });
        return new Promise((resolve)=>{
            let resolved = false;
            const checkInterval = setInterval(()=>{
                const req = this.pendingRequests.get(id);
                if (resolved || !req?.decision) {
                    return;
                }
                resolved = true;
                clearInterval(checkInterval);
                this.pendingRequests.delete(id);
                const granted = req.decision === 'allow';
                if (req.reason === 'always') {
                    this.userDecisions.set(decisionKey, req.decision);
                }
                __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$harness$2f$event$2d$bus$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["bus"].emitPermission(sessionID, 'decided', {
                    id,
                    decision: req.decision,
                    reason: req.reason
                });
                resolve({
                    granted,
                    decision: req.decision,
                    reason: req.reason
                });
            }, this.pollIntervalMs);
            setTimeout(()=>{
                if (resolved) return;
                resolved = true;
                clearInterval(checkInterval);
                this.pendingRequests.delete(id);
                __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$harness$2f$event$2d$bus$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["bus"].emitPermission(sessionID, 'decided', {
                    id,
                    decision: 'deny',
                    reason: 'Timeout'
                });
                resolve({
                    granted: false,
                    decision: 'deny',
                    reason: 'Timeout'
                });
            }, this.timeoutMs);
        });
    }
    /**
   * Respond to a permission request
   */ respond(requestID, decision, reason) {
        const request = this.pendingRequests.get(requestID);
        if (!request) return false;
        request.decision = decision;
        request.reason = reason;
        return true;
    }
    /**
   * Set session-level permissions
   */ setSessionPermissions(sessionID, permissions) {
        this.sessionPermissions.set(sessionID, permissions);
    }
    /**
   * Get session-level permissions
   */ getSessionPermissions(sessionID) {
        return this.sessionPermissions.get(sessionID);
    }
    /**
   * Clear cached decisions
   */ clearCache() {
        this.userDecisions.clear();
    }
    /**
   * Get pending requests
   */ getPendingRequests() {
        return Array.from(this.pendingRequests.values());
    }
}
const permissions = new PermissionManager();
}),
"[project]/apps/web/lib/agent/harness/agents.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * Agent System - Agent definitions with YAML/Markdown support
 *
 * Implements OpenCode-style agent configuration:
 * - Built-in agents: build, plan, ask
 * - Custom agents via YAML/Markdown files
 * - Agent modes: primary, subagent, all
 * - Per-agent tool permissions
 */ __turbopack_context__.s([
    "BUILTIN_AGENTS",
    ()=>BUILTIN_AGENTS,
    "SUBAGENT_TEMPLATES",
    ()=>SUBAGENT_TEMPLATES,
    "agents",
    ()=>agents,
    "parseAgentMarkdown",
    ()=>parseAgentMarkdown
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$harness$2f$permissions$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/lib/agent/harness/permissions.ts [app-ssr] (ecmascript)");
;
/**
 * Parse YAML frontmatter from markdown
 */ function parseFrontmatter(content) {
    const match = content.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/);
    if (!match) {
        return {
            frontmatter: {},
            body: content
        };
    }
    const frontmatterStr = match[1];
    const body = match[2];
    const frontmatter = {};
    const lines = frontmatterStr.split('\n');
    let currentArray = null;
    let indent = 0;
    for (const line of lines){
        const trimmed = line.trim();
        if (!trimmed) continue;
        const lineIndent = line.search(/\S/);
        if (currentArray && lineIndent > indent) {
            if (trimmed.startsWith('- ')) {
                currentArray.push(trimmed.slice(2));
            }
            continue;
        }
        currentArray = null;
        const colonIndex = trimmed.indexOf(':');
        if (colonIndex === -1) continue;
        const key = trimmed.slice(0, colonIndex).trim();
        const value = trimmed.slice(colonIndex + 1).trim();
        if (value === '' || value === '|') {
            indent = lineIndent;
            if (value === '' && lines[lines.indexOf(line) + 1]?.includes(':')) {
                frontmatter[key] = {};
            } else {
                frontmatter[key] = [];
                currentArray = frontmatter[key];
            }
        } else if (value.startsWith('[') && value.endsWith(']')) {
            frontmatter[key] = value.slice(1, -1).split(',').map((s)=>s.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
        } else if (value === 'true' || value === 'false') {
            frontmatter[key] = value === 'true';
        } else if (/^\d+$/.test(value)) {
            frontmatter[key] = parseInt(value, 10);
        } else if (/^\d+\.\d+$/.test(value)) {
            frontmatter[key] = parseFloat(value);
        } else {
            frontmatter[key] = value.replace(/^["']|["']$/g, '');
        }
    }
    return {
        frontmatter,
        body
    };
}
/**
 * Convert parsed frontmatter to Permission
 */ function parsePermissionConfig(config) {
    const permission = {};
    const tools = config.tools;
    if (tools) {
        for (const [tool, value] of Object.entries(tools)){
            if (typeof value === 'boolean') {
                permission[tool] = value ? 'allow' : 'deny';
            } else if (value === 'allow' || value === 'deny' || value === 'ask') {
                permission[tool] = value;
            }
        }
    }
    return permission;
}
function parseAgentMarkdown(content, name) {
    const { frontmatter, body } = parseFrontmatter(content);
    const mode = frontmatter.mode ?? 'subagent';
    const permission = parsePermissionConfig(frontmatter);
    return {
        name,
        description: frontmatter.description ?? body.slice(0, 200).trim(),
        model: frontmatter.model,
        variant: frontmatter.variant,
        temperature: frontmatter.temperature,
        topP: frontmatter.topP,
        prompt: body.trim() || undefined,
        permission: Object.keys(permission).length > 0 ? permission : __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$harness$2f$permissions$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["DEFAULT_PERMISSIONS"][mode] ?? {},
        mode,
        hidden: frontmatter.hidden ?? mode === 'subagent',
        color: frontmatter.color,
        steps: frontmatter.steps,
        options: frontmatter.options
    };
}
const BUILTIN_AGENTS = [
    {
        name: 'build',
        description: 'Full-access agent for active development work. Can read, write, run commands, and execute tasks.',
        mode: 'primary',
        permission: __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$harness$2f$permissions$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["DEFAULT_PERMISSIONS"].build,
        steps: 50,
        prompt: `You are Panda.ai, an AI coding agent with full access to the codebase.

Your primary goal is to help users build, modify, and debug code efficiently.

## Operational Guidelines

1. **Use tools proactively**: Read files, search code, and make changes using the available tools.
2. **Verify changes**: Run tests and lint checks after making modifications.
3. **Be concise**: Keep responses short and actionable.
4. **Explain critical actions**: Before destructive operations, briefly explain what you're doing.
5. **Respect user decisions**: If a user rejects a change, don't retry without their request.

## Available Tools

- \`read_files\`: Read file contents
- \`list_directory\`: Explore project structure
- \`write_files\`: Create or modify files
- \`run_command\`: Execute CLI commands
- \`search_code\`: Search for text patterns
- \`search_code_ast\`: Structural code search
- \`update_memory_bank\`: Persist important project knowledge
- \`task\`: Spawn specialized subagents (like debugger, tech-writer, explore) to handle complex tasks in parallel.

## Workflow

1. Understand the task by reading relevant files
2. Plan the changes needed
3. Implement changes using write_files
4. Verify with tests/lint
5. Summarize what was done`
    },
    {
        name: 'code',
        description: 'Implementation agent for code changes with read/write/command access, without subagent delegation.',
        mode: 'primary',
        permission: {
            read_files: 'allow',
            list_directory: 'allow',
            write_files: 'allow',
            run_command: 'allow',
            search_code: 'allow',
            search_code_ast: 'allow',
            update_memory_bank: 'allow',
            task: 'deny',
            question: 'deny'
        },
        steps: 30,
        prompt: `You are Panda.ai in code mode. Implement changes directly and concisely.

Use tools to read, edit, and verify. Keep chat output brief and do not paste code blocks.`
    },
    {
        name: 'plan',
        description: 'Read-only agent for analysis and planning. Explores codebase without making changes.',
        mode: 'primary',
        permission: __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$harness$2f$permissions$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["DEFAULT_PERMISSIONS"].plan,
        steps: 20,
        prompt: `You are Panda.ai in plan mode. Your role is to analyze and plan without making changes.

## Guidelines

1. **Read-only operations**: You can explore files and search code, but cannot write or execute commands.
2. **Provide detailed analysis**: Explain what you find and recommend approaches.
3. **Create actionable plans**: Produce or update a structured plan artifact, not just a chat answer.
4. **Identify risks**: Flag potential issues or edge cases.

## Available Tools

- \`read_files\`: Read file contents
- \`list_directory\`: Explore project structure  
- \`search_code\`: Search for text patterns
- \`search_code_ast\`: Structural code search
- \`task\`: Spawn specialized subagents (like debugger, tech-writer, explore) to handle complex tasks in parallel.

## Output Format

When planning, structure your response as:

## Goal
- One short statement of the desired outcome

## Clarifications
- 0-2 bullets; only what materially affects implementation

## Relevant Files
- Specific file paths, symbols, routes, or systems likely impacted

## Implementation Plan
1. Step one
2. Step two
3. ...

## Risks
- Potential issues
- Edge cases to consider

## Validation
- Checks, tests, or acceptance steps

## Open Questions
- Remaining unresolved questions, or "None"

Prefer concrete file references over generic architecture prose.`
    },
    {
        name: 'ask',
        description: 'Quick questions and code exploration. Minimal tool access for fast responses.',
        mode: 'primary',
        permission: __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$harness$2f$permissions$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["DEFAULT_PERMISSIONS"].ask,
        steps: 5,
        prompt: `You are Panda.ai in ask mode. Answer questions quickly and accurately.

## Guidelines

1. **Be concise**: Direct answers without unnecessary elaboration.
2. **Use search wisely**: Only search when needed to answer accurately.
3. **No modifications**: This mode is for questions only.

## Available Tools

- \`read_files\`: Read specific files
- \`search_code\`: Search for patterns`
    }
];
const SUBAGENT_TEMPLATES = [
    {
        name: 'explore',
        description: 'Thorough codebase exploration for understanding unfamiliar code.',
        mode: 'subagent',
        hidden: false,
        permission: {
            read_files: 'allow',
            list_directory: 'allow',
            search_code: 'allow',
            search_code_ast: 'allow'
        },
        prompt: `You are an exploration agent. Thoroughly investigate the codebase to answer questions.

Focus on:
- Finding all relevant files
- Understanding code structure and patterns
- Identifying dependencies and relationships
- Providing comprehensive summaries`
    },
    {
        name: 'security-auditor',
        description: 'Security-focused code review for vulnerabilities.',
        mode: 'subagent',
        hidden: false,
        permission: {
            read_files: 'allow',
            search_code: 'allow',
            search_code_ast: 'allow'
        },
        prompt: `You are a security auditor agent. Review code for security issues.

Check for:
- Authentication and authorization flaws
- Input validation issues
- Injection vulnerabilities
- Sensitive data exposure
- Insecure configurations

Provide severity ratings and remediation steps.`
    },
    {
        name: 'performance-analyzer',
        description: 'Analyze code for performance bottlenecks and optimization opportunities.',
        mode: 'subagent',
        hidden: false,
        permission: {
            read_files: 'allow',
            search_code: 'allow',
            run_command: 'allow'
        },
        prompt: `You are a performance analyzer agent. Identify performance issues.

Analyze:
- Algorithm complexity
- Memory usage patterns
- I/O bottlenecks
- Caching opportunities
- Database query efficiency`
    },
    {
        name: 'test-generator',
        description: 'Generate comprehensive test suites for code.',
        mode: 'subagent',
        hidden: false,
        permission: {
            read_files: 'allow',
            write_files: 'allow',
            run_command: 'allow',
            search_code: 'allow'
        },
        prompt: `You are a test generator agent. Create thorough test coverage.

Generate:
- Unit tests
- Integration tests
- Edge case tests
- Error handling tests

Use the project's testing framework and conventions.`
    },
    {
        name: 'code-reviewer',
        description: 'Review code for quality, maintainability, and best practices.',
        mode: 'subagent',
        hidden: false,
        permission: {
            read_files: 'allow',
            search_code: 'allow'
        },
        prompt: `You are a code reviewer agent. Provide constructive feedback.

Review for:
- Code quality and readability
- Design patterns and architecture
- Error handling
- Documentation
- Consistency with project conventions

Provide actionable suggestions with explanations.`
    },
    {
        name: 'debugger',
        description: 'Dedicated debugger focusing on stack traces, server logs, and runtime exceptions.',
        mode: 'subagent',
        hidden: false,
        permission: {
            read_files: 'allow',
            run_command: 'allow',
            search_code: 'allow',
            search_code_ast: 'allow'
        },
        prompt: `You are a dedicated debugger agent. Your sole purpose is to track down and solve errors.

Focus strictly on:
- Analyzing stack traces and runtime exceptions
- Reading and interpreting server logs
- Identifying the exact line and logic causing a failure
- Do NOT get distracted by general refactoring or feature additions
- Do NOT use shell operators (|, &&, >) when using the run_command tool

Provide the exact cause of the crash and a precise, minimal fix.`
    },
    {
        name: 'tech-writer',
        description: 'Tech writer agent that concurrently generates and updates project documentation.',
        mode: 'subagent',
        hidden: false,
        permission: {
            read_files: 'allow',
            write_files: 'allow',
            search_code: 'allow'
        },
        prompt: `You are a technical documentation agent. Your job is to keep documentation perfectly in sync with the codebase.

Focus on:
- Writing and updating high-quality JSDoc/TSDoc comments for functions and classes
- Updating README.md files to reflect new features or changes
- Generating Architecture markdown files for complex modules
- Writing clear, concise explanations of implementation details

When exploring code, ensure your generated documentation strictly matches the actual implementation.`
    }
];
/**
 * Agent Registry - manages all agents
 */ class AgentRegistry {
    agents = new Map();
    constructor(){
        for (const agent of BUILTIN_AGENTS){
            this.agents.set(agent.name, agent);
        }
        for (const agent of SUBAGENT_TEMPLATES){
            this.agents.set(agent.name, agent);
        }
    }
    /**
   * Get an agent by name
   */ get(name) {
        return this.agents.get(name);
    }
    /**
   * List all agents
   */ list() {
        return Array.from(this.agents.values());
    }
    /**
   * List agents by mode
   */ listByMode(mode) {
        return this.list().filter((a)=>a.mode === mode || a.mode === 'all');
    }
    /**
   * List primary agents (for Tab switching)
   */ listPrimary() {
        return this.list().filter((a)=>a.mode === 'primary' || a.mode === 'all');
    }
    /**
   * List subagents (for @ mentions)
   */ listSubagents() {
        return this.list().filter((a)=>!a.hidden && (a.mode === 'subagent' || a.mode === 'all'));
    }
    /**
   * Register a custom agent
   */ register(config) {
        this.agents.set(config.name, config);
    }
    /**
   * Register agent from markdown
   */ registerFromMarkdown(content, name) {
        const config = parseAgentMarkdown(content, name);
        this.register(config);
    }
    /**
   * Unregister an agent
   */ unregister(name) {
        if (BUILTIN_AGENTS.some((a)=>a.name === name)) {
            return false;
        }
        return this.agents.delete(name);
    }
    /**
   * Check if agent exists
   */ has(name) {
        return this.agents.has(name);
    }
}
const agents = new AgentRegistry();
}),
"[project]/apps/web/lib/agent/harness/plugins.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "costTrackingPlugin",
    ()=>costTrackingPlugin,
    "createPlugin",
    ()=>createPlugin,
    "defaultPlugins",
    ()=>defaultPlugins,
    "loggingPlugin",
    ()=>loggingPlugin,
    "plugins",
    ()=>plugins,
    "registerDefaultPlugins",
    ()=>registerDefaultPlugins,
    "specTrackingPlugin",
    ()=>specTrackingPlugin
]);
/**
 * Plugin System - Extensibility through hooks and custom tools
 *
 * Implements OpenCode-style plugin architecture:
 * - Lifecycle hooks for all operations
 * - Custom tool registration
 * - Custom agent registration
 * - Hook priority and ordering
 */ var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$logger$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/lib/logger.ts [app-ssr] (ecmascript)");
;
function debugHarnessLog(...args) {
    if (process.env.NEXT_PUBLIC_PANDA_AGENT_HARNESS_DEBUG_LOGS !== '1') {
        return;
    }
    console.log(...args);
}
class PluginManager {
    plugins = new Map();
    hooks = new Map();
    customTools = new Map();
    customAgents = new Map();
    /**
   * Register a plugin
   */ register(plugin) {
        if (this.plugins.has(plugin.name)) {
            __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$logger$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["appLog"].warn(`[PluginManager] Plugin "${plugin.name}" already registered, replacing`);
            this.unregister(plugin.name);
        }
        this.plugins.set(plugin.name, plugin);
        if (plugin.hooks) {
            for (const [hookType, handler] of Object.entries(plugin.hooks)){
                this.addHook(plugin.name, hookType, handler, 0);
            }
        }
        if (plugin.tools) {
            for (const tool of plugin.tools){
                this.customTools.set(tool.function.name, tool);
            }
        }
        if (plugin.agents) {
            for (const agent of plugin.agents){
                this.customAgents.set(agent.name, agent);
            }
        }
    }
    /**
   * Unregister a plugin
   */ unregister(name) {
        const plugin = this.plugins.get(name);
        if (!plugin) return;
        this.plugins.delete(name);
        for (const [hookType, entries] of this.hooks){
            this.hooks.set(hookType, entries.filter((e)=>e.plugin !== name));
        }
        if (plugin.tools) {
            for (const tool of plugin.tools){
                this.customTools.delete(tool.function.name);
            }
        }
        if (plugin.agents) {
            for (const agent of plugin.agents){
                this.customAgents.delete(agent.name);
            }
        }
    }
    /**
   * Add a hook handler
   */ addHook(plugin, hookType, handler, priority = 0) {
        if (!this.hooks.has(hookType)) {
            this.hooks.set(hookType, []);
        }
        const entries = this.hooks.get(hookType);
        entries.push({
            plugin,
            priority,
            handler
        });
        entries.sort((a, b)=>b.priority - a.priority);
    }
    /**
   * Execute hooks for a given type
   */ async executeHooks(hookType, context, data) {
        const entries = this.hooks.get(hookType);
        if (!entries || entries.length === 0) return data;
        let result = data;
        for (const entry of entries){
            try {
                const hookResult = await entry.handler(context, result);
                if (hookResult !== undefined) {
                    result = hookResult;
                }
            } catch (error) {
                __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$logger$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["appLog"].error(`[PluginManager] Hook error in ${entry.plugin}:`, error);
            }
        }
        return result;
    }
    /**
   * Get all registered tools (built-in + custom)
   */ getTools() {
        return Array.from(this.customTools.values());
    }
    /**
   * Get a specific tool
   */ getTool(name) {
        return this.customTools.get(name);
    }
    /**
   * Get all registered agents (custom)
   */ getAgents() {
        return Array.from(this.customAgents.values());
    }
    /**
   * Get a specific agent
   */ getAgent(name) {
        return this.customAgents.get(name);
    }
    /**
   * List all registered plugins
   */ listPlugins() {
        return Array.from(this.plugins.values());
    }
    /**
   * Check if a plugin is registered
   */ has(name) {
        return this.plugins.has(name);
    }
}
const plugins = new PluginManager();
function createPlugin(name, config) {
    return {
        name,
        version: '1.0.0',
        hooks: config.hooks ?? {},
        tools: config.tools,
        agents: config.agents
    };
}
const loggingPlugin = createPlugin('logging', {
    hooks: {
        'tool.execute.before': async (ctx, data)=>{
            debugHarnessLog(`[Tool] ${ctx.agent.name} executing:`, data);
            return data;
        },
        'tool.execute.after': async (ctx, data)=>{
            debugHarnessLog(`[Tool] ${ctx.agent.name} completed:`, data);
            return data;
        },
        'session.start': async (ctx, data)=>{
            debugHarnessLog(`[Session] Started:`, ctx.sessionID);
            return data;
        },
        'session.end': async (ctx, data)=>{
            debugHarnessLog(`[Session] Ended:`, ctx.sessionID);
            return data;
        }
    }
});
const costTrackingPlugin = createPlugin('cost-tracking', {
    hooks: {
        'llm.response': async (ctx, data)=>{
            const typedData = data;
            if (typedData.usage) {
                const cost = calculateCost(typedData.modelID, typedData.usage.totalTokens);
                debugHarnessLog(`[Cost] ${ctx.sessionID}: $${cost.toFixed(6)} (${typedData.usage.totalTokens} tokens)`);
            }
            return data;
        }
    }
});
function calculateCost(modelID, tokens) {
    const pricing = {
        'claude-sonnet-4': {
            input: 0.000003,
            output: 0.000015
        },
        'claude-opus-4': {
            input: 0.000015,
            output: 0.000075
        },
        'gpt-4o': {
            input: 0.000005,
            output: 0.000015
        },
        'gpt-4-turbo': {
            input: 0.00001,
            output: 0.00003
        }
    };
    const price = pricing[modelID] ?? {
        input: 0.000001,
        output: 0.000003
    };
    return tokens * ((price.input + price.output) / 2);
}
const specTrackingPlugin = createPlugin('spec-tracking', {
    hooks: {
        'tool.execute.after': async (ctx, data)=>{
            const typedData = data;
            // Log spec-related tool execution
            if (process.env.NEXT_PUBLIC_PANDA_SPEC_DEBUG === '1') {
                debugHarnessLog(`[SpecTracking] Tool executed: ${typedData.toolName}`, {
                    sessionID: ctx.sessionID,
                    step: ctx.step,
                    hasError: !!typedData.result.error
                });
            }
            // Check for drift detection if enabled
            if (typedData.toolName === 'write_files' || typedData.toolName === 'edit_file') {
                // Extract file paths from args
                const filePaths = [];
                if (Array.isArray(typedData.args.paths)) {
                    filePaths.push(...typedData.args.paths.map((p)=>String(p)));
                }
                if (Array.isArray(typedData.args.files)) {
                    filePaths.push(...typedData.args.files.map((f)=>f.path || '').filter(Boolean));
                }
                if (typeof typedData.args.path === 'string') {
                    filePaths.push(typedData.args.path);
                }
                // Drift detection would check if these files are covered by an active spec
                // and if the changes align with the spec constraints
                if (filePaths.length > 0) {
                // This is a placeholder for drift detection logic
                // In a full implementation, this would:
                // 1. Check if there's an active spec
                // 2. Verify the modified files are in the spec's dependencies
                // 3. Check if the changes align with spec constraints
                // 4. Emit drift detection event if misaligned
                }
            }
            return data;
        },
        'spec.execute.before': async (ctx, data)=>{
            const typedData = data;
            if (process.env.NEXT_PUBLIC_PANDA_SPEC_DEBUG === '1') {
                debugHarnessLog(`[SpecTracking] Spec execution starting:`, {
                    sessionID: ctx.sessionID,
                    specId: typedData.spec?.id,
                    goal: typedData.spec?.intent.goal.slice(0, 50)
                });
            }
            return data;
        },
        'spec.verify': async (ctx, data)=>{
            const typedData = data;
            if (process.env.NEXT_PUBLIC_PANDA_SPEC_DEBUG === '1') {
                const passedCount = typedData.criterionResults.filter((r)=>r.passed).length;
                debugHarnessLog(`[SpecTracking] Spec verification complete:`, {
                    sessionID: ctx.sessionID,
                    passed: typedData.passed,
                    criteriaPassed: `${passedCount}/${typedData.criterionResults.length}`
                });
            }
            return data;
        },
        'spec.drift.detected': async (ctx, data)=>{
            const typedData = data;
            __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$logger$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["appLog"].warn(`[SpecTracking] Drift detected:`, {
                sessionID: ctx.sessionID,
                specId: typedData.specId,
                filePath: typedData.filePath,
                reason: typedData.reason
            });
            return data;
        }
    }
});
const defaultPlugins = [
    loggingPlugin,
    costTrackingPlugin,
    specTrackingPlugin
];
function registerDefaultPlugins() {
    for (const plugin of defaultPlugins){
        if (!plugins.has(plugin.name)) {
            plugins.register(plugin);
        }
    }
}
}),
"[project]/apps/web/lib/agent/harness/compaction.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * Context Compaction - Auto-summarization for long conversations
 *
 * Implements OpenCode-style context management:
 * - Token counting and budget tracking
 * - Auto-summarization at threshold
 * - Message pruning for old tool outputs
 * - Compaction summaries as special message parts
 */ __turbopack_context__.s([
    "SUMMARIZATION_PROMPT",
    ()=>SUMMARIZATION_PROMPT,
    "compaction",
    ()=>compaction,
    "estimateMessageTokens",
    ()=>estimateMessageTokens,
    "estimatePartTokens",
    ()=>estimatePartTokens,
    "estimateTokens",
    ()=>estimateTokens,
    "filterCompacted",
    ()=>filterCompacted,
    "needsCompaction",
    ()=>needsCompaction,
    "pruneToolOutputs",
    ()=>pruneToolOutputs
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$harness$2f$identifier$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/lib/agent/harness/identifier.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$harness$2f$event$2d$bus$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/lib/agent/harness/event-bus.ts [app-ssr] (ecmascript)");
;
;
const DEFAULT_CONFIG = {
    threshold: 0.9,
    targetRatio: 0.5,
    preserveRecent: 4,
    maxToolOutputLength: 10000
};
function estimateTokens(text) {
    if (!text) return 0;
    const charCount = text.length;
    const wordCount = text.split(/\s+/).filter(Boolean).length;
    return Math.ceil(charCount / 4 + wordCount * 0.3);
}
function estimateMessageTokens(message) {
    let tokens = 50;
    if ('parts' in message && message.parts) {
        for (const part of message.parts){
            tokens += estimatePartTokens(part);
        }
    }
    if ('content' in message && typeof message.content === 'string') {
        tokens += estimateTokens(message.content);
    }
    if ('tool_calls' in message && message.tool_calls && Array.isArray(message.tool_calls)) {
        for (const tc of message.tool_calls){
            tokens += estimateTokens(tc.function.name);
            tokens += estimateTokens(tc.function.arguments);
        }
    }
    return tokens;
}
function estimatePartTokens(part) {
    let tokens = 20;
    switch(part.type){
        case 'text':
            tokens += estimateTokens(part.text);
            break;
        case 'reasoning':
            tokens += estimateTokens(part.text);
            if (part.summary) tokens += estimateTokens(part.summary);
            break;
        case 'tool':
            tokens += estimateTokens(JSON.stringify(part.state));
            break;
        case 'subtask':
            tokens += estimateTokens(part.prompt);
            if (part.result) {
                tokens += estimateTokens(part.result.output);
                for (const p of part.result.parts){
                    tokens += estimatePartTokens(p);
                }
            }
            break;
        case 'file':
            if (part.source.type === 'base64') {
                tokens += Math.ceil(part.source.data.length / 4);
            } else {
                tokens += 100;
            }
            break;
        case 'compaction':
            if (part.summary) tokens += estimateTokens(part.summary);
            break;
    }
    return tokens;
}
function needsCompaction(messages, contextLimit, config = DEFAULT_CONFIG) {
    const totalTokens = messages.reduce((sum, m)=>sum + estimateMessageTokens(m), 0);
    return totalTokens >= contextLimit * config.threshold;
}
function pruneToolOutputs(parts, maxLength) {
    let pruned = 0;
    const prunedParts = parts.map((part)=>{
        if (part.type === 'tool' && 'output' in part.state) {
            const state = part.state;
            if (state.output && state.output.length > maxLength) {
                pruned++;
                return {
                    ...part,
                    state: {
                        ...part.state,
                        output: state.output.slice(0, maxLength) + '\n\n[Output truncated due to length]'
                    }
                };
            }
        }
        return part;
    });
    return {
        parts: prunedParts,
        pruned
    };
}
function filterCompacted(messages) {
    return messages.filter((m)=>{
        if (m.role === 'assistant' && m.summary) return false;
        if ('parts' in m) {
            const hasCompaction = m.parts.some((p)=>p.type === 'compaction');
            if (hasCompaction) return false;
        }
        return true;
    });
}
/**
 * Compaction Manager
 */ class CompactionManager {
    summaries = new Map();
    config = DEFAULT_CONFIG;
    /**
   * Set configuration
   */ setConfig(config) {
        this.config = {
            ...this.config,
            ...config
        };
    }
    /**
   * Process messages for compaction
   */ async compact(sessionID, messages, contextLimit, summarizeFn) {
        const tokensBefore = messages.reduce((sum, m)=>sum + estimateMessageTokens(m), 0);
        __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$harness$2f$event$2d$bus$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["bus"].emitCompaction(sessionID, 'started', {
            tokensBefore,
            threshold: this.config.threshold,
            messageCount: messages.length
        });
        const filtered = filterCompacted(messages);
        const preserveCount = Math.min(this.config.preserveRecent, filtered.length);
        const toCompact = filtered.slice(0, -preserveCount);
        const toPreserve = filtered.slice(-preserveCount);
        if (toCompact.length === 0) {
            return {
                summary: '',
                tokensBefore,
                tokensAfter: tokensBefore,
                messagesCompacted: 0,
                error: 'No messages to compact'
            };
        }
        try {
            const summary = await summarizeFn(toCompact);
            this.summaries.set(sessionID, summary);
            const compactionPart = {
                id: (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$harness$2f$identifier$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["ascending"])('part_'),
                messageID: (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$harness$2f$identifier$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["ascending"])('msg_'),
                sessionID,
                type: 'compaction',
                auto: true,
                summary
            };
            const summaryMessage = {
                id: (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$harness$2f$identifier$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["ascending"])('msg_'),
                sessionID,
                role: 'user',
                time: {
                    created: Date.now()
                },
                parts: [
                    compactionPart
                ],
                agent: 'system'
            };
            const pruned = toPreserve.map((m)=>{
                if ('parts' in m) {
                    const { parts } = pruneToolOutputs(m.parts, this.config.maxToolOutputLength);
                    return {
                        ...m,
                        parts
                    };
                }
                return m;
            });
            const compacted = [
                summaryMessage,
                ...pruned
            ];
            const tokensAfter = compacted.reduce((sum, m)=>sum + estimateMessageTokens(m), 0);
            __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$harness$2f$event$2d$bus$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["bus"].emitCompaction(sessionID, 'completed', {
                tokensBefore,
                tokensAfter,
                messagesCompacted: toCompact.length,
                reduction: ((1 - tokensAfter / tokensBefore) * 100).toFixed(1) + '%'
            });
            return {
                summary,
                tokensBefore,
                tokensAfter,
                messagesCompacted: toCompact.length,
                messages: compacted
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$harness$2f$event$2d$bus$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["bus"].emitError(sessionID, {
                type: 'compaction',
                error: errorMessage
            });
            return {
                summary: '',
                tokensBefore,
                tokensAfter: tokensBefore,
                messagesCompacted: 0,
                error: errorMessage
            };
        }
    }
    /**
   * Get summary for session
   */ getSummary(sessionID) {
        return this.summaries.get(sessionID);
    }
    /**
   * Clear summary
   */ clearSummary(sessionID) {
        this.summaries.delete(sessionID);
    }
    /**
   * Calculate compaction threshold
   */ getThreshold(contextLimit) {
        return Math.floor(contextLimit * this.config.threshold);
    }
    /**
   * Get target token count after compaction
   */ getTarget(contextLimit) {
        return Math.floor(contextLimit * this.config.targetRatio);
    }
}
const compaction = new CompactionManager();
const SUMMARIZATION_PROMPT = `Provide a detailed but concise summary of the conversation above.

Focus on:
1. What was discussed and decided
2. What files were examined or modified
3. What changes were made
4. What's the current state of work
5. What should be done next

Keep the summary factual and actionable.`;
}),
"[project]/apps/web/lib/agent/command-analysis.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "analyzeCommand",
    ()=>analyzeCommand,
    "isCommandPipelineSafe",
    ()=>isCommandPipelineSafe,
    "splitCommandByPipe",
    ()=>splitCommandByPipe
]);
const PIPE_OPERATOR = '|';
const CHAIN_OPERATOR_PATTERN = /\s+(?:&&|\|\|)\s+/u;
const REDIRECT_OPERATORS = [
    '>>',
    '>'
];
const CHAIN_OPERATORS = [
    '&&',
    '||'
];
const READ_ONLY_PIPE_COMMANDS = new Set([
    'cat',
    'cut',
    'grep',
    'head',
    'jq',
    'sed',
    'sort',
    'tail',
    'uniq',
    'wc'
]);
function splitCommandByPipe(command) {
    return command.split(/\s+\|\s+/u).map((segment)=>segment.trim()).filter(Boolean);
}
function getLeadingCommand(segment) {
    const [command = ''] = segment.trim().split(/\s+/u);
    return command.toLowerCase();
}
function analyzeCommand(command) {
    const trimmed = command.trim();
    const operators = [
        ...REDIRECT_OPERATORS.filter((operator)=>trimmed.includes(operator)),
        ...CHAIN_OPERATORS.filter((operator)=>trimmed.includes(operator)),
        ...trimmed.includes(PIPE_OPERATOR) ? [
            PIPE_OPERATOR
        ] : []
    ];
    if (REDIRECT_OPERATORS.some((operator)=>trimmed.includes(operator))) {
        return {
            command: trimmed,
            kind: 'redirect',
            segments: [
                trimmed
            ],
            operators,
            riskTier: 'high',
            requiresApproval: true,
            reason: 'Output redirection can create or overwrite files.'
        };
    }
    if (CHAIN_OPERATORS.some((operator)=>trimmed.includes(operator))) {
        return {
            command: trimmed,
            kind: 'chain',
            segments: trimmed.split(CHAIN_OPERATOR_PATTERN).filter(Boolean),
            operators,
            riskTier: 'medium',
            requiresApproval: true,
            reason: 'Command chaining runs multiple operations in one request.'
        };
    }
    if (trimmed.includes(PIPE_OPERATOR)) {
        const segments = splitCommandByPipe(trimmed);
        const safePipeline = segments.length > 1 && segments.slice(1).every((segment)=>READ_ONLY_PIPE_COMMANDS.has(getLeadingCommand(segment)));
        return {
            command: trimmed,
            kind: 'pipeline',
            segments,
            operators,
            riskTier: safePipeline ? 'low' : 'medium',
            requiresApproval: !safePipeline,
            reason: safePipeline ? 'Read-only pipeline.' : 'Only read-only pipelines can run automatically.'
        };
    }
    return {
        command: trimmed,
        kind: 'single',
        segments: [
            trimmed
        ],
        operators,
        riskTier: 'low',
        requiresApproval: false,
        reason: 'Single command.'
    };
}
function isCommandPipelineSafe(analysis) {
    return analysis.kind === 'pipeline' && analysis.riskTier === 'low';
}
}),
"[project]/apps/web/lib/agent/harness/oracle.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "executeOracleSearch",
    ()=>executeOracleSearch
]);
const ORACLE_STOPWORDS = new Set([
    'a',
    'an',
    'and',
    'can',
    'find',
    'for',
    'how',
    'i',
    'in',
    'is',
    'show',
    'the',
    'to',
    'what',
    'where'
]);
function escapeRegexLiteral(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
function selectSignificantToken(query) {
    const tokens = query.split(/\s+/).map((token)=>token.trim()).filter(Boolean);
    const preferred = tokens.find((token)=>{
        const normalized = token.replace(/^[^\p{L}\p{N}_$]+|[^\p{L}\p{N}_$]+$/gu, '').toLowerCase();
        return normalized.length >= 3 && !ORACLE_STOPWORDS.has(normalized);
    });
    if (preferred) return preferred;
    return tokens.find((token)=>token.length > 0) ?? '';
}
async function executeOracleSearch(query, context) {
    if (!context.searchCode) {
        throw new Error('search_code is not available in this context');
    }
    const startTime = Date.now();
    // Clean the query slightly
    const cleanQuery = query.trim().replace(/^['"]|['"]$/g, '');
    if (!cleanQuery) {
        return {
            engine: 'oracle_multi_tier',
            query: '',
            matches: [],
            stats: {
                totalFound: 0,
                durationMs: Date.now() - startTime,
                literalMatches: 0,
                regexMatches: 0
            }
        };
    }
    try {
        // 1. Literal search for the exact query
        const literalResult = await context.searchCode({
            query: cleanQuery,
            mode: 'literal',
            caseSensitive: false,
            maxResults: 15
        });
        // 2. Regex search for symbol definitions (class, interface, function, const)
        // We break the query into words and look for the most significant one
        const significantToken = selectSignificantToken(cleanQuery);
        const escapedToken = escapeRegexLiteral(significantToken);
        const regexResult = escapedToken ? await context.searchCode({
            query: `(class|interface|function|const|let|var|type)\\s+[^\\s=]*${escapedToken}[^\\s=]*`,
            mode: 'regex',
            caseSensitive: false,
            maxResults: 15
        }) : {
            matches: []
        };
        // Combine results
        const combined = [
            ...literalResult?.matches || [],
            ...regexResult?.matches || []
        ];
        // Deduplicate by file and line
        const uniqueMatches = Array.from(new Map(combined.map((m)=>[
                `${m.file}:${m.line}`,
                m
            ])).values());
        return {
            engine: 'oracle_multi_tier',
            query: cleanQuery,
            matches: uniqueMatches.slice(0, 20),
            stats: {
                totalFound: uniqueMatches.length,
                durationMs: Date.now() - startTime,
                literalMatches: literalResult?.matches?.length || 0,
                regexMatches: regexResult?.matches?.length || 0
            }
        };
    } catch (error) {
        throw new Error(`Oracle search failed: ${error instanceof Error ? error.message : String(error)}`);
    }
}
}),
"[project]/apps/web/lib/agent/harness/tool-repair.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * Tool Call Repair
 *
 * Repairs malformed tool call JSON and provides fuzzy matching for tool names.
 * Inspired by OpenCode's experimental_repairToolCall() functionality.
 */ __turbopack_context__.s([
    "fuzzyMatchToolName",
    ()=>fuzzyMatchToolName,
    "looksLikeJSON",
    ()=>looksLikeJSON,
    "parseAndRepairToolCall",
    ()=>parseAndRepairToolCall,
    "repairJSON",
    ()=>repairJSON,
    "safeJSONParse",
    ()=>safeJSONParse,
    "wrapInvalidToolCall",
    ()=>wrapInvalidToolCall
]);
function repairJSON(raw) {
    let repaired = raw.trim();
    // Fix trailing commas in objects and arrays
    repaired = repaired.replace(/,(\s*[}\]])/g, '$1');
    // Fix single quotes to double quotes (simple cases)
    // Only replace single quotes that appear to be string delimiters
    repaired = repaired.replace(/([{[,]\s*)'([^']+)'(\s*[}\],:])/g, '$1"$2"$3');
    // Fix unquoted object keys
    repaired = repaired.replace(/([{,]\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/g, '$1"$2":');
    // Fix unclosed braces - add missing closing braces
    const openBraces = (repaired.match(/{/g) || []).length;
    const closeBraces = (repaired.match(/}/g) || []).length;
    if (openBraces > closeBraces) {
        repaired += '}'.repeat(openBraces - closeBraces);
    }
    // Fix unclosed brackets
    const openBrackets = (repaired.match(/\[/g) || []).length;
    const closeBrackets = (repaired.match(/\]/g) || []).length;
    if (openBrackets > closeBrackets) {
        repaired += ']'.repeat(openBrackets - closeBrackets);
    }
    // Fix missing quotes around string values (heuristic)
    // Pattern: colon followed by a word not in quotes, followed by comma or closing brace
    repaired = repaired.replace(/:(\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)\s*([,}\]])/g, ':"$2"$3');
    return repaired;
}
/**
 * Calculate Levenshtein distance between two strings
 */ function levenshteinDistance(a, b) {
    const matrix = [];
    for(let i = 0; i <= b.length; i++){
        matrix[i] = [
            i
        ];
    }
    for(let j = 0; j <= a.length; j++){
        matrix[0][j] = j;
    }
    for(let i = 1; i <= b.length; i++){
        for(let j = 1; j <= a.length; j++){
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1 // deletion
                );
            }
        }
    }
    return matrix[b.length][a.length];
}
function fuzzyMatchToolName(name, known) {
    const normalizedName = name.toLowerCase().trim();
    // Exact match (case insensitive)
    const exactMatch = known.find((k)=>k.toLowerCase() === normalizedName);
    if (exactMatch) {
        return exactMatch;
    }
    // Check Levenshtein distance for each known tool
    let bestMatch = null;
    let bestDistance = Infinity;
    const THRESHOLD = 2;
    for (const knownTool of known){
        const distance = levenshteinDistance(normalizedName, knownTool.toLowerCase());
        if (distance < bestDistance && distance <= THRESHOLD) {
            bestDistance = distance;
            bestMatch = knownTool;
        }
    }
    // Additional heuristic: check for common typos/prefixes
    if (!bestMatch) {
        // Check if the name contains a known tool name as substring
        for (const knownTool of known){
            if (normalizedName.includes(knownTool.toLowerCase()) || knownTool.toLowerCase().includes(normalizedName)) {
                return knownTool;
            }
        }
    }
    return bestMatch;
}
function wrapInvalidToolCall(name, args, error) {
    return {
        toolCallId: `invalid_${Date.now()}`,
        toolName: name,
        args: {
            raw: args,
            parseError: error
        },
        output: '',
        error: `Invalid tool call: ${error}. The tool '${name}' could not be executed. Please ensure you're using a valid tool name and properly formatted JSON arguments.`,
        durationMs: 0
    };
}
function parseAndRepairToolCall(toolCall, knownToolNames) {
    const warnings = [];
    let repaired = false;
    // Try to repair tool name
    let toolName = toolCall.function.name;
    if (!knownToolNames.includes(toolName)) {
        const matchedName = fuzzyMatchToolName(toolName, knownToolNames);
        if (matchedName) {
            warnings.push(`Tool name '${toolName}' was corrected to '${matchedName}'`);
            toolName = matchedName;
            repaired = true;
        } else {
            // Cannot repair - unknown tool
            return null;
        }
    }
    // Try to repair arguments JSON
    let args = toolCall.function.arguments;
    try {
        JSON.parse(args);
    } catch  {
        // Try repair
        const repairedArgs = repairJSON(args);
        try {
            JSON.parse(repairedArgs);
            warnings.push('Tool arguments JSON was repaired automatically');
            args = repairedArgs;
            repaired = true;
        } catch  {
            // Cannot repair arguments
            return null;
        }
    }
    return {
        toolCall: {
            ...toolCall,
            function: {
                ...toolCall.function,
                name: toolName,
                arguments: args
            }
        },
        repaired,
        warnings
    };
}
function safeJSONParse(raw, defaultValue = null) {
    try {
        return JSON.parse(raw);
    } catch  {
        const repaired = repairJSON(raw);
        try {
            return JSON.parse(repaired);
        } catch  {
            return defaultValue;
        }
    }
}
function looksLikeJSON(str) {
    const trimmed = str.trim();
    return trimmed.startsWith('{') && trimmed.endsWith('}') || trimmed.startsWith('[') && trimmed.endsWith(']');
}
}),
"[project]/apps/web/lib/agent/tools.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "AGENT_TOOLS",
    ()=>AGENT_TOOLS,
    "createToolContext",
    ()=>createToolContext,
    "executeTool",
    ()=>executeTool,
    "formatToolCall",
    ()=>formatToolCall,
    "formatToolResult",
    ()=>formatToolResult,
    "getAllowedToolsForMode",
    ()=>getAllowedToolsForMode,
    "getToolsForMode",
    ()=>getToolsForMode,
    "isToolAllowedForMode",
    ()=>isToolAllowedForMode,
    "parseToolCall",
    ()=>parseToolCall
]);
/**
 * Agent Tools
 *
 * Tool definitions for the agent runtime:
 * - read_files: Read file contents
 * - list_directory: List files/directories under a path
 * - write_files: Write or modify files
 * - run_command: Run CLI commands
 * - search_code: Search code with ripgrep/fallbacks
 * - search_code_ast: Structural AST-aware search
 */ var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$logger$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/lib/logger.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$command$2d$analysis$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/lib/agent/command-analysis.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$harness$2f$oracle$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/lib/agent/harness/oracle.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$harness$2f$tool$2d$repair$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/lib/agent/harness/tool-repair.ts [app-ssr] (ecmascript)");
;
;
;
;
function logToolError(message, error) {
    __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$logger$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["appLog"].error(`[agent-tools] ${message}`, error);
}
function getAllowedToolsForMode(mode) {
    const modeTools = {
        ask: [
            'search_codebase',
            'search_code',
            'search_code_ast',
            'read_files',
            'list_directory'
        ],
        architect: [
            'search_codebase',
            'search_code',
            'search_code_ast',
            'read_files',
            'list_directory',
            'update_memory_bank'
        ],
        code: [
            'search_codebase',
            'search_code',
            'search_code_ast',
            'read_files',
            'list_directory',
            'write_files',
            'apply_patch',
            'run_command',
            'update_memory_bank'
        ],
        build: [
            'search_codebase',
            'search_code',
            'search_code_ast',
            'read_files',
            'list_directory',
            'write_files',
            'apply_patch',
            'run_command',
            'update_memory_bank'
        ]
    };
    return modeTools[mode] ?? [];
}
function getToolsForMode(mode) {
    const allowedTools = getAllowedToolsForMode(mode);
    return AGENT_TOOLS.filter((tool)=>allowedTools.includes(tool.function.name));
}
function isToolAllowedForMode(toolName, mode) {
    const allowedTools = getAllowedToolsForMode(mode);
    return allowedTools.includes(toolName);
}
const AGENT_TOOLS = [
    {
        type: 'function',
        function: {
            name: 'read_files',
            description: 'Read the contents of one or more files. Use this to understand the codebase before making changes.',
            parameters: {
                type: 'object',
                properties: {
                    paths: {
                        type: 'array',
                        description: 'Array of file paths to read',
                        items: {
                            type: 'string',
                            description: 'File path relative to project root'
                        }
                    }
                },
                required: [
                    'paths'
                ]
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'list_directory',
            description: 'List files and subdirectories under a path. Use this to explore project structure before reading/writing files.',
            parameters: {
                type: 'object',
                properties: {
                    path: {
                        type: 'string',
                        description: 'Directory path relative to project root (default: root)'
                    },
                    recursive: {
                        type: 'boolean',
                        description: 'Whether to recursively include nested entries (default: false)'
                    }
                }
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'write_files',
            description: "Write or modify files. Provide complete file content, not diffs. Creates files if they don't exist.",
            parameters: {
                type: 'object',
                properties: {
                    files: {
                        type: 'array',
                        description: 'Array of files to write',
                        items: {
                            type: 'object',
                            properties: {
                                path: {
                                    type: 'string',
                                    description: 'File path relative to project root'
                                },
                                content: {
                                    type: 'string',
                                    description: 'Complete file content to write'
                                }
                            },
                            required: [
                                'path',
                                'content'
                            ]
                        }
                    }
                },
                required: [
                    'files'
                ]
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'run_command',
            description: 'Run a CLI command (tests, builds, linting, etc.). Safe read-only pipelines are allowed, while redirects and chained commands are higher risk and may require approval.',
            parameters: {
                type: 'object',
                properties: {
                    command: {
                        type: 'string',
                        description: 'Command to run (e.g., "npm test", "npm run lint"). Safe read-only pipes like "npm test | head -20" are allowed. Redirects and command chaining are higher risk.'
                    },
                    timeout: {
                        type: 'number',
                        description: 'Timeout in milliseconds (default: 30000)'
                    },
                    cwd: {
                        type: 'string',
                        description: 'Working directory for command (default: project root)'
                    }
                },
                required: [
                    'command'
                ]
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'search_codebase',
            description: 'Intelligent multi-level search over the codebase. Preferred over search_code for answering high-level questions, finding architectural patterns, or locating features. Combines filename matching, symbol detection, and keyword routing.',
            parameters: {
                type: 'object',
                properties: {
                    query: {
                        type: 'string',
                        description: 'Natural language query or specific code concept to find (e.g. "Where is authentication handled", "Timeline component")'
                    }
                },
                required: [
                    'query'
                ]
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'search_code',
            description: 'Search text across project files using ripgrep when available, with safe fallback engines.',
            parameters: {
                type: 'object',
                properties: {
                    query: {
                        type: 'string',
                        description: 'Text or regex query to search for'
                    },
                    mode: {
                        type: 'string',
                        enum: [
                            'literal',
                            'regex'
                        ],
                        description: 'Search mode (default: literal)'
                    },
                    caseSensitive: {
                        type: 'boolean',
                        description: 'Whether search is case-sensitive (default: false)'
                    },
                    includeGlobs: {
                        type: 'array',
                        items: {
                            type: 'string'
                        },
                        description: 'Optional include glob patterns'
                    },
                    excludeGlobs: {
                        type: 'array',
                        items: {
                            type: 'string'
                        },
                        description: 'Optional exclude glob patterns'
                    },
                    paths: {
                        type: 'array',
                        items: {
                            type: 'string'
                        },
                        description: 'Optional relative paths to search'
                    },
                    maxResults: {
                        type: 'number',
                        description: 'Maximum number of matches to return'
                    },
                    maxMatchesPerFile: {
                        type: 'number',
                        description: 'Maximum matches to return per file'
                    },
                    contextLines: {
                        type: 'number',
                        description: 'Number of context lines around each match'
                    },
                    timeoutMs: {
                        type: 'number',
                        description: 'Search timeout in milliseconds'
                    }
                },
                required: [
                    'query'
                ]
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'search_code_ast',
            description: 'Search code structurally using ast-grep patterns.',
            parameters: {
                type: 'object',
                properties: {
                    pattern: {
                        type: 'string',
                        description: 'AST pattern to search for'
                    },
                    language: {
                        type: 'string',
                        description: 'Optional language override (e.g. typescript, tsx)'
                    },
                    paths: {
                        type: 'array',
                        items: {
                            type: 'string'
                        },
                        description: 'Optional relative paths to search'
                    },
                    maxResults: {
                        type: 'number',
                        description: 'Maximum number of matches to return'
                    },
                    timeoutMs: {
                        type: 'number',
                        description: 'Search timeout in milliseconds'
                    },
                    jsonStyle: {
                        type: 'string',
                        enum: [
                            'pretty',
                            'stream',
                            'compact'
                        ],
                        description: 'ast-grep JSON output style'
                    }
                },
                required: [
                    'pattern'
                ]
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'update_memory_bank',
            description: 'Update the project-level memory bank (MEMORY_BANK.md). Use this to persist project conventions, tech stack details, or important architectural decisions that should be remembered across sessions.',
            parameters: {
                type: 'object',
                properties: {
                    content: {
                        type: 'string',
                        description: 'The updated contents of the memory bank in Markdown format.'
                    }
                },
                required: [
                    'content'
                ]
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'apply_patch',
            description: 'Apply a unified diff patch to a file. Use this for small edits to large files to save tokens. The patch must be in unified diff format.',
            parameters: {
                type: 'object',
                properties: {
                    path: {
                        type: 'string',
                        description: 'File path to apply the patch to'
                    },
                    patch: {
                        type: 'string',
                        description: 'Unified diff patch text to apply'
                    }
                },
                required: [
                    'path',
                    'patch'
                ]
            }
        }
    }
];
function normalizeWriteFilesInput(input) {
    if (Array.isArray(input)) {
        return input.filter((item)=>Boolean(item) && typeof item === 'object').map((item)=>({
                path: String(item.path ?? '').trim(),
                content: typeof item.content === 'string' ? item.content : String(item.content ?? '')
            })).filter((item)=>item.path.length > 0);
    }
    if (input && typeof input === 'object') {
        const record = input;
        if (Array.isArray(record.files)) {
            return normalizeWriteFilesInput(record.files);
        }
        if (record.file && typeof record.file === 'object') {
            return normalizeWriteFilesInput([
                record.file
            ]);
        }
        if ('path' in record && 'content' in record) {
            return normalizeWriteFilesInput([
                record
            ]);
        }
    }
    return [];
}
function createToolContext(projectId, chatId, userId, convexClient, artifactQueue, api) {
    return {
        projectId,
        chatId,
        userId,
        // Read files using Convex batchGet query
        readFiles: async (paths)=>{
            try {
                const results = await convexClient.query(api.files.batchGet, {
                    projectId,
                    paths
                });
                return results.map((result)=>({
                        path: result.path,
                        content: result.content
                    }));
            } catch (error) {
                logToolError('Failed to read files', error);
                return paths.map((path)=>({
                        path,
                        content: null
                    }));
            }
        },
        // Write files by queueing artifacts (don't write immediately)
        listDirectory: async (path, recursive)=>{
            if (!api.files.list) {
                throw new Error('list_directory: file listing API is not configured');
            }
            const normalizedBase = (path || '').trim().replace(/^\/+|\/+$/g, '');
            const allFiles = await convexClient.query(api.files.list, {
                projectId
            });
            const filePaths = allFiles.map((file)=>file.path).filter((filePath)=>{
                if (!normalizedBase) return true;
                return filePath === normalizedBase || filePath.startsWith(`${normalizedBase}/`);
            });
            if (recursive) {
                return filePaths.map((filePath)=>({
                        path: filePath,
                        type: 'file'
                    }));
            }
            const entries = new Map();
            for (const filePath of filePaths){
                const relative = normalizedBase ? filePath === normalizedBase ? '' : filePath.startsWith(`${normalizedBase}/`) ? filePath.slice(normalizedBase.length + 1) : filePath : filePath;
                if (!relative) {
                    entries.set(filePath, 'file');
                    continue;
                }
                const [head] = relative.split('/');
                if (!head) continue;
                if (relative.includes('/')) {
                    entries.set(head, 'directory');
                } else if (!entries.has(head)) {
                    entries.set(head, 'file');
                }
            }
            return Array.from(entries.entries()).map(([entryPath, type])=>({
                    path: normalizedBase ? `${normalizedBase}/${entryPath}` : entryPath,
                    type
                })).sort((a, b)=>a.path.localeCompare(b.path));
        },
        // Write files by queueing artifacts (don't write immediately)
        writeFiles: async (files)=>{
            const normalizedFiles = normalizeWriteFilesInput(files);
            if (normalizedFiles.length === 0) {
                return [
                    {
                        path: '',
                        success: false,
                        error: 'Invalid write_files payload (no files).'
                    }
                ];
            }
            try {
                const results = [];
                const paths = normalizedFiles.map((f)=>f.path);
                const existingByPath = new Map();
                try {
                    const existing = await convexClient.query(api.files.batchGet, {
                        projectId,
                        paths
                    });
                    for (const row of existing){
                        existingByPath.set(row.path, row.content ?? null);
                    }
                } catch (error) {
                    logToolError('Failed to fetch original contents for write_files', error);
                }
                for (const file of normalizedFiles){
                    try {
                        const originalContent = existingByPath.get(file.path) ?? null;
                        if (api.artifacts.create) {
                            await convexClient.mutation(api.artifacts.create, {
                                chatId,
                                actions: [
                                    {
                                        type: 'file_write',
                                        payload: {
                                            filePath: file.path,
                                            content: file.content,
                                            originalContent
                                        }
                                    }
                                ],
                                status: 'pending'
                            });
                        } else {
                            // Backward-compatible local fallback.
                            artifactQueue.addFileArtifact(file.path, file.content, originalContent);
                        }
                        results.push({
                            path: file.path,
                            success: true
                        });
                    } catch (error) {
                        results.push({
                            path: file.path,
                            success: false,
                            error: error instanceof Error ? error.message : 'Failed to queue artifact'
                        });
                    }
                }
                return results;
            } catch (error) {
                logToolError('Failed to queue file artifacts', error);
                return normalizedFiles.map((file)=>({
                        path: file.path,
                        success: false,
                        error: error instanceof Error ? error.message : 'Failed to queue artifacts'
                    }));
            }
        },
        // Run command by creating a job in Convex
        runCommand: async (command, timeout, cwd)=>{
            const startTime = Date.now();
            try {
                if (api.artifacts.create) {
                    await convexClient.mutation(api.artifacts.create, {
                        chatId,
                        actions: [
                            {
                                type: 'command_run',
                                payload: {
                                    command,
                                    workingDirectory: cwd
                                }
                            }
                        ],
                        status: 'pending'
                    });
                } else {
                    // Backward-compatible local fallback.
                    artifactQueue.addCommandArtifact(command, cwd);
                }
                // Determine job type from command
                let jobType = 'cli';
                const cmdLower = command.toLowerCase();
                if (cmdLower.includes('build') || cmdLower.includes('compile')) {
                    jobType = 'build';
                } else if (cmdLower.includes('test')) {
                    jobType = 'test';
                } else if (cmdLower.includes('deploy')) {
                    jobType = 'deploy';
                } else if (cmdLower.includes('lint')) {
                    jobType = 'lint';
                } else if (cmdLower.includes('format')) {
                    jobType = 'format';
                }
                // Create job in Convex
                const jobId = await convexClient.mutation(api.jobs.create, {
                    projectId,
                    type: jobType,
                    command
                });
                // If we cannot mutate job status, fall back to queued-only behavior.
                if (!api.jobs.updateStatus) {
                    return {
                        stdout: `Job created with ID: ${jobId}. Command queued for execution.`,
                        stderr: '',
                        exitCode: 0,
                        durationMs: Date.now() - startTime
                    };
                }
                const startedAt = Date.now();
                await convexClient.mutation(api.jobs.updateStatus, {
                    id: jobId,
                    status: 'running',
                    startedAt,
                    logs: [
                        `[${new Date(startedAt).toISOString()}] Running: ${command}`
                    ]
                });
                const response = await fetch('/api/jobs/execute', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        command,
                        workingDirectory: cwd,
                        timeoutMs: timeout
                    })
                });
                if (!response.ok) {
                    const errorText = await response.text();
                    await convexClient.mutation(api.jobs.updateStatus, {
                        id: jobId,
                        status: 'failed',
                        completedAt: Date.now(),
                        error: errorText,
                        logs: [
                            `[${new Date(startedAt).toISOString()}] Running: ${command}`,
                            `[${new Date().toISOString()}] Failed to execute command: ${errorText}`
                        ]
                    });
                    return {
                        stdout: '',
                        stderr: errorText,
                        exitCode: 1,
                        durationMs: Date.now() - startTime
                    };
                }
                const payload = await response.json();
                const completedAt = Date.now();
                const succeeded = payload.exitCode === 0;
                await convexClient.mutation(api.jobs.updateStatus, {
                    id: jobId,
                    status: succeeded ? 'completed' : 'failed',
                    output: payload.stdout || undefined,
                    error: payload.stderr || undefined,
                    completedAt,
                    logs: [
                        `[${new Date(startedAt).toISOString()}] Running: ${command}`,
                        `[${new Date(completedAt).toISOString()}] Exit code: ${payload.exitCode}`,
                        ...payload.timedOut ? [
                            `[${new Date(completedAt).toISOString()}] Command timed out`
                        ] : []
                    ]
                });
                // Return command result to the model for the next loop iteration.
                return {
                    stdout: payload.stdout,
                    stderr: payload.stderr,
                    exitCode: payload.exitCode,
                    durationMs: payload.durationMs
                };
            } catch (error) {
                logToolError('Failed to create job', error);
                return {
                    stdout: '',
                    stderr: error instanceof Error ? error.message : 'Failed to create job',
                    exitCode: 1,
                    durationMs: Date.now() - startTime
                };
            }
        },
        searchCode: async (params)=>{
            const response = await fetch('/api/search', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    type: 'text',
                    query: params.query,
                    mode: params.mode,
                    caseSensitive: params.caseSensitive,
                    includeGlobs: params.includeGlobs,
                    excludeGlobs: params.excludeGlobs,
                    paths: params.paths,
                    maxResults: params.maxResults,
                    maxMatchesPerFile: params.maxMatchesPerFile,
                    contextLines: params.contextLines,
                    timeoutMs: params.timeoutMs,
                    workingDirectory: params.cwd
                })
            });
            if (!response.ok) {
                const error = await response.text();
                throw new Error(error || 'search_code failed');
            }
            return await response.json();
        },
        searchCodeAst: async (params)=>{
            const response = await fetch('/api/search', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    type: 'ast',
                    pattern: params.pattern,
                    language: params.language,
                    paths: params.paths,
                    maxResults: params.maxResults,
                    timeoutMs: params.timeoutMs,
                    jsonStyle: params.jsonStyle,
                    workingDirectory: params.cwd
                })
            });
            if (!response.ok) {
                const error = await response.text();
                throw new Error(error || 'search_code_ast failed');
            }
            return await response.json();
        },
        // Update the project-level memory bank via Convex mutation
        updateMemoryBank: async (content)=>{
            try {
                if (api.memoryBank?.update) {
                    await convexClient.mutation(api.memoryBank.update, {
                        projectId,
                        content
                    });
                    return {
                        success: true
                    };
                }
                return {
                    success: false,
                    error: 'Memory bank API not available'
                };
            } catch (error) {
                return {
                    success: false,
                    error: error instanceof Error ? error.message : 'Failed to update memory bank'
                };
            }
        },
        // Apply a unified diff patch to a file
        applyPatch: async (params)=>{
            try {
                const { applyPatchText } = await __turbopack_context__.A("[project]/apps/web/lib/agent/patch.ts [app-ssr] (ecmascript, async loader)");
                // Read the current file content using readFiles from the closure
                const fileResults = await convexClient.query(api.files.batchGet, {
                    projectId,
                    paths: [
                        params.path
                    ]
                });
                const fileResult = fileResults[0];
                if (!fileResult || fileResult.content === null) {
                    return {
                        success: false,
                        error: `File not found: ${params.path}`,
                        appliedHunks: 0,
                        fuzzyMatches: 0
                    };
                }
                // Apply the patch
                const result = applyPatchText(fileResult.content, params.patch, {
                    fuzzyLines: 3
                });
                if (result.success && result.content !== undefined) {
                    // Write the patched content back as an artifact
                    if (api.artifacts.create) {
                        await convexClient.mutation(api.artifacts.create, {
                            chatId,
                            actions: [
                                {
                                    type: 'file_write',
                                    payload: {
                                        filePath: params.path,
                                        content: result.content,
                                        originalContent: fileResult.content
                                    }
                                }
                            ],
                            status: 'pending'
                        });
                    }
                }
                return {
                    success: result.success,
                    error: result.error,
                    appliedHunks: result.appliedHunks,
                    fuzzyMatches: result.fuzzyMatches
                };
            } catch (error) {
                return {
                    success: false,
                    error: error instanceof Error ? error.message : 'Failed to apply patch',
                    appliedHunks: 0,
                    fuzzyMatches: 0
                };
            }
        }
    };
}
async function executeTool(toolCall, context) {
    const startTime = Date.now();
    const retryCount = 0;
    try {
        const args = JSON.parse(toolCall.function.arguments);
        let output = '';
        let error;
        switch(toolCall.function.name){
            case 'read_files':
                {
                    const paths = args.paths;
                    const results = await context.readFiles(paths);
                    output = JSON.stringify(results, null, 2);
                    break;
                }
            case 'list_directory':
                {
                    if (!context.listDirectory) {
                        throw new Error('list_directory is not available in this context');
                    }
                    const path = typeof args.path === 'string' ? args.path : '';
                    const recursive = args.recursive === true;
                    const results = await context.listDirectory(path, recursive);
                    output = JSON.stringify(results, null, 2);
                    break;
                }
            case 'write_files':
                {
                    const files = normalizeWriteFilesInput(args.files ?? args);
                    if (files.length === 0) {
                        throw new Error('Invalid write_files arguments. Expected { files: [{ path, content }] } or { file: { path, content } }.');
                    }
                    const results = await context.writeFiles(files);
                    output = JSON.stringify(results, null, 2);
                    const failures = results.filter((r)=>!r.success);
                    if (failures.length > 0) {
                        error = `Failed to write ${failures.length} file(s): ${failures.map((f)=>f.path).join(', ')}`;
                    }
                    break;
                }
            case 'run_command':
                {
                    const { command, timeout, cwd } = args;
                    const commandAnalysis = (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$command$2d$analysis$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["analyzeCommand"])(String(command ?? ''));
                    if (commandAnalysis.kind === 'pipeline' && !(0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$command$2d$analysis$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["isCommandPipelineSafe"])(commandAnalysis)) {
                        return {
                            toolCallId: toolCall.id,
                            toolName: toolCall.function.name,
                            args,
                            output: '',
                            error: `${commandAnalysis.reason} Use a single command or a read-only pipeline instead.`,
                            durationMs: 0,
                            timestamp: Date.now(),
                            retryCount: 0
                        };
                    }
                    const result = await context.runCommand(command, timeout, cwd);
                    output = JSON.stringify({
                        stdout: result.stdout,
                        stderr: result.stderr,
                        exitCode: result.exitCode
                    }, null, 2);
                    if (result.exitCode !== 0) {
                        error = `Command failed with exit code ${result.exitCode}`;
                    }
                    break;
                }
            case 'search_code':
                {
                    if (!context.searchCode) {
                        throw new Error('search_code is not available in this context');
                    }
                    const result = await context.searchCode({
                        query: String(args.query ?? ''),
                        mode: args.mode === 'regex' ? 'regex' : 'literal',
                        caseSensitive: args.caseSensitive === true,
                        includeGlobs: Array.isArray(args.includeGlobs) ? args.includeGlobs : undefined,
                        excludeGlobs: Array.isArray(args.excludeGlobs) ? args.excludeGlobs : undefined,
                        paths: Array.isArray(args.paths) ? args.paths : undefined,
                        maxResults: typeof args.maxResults === 'number' ? args.maxResults : undefined,
                        maxMatchesPerFile: typeof args.maxMatchesPerFile === 'number' ? args.maxMatchesPerFile : undefined,
                        contextLines: typeof args.contextLines === 'number' ? args.contextLines : undefined,
                        timeoutMs: typeof args.timeoutMs === 'number' ? args.timeoutMs : undefined,
                        cwd: typeof args.cwd === 'string' ? args.cwd : undefined
                    });
                    output = JSON.stringify(result, null, 2);
                    break;
                }
            case 'search_codebase':
                {
                    const result = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$harness$2f$oracle$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["executeOracleSearch"])(String(args.query ?? ''), context);
                    output = JSON.stringify(result, null, 2);
                    break;
                }
            case 'search_codeAst':
                break;
            case 'search_code_ast':
                {
                    if (!context.searchCodeAst) {
                        throw new Error('search_code_ast is not available in this context');
                    }
                    const result = await context.searchCodeAst({
                        pattern: String(args.pattern ?? ''),
                        language: typeof args.language === 'string' ? args.language : undefined,
                        paths: Array.isArray(args.paths) ? args.paths : undefined,
                        maxResults: typeof args.maxResults === 'number' ? args.maxResults : undefined,
                        timeoutMs: typeof args.timeoutMs === 'number' ? args.timeoutMs : undefined,
                        jsonStyle: args.jsonStyle === 'pretty' || args.jsonStyle === 'compact' ? args.jsonStyle : args.jsonStyle === 'stream' ? 'stream' : undefined,
                        cwd: typeof args.cwd === 'string' ? args.cwd : undefined
                    });
                    output = JSON.stringify(result, null, 2);
                    break;
                }
            case 'update_memory_bank':
                {
                    const content = args.content;
                    const result = await context.updateMemoryBank(content);
                    output = JSON.stringify(result, null, 2);
                    if (!result.success) {
                        error = result.error;
                    }
                    break;
                }
            case 'apply_patch':
                {
                    if (!context.applyPatch) {
                        throw new Error('apply_patch is not available in this context');
                    }
                    const result = await context.applyPatch({
                        path: String(args.path ?? ''),
                        patch: String(args.patch ?? '')
                    });
                    output = JSON.stringify(result, null, 2);
                    if (!result.success) {
                        error = result.error;
                    }
                    break;
                }
            default:
                error = `Unknown tool: ${toolCall.function.name}`;
        }
        return {
            toolCallId: toolCall.id,
            toolName: toolCall.function.name,
            args,
            output,
            error,
            durationMs: Date.now() - startTime,
            timestamp: startTime,
            retryCount
        };
    } catch (err) {
        return {
            toolCallId: toolCall.id,
            toolName: toolCall.function.name,
            args: {},
            output: '',
            error: err instanceof Error ? err.message : String(err),
            durationMs: Date.now() - startTime,
            timestamp: startTime,
            retryCount
        };
    }
}
function parseToolCall(toolCall) {
    try {
        return {
            ...toolCall,
            parsedArgs: JSON.parse(toolCall.function.arguments)
        };
    } catch (parseError) {
        // Try to repair the JSON before giving up
        void parseError;
        const repairedArgs = (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$harness$2f$tool$2d$repair$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["repairJSON"])(toolCall.function.arguments);
        const parsedArgs = (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$harness$2f$tool$2d$repair$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["safeJSONParse"])(repairedArgs, {});
        if (parsedArgs && Object.keys(parsedArgs).length > 0) {
            console.warn('[tools] parseToolCall: Repaired malformed tool arguments JSON');
        }
        return {
            ...toolCall,
            parsedArgs: parsedArgs ?? {}
        };
    }
}
function formatToolResult(result) {
    if (result.error) {
        return `❌ ${result.toolName} failed: ${result.error}\n\nOutput:\n${result.output}`;
    }
    return `✅ ${result.toolName} completed (${result.durationMs}ms)\n\nOutput:\n${result.output}`;
}
function formatToolCall(toolCall) {
    const args = JSON.parse(toolCall.function.arguments);
    return `🔧 ${toolCall.function.name}(${JSON.stringify(args, null, 2)})`;
}
}),
"[project]/apps/web/lib/llm/errors.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * LLM Error Types
 *
 * Typed error classes for different LLM failure modes.
 * Enables proper error classification and retry strategies.
 */ /**
 * Base error class for LLM-related errors
 */ __turbopack_context__.s([
    "APIError",
    ()=>APIError,
    "AuthError",
    ()=>AuthError,
    "ContentFilterError",
    ()=>ContentFilterError,
    "ContextOverflowError",
    ()=>ContextOverflowError,
    "LLMError",
    ()=>LLMError,
    "NetworkError",
    ()=>NetworkError,
    "OutputLengthError",
    ()=>OutputLengthError,
    "RateLimitError",
    ()=>RateLimitError,
    "StreamIdleTimeoutError",
    ()=>StreamIdleTimeoutError,
    "StructuredOutputError",
    ()=>StructuredOutputError,
    "classifyError",
    ()=>classifyError,
    "getRetryDelayMs",
    ()=>getRetryDelayMs,
    "isLLMError",
    ()=>isLLMError,
    "isRetryableError",
    ()=>isRetryableError
]);
class LLMError extends Error {
    code;
    retryable;
    constructor(message, code, retryable = false){
        super(message), this.code = code, this.retryable = retryable;
        this.name = 'LLMError';
        Object.setPrototypeOf(this, LLMError.prototype);
    }
}
class RateLimitError extends LLMError {
    retryAfterMs;
    constructor(message, options){
        const retryAfterMs = options?.retryAfterMs ?? (options?.retryAfterSeconds ?? 60) * 1000;
        super(message, 'rate_limit', true);
        this.name = 'RateLimitError';
        this.retryAfterMs = retryAfterMs;
        Object.setPrototypeOf(this, RateLimitError.prototype);
    }
    /**
   * Parse rate limit error from HTTP response headers
   */ static fromHeaders(headers) {
        // Try various header formats
        const retryAfter = headers.get('retry-after');
        const retryAfterMs = headers.get('retry-after-ms');
        const xRetryAfter = headers.get('x-retry-after');
        let delayMs = 60000 // Default: 60 seconds
        ;
        if (retryAfterMs) {
            delayMs = parseInt(retryAfterMs, 10);
        } else if (retryAfter) {
            // Retry-After can be seconds or HTTP date
            const seconds = parseInt(retryAfter, 10);
            if (!isNaN(seconds)) {
                delayMs = seconds * 1000;
            }
        } else if (xRetryAfter) {
            const seconds = parseInt(xRetryAfter, 10);
            if (!isNaN(seconds)) {
                delayMs = seconds * 1000;
            }
        }
        return new RateLimitError('Rate limit exceeded', {
            retryAfterMs: delayMs
        });
    }
    /**
   * Extract from common rate limit error message patterns
   */ static fromMessage(message) {
        // Look for patterns like "try again in X seconds/minutes"
        const secondsMatch = message.match(/try again in (\d+(?:\.\d+)?) seconds?/i);
        const minutesMatch = message.match(/try again in (\d+(?:\.\d+)?) minutes?/i);
        let retryAfterMs = 60000;
        if (secondsMatch) {
            retryAfterMs = parseFloat(secondsMatch[1]) * 1000;
        } else if (minutesMatch) {
            retryAfterMs = parseFloat(minutesMatch[1]) * 60 * 1000;
        }
        return new RateLimitError(message, {
            retryAfterMs
        });
    }
}
class AuthError extends LLMError {
    constructor(message = 'Authentication failed'){
        super(message, 'auth_error', false);
        this.name = 'AuthError';
        Object.setPrototypeOf(this, AuthError.prototype);
    }
}
class OutputLengthError extends LLMError {
    constructor(message = 'Output length exceeded'){
        super(message, 'output_length', true);
        this.name = 'OutputLengthError';
        Object.setPrototypeOf(this, OutputLengthError.prototype);
    }
}
class ContentFilterError extends LLMError {
    filterType;
    constructor(message = 'Content filtered', filterType){
        super(message, 'content_filter', false);
        this.name = 'ContentFilterError';
        this.filterType = filterType;
        Object.setPrototypeOf(this, ContentFilterError.prototype);
    }
}
class ContextOverflowError extends LLMError {
    currentTokens;
    maxTokens;
    constructor(message = 'Context window exceeded', options){
        super(message, 'context_overflow', true);
        this.name = 'ContextOverflowError';
        this.currentTokens = options?.currentTokens;
        this.maxTokens = options?.maxTokens;
        Object.setPrototypeOf(this, ContextOverflowError.prototype);
    }
}
class StreamIdleTimeoutError extends LLMError {
    idleTimeMs;
    constructor(idleTimeMs = 120000){
        super(`Stream idle timeout after ${idleTimeMs}ms`, 'stream_idle_timeout', true);
        this.name = 'StreamIdleTimeoutError';
        this.idleTimeMs = idleTimeMs;
        Object.setPrototypeOf(this, StreamIdleTimeoutError.prototype);
    }
}
class StructuredOutputError extends LLMError {
    validationErrors;
    constructor(message = 'Structured output validation failed', validationErrors){
        super(message, 'structured_output', true);
        this.name = 'StructuredOutputError';
        this.validationErrors = validationErrors;
        Object.setPrototypeOf(this, StructuredOutputError.prototype);
    }
}
class NetworkError extends LLMError {
    originalError;
    constructor(message = 'Network error', originalError){
        super(message, 'network_error', true);
        this.name = 'NetworkError';
        this.originalError = originalError;
        Object.setPrototypeOf(this, NetworkError.prototype);
    }
}
class APIError extends LLMError {
    statusCode;
    responseBody;
    constructor(message, options){
        super(message, 'api_error', options?.retryable ?? false);
        this.name = 'APIError';
        this.statusCode = options?.statusCode;
        this.responseBody = options?.responseBody;
        Object.setPrototypeOf(this, APIError.prototype);
    }
}
function isLLMError(error) {
    return error instanceof LLMError;
}
function isRetryableError(error) {
    if (error instanceof LLMError) {
        return error.retryable;
    }
    // Legacy string-based detection as fallback
    if (error instanceof Error) {
        const message = error.message.toLowerCase();
        // Non-retryable errors
        if (message.includes('invalid api key') || message.includes('authentication') || message.includes('unauthorized') || message.includes('content policy') || message.includes('content filter') || message.includes('safety') || message.includes('moderation')) {
            return false;
        }
        // Retryable errors
        if (message.includes('rate limit') || message.includes('too many requests') || message.includes('timeout') || message.includes('network') || message.includes('econnreset') || message.includes('econnrefused') || message.includes('etimedout') || message.includes('overload') || message.includes('capacity') || message.includes('retry')) {
            return true;
        }
    }
    return false;
}
function getRetryDelayMs(error) {
    if (error instanceof RateLimitError) {
        return error.retryAfterMs;
    }
    if (error instanceof Error) {
        // Try to extract from message
        const message = error.message.toLowerCase();
        const secondsMatch = message.match(/retry after (\d+) seconds/);
        if (secondsMatch) {
            return parseInt(secondsMatch[1], 10) * 1000;
        }
    }
    return undefined;
}
function classifyError(error, response) {
    // Already typed
    if (error instanceof LLMError) {
        return error;
    }
    const errorMessage = error instanceof Error ? error.message : String(error);
    const lowerMessage = errorMessage.toLowerCase();
    // Check response status first
    if (response) {
        if (response.status === 429) {
            return RateLimitError.fromHeaders(response.headers);
        }
        if (response.status === 401 || response.status === 403) {
            return new AuthError(errorMessage);
        }
        if (response.status >= 500) {
            return new APIError(errorMessage, {
                statusCode: response.status,
                retryable: true
            });
        }
    }
    // Pattern matching for common errors
    if (lowerMessage.includes('rate limit') || lowerMessage.includes('too many requests')) {
        return RateLimitError.fromMessage(errorMessage);
    }
    if (lowerMessage.includes('invalid api key') || lowerMessage.includes('authentication') || lowerMessage.includes('unauthorized')) {
        return new AuthError(errorMessage);
    }
    if (lowerMessage.includes('context length') || lowerMessage.includes('maximum context') || lowerMessage.includes('token limit exceeded') || lowerMessage.includes('context window')) {
        return new ContextOverflowError(errorMessage);
    }
    if (lowerMessage.includes('content policy') || lowerMessage.includes('content filter') || lowerMessage.includes('safety') || lowerMessage.includes('moderation')) {
        return new ContentFilterError(errorMessage);
    }
    if (lowerMessage.includes('output length') || lowerMessage.includes('max tokens')) {
        return new OutputLengthError(errorMessage);
    }
    if (lowerMessage.includes('network') || lowerMessage.includes('econnreset') || lowerMessage.includes('econnrefused') || lowerMessage.includes('etimedout')) {
        return new NetworkError(errorMessage, error instanceof Error ? error : undefined);
    }
    // Default to API error
    return new APIError(errorMessage, {
        retryable: true
    });
}
}),
"[project]/apps/web/lib/llm/stream-resilience.ts [app-ssr] (ecmascript) <locals>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "isContextOverflowError",
    ()=>isContextOverflowError,
    "isRetryableError",
    ()=>isRetryableError,
    "withChunkTimeout",
    ()=>withChunkTimeout,
    "withRetry",
    ()=>withRetry,
    "withTimeoutAndRetry",
    ()=>withTimeoutAndRetry
]);
/**
 * Stream Resilience - Timeout detection, retry logic, and error classification
 *
 * Implements OpenCode-style stream resilience:
 * - Chunk timeout detection for stalled streams
 * - Exponential backoff retry with max retries
 * - Error classification for retryable errors
 * - Context overflow detection
 */ var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$llm$2f$errors$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/lib/llm/errors.ts [app-ssr] (ecmascript)");
;
;
const DEFAULT_RETRY_OPTIONS = {
    maxRetries: 3,
    initialDelayMs: 2000,
    maxDelayMs: 30000,
    backoffMultiplier: 2
};
/**
 * Calculate delay for retry attempt using exponential backoff
 */ function calculateRetryDelay(attempt, options) {
    const delay = options.initialDelayMs * Math.pow(options.backoffMultiplier, attempt);
    return Math.min(delay, options.maxDelayMs);
}
/**
 * Sleep for specified milliseconds
 */ function sleep(ms) {
    return new Promise((resolve)=>setTimeout(resolve, ms));
}
async function* withChunkTimeout(stream, timeoutMs) {
    const iterator = stream[Symbol.asyncIterator]();
    let timeoutId = null;
    let timedOut = false;
    const resetTimeout = ()=>{
        return new Promise((_, reject)=>{
            if (timeoutId) clearTimeout(timeoutId);
            timeoutId = setTimeout(()=>{
                timedOut = true;
                reject(new __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$llm$2f$errors$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["StreamIdleTimeoutError"](timeoutMs));
            }, timeoutMs);
        });
    };
    try {
        while(true){
            // Race between next chunk and timeout
            const result = await Promise.race([
                iterator.next(),
                resetTimeout()
            ]);
            if (timedOut) break;
            if (result.done) {
                break;
            }
            yield result.value;
        }
    } finally{
        if (timeoutId) clearTimeout(timeoutId);
        // Ensure iterator is properly cleaned up
        if (typeof iterator.return === 'function') {
            await iterator.return(undefined);
        }
    }
}
async function* withRetry(streamFactory, options = {}) {
    const opts = {
        ...DEFAULT_RETRY_OPTIONS,
        ...options
    };
    let lastError = null;
    for(let attempt = 0; attempt <= opts.maxRetries; attempt++){
        try {
            const stream = streamFactory();
            for await (const chunk of stream){
                yield chunk;
            }
            return; // Success - exit retry loop
        } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));
            // Check if error is retryable
            if (!isRetryableError(lastError)) {
                throw lastError;
            }
            // Don't retry after last attempt
            if (attempt >= opts.maxRetries) {
                throw new Error(`Stream failed after ${opts.maxRetries + 1} attempts: ${lastError.message}`);
            }
            // Calculate and apply backoff delay
            const delay = calculateRetryDelay(attempt, opts);
            // Emit retry notification
            yield {
                type: 'retry',
                attempt: attempt + 1,
                maxRetries: opts.maxRetries,
                error: lastError.message,
                nextRetryMs: delay
            };
            await sleep(delay);
        }
    }
}
async function* withTimeoutAndRetry(streamFactory, timeoutMs, retryOptions = {}) {
    const opts = {
        ...DEFAULT_RETRY_OPTIONS,
        ...retryOptions
    };
    let lastError = null;
    for(let attempt = 0; attempt <= opts.maxRetries; attempt++){
        try {
            const stream = streamFactory(attempt);
            const timeoutStream = withChunkTimeout(stream, timeoutMs);
            for await (const chunk of timeoutStream){
                // Filter out retry notifications from inner stream
                if (isRetryNotification(chunk)) {
                    continue;
                }
                yield chunk;
            }
            return; // Success - exit retry loop
        } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));
            // Context overflow errors should trigger compaction and retry at higher level
            if (isContextOverflowError(lastError)) {
                throw lastError;
            }
            // Check if error is retryable
            if (!isRetryableError(lastError)) {
                throw lastError;
            }
            // Don't retry after last attempt
            if (attempt >= opts.maxRetries) {
                throw new Error(`Stream failed after ${opts.maxRetries + 1} attempts: ${lastError.message}`);
            }
            // Calculate and apply backoff delay
            const delay = calculateRetryDelay(attempt, opts);
            // Emit retry notification
            yield {
                type: 'retry',
                attempt: attempt + 1,
                maxRetries: opts.maxRetries,
                error: lastError.message,
                nextRetryMs: delay
            };
            await sleep(delay);
        }
    }
}
/**
 * Check if a chunk is a retry notification
 */ function isRetryNotification(chunk) {
    return typeof chunk === 'object' && chunk !== null && 'type' in chunk && chunk.type === 'retry';
}
function isRetryableError(error) {
    // Check for typed errors first using instanceof
    if (error instanceof __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$llm$2f$errors$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["LLMError"]) {
        return error.retryable;
    }
    // Legacy checks for backward compatibility
    if (error instanceof __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$llm$2f$errors$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["StreamIdleTimeoutError"]) {
        return true;
    }
    // Fall back to string-based detection
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$llm$2f$errors$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["isRetryableError"])(error);
}
function isContextOverflowError(error) {
    // Check for ContextOverflowError instance
    if (error instanceof __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$llm$2f$errors$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["ContextOverflowError"]) {
        return true;
    }
    const message = error.message.toLowerCase();
    // Provider-specific context overflow patterns
    const contextOverflowPatterns = [
        'context_length_exceeded',
        'maximum context length',
        'prompt is too long',
        'tokens exceed',
        'context window exceeded',
        'input is too long',
        'message is too long',
        'token limit exceeded',
        'exceeds maximum tokens',
        'context size exceeded',
        'prompt tokens exceed',
        'input tokens exceed'
    ];
    return contextOverflowPatterns.some((pattern)=>message.includes(pattern));
}
}),
"[project]/apps/web/lib/agent/harness/snapshots.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "createPatch",
    ()=>createPatch,
    "diffSnapshots",
    ()=>diffSnapshots,
    "snapshots",
    ()=>snapshots
]);
/**
 * Git Snapshot - Per-step undo capability
 *
 * Implements OpenCode-style git snapshots that capture the working
 * state without altering history, allowing safe rollback on errors.
 */ var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$logger$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/lib/logger.ts [app-ssr] (ecmascript)");
;
/**
 * Snapshot manager for capturing and restoring git states
 */ class SnapshotManager {
    snapshots = new Map();
    gitDir = '.';
    /**
   * Initialize the snapshot manager for a project
   */ init(projectPath) {
        this.gitDir = `${projectPath}/.git`;
    }
    /**
   * Check if git is available
   */ isGitAvailable() {
        return this.gitDir !== null;
    }
    /**
   * Track current state as a snapshot
   * Uses git write-tree to create a tree object without a commit
   */ async track(sessionID, messageID, step) {
        if (!this.gitDir) {
            return null;
        }
        try {
            const result = await this.executeGitCommand(`git add -A && git write-tree`);
            if (!result.success) {
                __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$logger$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["appLog"].error('[Snapshot] Failed to create snapshot:', result.error);
                return null;
            }
            const hash = result.output.trim();
            const snapshot = {
                hash,
                messageID,
                step,
                timestamp: Date.now(),
                files: await this.getChangedFiles()
            };
            if (!this.snapshots.has(sessionID)) {
                this.snapshots.set(sessionID, []);
            }
            this.snapshots.get(sessionID).push(snapshot);
            return snapshot;
        } catch (error) {
            __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$logger$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["appLog"].error('[Snapshot] Error creating snapshot:', error);
            return null;
        }
    }
    /**
   * Restore to a specific snapshot
   */ async restore(sessionID, snapshotHash) {
        if (!this.gitDir) {
            return false;
        }
        try {
            const result = await this.executeGitCommand(`git read-tree ${snapshotHash} && git checkout-index -a -f`);
            if (!result.success) {
                __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$logger$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["appLog"].error('[Snapshot] Failed to restore:', result.error);
                return false;
            }
            return true;
        } catch (error) {
            __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$logger$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["appLog"].error('[Snapshot] Error restoring snapshot:', error);
            return false;
        }
    }
    /**
   * Restore to the last snapshot for a session
   */ async restoreLast(sessionID) {
        const snapshots = this.snapshots.get(sessionID);
        if (!snapshots || snapshots.length === 0) {
            return false;
        }
        const lastSnapshot = snapshots[snapshots.length - 1];
        return this.restore(sessionID, lastSnapshot.hash);
    }
    /**
   * Get all snapshots for a session
   */ getSnapshots(sessionID) {
        return this.snapshots.get(sessionID) ?? [];
    }
    /**
   * Get the last N snapshots for a session
   */ getLastSnapshots(sessionID, count) {
        const snapshots = this.getSnapshots(sessionID);
        return snapshots.slice(-count);
    }
    /**
   * Clear snapshots for a session
   */ clear(sessionID) {
        this.snapshots.delete(sessionID);
    }
    /**
   * Clear all snapshots
   */ clearAll() {
        this.snapshots.clear();
    }
    /**
   * Get list of changed files
   */ async getChangedFiles() {
        if (!this.gitDir) {
            return [];
        }
        try {
            const result = await this.executeGitCommand(`git diff --name-only HEAD`);
            if (!result.success) {
                return [];
            }
            return result.output.trim().split('\n').filter(Boolean);
        } catch (error) {
            void error;
            return [];
        }
    }
    /**
   * Execute a git command
   */ async executeGitCommand(command) {
        try {
            const response = await fetch('/api/git', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    command
                })
            });
            if (!response.ok) {
                const error = await response.text();
                return {
                    success: false,
                    output: '',
                    error
                };
            }
            const result = await response.json();
            return {
                success: result.exitCode === 0,
                output: result.stdout ?? '',
                error: result.stderr
            };
        } catch (error) {
            return {
                success: false,
                output: '',
                error: error instanceof Error ? error.message : 'Git command failed'
            };
        }
    }
}
const snapshots = new SnapshotManager();
async function diffSnapshots(fromHash, toHash) {
    try {
        const response = await fetch('/api/git/diff', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                from: fromHash,
                to: toHash
            })
        });
        if (!response.ok) {
            return {
                diff: '',
                error: await response.text()
            };
        }
        const result = await response.json();
        return {
            diff: result.diff ?? ''
        };
    } catch (error) {
        return {
            diff: '',
            error: error instanceof Error ? error.message : 'Failed to get diff'
        };
    }
}
async function createPatch(snapshotHash) {
    try {
        const response = await fetch('/api/git/patch', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                hash: snapshotHash
            })
        });
        if (!response.ok) {
            return {
                patch: '',
                error: await response.text()
            };
        }
        const result = await response.json();
        return {
            patch: result.patch ?? ''
        };
    } catch (error) {
        return {
            patch: '',
            error: error instanceof Error ? error.message : 'Failed to create patch'
        };
    }
}
}),
"[project]/apps/web/lib/agent/harness/task-tool.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * Task Tool - Subagent delegation for specialized tasks
 *
 * Implements OpenCode-style TaskTool that allows agents to spawn
 * specialized subagents for complex operations like:
 * - Code exploration
 * - Security auditing
 * - Performance analysis
 * - Test generation
 * - Code review
 */ __turbopack_context__.s([
    "QUESTION_TOOL_DEFINITION",
    ()=>QUESTION_TOOL_DEFINITION,
    "TASK_TOOL_DEFINITION",
    ()=>TASK_TOOL_DEFINITION,
    "createSubtaskPart",
    ()=>createSubtaskPart,
    "executeQuestionTool",
    ()=>executeQuestionTool,
    "executeTaskTool",
    ()=>executeTaskTool,
    "getTaskToolDefinitions",
    ()=>getTaskToolDefinitions
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$harness$2f$agents$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/lib/agent/harness/agents.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$harness$2f$identifier$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/lib/agent/harness/identifier.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$harness$2f$permissions$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/lib/agent/harness/permissions.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$harness$2f$event$2d$bus$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/lib/agent/harness/event-bus.ts [app-ssr] (ecmascript)");
;
;
;
;
const TASK_TOOL_DEFINITION = {
    type: 'function',
    function: {
        name: 'task',
        description: `Launch a specialized subagent to handle a complex task.

Available subagent types:
- explore: Thorough codebase exploration for understanding unfamiliar code
- security-auditor: Security-focused code review for vulnerabilities
- performance-analyzer: Analyze code for performance bottlenecks
- test-generator: Generate comprehensive test suites
- code-reviewer: Review code for quality and best practices
- debugger: Dedicated debugger for tracking down runtime exceptions
- tech-writer: Tech writer for generating or updating documentation

Use this tool when:
- You need specialized expertise for a specific task
- You want to delegate complex multi-step operations
- You need to explore large codebases efficiently
- You want a fresh perspective on code quality or security

The subagent will work autonomously and return its findings.

CRITICAL: You can spawn multiple subagents in parallel! To do this, simply output multiple \`task\` tool calls in a single response. They will all execute concurrently (Panda Swarm) and return their results together.`,
        parameters: {
            type: 'object',
            properties: {
                subagent_type: {
                    type: 'string',
                    description: 'The type of specialized agent to use',
                    enum: [
                        'explore',
                        'security-auditor',
                        'performance-analyzer',
                        'test-generator',
                        'code-reviewer',
                        'debugger',
                        'tech-writer'
                    ]
                },
                prompt: {
                    type: 'string',
                    description: 'The detailed task for the subagent to perform. Be specific about what you need.'
                },
                description: {
                    type: 'string',
                    description: 'A short (3-5 words) description of the task for logging'
                }
            },
            required: [
                'subagent_type',
                'prompt',
                'description'
            ]
        }
    }
};
async function executeTaskTool(args, ctx) {
    const agentConfig = __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$harness$2f$agents$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["agents"].get(args.subagent_type);
    if (!agentConfig) {
        return {
            output: '',
            error: `Unknown subagent type: ${args.subagent_type}. Available types: ${__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$harness$2f$agents$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["agents"].listSubagents().map((a)=>a.name).join(', ')}`
        };
    }
    if (agentConfig.mode === 'primary') {
        return {
            output: '',
            error: `Agent "${args.subagent_type}" is a primary agent and cannot be used as a subagent.`
        };
    }
    const childSessionID = (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$harness$2f$identifier$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["ascending"])('session_');
    const delegatedAgent = {
        ...agentConfig,
        permission: (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$harness$2f$permissions$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["intersectPermissions"])(ctx.parentAgent.permission, agentConfig.permission)
    };
    __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$harness$2f$event$2d$bus$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["bus"].emit('subagent.started', ctx.sessionID, {
        parentSessionID: ctx.sessionID,
        childSessionID,
        agent: delegatedAgent.name,
        description: args.description
    });
    try {
        const result = await ctx.runSubagent(delegatedAgent, args.prompt, childSessionID);
        __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$harness$2f$event$2d$bus$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["bus"].emit('subagent.completed', ctx.sessionID, {
            parentSessionID: ctx.sessionID,
            childSessionID,
            agent: delegatedAgent.name,
            success: !result.error
        });
        return {
            output: result.error ? `Subagent error: ${result.error}\n\n${result.output}` : result.output,
            error: result.error,
            metadata: {
                childSessionID,
                agent: delegatedAgent.name,
                usage: result.usage,
                cost: result.cost
            }
        };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$harness$2f$event$2d$bus$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["bus"].emit('subagent.completed', ctx.sessionID, {
            parentSessionID: ctx.sessionID,
            childSessionID,
            agent: delegatedAgent.name,
            success: false,
            error: errorMessage
        });
        return {
            output: '',
            error: `Failed to execute subagent: ${errorMessage}`
        };
    }
}
function createSubtaskPart(messageID, sessionID, agent, prompt) {
    return {
        id: (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$harness$2f$identifier$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["ascending"])('part_'),
        messageID,
        sessionID,
        type: 'subtask',
        agent,
        prompt
    };
}
const QUESTION_TOOL_DEFINITION = {
    type: 'function',
    function: {
        name: 'question',
        description: `Ask the user a question during execution.

Use this tool when:
- You need clarification on the user's request
- You need the user to make a decision
- You need more information to proceed

The user's response will be provided in the next turn.`,
        parameters: {
            type: 'object',
            properties: {
                questions: {
                    type: 'array',
                    description: 'Questions to ask the user',
                    items: {
                        type: 'object',
                        properties: {
                            question: {
                                type: 'string',
                                description: 'The question to ask'
                            },
                            header: {
                                type: 'string',
                                description: 'Short header for the question (max 30 chars)'
                            },
                            options: {
                                type: 'array',
                                description: 'Predefined options for the user to choose from',
                                items: {
                                    type: 'object',
                                    properties: {
                                        label: {
                                            type: 'string',
                                            description: 'Display label for the option'
                                        },
                                        description: {
                                            type: 'string',
                                            description: 'Explanation of what this option means'
                                        }
                                    },
                                    required: [
                                        'label',
                                        'description'
                                    ]
                                }
                            },
                            multiple: {
                                type: 'boolean',
                                description: 'Allow selecting multiple options'
                            }
                        },
                        required: [
                            'question',
                            'header'
                        ]
                    }
                }
            },
            required: [
                'questions'
            ]
        }
    }
};
async function executeQuestionTool(args, ctx) {
    try {
        const answers = await ctx.askUser(args.questions);
        const formatted = args.questions.map((q, i)=>({
                question: q.question,
                answer: answers[i] ?? 'No answer provided'
            }));
        return {
            output: JSON.stringify(formatted, null, 2)
        };
    } catch (error) {
        return {
            output: '',
            error: error instanceof Error ? error.message : 'Failed to get user response'
        };
    }
}
function getTaskToolDefinitions() {
    return [
        TASK_TOOL_DEFINITION,
        QUESTION_TOOL_DEFINITION
    ];
}
}),
"[project]/apps/web/lib/agent/spec/classifier.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * Intent Classifier - LLM-based classification for SpecNative tier detection
 *
 * Evaluates user messages to determine the appropriate spec tier:
 * - instant: No spec needed (simple Q&A, typo fixes)
 * - ambient: Spec generated silently (refactoring, error handling)
 * - explicit: Full spec surfaced (complex features, system design)
 *
 * Classification evaluates: scope, risk, and complexity
 */ __turbopack_context__.s([
    "classifyBatch",
    ()=>classifyBatch,
    "classifyIntent",
    ()=>classifyIntent,
    "getClassificationStats",
    ()=>getClassificationStats
]);
async function classifyIntent(message, context = {}) {
    // First, apply heuristic rules for instant classification
    const heuristicResult = applyHeuristics(message, context);
    if (heuristicResult.confidence > 0.9) {
        return heuristicResult;
    }
    // For ambiguous cases, use LLM-based classification
    return performLLMClassification(message, context, heuristicResult);
}
/**
 * Apply heuristic rules for quick classification
 */ function applyHeuristics(message, context) {
    // Tier 1 (Instant) patterns - simple Q&A, explanations, small fixes
    const instantPatterns = [
        /^what\s+is\b/i,
        /^what\s+are\b/i,
        /^how\s+(do|does|can|should)\b/i,
        /^why\s+(is|are|does)\b/i,
        /^explain\b/i,
        /^describe\b/i,
        /^define\b/i,
        /^show\s+me\b/i,
        /^tell\s+me\b/i,
        /^can\s+you\s+explain\b/i,
        /^help\s+me\s+understand\b/i,
        /\b(typo|spelling|grammar)\s+(fix|error)\b/i,
        /^fix\s+(the\s+)?typo\b/i,
        /^rename\s+(this\s+)?variable\b/i,
        /^what\s+(does|is)\s+this\s+(function|method|class)\s+do\b/i,
        /^\?/
    ];
    for (const pattern of instantPatterns){
        if (pattern.test(message)) {
            return {
                tier: 'instant',
                confidence: 0.95,
                reasoning: `Message matches instant pattern: ${pattern.source}`,
                factors: {
                    scope: 'single-file',
                    risk: 'read-only',
                    complexity: 'simple'
                }
            };
        }
    }
    // Check for explicit code snippets that suggest simple changes
    const isSimpleCodeChange = /^\s*`[^`]+`\s*$/m.test(message) || message.length < 100 && /\b(change|update|set)\s+\w+\s+to\s+/i.test(message);
    if (isSimpleCodeChange) {
        return {
            tier: 'instant',
            confidence: 0.85,
            reasoning: 'Simple code change with clear, limited scope',
            factors: {
                scope: 'single-file',
                risk: 'write',
                complexity: 'simple'
            }
        };
    }
    // Tier 3 (Explicit) patterns - complex system changes
    const explicitPatterns = [
        /\b(build|create|implement)\s+(a\s+|an\s+)?(new\s+)?(system|service|api|module|architecture)\b/i,
        /\b(redesign|refactor)\s+(the\s+)?(entire|whole|complete)\b/i,
        /\b(migrate|migration)\s+(to|from)\b/i,
        /\b(add\s+support\s+for)\b/i,
        /\b(integrate|integration)\s+(with|into)\b/i,
        /\b(websocket|real-time|streaming|queue|worker|microservice)\b/i,
        /\b(authentication|authorization|auth|security)\s+(system|flow|mechanism)\b/i,
        /\b(payment|billing|subscription)\s+(system|flow)\b/i,
        /\b(database|db)\s+(schema|migration|redesign)\b/i,
        /\b(design\s+pattern|architectural)\b/i,
        /\b(multi-tenant|scalable|distributed)\b/i
    ];
    for (const pattern of explicitPatterns){
        if (pattern.test(message)) {
            return {
                tier: 'explicit',
                confidence: 0.9,
                reasoning: `Message matches explicit pattern: ${pattern.source}`,
                factors: {
                    scope: 'system-wide',
                    risk: 'destructive',
                    complexity: 'complex'
                }
            };
        }
    }
    // Analyze scope indicators
    const scopeIndicators = analyzeScope(message);
    const riskIndicators = analyzeRisk(message);
    const complexityIndicators = analyzeComplexity(message, context);
    // If any indicator is high, suggest explicit tier
    if (scopeIndicators === 'system-wide' || riskIndicators === 'destructive' || complexityIndicators === 'complex') {
        return {
            tier: 'explicit',
            confidence: 0.75,
            reasoning: `High ${scopeIndicators === 'system-wide' ? 'scope' : riskIndicators === 'destructive' ? 'risk' : 'complexity'} detected`,
            factors: {
                scope: scopeIndicators,
                risk: riskIndicators,
                complexity: complexityIndicators
            }
        };
    }
    // Default to ambient for unclear cases (will be refined by LLM)
    return {
        tier: 'ambient',
        confidence: 0.5,
        reasoning: 'Ambiguous classification, requires LLM analysis',
        factors: {
            scope: scopeIndicators,
            risk: riskIndicators,
            complexity: complexityIndicators
        }
    };
}
/**
 * Analyze scope from message content
 */ function analyzeScope(message) {
    const lowerMessage = message.toLowerCase();
    // System-wide indicators
    const systemWideIndicators = [
        /\b(all|every|entire|whole|system|app|application|project)\b/,
        /\b(globally|across|throughout)\b/,
        /\b(architecture|infrastructure|framework)\b/,
        /\b(multiple|many)\s+(files|components|modules)\b/
    ];
    for (const pattern of systemWideIndicators){
        if (pattern.test(lowerMessage)) {
            return 'system-wide';
        }
    }
    // Multi-file indicators
    const multiFileIndicators = [
        /\b(several|some|few)\s+(files|components)\b/,
        /\b(between|across)\s+(files|modules)\b/,
        /\b(import|export)\s+(from|to)\b/,
        /\b(share|common|utility)\b/
    ];
    for (const pattern of multiFileIndicators){
        if (pattern.test(lowerMessage)) {
            return 'multi-file';
        }
    }
    return 'single-file';
}
/**
 * Analyze risk level from message content
 */ function analyzeRisk(message) {
    const lowerMessage = message.toLowerCase();
    // Destructive indicators
    const destructiveIndicators = [
        /\b(delete|remove|drop|destroy|clean\s+up|purge)\b/,
        /\b(replace|rewrite|rebuild)\b/,
        /\b(migrate|migration)\b/,
        /\b(change\s+the\s+way|modify\s+how)\b/
    ];
    for (const pattern of destructiveIndicators){
        if (pattern.test(lowerMessage)) {
            return 'destructive';
        }
    }
    // Write indicators
    const writeIndicators = [
        /\b(add|create|implement|write|update|modify|change|fix)\b/,
        /\b(refactor|reorganize|restructure)\b/,
        /\b(extract|move|rename)\b/
    ];
    for (const pattern of writeIndicators){
        if (pattern.test(lowerMessage)) {
            return 'write';
        }
    }
    return 'read-only';
}
/**
 * Analyze complexity from message content and context
 */ function analyzeComplexity(message, _context) {
    const lowerMessage = message.toLowerCase();
    // Complex indicators
    const complexIndicators = [
        /\b(design|architect|pattern|strategy)\b/,
        /\b(algorithm|optimization|performance)\b/,
        /\b(state\s+management|data\s+flow)\b/,
        /\b(async|concurrent|parallel|threading)\b/,
        /\b(caching|cache|memoization)\b/,
        /\b(error\s+handling|retry|fallback)\b/,
        /\b(validation|sanitization|parsing)\b/,
        /\b(tests?\s+(for|coverage))\b/
    ];
    for (const pattern of complexIndicators){
        if (pattern.test(lowerMessage)) {
            return 'complex';
        }
    }
    // Medium complexity indicators
    const mediumIndicators = [
        /\b(refactor|improve|enhance|clean\s+up)\b/,
        /\b(extract|component|function|hook)\b/,
        /\b(style|css|theme|layout)\b/,
        /\b(props|interface|type|schema)\b/,
        /\b(form|input|validation)\b/
    ];
    for (const pattern of mediumIndicators){
        if (pattern.test(lowerMessage)) {
            return 'medium';
        }
    }
    // Check message length as a proxy for complexity
    if (message.length > 500) {
        return 'complex';
    }
    if (message.length > 200) {
        return 'medium';
    }
    return 'simple';
}
/**
 * Perform LLM-based classification for ambiguous cases
 *
 * In production, this would call an LLM. For now, we use enhanced heuristics.
 */ async function performLLMClassification(message, context, heuristicResult) {
    // Enhanced analysis based on combined factors
    const factors = heuristicResult.factors;
    // Scoring system
    let explicitScore = 0;
    let ambientScore = 0;
    let instantScore = 0;
    // Scope scoring
    switch(factors.scope){
        case 'system-wide':
            explicitScore += 3;
            break;
        case 'multi-file':
            ambientScore += 2;
            explicitScore += 1;
            break;
        case 'single-file':
            instantScore += 1;
            ambientScore += 1;
            break;
    }
    // Risk scoring
    switch(factors.risk){
        case 'destructive':
            explicitScore += 3;
            break;
        case 'write':
            ambientScore += 2;
            break;
        case 'read-only':
            instantScore += 3;
            break;
    }
    // Complexity scoring
    switch(factors.complexity){
        case 'complex':
            explicitScore += 3;
            break;
        case 'medium':
            ambientScore += 2;
            break;
        case 'simple':
            instantScore += 2;
            break;
    }
    // Mode-based adjustments
    if (context.mode) {
        switch(context.mode){
            case 'ask':
            case 'discuss':
                instantScore += 2;
                break;
            case 'code':
            case 'debug':
                ambientScore += 1;
                break;
            case 'build':
            case 'architect':
                explicitScore += 2;
                break;
            case 'review':
                instantScore += 1;
                break;
        }
    }
    // Message length factor
    if (message.length < 50) {
        instantScore += 1;
    } else if (message.length > 300) {
        explicitScore += 1;
    }
    // Determine final tier
    let tier;
    let confidence;
    if (explicitScore >= Math.max(ambientScore, instantScore)) {
        tier = 'explicit';
        confidence = Math.min(0.95, 0.5 + explicitScore * 0.1);
    } else if (ambientScore >= instantScore) {
        tier = 'ambient';
        confidence = Math.min(0.9, 0.5 + ambientScore * 0.1);
    } else {
        tier = 'instant';
        confidence = Math.min(0.95, 0.5 + instantScore * 0.1);
    }
    // Generate reasoning
    const reasoning = generateReasoning(tier, factors, {
        explicitScore,
        ambientScore,
        instantScore
    });
    return {
        tier,
        confidence,
        reasoning,
        factors
    };
}
/**
 * Generate human-readable reasoning for classification
 */ function generateReasoning(tier, factors, scores) {
    const parts = [];
    parts.push(`Classified as ${tier} tier`);
    parts.push(`(scores: explicit=${scores.explicitScore}, ambient=${scores.ambientScore}, instant=${scores.instantScore})`);
    // Add factor explanations
    const factorExplanations = [];
    if (factors.scope === 'system-wide') {
        factorExplanations.push('system-wide scope detected');
    } else if (factors.scope === 'multi-file') {
        factorExplanations.push('multi-file scope detected');
    }
    if (factors.risk === 'destructive') {
        factorExplanations.push('destructive operations identified');
    } else if (factors.risk === 'write') {
        factorExplanations.push('write operations required');
    } else {
        factorExplanations.push('read-only query');
    }
    if (factors.complexity === 'complex') {
        factorExplanations.push('complex implementation needed');
    } else if (factors.complexity === 'medium') {
        factorExplanations.push('moderate complexity');
    } else {
        factorExplanations.push('simple task');
    }
    if (factorExplanations.length > 0) {
        parts.push(`based on: ${factorExplanations.join(', ')}`);
    }
    return parts.join(' ');
}
async function classifyBatch(messages) {
    return Promise.all(messages.map((m)=>classifyIntent(m.message, m.context)));
}
function getClassificationStats(results) {
    const counts = {
        instant: 0,
        ambient: 0,
        explicit: 0
    };
    let totalConfidence = 0;
    for (const result of results){
        counts[result.tier]++;
        totalConfidence += result.confidence;
    }
    return {
        ...counts,
        averageConfidence: results.length > 0 ? totalConfidence / results.length : 0
    };
}
}),
"[project]/apps/web/lib/agent/spec/types.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * SpecNative Type System - Formal specification types for the agentic harness
 *
 * Defines the core type system for specification-native development:
 * - SpecTier: Complexity-based interaction levels
 * - SpecStatus: Lifecycle states of specifications
 * - FormalSpecification: Core specification structure
 * - EARS-style acceptance criteria
 * - Typed constraint system
 *
 * @module lib/agent/spec/types
 */ /**
 * Complexity tier for automatic spec behavior
 * - instant: No spec generated (simple Q&A, typo fixes)
 * - ambient: Spec generated silently, stored but not shown
 * - explicit: Full spec surfaced for user review before execution
 */ __turbopack_context__.s([
    "createAcceptanceCriterion",
    ()=>createAcceptanceCriterion,
    "createBehavioralConstraint",
    ()=>createBehavioralConstraint,
    "createCompatibilityConstraint",
    ()=>createCompatibilityConstraint,
    "createPerformanceConstraint",
    ()=>createPerformanceConstraint,
    "createSecurityConstraint",
    ()=>createSecurityConstraint,
    "createStructuralConstraint",
    ()=>createStructuralConstraint,
    "isAcceptanceCriterion",
    ()=>isAcceptanceCriterion,
    "isConstraint",
    ()=>isConstraint,
    "isSpecStatus",
    ()=>isSpecStatus,
    "isSpecTier",
    ()=>isSpecTier
]);
function isSpecTier(value) {
    return typeof value === 'string' && [
        'instant',
        'ambient',
        'explicit'
    ].includes(value);
}
function isSpecStatus(value) {
    const validStatuses = [
        'draft',
        'validated',
        'approved',
        'executing',
        'verified',
        'drifted',
        'failed',
        'archived'
    ];
    return typeof value === 'string' && validStatuses.includes(value);
}
function isConstraint(value) {
    if (typeof value !== 'object' || value === null) return false;
    const constraint = value;
    if (!('type' in constraint)) return false;
    const validTypes = [
        'structural',
        'behavioral',
        'performance',
        'compatibility',
        'security'
    ];
    if (!validTypes.includes(constraint.type)) return false;
    switch(constraint.type){
        case 'structural':
            return 'rule' in constraint && 'target' in constraint;
        case 'behavioral':
            return 'rule' in constraint && 'assertion' in constraint;
        case 'performance':
            return 'metric' in constraint && 'threshold' in constraint && 'unit' in constraint;
        case 'compatibility':
            return 'requirement' in constraint && 'scope' in constraint;
        case 'security':
            return 'requirement' in constraint;
        default:
            return false;
    }
}
function isAcceptanceCriterion(value) {
    if (typeof value !== 'object' || value === null) return false;
    const criterion = value;
    return 'id' in criterion && 'trigger' in criterion && 'behavior' in criterion && 'verificationMethod' in criterion && 'status' in criterion;
}
function createAcceptanceCriterion(id, trigger, behavior, verificationMethod = 'automated') {
    return {
        id,
        trigger,
        behavior,
        verificationMethod,
        status: 'pending'
    };
}
function createStructuralConstraint(rule, target) {
    return {
        type: 'structural',
        rule,
        target
    };
}
function createBehavioralConstraint(rule, assertion) {
    return {
        type: 'behavioral',
        rule,
        assertion
    };
}
function createPerformanceConstraint(metric, threshold, unit) {
    return {
        type: 'performance',
        metric,
        threshold,
        unit
    };
}
function createCompatibilityConstraint(requirement, scope) {
    return {
        type: 'compatibility',
        requirement,
        scope
    };
}
function createSecurityConstraint(requirement, standard) {
    return {
        type: 'security',
        requirement,
        standard
    };
}
}),
"[project]/apps/web/lib/agent/utils/hash.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * String utilities for agentic harness
 */ /**
 * Simple string hash for prompt identification
 * Used across spec templates and engine for generating consistent hashes
 */ __turbopack_context__.s([
    "hashString",
    ()=>hashString
]);
function hashString(str) {
    let hash = 0;
    for(let i = 0; i < str.length; i++){
        const char = str.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash = hash & hash;
    }
    return Math.abs(hash).toString(36).slice(0, 8);
}
}),
"[project]/apps/web/lib/agent/spec/templates/build.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * Build Mode Template - Full implementation specification
 *
 * Generates comprehensive specifications for building new features,
 * systems, or substantial implementations. This is the most detailed
 * template with full requirements, constraints, and verification.
 */ __turbopack_context__.s([
    "generateBuildSpec",
    ()=>generateBuildSpec
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$spec$2f$types$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/lib/agent/spec/types.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$utils$2f$hash$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/lib/agent/utils/hash.ts [app-ssr] (ecmascript)");
;
;
function generateBuildSpec(_userMessage, _context) {
    const now = Date.now();
    // Generate intent
    const intent = generateBuildIntent(_userMessage, _context);
    // Generate plan
    const plan = generateBuildPlan(_userMessage, _context);
    // Generate validation criteria
    const validation = generateBuildValidation(_userMessage, _context);
    // Generate provenance
    const provenance = {
        model: _context.model || 'unknown',
        promptHash: (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$utils$2f$hash$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["hashString"])(_userMessage),
        timestamp: now,
        chatId: _context.chatId || ''
    };
    return {
        intent,
        plan,
        validation,
        provenance
    };
}
/**
 * Generate intent section for build mode
 */ function generateBuildIntent(userMessage, context) {
    // Extract implied goal from message
    const goal = extractGoal(userMessage);
    // Generate constraints based on context
    const constraints = [
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$spec$2f$types$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["createStructuralConstraint"])('Follow existing project structure and conventions', 'all files'),
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$spec$2f$types$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["createStructuralConstraint"])('No breaking changes to existing APIs', 'public interfaces'),
        {
            type: 'behavioral',
            rule: 'All new functionality must have error handling',
            assertion: 'try-catch blocks or error boundaries present'
        },
        {
            type: 'compatibility',
            requirement: 'Maintain compatibility with existing dependencies',
            scope: 'package.json'
        }
    ];
    // Add tech-stack specific constraints
    if (context.techStack?.includes('typescript')) {
        constraints.push((0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$spec$2f$types$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["createStructuralConstraint"])('All new code must be TypeScript with proper types', '*.ts, *.tsx'));
    }
    if (context.techStack?.includes('react')) {
        constraints.push({
            type: 'behavioral',
            rule: 'Follow React best practices (hooks rules, key props)',
            assertion: 'eslint-plugin-react-hooks compliance'
        });
    }
    // Generate acceptance criteria using EARS syntax
    const acceptanceCriteria = [
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$spec$2f$types$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["createAcceptanceCriterion"])('ac-1', 'the feature is implemented', 'the system provides the requested functionality', 'automated'),
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$spec$2f$types$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["createAcceptanceCriterion"])('ac-2', 'a user interacts with the feature', 'the system responds according to specifications', 'llm-judge'),
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$spec$2f$types$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["createAcceptanceCriterion"])('ac-3', 'an error condition occurs', 'the system handles the error gracefully without crashing', 'automated')
    ];
    return {
        goal,
        rawMessage: userMessage,
        constraints,
        acceptanceCriteria
    };
}
/**
 * Generate plan section for build mode
 */ function generateBuildPlan(userMessage, _context) {
    // Analyze the request to determine appropriate steps
    const steps = generateStepsFromMessage(userMessage);
    // Estimate file dependencies
    const dependencies = [
        {
            path: 'src/',
            access: 'read',
            reason: 'Understand existing patterns'
        },
        {
            path: 'package.json',
            access: 'read',
            reason: 'Check dependencies'
        }
    ];
    // Add implied file dependencies based on message content
    if (userMessage.toLowerCase().includes('api') || userMessage.toLowerCase().includes('endpoint')) {
        dependencies.push({
            path: 'src/api/',
            access: 'create',
            reason: 'New API endpoints'
        }, {
            path: 'src/types/',
            access: 'write',
            reason: 'Shared type definitions'
        });
    }
    if (userMessage.toLowerCase().includes('component') || userMessage.toLowerCase().includes('ui')) {
        dependencies.push({
            path: 'src/components/',
            access: 'create',
            reason: 'New UI components'
        }, {
            path: 'src/styles/',
            access: 'write',
            reason: 'Styling updates'
        });
    }
    if (userMessage.toLowerCase().includes('test')) {
        dependencies.push({
            path: 'src/__tests__/',
            access: 'create',
            reason: 'Unit tests'
        }, {
            path: 'e2e/',
            access: 'create',
            reason: 'E2E tests'
        });
    }
    // Identify risks
    const risks = [
        {
            description: 'Integration with existing code may reveal unexpected dependencies',
            severity: 'medium',
            mitigation: 'Start with minimal implementation and iterate'
        },
        {
            description: 'Scope creep during implementation',
            severity: 'medium',
            mitigation: 'Stick to core requirements, document extensions for future'
        }
    ];
    return {
        steps,
        dependencies,
        risks,
        estimatedTools: [
            'read_files',
            'write_files',
            'search_code',
            'run_command'
        ]
    };
}
/**
 * Generate validation section for build mode
 */ function generateBuildValidation(userMessage, _context) {
    const preConditions = [
        {
            description: 'Project builds successfully before changes',
            check: 'npm run build passes',
            type: 'command-passes'
        },
        {
            description: 'Existing tests pass',
            check: 'npm test passes',
            type: 'command-passes'
        }
    ];
    const postConditions = [
        {
            description: 'Project builds successfully after changes',
            check: 'npm run build passes',
            type: 'command-passes'
        },
        {
            description: 'New functionality is accessible/usable',
            check: 'Feature can be invoked/accessed',
            type: 'llm-assert'
        },
        {
            description: 'No TypeScript errors introduced',
            check: 'tsc --noEmit passes',
            type: 'command-passes'
        }
    ];
    // Add test-related post-condition if tests are mentioned
    if (userMessage.toLowerCase().includes('test')) {
        postConditions.push({
            description: 'New tests pass',
            check: 'New test files execute successfully',
            type: 'command-passes'
        });
    }
    const invariants = [
        {
            description: 'Existing functionality remains intact',
            scope: 'all existing files',
            rule: 'No regressions in existing test suite'
        },
        {
            description: 'Code quality standards maintained',
            scope: 'all modified and new files',
            rule: 'Linting passes, no console errors'
        }
    ];
    return {
        preConditions,
        postConditions,
        invariants
    };
}
/**
 * Generate implementation steps from message analysis
 */ function generateStepsFromMessage(userMessage) {
    const steps = [];
    const lowerMessage = userMessage.toLowerCase();
    // Always start with analysis
    steps.push({
        id: 'step-1',
        description: 'Analyze existing codebase structure and patterns',
        tools: [
            'read_files',
            'list_directory',
            'search_code'
        ],
        targetFiles: [
            'src/',
            'package.json'
        ],
        status: 'pending'
    });
    let stepNum = 2;
    // Design phase for complex features
    if (lowerMessage.includes('system') || lowerMessage.includes('architecture') || lowerMessage.includes('design')) {
        steps.push({
            id: `step-${stepNum}`,
            description: 'Design the system architecture and define interfaces',
            tools: [
                'read_files',
                'search_code'
            ],
            targetFiles: [
                'src/types/',
                'src/interfaces/'
            ],
            status: 'pending'
        });
        stepNum++;
    }
    // Core implementation
    steps.push({
        id: `step-${stepNum}`,
        description: 'Implement core functionality',
        tools: [
            'write_files'
        ],
        targetFiles: [
            'src/'
        ],
        status: 'pending'
    });
    stepNum++;
    // Integration if needed
    if (lowerMessage.includes('integrate') || lowerMessage.includes('connect')) {
        steps.push({
            id: `step-${stepNum}`,
            description: 'Integrate with existing systems/components',
            tools: [
                'write_files',
                'read_files'
            ],
            targetFiles: [
                'src/'
            ],
            status: 'pending'
        });
        stepNum++;
    }
    // Tests
    steps.push({
        id: `step-${stepNum}`,
        description: 'Add tests for new functionality',
        tools: [
            'write_files',
            'run_command'
        ],
        targetFiles: [
            'src/__tests__/',
            '__tests__/'
        ],
        status: 'pending'
    });
    stepNum++;
    // Verification
    steps.push({
        id: `step-${stepNum}`,
        description: 'Verify implementation against acceptance criteria',
        tools: [
            'run_command',
            'read_files'
        ],
        targetFiles: [
            'src/'
        ],
        status: 'pending'
    });
    return steps;
}
/**
 * Extract goal from user message
 */ function extractGoal(message) {
    // Remove filler words and extract core intent
    const patterns = [
        /(?:build|create|implement|add)\s+(?:a\s+|an\s+|the\s+)?(.+?)(?:\.|$)/i,
        /(?:make|develop)\s+(?:a\s+|an\s+|the\s+)?(.+?)(?:\.|$)/i
    ];
    for (const pattern of patterns){
        const match = message.match(pattern);
        if (match?.[1]) {
            return match[1].trim();
        }
    }
    // Fallback: use first sentence or first 100 chars
    const firstSentence = message.split(/[.!?]/)[0] || message;
    return firstSentence.slice(0, 100).trim();
}
}),
"[project]/apps/web/lib/agent/spec/templates/code.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * Code Mode Template - Change-scoped specification
 *
 * Generates focused specifications for code changes, refactoring,
 * and feature additions within existing codebases. More lightweight
 * than build mode but still maintains structure and verification.
 */ __turbopack_context__.s([
    "generateCodeSpec",
    ()=>generateCodeSpec
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$spec$2f$types$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/lib/agent/spec/types.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$utils$2f$hash$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/lib/agent/utils/hash.ts [app-ssr] (ecmascript)");
;
;
function generateCodeSpec(userMessage, context) {
    const now = Date.now();
    const intent = generateCodeIntent(userMessage, context);
    const plan = generateCodePlan(userMessage, context);
    const validation = generateCodeValidation(userMessage, context);
    const provenance = {
        model: context.model || 'unknown',
        promptHash: (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$utils$2f$hash$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["hashString"])(userMessage),
        timestamp: now,
        chatId: context.chatId || ''
    };
    return {
        intent,
        plan,
        validation,
        provenance
    };
}
/**
 * Generate intent section for code mode
 */ function generateCodeIntent(userMessage, context) {
    const goal = extractCodeGoal(userMessage);
    const constraints = [
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$spec$2f$types$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["createStructuralConstraint"])('Maintain existing code style and patterns', 'modified files'),
        {
            type: 'behavioral',
            rule: 'Preserve existing functionality unless explicitly changing it',
            assertion: 'Existing tests still pass'
        },
        {
            type: 'compatibility',
            requirement: 'Changes must not break public APIs without versioning',
            scope: 'public interfaces'
        }
    ];
    // Add constraints based on change type
    const lowerMessage = userMessage.toLowerCase();
    if (lowerMessage.includes('refactor')) {
        constraints.push({
            type: 'behavioral',
            rule: 'Refactoring must preserve external behavior',
            assertion: 'All existing tests pass without modification'
        });
    }
    if (lowerMessage.includes('fix') || lowerMessage.includes('bug')) {
        constraints.push({
            type: 'behavioral',
            rule: 'Fix must address root cause, not just symptoms',
            assertion: 'Bug scenario is tested and passes'
        });
    }
    if (lowerMessage.includes('type') || lowerMessage.includes('typescript')) {
        constraints.push((0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$spec$2f$types$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["createStructuralConstraint"])('TypeScript types must be accurate and complete', '*.ts, *.tsx'));
    }
    // Target file constraint if specified
    if (context.targetFiles && context.targetFiles.length > 0) {
        constraints.push({
            type: 'structural',
            rule: `Changes limited to: ${context.targetFiles.join(', ')}`,
            target: context.targetFiles.join(', ')
        });
    }
    const acceptanceCriteria = [
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$spec$2f$types$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["createAcceptanceCriterion"])('ac-1', 'the code changes are applied', 'the modified code implements the requested changes', 'automated'),
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$spec$2f$types$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["createAcceptanceCriterion"])('ac-2', 'the code is reviewed', 'the changes follow project conventions and best practices', 'llm-judge')
    ];
    // Add specific criteria based on change type
    if (lowerMessage.includes('fix')) {
        acceptanceCriteria.push((0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$spec$2f$types$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["createAcceptanceCriterion"])('ac-3', 'the bug scenario is tested', 'the previously failing case now passes', 'automated'));
    }
    if (lowerMessage.includes('refactor')) {
        acceptanceCriteria.push((0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$spec$2f$types$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["createAcceptanceCriterion"])('ac-3', 'refactoring is complete', 'all existing tests pass without modification', 'automated'));
    }
    return {
        goal,
        rawMessage: userMessage,
        constraints,
        acceptanceCriteria
    };
}
/**
 * Generate plan section for code mode
 */ function generateCodePlan(userMessage, context) {
    const steps = generateCodeSteps(userMessage, context);
    const dependencies = [];
    // Add target files as write dependencies
    if (context.targetFiles) {
        for (const file of context.targetFiles){
            dependencies.push({
                path: file,
                access: 'write',
                reason: 'Primary target for changes'
            });
        }
    }
    // Always include project context
    dependencies.push({
        path: 'package.json',
        access: 'read',
        reason: 'Check dependencies and scripts'
    }, {
        path: 'tsconfig.json',
        access: 'read',
        reason: 'TypeScript configuration'
    });
    const risks = [
        {
            description: 'Changes may have unintended side effects in dependent code',
            severity: 'medium',
            mitigation: 'Search for usages before modifying public APIs'
        },
        {
            description: 'Edge cases may not be covered',
            severity: 'low',
            mitigation: 'Consider boundary conditions and error paths'
        }
    ];
    if (userMessage.toLowerCase().includes('refactor')) {
        risks.push({
            description: 'Refactoring may introduce subtle behavior changes',
            severity: 'medium',
            mitigation: 'Make small, incremental changes and verify after each'
        });
    }
    return {
        steps,
        dependencies,
        risks,
        estimatedTools: [
            'read_files',
            'write_files',
            'search_code'
        ]
    };
}
/**
 * Generate validation section for code mode
 */ function generateCodeValidation(userMessage, _context) {
    const preConditions = [
        {
            description: 'Target files exist and are readable',
            check: 'Files can be read successfully',
            type: 'file-exists'
        },
        {
            description: 'Project is in a buildable state',
            check: 'npm run build passes or equivalent',
            type: 'command-passes'
        }
    ];
    const postConditions = [
        {
            description: 'Changes compile without errors',
            check: 'TypeScript compilation succeeds',
            type: 'command-passes'
        },
        {
            description: 'Linting passes',
            check: 'eslint passes for modified files',
            type: 'command-passes'
        },
        {
            description: 'Requested changes are implemented',
            check: 'Code review confirms requirements met',
            type: 'llm-assert'
        }
    ];
    // Add test condition if tests mentioned
    if (userMessage.toLowerCase().includes('test')) {
        postConditions.push({
            description: 'Tests pass for modified code',
            check: 'Test suite passes',
            type: 'command-passes'
        });
    }
    const invariants = [
        {
            description: 'Public API signatures remain stable (unless intentionally changed)',
            scope: 'public exports',
            rule: 'No breaking changes to function signatures'
        },
        {
            description: 'No console errors or warnings introduced',
            scope: 'modified files',
            rule: 'Clean console output'
        }
    ];
    return {
        preConditions,
        postConditions,
        invariants
    };
}
/**
 * Generate code change steps
 */ function generateCodeSteps(userMessage, context) {
    const steps = [];
    const lowerMessage = userMessage.toLowerCase();
    // Step 1: Understand current state
    steps.push({
        id: 'step-1',
        description: 'Read and understand the current code',
        tools: [
            'read_files',
            'search_code'
        ],
        targetFiles: context.targetFiles || [
            'src/'
        ],
        status: 'pending'
    });
    // Step 2: Search for related code if refactoring or modifying
    if (lowerMessage.includes('refactor') || lowerMessage.includes('rename')) {
        steps.push({
            id: 'step-2',
            description: 'Search for all usages and references',
            tools: [
                'search_code'
            ],
            targetFiles: [
                'src/'
            ],
            status: 'pending'
        });
    }
    // Step 3: Apply changes
    const changeStep = {
        id: `step-${steps.length + 1}`,
        description: 'Apply the requested changes',
        tools: [
            'write_files'
        ],
        targetFiles: context.targetFiles || [
            'src/'
        ],
        status: 'pending'
    };
    if (lowerMessage.includes('fix')) {
        changeStep.description = 'Fix the identified issue';
    } else if (lowerMessage.includes('refactor')) {
        changeStep.description = 'Refactor the code according to requirements';
    } else if (lowerMessage.includes('add')) {
        changeStep.description = 'Add the new functionality';
    } else if (lowerMessage.includes('update')) {
        changeStep.description = 'Update the existing code';
    }
    steps.push(changeStep);
    // Step 4: Verify changes
    steps.push({
        id: `step-${steps.length + 1}`,
        description: 'Verify the changes work as expected',
        tools: [
            'run_command',
            'read_files'
        ],
        targetFiles: context.targetFiles || [
            'src/'
        ],
        status: 'pending'
    });
    return steps;
}
/**
 * Extract goal from code-related message
 */ function extractCodeGoal(message) {
    // Common code action patterns
    const patterns = [
        /(?:fix|bug)\s+(?:the\s+)?(.+?)(?:\.|$)/i,
        /(?:refactor|improve|clean\s+up)\s+(?:the\s+)?(.+?)(?:\.|$)/i,
        /(?:add|implement)\s+(?:a\s+|an\s+)?(.+?)(?:\.|$)/i,
        /(?:update|change|modify)\s+(?:the\s+)?(.+?)(?:\.|$)/i,
        /(?:remove|delete)\s+(?:the\s+)?(.+?)(?:\.|$)/i
    ];
    for (const pattern of patterns){
        const match = message.match(pattern);
        if (match?.[1]) {
            return match[1].trim();
        }
    }
    // Fallback
    const firstSentence = message.split(/[.!?]/)[0] || message;
    return firstSentence.slice(0, 100).trim();
}
}),
"[project]/apps/web/lib/agent/spec/templates/architect.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * Architect Mode Template - Design specification
 *
 * Generates design-focused specifications for system architecture,
 * API design, and high-level technical decisions. Emphasizes
 * patterns, trade-offs, and structural decisions over implementation.
 */ __turbopack_context__.s([
    "generateArchitectSpec",
    ()=>generateArchitectSpec
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$spec$2f$types$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/lib/agent/spec/types.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$utils$2f$hash$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/lib/agent/utils/hash.ts [app-ssr] (ecmascript)");
;
;
function generateArchitectSpec(_userMessage, _context) {
    const now = Date.now();
    const intent = generateArchitectIntent(_userMessage, _context);
    const plan = generateArchitectPlan(_userMessage, _context);
    const validation = generateArchitectValidation(_userMessage, _context);
    const provenance = {
        model: _context.model || 'unknown',
        promptHash: (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$utils$2f$hash$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["hashString"])(_userMessage),
        timestamp: now,
        chatId: _context.chatId || ''
    };
    return {
        intent,
        plan,
        validation,
        provenance
    };
}
/**
 * Generate intent section for architect mode
 */ function generateArchitectIntent(userMessage, context) {
    const goal = extractDesignGoal(userMessage);
    const constraints = [
        {
            type: 'structural',
            rule: 'Design must align with existing architecture patterns',
            target: 'system-wide'
        },
        {
            type: 'behavioral',
            rule: 'Design must consider scalability and maintainability',
            assertion: 'Design review addresses scale concerns'
        },
        {
            type: 'compatibility',
            requirement: 'Design must integrate with existing systems',
            scope: 'integration points'
        }
    ];
    // Add tech-specific constraints
    if (context.techStack) {
        constraints.push({
            type: 'structural',
            rule: `Design must leverage ${context.techStack.join(', ')} effectively`,
            target: 'architecture'
        });
    }
    // Add constraints based on design type
    const lowerMessage = userMessage.toLowerCase();
    if (lowerMessage.includes('api') || lowerMessage.includes('endpoint')) {
        constraints.push({
            type: 'behavioral',
            rule: 'API design must follow REST/GraphQL best practices',
            assertion: 'Consistent naming, proper HTTP methods, clear error responses'
        });
    }
    if (lowerMessage.includes('database') || lowerMessage.includes('schema')) {
        constraints.push({
            type: 'structural',
            rule: 'Database design must follow normalization principles',
            target: 'schema'
        });
    }
    if (lowerMessage.includes('security') || lowerMessage.includes('auth')) {
        constraints.push({
            type: 'security',
            requirement: 'Design must address security considerations',
            standard: 'OWASP guidelines'
        });
    }
    const acceptanceCriteria = [
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$spec$2f$types$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["createAcceptanceCriterion"])('ac-1', 'the design is complete', 'the architecture addresses all requirements and constraints', 'llm-judge'),
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$spec$2f$types$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["createAcceptanceCriterion"])('ac-2', 'the design is reviewed', 'trade-offs are documented and justified', 'manual'),
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$spec$2f$types$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["createAcceptanceCriterion"])('ac-3', 'the design is approved', 'stakeholders agree the design is sound', 'manual')
    ];
    return {
        goal,
        rawMessage: userMessage,
        constraints,
        acceptanceCriteria
    };
}
/**
 * Generate plan section for architect mode
 */ function generateArchitectPlan(userMessage, context) {
    const steps = [
        {
            id: 'step-1',
            description: 'Analyze existing system architecture and patterns',
            tools: [
                'read_files',
                'list_directory'
            ],
            targetFiles: [
                'src/',
                'docs/',
                'README.md'
            ],
            status: 'pending'
        },
        {
            id: 'step-2',
            description: 'Identify requirements and constraints',
            tools: [
                'read_files',
                'search_code'
            ],
            targetFiles: context.existingFiles || [
                'src/'
            ],
            status: 'pending'
        },
        {
            id: 'step-3',
            description: 'Research and evaluate design options',
            tools: [
                'read_files',
                'search_code'
            ],
            targetFiles: [
                'src/',
                'docs/'
            ],
            status: 'pending'
        }
    ];
    const dependencies = [
        {
            path: 'src/',
            access: 'read',
            reason: 'Understand existing patterns'
        },
        {
            path: 'docs/',
            access: 'read',
            reason: 'Review existing documentation'
        },
        {
            path: 'package.json',
            access: 'read',
            reason: 'Check dependencies and constraints'
        },
        {
            path: 'docs/architecture/',
            access: 'create',
            reason: 'Document design decisions'
        }
    ];
    const risks = [
        {
            description: 'Design may not account for all edge cases',
            severity: 'medium',
            mitigation: 'Include review phase and iterate based on feedback'
        },
        {
            description: 'Implementation complexity may exceed estimates',
            severity: 'medium',
            mitigation: 'Break design into phases, prioritize core functionality'
        },
        {
            description: 'Existing technical debt may complicate integration',
            severity: 'high',
            mitigation: 'Document integration points and migration strategy'
        }
    ];
    return {
        steps,
        dependencies,
        risks,
        estimatedTools: [
            'read_files',
            'search_code'
        ]
    };
}
/**
 * Generate validation section for architect mode
 */ function generateArchitectValidation(_userMessage, _context) {
    const preConditions = [
        {
            description: 'Existing architecture is understood',
            check: 'Key system components identified',
            type: 'llm-assert'
        },
        {
            description: 'Requirements are clear',
            check: 'Design goals documented',
            type: 'llm-assert'
        }
    ];
    const postConditions = [
        {
            description: 'Design document is complete',
            check: 'Architecture documented with diagrams/decisions',
            type: 'file-exists'
        },
        {
            description: 'Interfaces are defined',
            check: 'Type definitions or interface contracts created',
            type: 'file-exists'
        },
        {
            description: 'Trade-offs are documented',
            check: 'ADR or design doc includes decision rationale',
            type: 'llm-assert'
        }
    ];
    const invariants = [
        {
            description: 'Design maintains system consistency',
            scope: 'architecture',
            rule: 'New components follow established patterns'
        },
        {
            description: 'Design is implementation-agnostic where appropriate',
            scope: 'interfaces',
            rule: 'Contracts define what, not how'
        }
    ];
    return {
        preConditions,
        postConditions,
        invariants
    };
}
/**
 * Extract design goal from message
 */ function extractDesignGoal(message) {
    const patterns = [
        /(?:design|architect)\s+(?:a\s+|an\s+|the\s+)?(.+?)(?:\.|$)/i,
        /(?:how\s+should\s+we)\s+(.+?)(?:\.|$)/i,
        /(?:what\s+is\s+the\s+best\s+way\s+to)\s+(.+?)(?:\.|$)/i,
        /(?:propose|suggest)\s+(?:a\s+|an\s+)?(.+?)(?:\.|$)/i
    ];
    for (const pattern of patterns){
        const match = message.match(pattern);
        if (match?.[1]) {
            return match[1].trim();
        }
    }
    const firstSentence = message.split(/[.!?]/)[0] || message;
    return firstSentence.slice(0, 100).trim();
}
}),
"[project]/apps/web/lib/agent/spec/templates/debug.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * Debug Mode Template - Diagnostic specification
 *
 * Generates specifications for debugging issues, investigating bugs,
 * and diagnosing problems. Focuses on reproduction, root cause analysis,
 * and verification of fixes.
 */ __turbopack_context__.s([
    "generateDebugSpec",
    ()=>generateDebugSpec
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$spec$2f$types$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/lib/agent/spec/types.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$utils$2f$hash$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/lib/agent/utils/hash.ts [app-ssr] (ecmascript)");
;
;
function generateDebugSpec(userMessage, context) {
    const now = Date.now();
    const intent = generateDebugIntent(userMessage, context);
    const plan = generateDebugPlan(userMessage, context);
    const validation = generateDebugValidation(userMessage, context);
    const provenance = {
        model: context.model || 'unknown',
        promptHash: (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$utils$2f$hash$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["hashString"])(userMessage),
        timestamp: now,
        chatId: context.chatId || ''
    };
    return {
        intent,
        plan,
        validation,
        provenance
    };
}
/**
 * Generate intent section for debug mode
 */ function generateDebugIntent(userMessage, context) {
    const goal = extractDebugGoal(userMessage, context.errorMessage);
    const constraints = [
        {
            type: 'behavioral',
            rule: 'Investigation must be systematic and evidence-based',
            assertion: 'Each hypothesis is tested before conclusions drawn'
        },
        {
            type: 'structural',
            rule: 'Changes during debugging must be minimal and targeted',
            target: 'modified files'
        },
        {
            type: 'behavioral',
            rule: 'Root cause must be identified, not just symptoms fixed',
            assertion: 'Explanation of why the bug occurred'
        }
    ];
    // Add constraints based on error type
    const lowerMessage = userMessage.toLowerCase();
    if (context.errorMessage) {
        constraints.push({
            type: 'behavioral',
            rule: 'Fix must address the specific error reported',
            assertion: `Error "${context.errorMessage.slice(0, 50)}..." is resolved`
        });
    }
    if (lowerMessage.includes('test') || lowerMessage.includes('failing')) {
        constraints.push({
            type: 'behavioral',
            rule: 'All tests must pass after the fix',
            assertion: 'Test suite passes'
        });
    }
    if (lowerMessage.includes('performance') || lowerMessage.includes('slow')) {
        constraints.push({
            type: 'performance',
            metric: 'response time',
            threshold: 1000,
            unit: 'ms'
        });
    }
    const acceptanceCriteria = [
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$spec$2f$types$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["createAcceptanceCriterion"])('ac-1', 'the issue is reproduced', 'the bug can be consistently reproduced or explained', 'automated'),
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$spec$2f$types$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["createAcceptanceCriterion"])('ac-2', 'the root cause is identified', 'the underlying cause of the issue is documented', 'llm-judge'),
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$spec$2f$types$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["createAcceptanceCriterion"])('ac-3', 'the fix is applied', 'the issue is resolved without introducing new problems', 'automated')
    ];
    // Add verification criterion if tests exist
    if (lowerMessage.includes('test')) {
        acceptanceCriteria.push((0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$spec$2f$types$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["createAcceptanceCriterion"])('ac-4', 'regression test is added', 'a test exists to prevent this bug from recurring', 'automated'));
    }
    return {
        goal,
        rawMessage: userMessage,
        constraints,
        acceptanceCriteria
    };
}
/**
 * Generate plan section for debug mode
 */ function generateDebugPlan(userMessage, context) {
    const steps = [
        {
            id: 'step-1',
            description: 'Gather information about the issue',
            tools: [
                'read_files',
                'search_code'
            ],
            targetFiles: [
                'src/',
                'logs/',
                'tests/'
            ],
            status: 'pending'
        },
        {
            id: 'step-2',
            description: 'Analyze error messages and stack traces',
            tools: [
                'read_files'
            ],
            targetFiles: context.stackTrace ? [
                'src/'
            ] : [
                'src/'
            ],
            status: 'pending'
        },
        {
            id: 'step-3',
            description: 'Reproduce the issue',
            tools: [
                'run_command',
                'read_files'
            ],
            targetFiles: [
                'src/',
                'tests/'
            ],
            status: 'pending'
        },
        {
            id: 'step-4',
            description: 'Identify root cause through systematic investigation',
            tools: [
                'read_files',
                'search_code'
            ],
            targetFiles: [
                'src/'
            ],
            status: 'pending'
        },
        {
            id: 'step-5',
            description: 'Implement the fix',
            tools: [
                'write_files'
            ],
            targetFiles: [
                'src/'
            ],
            status: 'pending'
        },
        {
            id: 'step-6',
            description: 'Verify the fix resolves the issue',
            tools: [
                'run_command',
                'read_files'
            ],
            targetFiles: [
                'src/',
                'tests/'
            ],
            status: 'pending'
        }
    ];
    // Add regression test step if appropriate
    if (userMessage.toLowerCase().includes('test')) {
        steps.push({
            id: 'step-7',
            description: 'Add regression test to prevent recurrence',
            tools: [
                'write_files'
            ],
            targetFiles: [
                'src/__tests__/',
                '__tests__/'
            ],
            status: 'pending'
        });
    }
    const dependencies = [
        {
            path: 'src/',
            access: 'read',
            reason: 'Investigate issue source'
        },
        {
            path: 'src/',
            access: 'write',
            reason: 'Apply fixes'
        }
    ];
    // Add error-specific dependencies
    if (context.errorMessage) {
        dependencies.push({
            path: 'logs/',
            access: 'read',
            reason: 'Review error logs'
        });
    }
    const risks = [
        {
            description: 'Root cause may be in a different location than symptoms suggest',
            severity: 'high',
            mitigation: 'Follow the error chain, check call stack thoroughly'
        },
        {
            description: 'Fix may introduce new bugs',
            severity: 'medium',
            mitigation: 'Make minimal changes, verify existing tests pass'
        },
        {
            description: 'Issue may be intermittent or environment-specific',
            severity: 'medium',
            mitigation: 'Test fix in multiple scenarios if possible'
        }
    ];
    return {
        steps,
        dependencies,
        risks,
        estimatedTools: [
            'read_files',
            'search_code',
            'run_command'
        ]
    };
}
/**
 * Generate validation section for debug mode
 */ function generateDebugValidation(userMessage, context) {
    const preConditions = [
        {
            description: 'Error information is available',
            check: context.errorMessage ? 'Error message provided' : 'Issue description clear',
            type: 'llm-assert'
        },
        {
            description: 'Relevant code is accessible',
            check: 'Source files can be read',
            type: 'file-exists'
        }
    ];
    const postConditions = [
        {
            description: 'Original error is resolved',
            check: context.errorMessage ? `Error "${context.errorMessage.slice(0, 30)}..." no longer occurs` : 'Reported issue is fixed',
            type: 'command-passes'
        },
        {
            description: 'Root cause is documented',
            check: 'Explanation of why the bug occurred',
            type: 'llm-assert'
        },
        {
            description: 'No new errors introduced',
            check: 'Application runs without new console errors',
            type: 'command-passes'
        }
    ];
    // Add test condition if tests mentioned
    if (userMessage.toLowerCase().includes('test')) {
        postConditions.push({
            description: 'All tests pass',
            check: 'Test suite passes',
            type: 'command-passes'
        });
    }
    const invariants = [
        {
            description: 'Existing functionality is preserved',
            scope: 'all files',
            rule: 'No regressions in unrelated features'
        },
        {
            description: 'Fix is minimal and targeted',
            scope: 'modified files',
            rule: 'Only necessary changes made'
        }
    ];
    return {
        preConditions,
        postConditions,
        invariants
    };
}
/**
 * Extract debug goal from message
 */ function extractDebugGoal(message, errorMessage) {
    // If we have an error message, use it
    if (errorMessage) {
        return `Debug and fix: ${errorMessage.slice(0, 100)}`;
    }
    const patterns = [
        /(?:fix|debug|solve)\s+(?:the\s+)?(.+?)(?:\.|$)/i,
        /(?:why\s+(?:is|are))\s+(.+?)(?:\.|$)/i,
        /(?:investigate)\s+(?:the\s+)?(.+?)(?:\.|$)/i,
        /(?:error|bug|issue)\s+(?:with\s+)?(.+?)(?:\.|$)/i
    ];
    for (const pattern of patterns){
        const match = message.match(pattern);
        if (match?.[1]) {
            return match[1].trim();
        }
    }
    const firstSentence = message.split(/[.!?]/)[0] || message;
    return firstSentence.slice(0, 100).trim();
}
}),
"[project]/apps/web/lib/agent/spec/templates/review.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * Review Mode Template - Quality specification
 *
 * Generates specifications for code review, quality assessment,
 * and improvement suggestions. Focuses on analysis, feedback,
 * and recommendations rather than direct changes.
 */ __turbopack_context__.s([
    "generateReviewSpec",
    ()=>generateReviewSpec
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$spec$2f$types$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/lib/agent/spec/types.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$utils$2f$hash$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/lib/agent/utils/hash.ts [app-ssr] (ecmascript)");
;
;
function generateReviewSpec(userMessage, context) {
    const now = Date.now();
    const intent = generateReviewIntent(userMessage, context);
    const plan = generateReviewPlan(userMessage, context);
    const validation = generateReviewValidation(userMessage, context);
    const provenance = {
        model: context.model || 'unknown',
        promptHash: (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$utils$2f$hash$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["hashString"])(userMessage),
        timestamp: now,
        chatId: context.chatId || ''
    };
    return {
        intent,
        plan,
        validation,
        provenance
    };
}
function generateReviewIntent(userMessage, context) {
    const goal = extractReviewGoal(userMessage);
    const reviewType = context.reviewType || detectReviewType(userMessage);
    const constraints = [
        {
            type: 'behavioral',
            rule: 'Review must be objective and evidence-based',
            assertion: 'Feedback references specific code patterns'
        },
        {
            type: 'structural',
            rule: 'No direct code changes during review phase',
            target: 'target files'
        },
        {
            type: 'behavioral',
            rule: 'Review must cover all specified aspects',
            assertion: 'All review categories addressed'
        }
    ];
    switch(reviewType){
        case 'security':
            constraints.push({
                type: 'security',
                requirement: 'Identify security vulnerabilities and risks',
                standard: 'OWASP Top 10'
            });
            break;
        case 'performance':
            constraints.push({
                type: 'performance',
                metric: 'response time',
                threshold: 1000,
                unit: 'ms'
            });
            break;
        case 'accessibility':
            constraints.push({
                type: 'behavioral',
                rule: 'Review must check WCAG compliance',
                assertion: 'Accessibility standards met'
            });
            break;
    }
    if (context.targetFiles && context.targetFiles.length > 0) {
        constraints.push({
            type: 'structural',
            rule: `Review limited to: ${context.targetFiles.join(', ')}`,
            target: context.targetFiles.join(', ')
        });
    }
    const acceptanceCriteria = [
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$spec$2f$types$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["createAcceptanceCriterion"])('ac-1', 'the review is complete', 'all target files have been analyzed', 'automated'),
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$spec$2f$types$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["createAcceptanceCriterion"])('ac-2', 'findings are documented', 'issues and recommendations are clearly listed', 'llm-judge'),
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$spec$2f$types$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["createAcceptanceCriterion"])('ac-3', 'priorities are assigned', 'each finding has a severity/priority level', 'llm-judge')
    ];
    return {
        goal,
        rawMessage: userMessage,
        constraints,
        acceptanceCriteria
    };
}
function generateReviewPlan(userMessage, context) {
    const reviewType = context.reviewType || detectReviewType(userMessage);
    const steps = [
        {
            id: 'step-1',
            description: 'Read and understand the target code',
            tools: [
                'read_files'
            ],
            targetFiles: context.targetFiles || [
                'src/'
            ],
            status: 'pending'
        },
        {
            id: 'step-2',
            description: `${reviewType.charAt(0).toUpperCase() + reviewType.slice(1)} analysis`,
            tools: [
                'read_files',
                'search_code'
            ],
            targetFiles: context.targetFiles || [
                'src/'
            ],
            status: 'pending'
        },
        {
            id: 'step-3',
            description: 'Identify issues and areas for improvement',
            tools: [
                'read_files'
            ],
            targetFiles: context.targetFiles || [
                'src/'
            ],
            status: 'pending'
        },
        {
            id: 'step-4',
            description: 'Document findings with recommendations',
            tools: [
                'write_files'
            ],
            targetFiles: [
                'docs/review/',
                'REVIEW.md'
            ],
            status: 'pending'
        }
    ];
    if (!context.targetFiles || context.targetFiles.length > 5) {
        steps.push({
            id: 'step-5',
            description: 'Prioritize findings by impact and effort',
            tools: [
                'read_files'
            ],
            targetFiles: [
                'docs/review/'
            ],
            status: 'pending'
        });
    }
    const dependencies = [
        {
            path: 'src/',
            access: 'read',
            reason: 'Review target code'
        },
        {
            path: 'package.json',
            access: 'read',
            reason: 'Check dependencies'
        }
    ];
    if (context.targetFiles) {
        for (const file of context.targetFiles){
            dependencies.push({
                path: file,
                access: 'read',
                reason: 'Primary review target'
            });
        }
    }
    const risks = [
        {
            description: 'Review may miss subtle issues',
            severity: 'medium',
            mitigation: 'Use checklists and systematic approach'
        },
        {
            description: 'Recommendations may not account for all constraints',
            severity: 'low',
            mitigation: 'Note assumptions and request clarification if needed'
        }
    ];
    return {
        steps,
        dependencies,
        risks,
        estimatedTools: [
            'read_files',
            'search_code',
            'write_files'
        ]
    };
}
function generateReviewValidation(_userMessage, context) {
    const preConditions = [
        {
            description: 'Target files exist and are readable',
            check: 'Files can be accessed',
            type: 'file-exists'
        },
        {
            description: 'Review scope is clear',
            check: 'Target files or directories specified',
            type: 'llm-assert'
        }
    ];
    const postConditions = [
        {
            description: 'Review document is created',
            check: 'Findings documented in review file',
            type: 'file-exists'
        },
        {
            description: 'All target files reviewed',
            check: 'Each file has associated feedback',
            type: 'llm-assert'
        },
        {
            description: 'Recommendations are actionable',
            check: 'Each issue has a suggested fix or improvement',
            type: 'llm-assert'
        }
    ];
    if (context.targetFiles) {
        postConditions.push({
            description: `Specifically reviewed: ${context.targetFiles.join(', ')}`,
            check: 'All specified files covered',
            type: 'llm-assert'
        });
    }
    const invariants = [
        {
            description: 'Review remains objective and constructive',
            scope: 'review document',
            rule: 'Feedback is professional and actionable'
        },
        {
            description: 'No code changes made during review',
            scope: 'target files',
            rule: 'Files remain unchanged (read-only)'
        }
    ];
    return {
        preConditions,
        postConditions,
        invariants
    };
}
function extractReviewGoal(message) {
    const patterns = [
        /(?:review|audit|analyze)\s+(?:the\s+)?(.+?)(?:\.|$)/i,
        /(?:check|evaluate)\s+(?:the\s+)?(.+?)(?:\.|$)/i,
        /(?:what\s+do\s+you\s+think\s+(?:of|about))\s+(.+?)(?:\.|$)/i,
        /(?:assess|inspect)\s+(?:the\s+)?(.+?)(?:\.|$)/i
    ];
    for (const pattern of patterns){
        const match = message.match(pattern);
        if (match?.[1]) {
            return match[1].trim();
        }
    }
    const firstSentence = message.split(/[.!?]/)[0] || message;
    return firstSentence.slice(0, 100).trim();
}
function detectReviewType(message) {
    const lowerMessage = message.toLowerCase();
    if (lowerMessage.includes('security') || lowerMessage.includes('vulnerability') || lowerMessage.includes('safe')) {
        return 'security';
    }
    if (lowerMessage.includes('performance') || lowerMessage.includes('speed') || lowerMessage.includes('slow') || lowerMessage.includes('optimize')) {
        return 'performance';
    }
    if (lowerMessage.includes('accessibility') || lowerMessage.includes('a11y') || lowerMessage.includes('aria') || lowerMessage.includes('screen reader')) {
        return 'accessibility';
    }
    return 'general';
}
}),
"[project]/apps/web/lib/agent/spec/templates/index.ts [app-ssr] (ecmascript) <locals>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([]);
/**
 * Spec Templates Index - Mode-specific specification generators
 *
 * Exports all template generators for different agent modes:
 * - build: Full implementation specs
 * - code: Change-scoped specs
 * - architect: Design specs
 * - debug: Diagnostic specs
 * - review: Quality assessment specs
 */ var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$spec$2f$templates$2f$build$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/lib/agent/spec/templates/build.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$spec$2f$templates$2f$code$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/lib/agent/spec/templates/code.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$spec$2f$templates$2f$architect$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/lib/agent/spec/templates/architect.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$spec$2f$templates$2f$debug$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/lib/agent/spec/templates/debug.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$spec$2f$templates$2f$review$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/lib/agent/spec/templates/review.ts [app-ssr] (ecmascript)");
;
;
;
;
;
}),
"[project]/apps/web/lib/agent/spec/validator.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * Spec Validator - Multi-layer validation pipeline
 *
 * Validates formal specifications through multiple layers:
 * - Structural validation: Required fields, types, formats
 * - Semantic validation: Logical consistency, completeness
 * - Constraint validation: Feasibility checks
 */ __turbopack_context__.s([
    "quickValidate",
    ()=>quickValidate,
    "validateField",
    ()=>validateField,
    "validateSpec",
    ()=>validateSpec
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$spec$2f$types$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/lib/agent/spec/types.ts [app-ssr] (ecmascript)");
;
async function validateSpec(spec) {
    const errors = [];
    const warnings = [];
    // Layer 1: Structural validation
    const structuralErrors = validateStructure(spec);
    errors.push(...structuralErrors.filter((e)=>e.severity === 'error'));
    warnings.push(...structuralErrors.filter((e)=>e.severity === 'warning'));
    // Layer 2: Semantic validation
    const semanticErrors = validateSemantics(spec);
    errors.push(...semanticErrors.filter((e)=>e.severity === 'error'));
    warnings.push(...semanticErrors.filter((e)=>e.severity === 'warning'));
    // Layer 3: Constraint validation
    const constraintErrors = validateConstraints(spec);
    errors.push(...constraintErrors.filter((e)=>e.severity === 'error'));
    warnings.push(...constraintErrors.filter((e)=>e.severity === 'warning'));
    return {
        isValid: errors.length === 0,
        errors,
        warnings
    };
}
/**
 * Structural validation - Required fields and types
 */ function validateStructure(spec) {
    const errors = [];
    // ID validation
    if (!spec.id || typeof spec.id !== 'string') {
        errors.push({
            field: 'id',
            message: 'Spec ID is required and must be a string',
            severity: 'error',
            code: 'STRUCT-001'
        });
    }
    // Version validation
    if (typeof spec.version !== 'number' || spec.version < 1) {
        errors.push({
            field: 'version',
            message: 'Version must be a positive number',
            severity: 'error',
            code: 'STRUCT-002'
        });
    }
    // Tier validation
    if (!(0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$spec$2f$types$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["isSpecTier"])(spec.tier)) {
        errors.push({
            field: 'tier',
            message: `Invalid tier: ${spec.tier}. Must be 'instant', 'ambient', or 'explicit'`,
            severity: 'error',
            code: 'STRUCT-003'
        });
    }
    // Status validation
    if (!(0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$spec$2f$types$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["isSpecStatus"])(spec.status)) {
        errors.push({
            field: 'status',
            message: `Invalid status: ${spec.status}`,
            severity: 'error',
            code: 'STRUCT-004'
        });
    }
    // Intent validation
    errors.push(...validateIntentStructure(spec.intent));
    // Plan validation
    errors.push(...validatePlanStructure(spec.plan));
    // Validation section validation
    errors.push(...validateValidationStructure(spec.validation));
    // Provenance validation
    errors.push(...validateProvenanceStructure(spec.provenance));
    // Timestamp validation
    if (!spec.createdAt || typeof spec.createdAt !== 'number') {
        errors.push({
            field: 'createdAt',
            message: 'createdAt timestamp is required',
            severity: 'error',
            code: 'STRUCT-005'
        });
    }
    if (!spec.updatedAt || typeof spec.updatedAt !== 'number') {
        errors.push({
            field: 'updatedAt',
            message: 'updatedAt timestamp is required',
            severity: 'error',
            code: 'STRUCT-006'
        });
    }
    return errors;
}
/**
 * Validate intent structure
 */ function validateIntent(intent) {
    const errors = [];
    // Goal validation
    if (!intent.goal || typeof intent.goal !== 'string') {
        errors.push({
            field: 'intent.goal',
            message: 'Goal is required and must be a string',
            severity: 'error',
            code: 'STRUCT-101'
        });
    } else if (intent.goal.length < 5) {
        errors.push({
            field: 'intent.goal',
            message: 'Goal must be at least 5 characters',
            severity: 'error',
            code: 'STRUCT-102'
        });
    } else if (intent.goal.length > 500) {
        errors.push({
            field: 'intent.goal',
            message: 'Goal should be concise (max 500 chars)',
            severity: 'warning',
            code: 'STRUCT-103'
        });
    }
    // Raw message validation
    if (!intent.rawMessage || typeof intent.rawMessage !== 'string') {
        errors.push({
            field: 'intent.rawMessage',
            message: 'Raw message is required',
            severity: 'error',
            code: 'STRUCT-104'
        });
    }
    // Constraints validation
    if (!Array.isArray(intent.constraints)) {
        errors.push({
            field: 'intent.constraints',
            message: 'Constraints must be an array',
            severity: 'error',
            code: 'STRUCT-105'
        });
    } else {
        for(let i = 0; i < intent.constraints.length; i++){
            if (!(0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$spec$2f$types$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["isConstraint"])(intent.constraints[i])) {
                errors.push({
                    field: `intent.constraints[${i}]`,
                    message: `Invalid constraint at index ${i}`,
                    severity: 'error',
                    code: 'STRUCT-106'
                });
            }
        }
    }
    // Acceptance criteria validation
    if (!Array.isArray(intent.acceptanceCriteria)) {
        errors.push({
            field: 'intent.acceptanceCriteria',
            message: 'Acceptance criteria must be an array',
            severity: 'error',
            code: 'STRUCT-107'
        });
    } else {
        for(let i = 0; i < intent.acceptanceCriteria.length; i++){
            if (!(0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$spec$2f$types$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["isAcceptanceCriterion"])(intent.acceptanceCriteria[i])) {
                errors.push({
                    field: `intent.acceptanceCriteria[${i}]`,
                    message: `Invalid acceptance criterion at index ${i}`,
                    severity: 'error',
                    code: 'STRUCT-108'
                });
            }
        }
    }
    return errors;
}
/**
 * Validate plan structure
 */ function validatePlan(plan) {
    const errors = [];
    // Steps validation
    if (!Array.isArray(plan.steps)) {
        errors.push({
            field: 'plan.steps',
            message: 'Steps must be an array',
            severity: 'error',
            code: 'STRUCT-201'
        });
    } else if (plan.steps.length === 0) {
        errors.push({
            field: 'plan.steps',
            message: 'At least one step is required',
            severity: 'error',
            code: 'STRUCT-202'
        });
    } else {
        for(let i = 0; i < plan.steps.length; i++){
            const step = plan.steps[i];
            if (!step.id || typeof step.id !== 'string') {
                errors.push({
                    field: `plan.steps[${i}].id`,
                    message: `Step ${i} must have an ID`,
                    severity: 'error',
                    code: 'STRUCT-203'
                });
            }
            if (!step.description || typeof step.description !== 'string') {
                errors.push({
                    field: `plan.steps[${i}].description`,
                    message: `Step ${i} must have a description`,
                    severity: 'error',
                    code: 'STRUCT-204'
                });
            }
            if (!Array.isArray(step.tools)) {
                errors.push({
                    field: `plan.steps[${i}].tools`,
                    message: `Step ${i} tools must be an array`,
                    severity: 'error',
                    code: 'STRUCT-205'
                });
            }
            if (!Array.isArray(step.targetFiles)) {
                errors.push({
                    field: `plan.steps[${i}].targetFiles`,
                    message: `Step ${i} targetFiles must be an array`,
                    severity: 'error',
                    code: 'STRUCT-206'
                });
            }
        }
    }
    // Dependencies validation
    if (!Array.isArray(plan.dependencies)) {
        errors.push({
            field: 'plan.dependencies',
            message: 'Dependencies must be an array',
            severity: 'error',
            code: 'STRUCT-207'
        });
    }
    // Risks validation
    if (!Array.isArray(plan.risks)) {
        errors.push({
            field: 'plan.risks',
            message: 'Risks must be an array',
            severity: 'error',
            code: 'STRUCT-208'
        });
    }
    // Estimated tools validation
    if (!Array.isArray(plan.estimatedTools)) {
        errors.push({
            field: 'plan.estimatedTools',
            message: 'Estimated tools must be an array',
            severity: 'error',
            code: 'STRUCT-209'
        });
    }
    return errors;
}
/**
 * Validate validation section structure
 */ function validateValidation(validation) {
    const errors = [];
    // Pre-conditions validation
    if (!Array.isArray(validation.preConditions)) {
        errors.push({
            field: 'validation.preConditions',
            message: 'Pre-conditions must be an array',
            severity: 'error',
            code: 'STRUCT-301'
        });
    }
    // Post-conditions validation
    if (!Array.isArray(validation.postConditions)) {
        errors.push({
            field: 'validation.postConditions',
            message: 'Post-conditions must be an array',
            severity: 'error',
            code: 'STRUCT-302'
        });
    }
    // Invariants validation
    if (!Array.isArray(validation.invariants)) {
        errors.push({
            field: 'validation.invariants',
            message: 'Invariants must be an array',
            severity: 'error',
            code: 'STRUCT-303'
        });
    }
    return errors;
}
/**
 * Validate provenance structure
 */ function validateProvenance(provenance) {
    const errors = [];
    if (!provenance.model || typeof provenance.model !== 'string') {
        errors.push({
            field: 'provenance.model',
            message: 'Model is required',
            severity: 'error',
            code: 'STRUCT-401'
        });
    }
    if (!provenance.promptHash || typeof provenance.promptHash !== 'string') {
        errors.push({
            field: 'provenance.promptHash',
            message: 'Prompt hash is required',
            severity: 'error',
            code: 'STRUCT-402'
        });
    }
    if (!provenance.timestamp || typeof provenance.timestamp !== 'number') {
        errors.push({
            field: 'provenance.timestamp',
            message: 'Timestamp is required',
            severity: 'error',
            code: 'STRUCT-403'
        });
    }
    if (!provenance.chatId || typeof provenance.chatId !== 'string') {
        errors.push({
            field: 'provenance.chatId',
            message: 'Chat ID is required',
            severity: 'error',
            code: 'STRUCT-404'
        });
    }
    return errors;
}
// Alias functions to fix the naming issue
const validateIntentStructure = validateIntent;
const validatePlanStructure = validatePlan;
const validateValidationStructure = validateValidation;
const validateProvenanceStructure = validateProvenance;
/**
 * Semantic validation - Logical consistency
 */ function validateSemantics(spec) {
    const errors = [];
    // Check that goal matches raw message intent
    const goalLower = spec.intent.goal.toLowerCase();
    const messageLower = spec.intent.rawMessage.toLowerCase();
    // Goal should be a reasonable summary of the message
    const messageWords = messageLower.split(/\s+/).filter((w)=>w.length > 3);
    const goalWords = goalLower.split(/\s+/).filter((w)=>w.length > 3);
    const commonWords = messageWords.filter((w)=>goalWords.includes(w));
    if (messageWords.length > 0 && commonWords.length / messageWords.length < 0.1) {
        errors.push({
            field: 'intent.goal',
            message: 'Goal appears unrelated to the raw message',
            severity: 'warning',
            code: 'SEM-001'
        });
    }
    // Check that steps are ordered logically
    for(let i = 1; i < spec.plan.steps.length; i++){
        const prevStep = spec.plan.steps[i - 1];
        const currStep = spec.plan.steps[i];
        // Steps should have unique IDs
        if (prevStep.id === currStep.id) {
            errors.push({
                field: `plan.steps[${i}].id`,
                message: `Duplicate step ID: ${currStep.id}`,
                severity: 'error',
                code: 'SEM-002'
            });
        }
    }
    // Check that acceptance criteria are testable
    for(let i = 0; i < spec.intent.acceptanceCriteria.length; i++){
        const ac = spec.intent.acceptanceCriteria[i];
        // EARS-style criteria should have WHEN and SHALL
        if (!ac.trigger.toLowerCase().includes('when') && !ac.behavior.toLowerCase().includes('when')) {
            errors.push({
                field: `intent.acceptanceCriteria[${i}]`,
                message: `Criterion ${ac.id} should use EARS-style "WHEN" syntax`,
                severity: 'warning',
                code: 'SEM-003'
            });
        }
        if (!ac.behavior.toLowerCase().includes('shall') && !ac.behavior.toLowerCase().includes('should') && !ac.behavior.toLowerCase().includes('must')) {
            errors.push({
                field: `intent.acceptanceCriteria[${i}]`,
                message: `Criterion ${ac.id} should use "SHALL/MUST/SHOULD" for behavior`,
                severity: 'warning',
                code: 'SEM-004'
            });
        }
    }
    // Check tier-appropriate complexity
    if (spec.tier === 'instant' && spec.plan.steps.length > 3) {
        errors.push({
            field: 'plan.steps',
            message: 'Instant tier should have minimal steps (≤3)',
            severity: 'warning',
            code: 'SEM-005'
        });
    }
    // Check that explicit tier has proper constraints
    if (spec.tier === 'explicit' && spec.intent.constraints.length < 2) {
        errors.push({
            field: 'intent.constraints',
            message: 'Explicit tier should have multiple constraints defined',
            severity: 'warning',
            code: 'SEM-006'
        });
    }
    return errors;
}
/**
 * Constraint validation - Feasibility checks
 */ function validateConstraints(spec) {
    const errors = [];
    // Check for duplicate constraints
    const constraintSignatures = new Set();
    for(let i = 0; i < spec.intent.constraints.length; i++){
        const c = spec.intent.constraints[i];
        const sig = `${c.type}:${JSON.stringify(c)}`;
        if (constraintSignatures.has(sig)) {
            errors.push({
                field: `intent.constraints[${i}]`,
                message: `Duplicate constraint detected`,
                severity: 'warning',
                code: 'CONST-001'
            });
        }
        constraintSignatures.add(sig);
    }
    // Check that file dependencies match step targets
    const dependencyPaths = new Set(spec.plan.dependencies.map((d)=>d.path));
    const stepTargetPaths = new Set(spec.plan.steps.flatMap((s)=>s.targetFiles));
    for (const targetPath of stepTargetPaths){
        // Check if any dependency covers this target
        const hasMatchingDependency = Array.from(dependencyPaths).some((depPath)=>targetPath.startsWith(depPath) || depPath.startsWith(targetPath));
        if (!hasMatchingDependency && spec.plan.dependencies.length > 0) {
            errors.push({
                field: 'plan.dependencies',
                message: `Step targets ${targetPath} but no matching dependency declared`,
                severity: 'warning',
                code: 'CONST-002'
            });
        }
    }
    // Check for realistic step count
    if (spec.plan.steps.length > 20) {
        errors.push({
            field: 'plan.steps',
            message: 'Spec has unusually high number of steps (>20), consider breaking into subtasks',
            severity: 'warning',
            code: 'CONST-003'
        });
    }
    // Check that risks have mitigations
    for(let i = 0; i < spec.plan.risks.length; i++){
        const risk = spec.plan.risks[i];
        if (!risk.mitigation || risk.mitigation.length < 10) {
            errors.push({
                field: `plan.risks[${i}]`,
                message: `Risk "${risk.description}" should have a detailed mitigation strategy`,
                severity: 'warning',
                code: 'CONST-004'
            });
        }
    }
    // Validate performance constraints have reasonable thresholds
    for(let i = 0; i < spec.intent.constraints.length; i++){
        const c = spec.intent.constraints[i];
        if (c.type === 'performance') {
            if (c.threshold <= 0) {
                errors.push({
                    field: `intent.constraints[${i}]`,
                    message: `Performance threshold must be positive`,
                    severity: 'error',
                    code: 'CONST-005'
                });
            }
            if (c.unit !== 'ms' && c.unit !== 's' && c.unit !== 'mb' && c.unit !== 'gb') {
                errors.push({
                    field: `intent.constraints[${i}]`,
                    message: `Performance unit should be ms, s, mb, or gb`,
                    severity: 'warning',
                    code: 'CONST-006'
                });
            }
        }
    }
    return errors;
}
function quickValidate(spec) {
    const errors = [];
    if (!spec.id) {
        errors.push({
            field: 'id',
            message: 'ID is required',
            severity: 'error',
            code: 'QUICK-001'
        });
    }
    if (!spec.intent?.goal) {
        errors.push({
            field: 'intent.goal',
            message: 'Goal is required',
            severity: 'error',
            code: 'QUICK-002'
        });
    }
    if (!spec.plan?.steps || spec.plan.steps.length === 0) {
        errors.push({
            field: 'plan.steps',
            message: 'At least one step is required',
            severity: 'error',
            code: 'QUICK-003'
        });
    }
    return {
        isValid: errors.length === 0,
        errors,
        warnings: []
    };
}
function validateField(spec, fieldPath) {
    const allErrors = validateStructure(spec);
    return allErrors.find((e)=>e.field === fieldPath) || null;
}
}),
"[project]/apps/web/lib/agent/spec/verifier.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * Spec Verifier - Post-execution verification against specifications
 *
 * Verifies that execution results satisfy the specification:
 * - Checks acceptance criteria against results
 * - Verifies constraints are satisfied
 * - Generates verification report with pass/fail status
 */ __turbopack_context__.s([
    "canMarkAsVerified",
    ()=>canMarkAsVerified,
    "getStatusFromVerification",
    ()=>getStatusFromVerification,
    "verifySpec",
    ()=>verifySpec
]);
async function verifySpec(spec, results) {
    const timestamp = Date.now();
    // Verify acceptance criteria
    const criterionResults = await verifyAcceptanceCriteria(spec.intent.acceptanceCriteria, results);
    // Verify constraints
    const constraintResults = await verifyConstraints(spec.intent.constraints, results);
    // Determine overall status
    const passedCriteria = criterionResults.filter((r)=>r.passed).length;
    const totalCriteria = criterionResults.length;
    const passedConstraints = constraintResults.filter((r)=>r.satisfied).length;
    const totalConstraints = constraintResults.length;
    const allCriteriaPassed = passedCriteria === totalCriteria;
    const allConstraintsSatisfied = passedConstraints === totalConstraints;
    let status;
    if (allCriteriaPassed && allConstraintsSatisfied) {
        status = 'passed';
    } else if (passedCriteria === 0) {
        status = 'failed';
    } else if (allCriteriaPassed || allConstraintsSatisfied) {
        status = 'partial';
    } else {
        status = 'inconclusive';
    }
    // Generate summary
    const summary = generateSummary(spec, criterionResults, constraintResults, results.errors || []);
    // Generate recommendations
    const recommendations = generateRecommendations(criterionResults, constraintResults, results);
    return {
        passed: status === 'passed',
        status,
        criterionResults,
        constraintResults,
        summary,
        recommendations,
        timestamp
    };
}
/**
 * Verify acceptance criteria against execution results
 */ async function verifyAcceptanceCriteria(criteria, results) {
    const results_array = [];
    for (const criterion of criteria){
        const result = await verifySingleCriterion(criterion, results);
        results_array.push(result);
    }
    return results_array;
}
/**
 * Verify a single acceptance criterion
 */ async function verifySingleCriterion(criterion, results) {
    const { trigger, behavior, verificationMethod } = criterion;
    switch(verificationMethod){
        case 'automated':
            return verifyAutomatedCriterion(criterion, results);
        case 'llm-judge':
            return verifyLLMJudgeCriterion(criterion, results);
        case 'manual':
            return {
                criterionId: criterion.id,
                passed: false,
                message: 'Manual verification required',
                details: {
                    trigger,
                    behavior,
                    note: 'This criterion requires human review'
                }
            };
        default:
            return {
                criterionId: criterion.id,
                passed: false,
                message: `Unknown verification method: ${verificationMethod}`
            };
    }
}
/**
 * Verify criterion using automated checks
 */ function verifyAutomatedCriterion(criterion, results) {
    const { trigger, behavior } = criterion;
    const triggerLower = trigger.toLowerCase();
    const behaviorLower = behavior.toLowerCase();
    // Check for errors first
    if (results.errors && results.errors.length > 0) {
        // If criterion is about error handling
        if (triggerLower.includes('error') || behaviorLower.includes('error')) {
            const hasErrorHandling = results.toolCalls?.some((tc)=>tc.tool.includes('error') || tc.result && tc.result.toLowerCase().includes('error') || tc.error && tc.error.toLowerCase().includes('handled'));
            return {
                criterionId: criterion.id,
                passed: hasErrorHandling || false,
                message: hasErrorHandling ? 'Error handling detected' : 'Criterion requires error handling but none detected',
                details: {
                    errors: results.errors
                }
            };
        }
        // Other criteria fail if there are errors
        return {
            criterionId: criterion.id,
            passed: false,
            message: `Execution had errors: ${results.errors.join(', ')}`,
            details: {
                errors: results.errors
            }
        };
    }
    // Check if files were modified (for implementation criteria)
    if ((triggerLower.includes('implemented') || triggerLower.includes('applied')) && (behaviorLower.includes('code') || behaviorLower.includes('file'))) {
        const filesModified = results.filesModified || [];
        const passed = filesModified.length > 0;
        return {
            criterionId: criterion.id,
            passed,
            message: passed ? `Files modified: ${filesModified.join(', ')}` : 'No files were modified',
            details: {
                filesModified
            }
        };
    }
    // Check for successful command execution
    if (triggerLower.includes('command') || behaviorLower.includes('command')) {
        const commandsRun = results.commandsRun || [];
        const passed = commandsRun.length > 0 && (results.errors?.length || 0) === 0;
        return {
            criterionId: criterion.id,
            passed,
            message: passed ? `Commands executed: ${commandsRun.length}` : 'Commands were not executed successfully',
            details: {
                commandsRun
            }
        };
    }
    // Check for output generation
    if (behaviorLower.includes('response') || behaviorLower.includes('output')) {
        const hasOutput = results.output && results.output.length > 0;
        return {
            criterionId: criterion.id,
            passed: hasOutput || false,
            message: hasOutput ? 'Output was generated' : 'No output was generated',
            details: {
                outputLength: results.output?.length
            }
        };
    }
    // Default: assume passed if no errors
    return {
        criterionId: criterion.id,
        passed: (results.errors?.length || 0) === 0,
        message: 'No errors detected during execution'
    };
}
/**
 * Verify criterion using LLM judgment (simulated)
 *
 * In production, this would call an LLM to evaluate the criterion
 */ function verifyLLMJudgeCriterion(criterion, results) {
    const { trigger, behavior } = criterion;
    // Simulate LLM judgment with heuristics
    const output = results.output || '';
    const outputLower = output.toLowerCase();
    const behaviorLower = behavior.toLowerCase();
    // Check if output contains indicators of the behavior
    const behaviorKeywords = behaviorLower.replace(/the system shall /g, '').replace(/the system should /g, '').split(' ').filter((w)=>w.length > 4);
    const keywordMatches = behaviorKeywords.filter((kw)=>outputLower.includes(kw)).length;
    const matchRatio = behaviorKeywords.length > 0 ? keywordMatches / behaviorKeywords.length : 0;
    // Heuristic: if we have good output and no errors, likely passed
    const passed = matchRatio > 0.3 && (results.errors?.length || 0) === 0;
    return {
        criterionId: criterion.id,
        passed,
        message: passed ? `LLM judge: Output appears to satisfy "${behavior}"` : `LLM judge: Output may not fully satisfy "${behavior}"`,
        details: {
            trigger,
            behavior,
            matchRatio,
            outputPreview: output.slice(0, 200)
        }
    };
}
/**
 * Verify constraints against execution results
 */ async function verifyConstraints(constraints, results) {
    const results_array = [];
    for (const constraint of constraints){
        const result = await verifySingleConstraint(constraint, results);
        results_array.push(result);
    }
    return results_array;
}
/**
 * Verify a single constraint
 */ async function verifySingleConstraint(constraint, results) {
    switch(constraint.type){
        case 'structural':
            return verifyStructuralConstraint(constraint, results);
        case 'behavioral':
            return verifyBehavioralConstraint(constraint, results);
        case 'performance':
            return verifyPerformanceConstraint(constraint, results);
        case 'compatibility':
            return verifyCompatibilityConstraint(constraint, results);
        case 'security':
            return verifySecurityConstraint(constraint, results);
        default:
            return {
                constraint,
                satisfied: false,
                message: `Unknown constraint type: ${constraint.type}`
            };
    }
}
/**
 * Verify structural constraint
 */ function verifyStructuralConstraint(constraint, results) {
    const { rule } = constraint;
    const ruleLower = rule.toLowerCase();
    // Check for breaking changes
    if (ruleLower.includes('breaking') || ruleLower.includes('api')) {
        // This would need more context to verify properly
        return {
            constraint,
            satisfied: true,
            message: 'Breaking change verification requires additional context'
        };
    }
    // Check for file structure
    if (ruleLower.includes('structure') || ruleLower.includes('convention')) {
        const filesModified = results.filesModified || [];
        // Assume satisfied if files were modified appropriately
        return {
            constraint,
            satisfied: filesModified.length > 0,
            message: filesModified.length > 0 ? 'Files modified following structure' : 'No files modified'
        };
    }
    return {
        constraint,
        satisfied: true,
        message: `Structural constraint "${rule}" assumed satisfied`
    };
}
/**
 * Verify behavioral constraint
 */ function verifyBehavioralConstraint(constraint, results) {
    const { rule, assertion } = constraint;
    const ruleLower = rule.toLowerCase();
    // Check for error handling
    if (ruleLower.includes('error handling') || ruleLower.includes('error')) {
        const hasErrors = (results.errors?.length || 0) > 0;
        const toolErrors = results.toolCalls?.filter((tc)=>tc.error).length || 0;
        return {
            constraint,
            satisfied: !hasErrors || toolErrors === 0,
            message: hasErrors ? `Errors occurred: ${results.errors?.join(', ')}` : 'No unhandled errors detected'
        };
    }
    // Check for tests
    if (ruleLower.includes('test') || assertion?.toLowerCase().includes('test')) {
        const testCommands = results.commandsRun?.filter((cmd)=>cmd.toLowerCase().includes('test')).length;
        return {
            constraint,
            satisfied: (testCommands || 0) > 0,
            message: testCommands ? `Test commands executed: ${testCommands}` : 'No test commands run'
        };
    }
    return {
        constraint,
        satisfied: (results.errors?.length || 0) === 0,
        message: `Behavioral constraint checked: ${rule}`
    };
}
/**
 * Verify performance constraint
 */ function verifyPerformanceConstraint(constraint, _results) {
    const { metric, threshold, unit } = constraint;
    // Performance constraints require runtime measurement
    // This would typically be checked with actual timing data
    return {
        constraint,
        satisfied: true,
        message: `Performance constraint (${metric} < ${threshold}${unit}) requires runtime metrics for verification`
    };
}
/**
 * Verify compatibility constraint
 */ function verifyCompatibilityConstraint(constraint, results) {
    const { requirement, scope } = constraint;
    // Check if scope files were modified
    const filesModified = results.filesModified || [];
    const scopeFilesModified = filesModified.filter((f)=>f.includes(scope));
    return {
        constraint,
        satisfied: true,
        message: `Compatibility constraint "${requirement}" for scope "${scope}" - ${scopeFilesModified.length} files in scope modified`
    };
}
/**
 * Verify security constraint
 */ function verifySecurityConstraint(constraint, results) {
    const { requirement, standard } = constraint;
    // Security constraints typically require static analysis
    // This is a simplified check
    const hasSecurityTool = results.toolCalls?.some((tc)=>tc.tool.toLowerCase().includes('security') || tc.tool.toLowerCase().includes('audit') || tc.tool.toLowerCase().includes('scan'));
    return {
        constraint,
        satisfied: hasSecurityTool || false,
        message: hasSecurityTool ? `Security tool executed for "${requirement}"` : `Security constraint "${requirement}"${standard ? ` (${standard})` : ''} requires security scanning`
    };
}
/**
 * Generate verification summary
 */ function generateSummary(spec, criterionResults, constraintResults, errors) {
    const passedCriteria = criterionResults.filter((r)=>r.passed).length;
    const totalCriteria = criterionResults.length;
    const passedConstraints = constraintResults.filter((r)=>r.satisfied).length;
    const totalConstraints = constraintResults.length;
    const parts = [];
    parts.push(`Verification for spec "${spec.intent.goal.slice(0, 50)}..."`);
    parts.push(`Acceptance Criteria: ${passedCriteria}/${totalCriteria} passed`);
    parts.push(`Constraints: ${passedConstraints}/${totalConstraints} satisfied`);
    if (errors.length > 0) {
        parts.push(`Errors during execution: ${errors.length}`);
    }
    const allPassed = passedCriteria === totalCriteria && passedConstraints === totalConstraints;
    if (allPassed) {
        parts.push('✓ All verifications passed');
    } else if (passedCriteria === 0 && passedConstraints === 0) {
        parts.push('✗ Verification failed');
    } else {
        parts.push('⚠ Partial verification - some items need attention');
    }
    return parts.join('\n');
}
/**
 * Generate recommendations based on verification results
 */ function generateRecommendations(criterionResults, constraintResults, results) {
    const recommendations = [];
    // Failed criteria recommendations
    const failedCriteria = criterionResults.filter((r)=>!r.passed);
    for (const result of failedCriteria){
        if (result.message?.includes('error')) {
            recommendations.push(`Fix error handling for criterion ${result.criterionId}`);
        }
        if (result.message?.includes('file')) {
            recommendations.push(`Ensure files are properly modified for criterion ${result.criterionId}`);
        }
    }
    // Failed constraint recommendations
    const failedConstraints = constraintResults.filter((r)=>!r.satisfied);
    for (const result of failedConstraints){
        if (result.constraint.type === 'behavioral') {
            recommendations.push(`Address behavioral constraint: ${result.constraint.rule}`);
        }
        if (result.constraint.type === 'structural') {
            recommendations.push(`Review structural constraint: ${result.constraint.rule}`);
        }
    }
    // Error-based recommendations
    if (results.errors && results.errors.length > 0) {
        recommendations.push('Review and fix execution errors');
    }
    // No files modified recommendation
    if ((!results.filesModified || results.filesModified.length === 0) && failedCriteria.length > 0) {
        recommendations.push('Consider if file modifications are needed to satisfy criteria');
    }
    return recommendations;
}
function canMarkAsVerified(report) {
    return report.status === 'passed' || report.status === 'partial';
}
function getStatusFromVerification(report) {
    if (report.status === 'passed') {
        return 'verified';
    } else if (report.status === 'failed') {
        return 'failed';
    } else {
        return 'drifted';
    }
}
}),
"[project]/apps/web/lib/agent/spec/engine.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * Spec Engine - Core specification generation, validation, and refinement
 *
 * The SpecEngine class is the central component of the SpecNative system:
 * - Generates formal specifications from user messages
 * - Validates specifications for correctness and completeness
 * - Refines specifications based on validation errors
 * - Verifies execution results against specifications
 */ __turbopack_context__.s([
    "SpecEngine",
    ()=>SpecEngine,
    "createSpecEngine",
    ()=>createSpecEngine,
    "defaultSpecEngine",
    ()=>defaultSpecEngine
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$spec$2f$classifier$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/lib/agent/spec/classifier.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$spec$2f$templates$2f$index$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/apps/web/lib/agent/spec/templates/index.ts [app-ssr] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$spec$2f$templates$2f$build$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/lib/agent/spec/templates/build.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$spec$2f$templates$2f$code$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/lib/agent/spec/templates/code.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$spec$2f$templates$2f$architect$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/lib/agent/spec/templates/architect.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$spec$2f$templates$2f$debug$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/lib/agent/spec/templates/debug.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$spec$2f$templates$2f$review$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/lib/agent/spec/templates/review.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$spec$2f$validator$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/lib/agent/spec/validator.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$spec$2f$verifier$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/lib/agent/spec/verifier.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$harness$2f$identifier$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/lib/agent/harness/identifier.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$utils$2f$hash$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/lib/agent/utils/hash.ts [app-ssr] (ecmascript)");
;
;
;
;
;
;
class SpecEngine {
    config;
    constructor(config){
        this.config = {
            autoApproveAmbient: true,
            maxSpecsPerProject: 100,
            enableDriftDetection: false,
            ...config
        };
    }
    /**
   * Check if the spec engine is enabled
   */ isEnabled() {
        return this.config.enabled;
    }
    /**
   * Get the spec engine configuration
   */ getConfig() {
        return {
            ...this.config
        };
    }
    /**
   * Update the spec engine configuration
   */ updateConfig(config) {
        this.config = {
            ...this.config,
            ...config
        };
    }
    /**
   * Classify user intent to determine spec tier
   *
   * @param message - User's message
   * @param context - Classification context
   * @returns Classification result with tier and confidence
   */ async classify(message, context) {
        // If default tier is set, use it but still run classification for factors
        if (this.config.defaultTier) {
            const result = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$spec$2f$classifier$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["classifyIntent"])(message, context);
            return {
                ...result,
                tier: this.config.defaultTier,
                reasoning: `${result.reasoning} (overridden by defaultTier: ${this.config.defaultTier})`
            };
        }
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$spec$2f$classifier$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["classifyIntent"])(message, context);
    }
    /**
   * Generate a formal specification from user message
   *
   * @param userMessage - The user's original message
   * @param context - Generation context
   * @param tier - The spec tier (instant, ambient, explicit)
   * @returns Generated specification
   */ async generate(userMessage, context, tier) {
        const classification = await this.classify(userMessage, {
            mode: context.mode,
            projectContext: context.existingFiles ? {
                fileCount: context.existingFiles.length
            } : undefined
        });
        // For instant tier, return minimal spec
        if (tier === 'instant') {
            const spec = this.createMinimalSpec(userMessage, context, tier);
            return {
                spec,
                tier,
                classification
            };
        }
        // Generate full spec based on mode
        const specData = this.generateSpecForMode(userMessage, context, tier);
        const now = Date.now();
        const spec = {
            id: (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$harness$2f$identifier$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["ascending"])('spec_'),
            version: 1,
            tier,
            status: 'draft',
            ...specData,
            provenance: {
                ...specData.provenance,
                chatId: context.chatId || ''
            },
            createdAt: now,
            updatedAt: now
        };
        return {
            spec,
            tier,
            classification
        };
    }
    /**
   * Validate a specification
   *
   * @param spec - The specification to validate
   * @returns Validation result with errors if any
   */ async validate(spec) {
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$spec$2f$validator$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["validateSpec"])(spec);
    }
    /**
   * Refine a specification based on validation errors
   *
   * @param spec - The specification to refine
   * @param errors - Validation errors to address
   * @returns Refined specification
   */ async refine(spec, errors) {
        const refined = {
            ...spec,
            version: spec.version + 1,
            status: 'draft',
            updatedAt: Date.now()
        };
        // Address structural errors
        for (const error of errors){
            switch(error.field){
                case 'intent.goal':
                    if (!refined.intent.goal || refined.intent.goal.length < 5) {
                        refined.intent.goal = this.inferGoalFromMessage(refined.intent.rawMessage);
                    }
                    break;
                case 'intent.acceptanceCriteria':
                    if (refined.intent.acceptanceCriteria.length === 0) {
                        refined.intent.acceptanceCriteria = [
                            {
                                id: 'ac-1',
                                trigger: 'the task is executed',
                                behavior: 'the system completes the requested operation',
                                verificationMethod: 'automated',
                                status: 'pending'
                            }
                        ];
                    }
                    break;
                case 'plan.steps':
                    if (refined.plan.steps.length === 0) {
                        refined.plan.steps = [
                            {
                                id: 'step-1',
                                description: 'Analyze and execute the request',
                                tools: [
                                    'read_files',
                                    'write_files'
                                ],
                                targetFiles: [
                                    'src/'
                                ],
                                status: 'pending'
                            }
                        ];
                    }
                    break;
                case 'validation.preConditions':
                    if (refined.validation.preConditions.length === 0) {
                        refined.validation.preConditions = [
                            {
                                description: 'Project is in a valid state',
                                check: 'Files are accessible',
                                type: 'file-exists'
                            }
                        ];
                    }
                    break;
                case 'validation.postConditions':
                    if (refined.validation.postConditions.length === 0) {
                        refined.validation.postConditions = [
                            {
                                description: 'Task is completed successfully',
                                check: 'Requested changes are applied',
                                type: 'llm-assert'
                            }
                        ];
                    }
                    break;
                default:
                    // For other errors, add a constraint note
                    if (!refined.intent.constraints.find((c)=>c.type === 'structural' && c.rule.includes('refined'))) {
                        refined.intent.constraints.push({
                            type: 'structural',
                            rule: `Auto-refined: ${error.message}`,
                            target: error.field
                        });
                    }
                    break;
            }
        }
        // Re-validate to ensure fixes worked
        const revalidation = await this.validate(refined);
        if (!revalidation.isValid) {
            // If still invalid, mark as best effort
            refined.status = 'draft';
        } else {
            refined.status = 'validated';
        }
        return refined;
    }
    /**
   * Verify execution results against specification
   *
   * @param spec - The specification to verify against
   * @param executionResults - Results from execution
   * @returns Verification report
   */ async verify(spec, executionResults) {
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$spec$2f$verifier$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["verifySpec"])(spec, executionResults);
    }
    /**
   * Approve a specification for execution (Tier 3)
   *
   * @param spec - The specification to approve
   * @returns Approved specification
   */ approve(spec) {
        if (spec.tier !== 'explicit') {
            throw new Error('Only explicit tier specs require approval');
        }
        return {
            ...spec,
            status: 'approved',
            updatedAt: Date.now()
        };
    }
    /**
   * Mark a specification as executing
   *
   * @param spec - The specification
   * @returns Updated specification
   */ markExecuting(spec) {
        return {
            ...spec,
            status: 'executing',
            updatedAt: Date.now()
        };
    }
    /**
   * Mark a specification as verified
   *
   * @param spec - The specification
   * @param results - Verification results
   * @returns Updated specification
   */ markVerified(spec, results) {
        return {
            ...spec,
            status: 'verified',
            verificationResults: results,
            updatedAt: Date.now()
        };
    }
    /**
   * Mark a specification as failed
   *
   * @param spec - The specification
   * @param reason - Failure reason
   * @returns Updated specification
   */ markFailed(spec, _reason) {
        return {
            ...spec,
            status: 'failed',
            updatedAt: Date.now()
        };
    }
    /**
   * Mark a specification as drifted
   *
   * @param spec - The specification
   * @param driftReport - The drift report
   * @returns Updated specification
   */ markDrifted(spec, _driftReport) {
        return {
            ...spec,
            status: 'drifted',
            updatedAt: Date.now()
        };
    }
    /**
   * Refine a specification based on detected drift
   *
   * This method re-evaluates constraints against new code state and
   * generates a reconciliation plan to update the spec.
   *
   * @param spec - The specification to refine
   * @param driftReport - The drift detection report
   * @returns Refined specification with updated constraints
   */ async refineFromDrift(spec, driftReport) {
        const changes = [];
        const refined = {
            ...spec,
            version: spec.version + 1,
            status: 'draft',
            updatedAt: Date.now(),
            provenance: {
                ...spec.provenance,
                parentSpecId: spec.id,
                timestamp: Date.now()
            }
        };
        // Process each drift finding
        for (const finding of driftReport.findings){
            const change = await this.generateChangeForFinding(finding, spec);
            if (change) {
                changes.push(change);
                this.applyChange(refined, change);
            }
        }
        // Add a meta-constraint about the drift
        refined.intent.constraints.push({
            type: 'structural',
            rule: `Auto-refined from drift detection at ${new Date().toISOString()}`,
            target: driftReport.modifiedFiles.join(', ') || 'spec'
        });
        // Validate the refined spec
        const validation = await this.validate(refined);
        if (validation.isValid) {
            refined.status = 'validated';
        }
        return {
            spec: refined,
            changes
        };
    }
    /**
   * Generate a reconciliation change for a drift finding
   */ async generateChangeForFinding(finding, _spec) {
        switch(finding.type){
            case 'constraint_violation':
                if (finding.relatedConstraint) {
                    // Update the existing constraint to reflect new reality
                    // Only structural and behavioral constraints have a 'rule' property
                    const updatedConstraint = finding.relatedConstraint.type === 'structural' || finding.relatedConstraint.type === 'behavioral' ? {
                        ...finding.relatedConstraint,
                        rule: `${finding.relatedConstraint.rule} (updated after drift detection)`
                    } : finding.relatedConstraint;
                    return {
                        type: 'update_constraint',
                        targetId: finding.relatedConstraint.type,
                        value: updatedConstraint,
                        reason: finding.description
                    };
                }
                // Add a new constraint to address the drift
                return {
                    type: 'add_constraint',
                    value: {
                        type: 'structural',
                        rule: `Address drift: ${finding.description}`,
                        target: finding.filePath
                    },
                    reason: finding.description
                };
            case 'dependency_change':
                // Add or update dependency
                return {
                    type: 'update_dependency',
                    targetId: finding.filePath,
                    value: {
                        path: finding.filePath,
                        access: 'write',
                        reason: `Modified during execution: ${finding.description}`
                    },
                    reason: finding.description
                };
            case 'invariant_breach':
                // Add a note about the invariant in constraints
                return {
                    type: 'add_constraint',
                    value: {
                        type: 'behavioral',
                        rule: `Verify invariant after changes: ${finding.description}`,
                        assertion: finding.suggestion
                    },
                    reason: finding.description
                };
            case 'requirement_mismatch':
                // Add a new acceptance criterion
                return {
                    type: 'add_criterion',
                    value: {
                        id: `ac-drift-${Date.now()}`,
                        trigger: `code changes to ${finding.filePath}`,
                        behavior: finding.suggestion,
                        verificationMethod: 'automated',
                        status: 'pending'
                    },
                    reason: finding.description
                };
            default:
                return null;
        }
    }
    /**
   * Apply a reconciliation change to a specification
   */ applyChange(spec, change) {
        switch(change.type){
            case 'add_constraint':
                spec.intent.constraints.push(change.value);
                return true;
            case 'remove_constraint':
                spec.intent.constraints = spec.intent.constraints.filter((c)=>JSON.stringify(c) !== JSON.stringify(change.value));
                return true;
            case 'update_constraint':
                if (change.targetId) {
                    const idx = spec.intent.constraints.findIndex((c)=>c.type === change.targetId);
                    if (idx >= 0) {
                        spec.intent.constraints[idx] = change.value;
                        return true;
                    }
                }
                return false;
            case 'add_criterion':
                spec.intent.acceptanceCriteria.push(change.value);
                return true;
            case 'update_criterion':
                if (change.targetId) {
                    const idx = spec.intent.acceptanceCriteria.findIndex((c)=>c.id === change.targetId);
                    if (idx >= 0) {
                        spec.intent.acceptanceCriteria[idx] = {
                            ...spec.intent.acceptanceCriteria[idx],
                            ...change.value
                        };
                        return true;
                    }
                }
                return false;
            case 'add_step':
                spec.plan.steps.push(change.value);
                return true;
            case 'update_step':
                if (change.targetId) {
                    const idx = spec.plan.steps.findIndex((s)=>s.id === change.targetId);
                    if (idx >= 0) {
                        spec.plan.steps[idx] = {
                            ...spec.plan.steps[idx],
                            ...change.value
                        };
                        return true;
                    }
                }
                return false;
            default:
                return false;
        }
    }
    /**
   * Create a minimal spec for instant tier
   */ createMinimalSpec(userMessage, context, tier) {
        const now = Date.now();
        return {
            id: (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$harness$2f$identifier$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["ascending"])('spec_'),
            version: 1,
            tier,
            status: 'validated',
            intent: {
                goal: this.inferGoalFromMessage(userMessage),
                rawMessage: userMessage,
                constraints: [],
                acceptanceCriteria: [
                    {
                        id: 'ac-1',
                        trigger: 'the request is processed',
                        behavior: 'the system provides a helpful response',
                        verificationMethod: 'llm-judge',
                        status: 'pending'
                    }
                ]
            },
            plan: {
                steps: [
                    {
                        id: 'step-1',
                        description: 'Process the user request',
                        tools: [
                            'read_files'
                        ],
                        targetFiles: context.targetFiles || [],
                        status: 'pending'
                    }
                ],
                dependencies: [],
                risks: [],
                estimatedTools: []
            },
            validation: {
                preConditions: [],
                postConditions: [],
                invariants: []
            },
            provenance: {
                model: 'gpt-4o',
                promptHash: (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$utils$2f$hash$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["hashString"])(userMessage),
                timestamp: now,
                chatId: context.chatId || ''
            },
            createdAt: now,
            updatedAt: now
        };
    }
    /**
   * Generate spec data based on mode
   */ generateSpecForMode(userMessage, context, _tier) {
        const mode = context.mode?.toLowerCase() || 'code';
        const model = context.model || 'unknown';
        switch(mode){
            case 'build':
                return (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$spec$2f$templates$2f$build$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["generateBuildSpec"])(userMessage, {
                    projectId: context.projectId,
                    chatId: context.chatId,
                    existingFiles: context.existingFiles,
                    techStack: context.techStack,
                    model
                });
            case 'architect':
                return (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$spec$2f$templates$2f$architect$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["generateArchitectSpec"])(userMessage, {
                    projectId: context.projectId,
                    chatId: context.chatId,
                    existingFiles: context.existingFiles,
                    techStack: context.techStack,
                    model
                });
            case 'debug':
                return (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$spec$2f$templates$2f$debug$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["generateDebugSpec"])(userMessage, {
                    projectId: context.projectId,
                    chatId: context.chatId,
                    errorMessage: context.errorMessage,
                    stackTrace: context.stackTrace,
                    model
                });
            case 'review':
                return (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$spec$2f$templates$2f$review$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["generateReviewSpec"])(userMessage, {
                    projectId: context.projectId,
                    chatId: context.chatId,
                    targetFiles: context.targetFiles,
                    model
                });
            case 'code':
            case 'ask':
            case 'discuss':
            default:
                return (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$spec$2f$templates$2f$code$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["generateCodeSpec"])(userMessage, {
                    projectId: context.projectId,
                    chatId: context.chatId,
                    existingFiles: context.existingFiles,
                    targetFiles: context.targetFiles,
                    model
                });
        }
    }
    /**
   * Infer a goal from the user message
   */ inferGoalFromMessage(message) {
        const firstSentence = message.split(/[.!?]/)[0] || message;
        return firstSentence.slice(0, 150).trim();
    }
}
function createSpecEngine(config) {
    return new SpecEngine({
        enabled: true,
        autoApproveAmbient: true,
        maxSpecsPerProject: 100,
        enableDriftDetection: false,
        ...config
    });
}
const defaultSpecEngine = createSpecEngine();
}),
"[project]/apps/web/lib/agent/harness/runtime.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * Agent Runtime - Core execution engine for the agentic harness
 *
 * Implements OpenCode-style agent execution with:
 * - Provider-agnostic LLM integration
 * - Multi-step reasoning with tool execution
 * - Subagent delegation
 * - Context compaction
 * - Step limiting and forced text-only mode
 * - Reasoning part capture
 * - Permission-aware tool execution
 * - Plugin hooks integration
 */ __turbopack_context__.s([
    "Runtime",
    ()=>Runtime,
    "createRuntime",
    ()=>createRuntime
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$tools$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/lib/agent/tools.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$command$2d$analysis$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/lib/agent/command-analysis.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$harness$2f$identifier$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/lib/agent/harness/identifier.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$harness$2f$agents$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/lib/agent/harness/agents.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$harness$2f$permissions$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/lib/agent/harness/permissions.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$harness$2f$plugins$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/lib/agent/harness/plugins.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$harness$2f$tool$2d$repair$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/lib/agent/harness/tool-repair.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$harness$2f$compaction$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/lib/agent/harness/compaction.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$llm$2f$stream$2d$resilience$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/apps/web/lib/llm/stream-resilience.ts [app-ssr] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$harness$2f$snapshots$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/lib/agent/harness/snapshots.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$harness$2f$task$2d$tool$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/lib/agent/harness/task-tool.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$spec$2f$engine$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/lib/agent/spec/engine.ts [app-ssr] (ecmascript)");
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
function normalizeCheckpointToolCallFrequency(entries) {
    return (entries ?? []).flatMap((entry)=>{
        if (Array.isArray(entry)) {
            const [key, count] = entry;
            return typeof key === 'string' && typeof count === 'number' ? [
                {
                    key,
                    count
                }
            ] : [];
        }
        return typeof entry?.key === 'string' && typeof entry.count === 'number' ? [
            entry
        ] : [];
    });
}
/**
 * Default runtime configuration
 */ const DEFAULT_RUNTIME_CONFIG = {
    maxIterations: 100,
    maxSteps: 50,
    maxToolCallsPerStep: 10,
    enableToolDeduplication: true,
    toolLoopThreshold: 3,
    contextCompactionThreshold: 0.9,
    enableSnapshots: true,
    snapshotFailureMode: 'warn',
    enableReasoning: true,
    maxSubagentDepth: 2,
    subagentDepth: 0,
    maxToolExecutionRetries: 0,
    toolRetryBackoffMs: 200,
    enableToolCallIdempotencyCache: false,
    specEngine: {
        enabled: true,
        autoApproveAmbient: true,
        maxSpecsPerProject: 100,
        enableDriftDetection: false
    },
    // Stream resilience configuration
    streamIdleTimeoutMs: 120000,
    maxStreamRetries: 3,
    streamRetryBackoffMs: 2000
};
class Runtime {
    provider;
    toolExecutors;
    config;
    state = null;
    toolCallResultCache = new Map();
    specEngine;
    constructor(provider, toolExecutors, config){
        this.provider = provider;
        this.toolExecutors = toolExecutors;
        this.config = {
            ...DEFAULT_RUNTIME_CONFIG,
            ...config
        };
        this.specEngine = (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$spec$2f$engine$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["createSpecEngine"])(this.config.specEngine);
    }
    /**
   * Run the agent with streaming events
   */ async *run(sessionID, userMessage, initialMessages = []) {
        this.toolCallResultCache.clear();
        const agent = __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$harness$2f$agents$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["agents"].get(userMessage.agent) ?? __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$harness$2f$agents$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["agents"].get('build');
        const maxSteps = agent.steps ?? this.config.maxSteps ?? 50;
        this.state = this.createInitialState(sessionID, [
            ...initialMessages,
            userMessage
        ]);
        // SpecNative: Generate spec before execution if enabled
        if (this.specEngine.isEnabled()) {
            const userText = this.extractUserText(userMessage);
            if (userText) {
                const shouldProceed = yield* this.generateAndHandleSpec(userText, agent, sessionID);
                if (shouldProceed === false) {
                    yield {
                        type: 'error',
                        error: 'Specification approval cancelled'
                    };
                    return;
                }
            }
        }
        yield* this.runLoop(agent, maxSteps, {
            emitSessionStart: true
        });
    }
    /**
   * Extract text content from user message
   */ extractUserText(userMessage) {
        const textParts = userMessage.parts.filter((p)=>p.type === 'text');
        if (textParts.length === 0) return null;
        return textParts.map((p)=>'text' in p ? p.text : '').join('\n');
    }
    /**
   * Generate and handle specification
   */ async *generateAndHandleSpec(userMessage, agent, sessionID) {
        if (!this.state) return true;
        // Classify intent
        const classification = await this.specEngine.classify(userMessage, {
            mode: agent.name
        });
        // Execute spec.classify hook
        await this.executeHook('spec.classify', {
            sessionID,
            step: this.state.step,
            agent,
            messageID: ''
        }, classification);
        const tier = classification.tier;
        // Skip spec generation for instant tier
        if (tier === 'instant') {
            return true;
        }
        // Generate spec
        await this.executeHook('spec.generate.before', {
            sessionID,
            step: this.state.step,
            agent,
            messageID: ''
        }, {
            userMessage,
            tier
        });
        const specContext = {
            mode: agent.name,
            model: agent.model ?? this.provider.config.defaultModel ?? 'unknown'
        };
        const { spec } = await this.specEngine.generate(userMessage, specContext, tier);
        await this.executeHook('spec.generate.after', {
            sessionID,
            step: this.state.step,
            agent,
            messageID: ''
        }, {
            spec
        });
        // Validate spec
        const validation = await this.specEngine.validate(spec);
        await this.executeHook('spec.validate', {
            sessionID,
            step: this.state.step,
            agent,
            messageID: ''
        }, validation);
        let finalSpec = spec;
        if (!validation.isValid) {
            finalSpec = await this.specEngine.refine(spec, validation.errors);
            await this.executeHook('spec.refine', {
                sessionID,
                step: this.state.step,
                agent,
                messageID: ''
            }, {
                original: spec,
                refined: finalSpec,
                errors: validation.errors
            });
        }
        // Handle tier-specific behavior
        if (tier === 'explicit') {
            // Yield spec for UI approval
            yield {
                type: 'spec_pending_approval',
                spec: finalSpec,
                tier
            };
            const approval = this.config.onSpecApproval ? await this.config.onSpecApproval({
                sessionID,
                spec: finalSpec,
                tier
            }) : {
                decision: 'approve',
                spec: finalSpec
            };
            if (approval.decision === 'cancel') {
                this.state.activeSpec = undefined;
                return false;
            }
            finalSpec = approval.spec ?? finalSpec;
            finalSpec = this.specEngine.approve(finalSpec);
            await this.executeHook('spec.approve', {
                sessionID,
                step: this.state.step,
                agent,
                messageID: ''
            }, {
                spec: finalSpec
            });
        } else if (tier === 'ambient') {
            // Auto-approve ambient specs based on config
            if (this.config.specEngine?.autoApproveAmbient !== false) {
                finalSpec = this.specEngine.markExecuting(finalSpec);
            }
        }
        // Store active spec
        this.state.activeSpec = finalSpec;
        // Yield spec generated event
        yield {
            type: 'spec_generated',
            spec: finalSpec,
            tier
        };
        await this.executeHook('spec.execute.before', {
            sessionID,
            step: this.state.step,
            agent,
            messageID: ''
        }, {
            spec: finalSpec
        });
        return true;
    }
    /**
   * Resume a session from a stored checkpoint
   */ async *resume(sessionID) {
        this.toolCallResultCache.clear();
        const checkpointStore = this.config.checkpointStore;
        if (!checkpointStore) {
            throw new Error('Checkpoint store is not configured');
        }
        const checkpoint = await checkpointStore.load(sessionID);
        if (!checkpoint) {
            throw new Error(`No checkpoint found for session: ${sessionID}`);
        }
        const agent = __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$harness$2f$agents$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["agents"].get(checkpoint.agentName) ?? __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$harness$2f$agents$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["agents"].get('build');
        const maxSteps = agent.steps ?? this.config.maxSteps ?? 50;
        this.state = this.restoreStateFromCheckpoint(checkpoint.state);
        yield* this.runLoop(agent, maxSteps, {
            emitSessionStart: false
        });
    }
    createInitialState(sessionID, messages) {
        return {
            sessionID,
            messages,
            step: 0,
            isComplete: false,
            isLastStep: false,
            abortController: new AbortController(),
            pendingSubtasks: [],
            cost: 0,
            tokens: {
                input: 0,
                output: 0,
                reasoning: 0,
                cacheRead: 0,
                cacheWrite: 0
            },
            lastToolLoopSignature: null,
            toolLoopStreak: 0,
            toolCallHistory: [],
            toolCallFrequency: new Map(),
            cyclicPatternDetected: false,
            lastInterventionStep: 0
        };
    }
    async *runLoop(agent, maxSteps, options) {
        if (!this.state) {
            throw new Error('Runtime not initialized');
        }
        const sessionID = this.state.sessionID;
        const contextLimit = this.provider.config.auth.baseUrl?.includes('anthropic') ? 200000 : 128000;
        if (options.emitSessionStart) {
            await this.executeHook('session.start', {
                sessionID,
                step: this.state.step,
                agent,
                messageID: ''
            }, {});
        }
        try {
            while(!this.state.isComplete && this.state.step < maxSteps){
                this.state.step++;
                const isLastStep = this.state.step >= maxSteps - 1;
                this.state.isLastStep = isLastStep;
                yield {
                    type: 'step_start',
                    step: this.state.step
                };
                await this.executeHook('step.start', {
                    sessionID,
                    step: this.state.step,
                    agent,
                    messageID: ''
                }, {
                    isLastStep
                });
                if (this.state.pendingSubtasks.length > 0) {
                    yield* this.processSubtasks(agent);
                    await this.saveCheckpoint(agent.name, 'step');
                    continue;
                }
                if ((0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$harness$2f$compaction$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["needsCompaction"])(this.state.messages, contextLimit, {
                    threshold: this.config.contextCompactionThreshold ?? 0.9,
                    targetRatio: 0.5,
                    preserveRecent: 4,
                    maxToolOutputLength: 10000
                })) {
                    const compacted = yield* this.performCompaction(agent);
                    if (compacted) {
                        await this.saveCheckpoint(agent.name, 'step');
                        continue;
                    }
                }
                const result = yield* this.executeStep(agent, isLastStep);
                if (result.messageID) {
                    yield* this.captureStepSnapshot(agent, result.messageID);
                }
                if (result.finishReason === 'stop' || result.finishReason === 'length') {
                    this.state.isComplete = true;
                }
                await this.saveCheckpoint(agent.name, 'step');
                yield {
                    type: 'step_finish',
                    step: this.state.step,
                    finishReason: result.finishReason,
                    usage: this.state.tokens,
                    cost: this.state.cost
                };
                await this.executeHook('step.end', {
                    sessionID,
                    step: this.state.step,
                    agent,
                    messageID: ''
                }, {
                    finishReason: result.finishReason
                });
            }
            let completedSuccessfully = this.state.isComplete;
            if (!this.state.isComplete) {
                await this.saveCheckpoint(agent.name, 'error');
                yield {
                    type: 'error',
                    error: `Agent reached maximum steps (${maxSteps}) without completing`
                };
            } else {
                completedSuccessfully = true;
            }
            if (completedSuccessfully) {
                await this.saveCheckpoint(agent.name, 'complete');
            }
            // SpecNative: Post-execution verification
            if (this.state.activeSpec) {
                yield* this.verifyAndFinalizeSpec(sessionID, agent);
            }
            yield {
                type: 'complete',
                usage: this.state.tokens,
                cost: this.state.cost
            };
            await this.executeHook('session.end', {
                sessionID,
                step: this.state.step,
                agent,
                messageID: ''
            }, {});
        } catch (error) {
            await this.saveCheckpoint(agent.name, 'error');
            yield {
                type: 'error',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
    /**
   * Execute a single step
   */ async *executeStep(agent, isLastStep) {
        if (!this.state) throw new Error('Runtime not initialized');
        const messageID = (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$harness$2f$identifier$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["ascending"])('msg_');
        const lastUserMessage = this.state.messages.filter((m)=>m.role === 'user').pop();
        if (!lastUserMessage) {
            throw new Error('No user message found');
        }
        const baseCompletionOptions = {
            model: agent.model ?? this.provider.config.defaultModel ?? 'gpt-4o',
            messages: this.buildCompletionMessages(isLastStep),
            temperature: agent.temperature ?? 0.7,
            maxTokens: 4096,
            tools: isLastStep ? undefined : this.getToolsForAgent(agent),
            stream: true
        };
        const completionOptions = await this.executeHook('llm.request', {
            sessionID: this.state.sessionID,
            step: this.state.step,
            agent,
            messageID
        }, baseCompletionOptions);
        const assistantMessage = {
            id: messageID,
            sessionID: this.state.sessionID,
            role: 'assistant',
            parentID: lastUserMessage.id,
            parts: [],
            time: {
                created: Date.now()
            },
            modelID: completionOptions.model,
            providerID: this.provider.name,
            mode: agent.name,
            agent: agent.name
        };
        let fullContent = '';
        let reasoningContent = '';
        const pendingToolCalls = [];
        let finishReason = 'unknown';
        let usage = {
            promptTokens: 0,
            completionTokens: 0,
            totalTokens: 0
        };
        // Stream resilience: wrap with timeout and retry
        const streamIdleTimeoutMs = this.config.streamIdleTimeoutMs ?? 120000;
        const maxStreamRetries = this.config.maxStreamRetries ?? 3;
        const streamRetryBackoffMs = this.config.streamRetryBackoffMs ?? 2000;
        try {
            let contextOverflowRetryCount = 0;
            const maxContextOverflowRetries = 1;
            const processStreamWithResilience = (async function*() {
                while(true){
                    try {
                        const streamFactory = ()=>this.provider.completionStream(completionOptions);
                        for await (const chunk of (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$llm$2f$stream$2d$resilience$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["withTimeoutAndRetry"])(streamFactory, streamIdleTimeoutMs, {
                            maxRetries: maxStreamRetries,
                            initialDelayMs: streamRetryBackoffMs
                        })){
                            // Filter out retry notification chunks
                            if (typeof chunk === 'object' && chunk !== null && 'type' in chunk) {
                                const chunkType = chunk.type;
                                if (chunkType === 'retry') {
                                    yield {
                                        type: 'chunk',
                                        data: {
                                            type: 'status_thinking',
                                            content: 'Retrying LLM request...'
                                        }
                                    };
                                    continue;
                                }
                            }
                            yield {
                                type: 'chunk',
                                data: chunk
                            };
                        }
                        return;
                    } catch (error) {
                        const errorObj = error instanceof Error ? error : new Error(String(error));
                        // Handle context overflow by triggering compaction
                        if ((0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$llm$2f$stream$2d$resilience$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["isContextOverflowError"])(errorObj) && contextOverflowRetryCount < maxContextOverflowRetries) {
                            contextOverflowRetryCount++;
                            // Trigger compaction
                            for await (const event of this.performCompaction(agent)){
                                // Consume compaction events
                                yield event;
                            }
                            if (contextOverflowRetryCount <= maxContextOverflowRetries) {
                                // Update completion options with compacted messages
                                completionOptions.messages = this.buildCompletionMessages(isLastStep);
                                continue; // Retry the stream with compacted context
                            }
                        }
                        yield {
                            type: 'error',
                            error: errorObj.message
                        };
                        return;
                    }
                }
            }).bind(this);
            for await (const event of processStreamWithResilience()){
                if (event.type === 'error') {
                    yield {
                        type: 'error',
                        error: event.error
                    };
                    return {
                        finishReason: 'error',
                        messageID
                    };
                }
                const chunk = event.data;
                switch(chunk.type){
                    case 'text':
                        if (chunk.content) {
                            fullContent += chunk.content;
                            yield {
                                type: 'text',
                                content: chunk.content
                            };
                        }
                        break;
                    case 'reasoning':
                        if (chunk.reasoningContent) {
                            reasoningContent += chunk.reasoningContent;
                            yield {
                                type: 'reasoning',
                                reasoningContent: chunk.reasoningContent
                            };
                        }
                        break;
                    case 'tool_call':
                        if (chunk.toolCall) {
                            pendingToolCalls.push(chunk.toolCall);
                            yield {
                                type: 'tool_call',
                                toolCall: chunk.toolCall
                            };
                        }
                        break;
                    case 'finish':
                        if (chunk.usage) {
                            usage = chunk.usage;
                            this.state.tokens.input += usage.promptTokens;
                            this.state.tokens.output += usage.completionTokens;
                            // Track reasoning and cache tokens if available
                            if (usage.reasoningTokens) {
                                this.state.tokens.reasoning += usage.reasoningTokens;
                            }
                            if (usage.cacheReadTokens) {
                                this.state.tokens.cacheRead = (this.state.tokens.cacheRead ?? 0) + usage.cacheReadTokens;
                            }
                            if (usage.cacheWriteTokens) {
                                this.state.tokens.cacheWrite = (this.state.tokens.cacheWrite ?? 0) + usage.cacheWriteTokens;
                            }
                        }
                        if (chunk.finishReason) {
                            finishReason = this.mapFinishReason(chunk.finishReason);
                        }
                        break;
                    case 'error':
                        yield {
                            type: 'error',
                            error: chunk.error
                        };
                        return {
                            finishReason: 'error',
                            messageID
                        };
                    case 'status_thinking':
                        if (chunk.content) {
                            yield {
                                type: 'status',
                                content: chunk.content
                            };
                        }
                        break;
                }
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Stream error';
            yield {
                type: 'error',
                error: errorMessage
            };
            return {
                finishReason: 'error',
                messageID
            };
        }
        if (reasoningContent) {
            const reasoningPart = {
                id: (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$harness$2f$identifier$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["ascending"])('part_'),
                messageID,
                sessionID: this.state.sessionID,
                type: 'reasoning',
                text: reasoningContent
            };
            assistantMessage.parts.push(reasoningPart);
        }
        if (fullContent) {
            const textPart = {
                id: (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$harness$2f$identifier$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["ascending"])('part_'),
                messageID,
                sessionID: this.state.sessionID,
                type: 'text',
                text: fullContent
            };
            assistantMessage.parts.push(textPart);
        }
        if (pendingToolCalls.length > 0) {
            finishReason = 'tool-calls';
            // Get list of available tool names for fuzzy matching
            const availableToolNames = [
                ...__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$tools$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["AGENT_TOOLS"],
                ...(0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$harness$2f$task$2d$tool$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getTaskToolDefinitions"])(),
                ...__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$harness$2f$plugins$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["plugins"].getTools()
            ].map((t)=>t.function.name);
            const preparedToolCalls = pendingToolCalls.map((toolCall)=>{
                // Try to repair tool name if it's not recognized
                let toolName = toolCall.function.name;
                if (!availableToolNames.includes(toolName)) {
                    const matchedName = (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$harness$2f$tool$2d$repair$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["fuzzyMatchToolName"])(toolName, availableToolNames);
                    if (matchedName) {
                        console.warn(`[runtime] Tool name '${toolName}' was corrected to '${matchedName}'`);
                        toolName = matchedName;
                    }
                }
                // Try to parse arguments with repair fallback
                let parsedArgs;
                try {
                    parsedArgs = JSON.parse(toolCall.function.arguments);
                } catch  {
                    // Try repair
                    const repairedArgs = (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$harness$2f$tool$2d$repair$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["repairJSON"])(toolCall.function.arguments);
                    parsedArgs = (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$harness$2f$tool$2d$repair$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["safeJSONParse"])(repairedArgs, {});
                    if (Object.keys(parsedArgs).length > 0) {
                        console.warn('[runtime] Tool arguments JSON was repaired automatically');
                    } else {
                        parsedArgs = {};
                    }
                }
                return {
                    toolCall: {
                        ...toolCall,
                        function: {
                            ...toolCall.function,
                            name: toolName
                        }
                    },
                    parsedArgs,
                    dedupKey: this.createToolCallDedupKey(toolName, parsedArgs)
                };
            });
            let processedToolCallsThisStep = 0;
            const maxToolCallsPerStep = this.config.maxToolCallsPerStep;
            const dedupEnabled = this.config.enableToolDeduplication === true;
            const seenDedupKeysThisStep = new Set();
            const executableToolKeysForLoop = [];
            {
                let previewProcessedToolCallsThisStep = 0;
                const previewSeenDedupKeysThisStep = new Set();
                for (const prepared of preparedToolCalls){
                    if (dedupEnabled && previewSeenDedupKeysThisStep.has(prepared.dedupKey)) {
                        continue;
                    }
                    if (dedupEnabled) {
                        previewSeenDedupKeysThisStep.add(prepared.dedupKey);
                    }
                    if (typeof maxToolCallsPerStep === 'number' && previewProcessedToolCallsThisStep >= maxToolCallsPerStep) {
                        continue;
                    }
                    previewProcessedToolCallsThisStep++;
                    executableToolKeysForLoop.push(prepared.dedupKey);
                }
            }
            const loopGuardResult = this.applyToolLoopGuard(executableToolKeysForLoop);
            // Progressive intervention: warn at threshold - 1
            if (loopGuardResult.warned) {
                yield {
                    type: 'status',
                    content: 'Warning: You appear to be repeating similar tool calls. Try a different approach to avoid a loop.'
                };
            }
            if (loopGuardResult.triggered) {
                const threshold = this.config.toolLoopThreshold;
                // Hard stop
                yield {
                    type: 'error',
                    error: `Detected repeated tool loop across steps (threshold: ${threshold}); ` + 'halting before executing tool calls'
                };
                this.state.isComplete = true;
            } else {
                // Partition tools into parallelizable (read-only) and sequential (side effects)
                const parallelizableTools = [
                    'read_files',
                    'list_directory',
                    'search_code',
                    'search_code_ast',
                    'search_codebase'
                ];
                const partitionedTools = preparedToolCalls.reduce((acc, tool)=>{
                    const toolName = tool.toolCall.function.name;
                    if (parallelizableTools.includes(toolName)) {
                        acc.parallel.push(tool);
                    } else {
                        acc.sequential.push(tool);
                    }
                    return acc;
                }, {
                    parallel: [],
                    sequential: []
                });
                // Execute tools (parallel tools can run concurrently)
                const sequentialTools = partitionedTools.sequential;
                const parallelTools = partitionedTools.parallel;
                // Execute parallel tools concurrently
                if (parallelTools.length > 0) {
                    yield {
                        type: 'status',
                        content: `Executing ${parallelTools.length} read-only tool(s)`
                    };
                    for (const tool of parallelTools){
                        const { toolCall, parsedArgs, dedupKey } = tool;
                        const toolName = toolCall.function.name;
                        if (dedupEnabled && seenDedupKeysThisStep.has(dedupKey)) {
                            const error = `Skipped duplicate tool call within step: ${toolName} ` + '(duplicate tool call)';
                            yield this.createToolResultEvent({
                                toolCallId: toolCall.id,
                                toolName,
                                args: parsedArgs,
                                output: '',
                                error
                            });
                            assistantMessage.parts.push({
                                id: (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$harness$2f$identifier$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["ascending"])('part_'),
                                messageID,
                                sessionID: this.state.sessionID,
                                type: 'tool',
                                tool: toolName,
                                state: {
                                    status: 'error',
                                    input: parsedArgs,
                                    error,
                                    time: {
                                        start: Date.now(),
                                        end: Date.now()
                                    }
                                }
                            });
                            continue;
                        }
                        if (dedupEnabled) {
                            seenDedupKeysThisStep.add(dedupKey);
                        }
                        if (typeof maxToolCallsPerStep === 'number' && processedToolCallsThisStep >= maxToolCallsPerStep) {
                            const error = `Reached maximum tool calls per step (${maxToolCallsPerStep}); ` + `skipping additional tool call: ${toolName}`;
                            yield this.createToolResultEvent({
                                toolCallId: toolCall.id,
                                toolName,
                                args: parsedArgs,
                                output: '',
                                error
                            });
                            assistantMessage.parts.push({
                                id: (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$harness$2f$identifier$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["ascending"])('part_'),
                                messageID,
                                sessionID: this.state.sessionID,
                                type: 'tool',
                                tool: toolName,
                                state: {
                                    status: 'error',
                                    input: parsedArgs,
                                    error,
                                    time: {
                                        start: Date.now(),
                                        end: Date.now()
                                    }
                                }
                            });
                            continue;
                        }
                        processedToolCallsThisStep++;
                        for await (const event of this.executeToolAndAddToMessage(toolCall, parsedArgs, agent, messageID, assistantMessage)){
                            yield event;
                        }
                    }
                }
                // Execute sequential tools in order
                for (const tool of sequentialTools){
                    const { toolCall, parsedArgs, dedupKey } = tool;
                    const toolName = toolCall.function.name;
                    if (dedupEnabled && seenDedupKeysThisStep.has(dedupKey)) {
                        const error = `Skipped duplicate tool call within step: ${toolName} ` + '(duplicate tool call)';
                        yield this.createToolResultEvent({
                            toolCallId: toolCall.id,
                            toolName,
                            args: parsedArgs,
                            output: '',
                            error
                        });
                        assistantMessage.parts.push({
                            id: (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$harness$2f$identifier$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["ascending"])('part_'),
                            messageID,
                            sessionID: this.state.sessionID,
                            type: 'tool',
                            tool: toolName,
                            state: {
                                status: 'error',
                                input: parsedArgs,
                                error,
                                time: {
                                    start: Date.now(),
                                    end: Date.now()
                                }
                            }
                        });
                        continue;
                    }
                    if (dedupEnabled) {
                        seenDedupKeysThisStep.add(dedupKey);
                    }
                    if (typeof maxToolCallsPerStep === 'number' && processedToolCallsThisStep >= maxToolCallsPerStep) {
                        const error = `Reached maximum tool calls per step (${maxToolCallsPerStep}); ` + `skipping additional tool call: ${toolName}`;
                        yield this.createToolResultEvent({
                            toolCallId: toolCall.id,
                            toolName,
                            args: parsedArgs,
                            output: '',
                            error
                        });
                        assistantMessage.parts.push({
                            id: (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$harness$2f$identifier$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["ascending"])('part_'),
                            messageID,
                            sessionID: this.state.sessionID,
                            type: 'tool',
                            tool: toolName,
                            state: {
                                status: 'error',
                                input: parsedArgs,
                                error,
                                time: {
                                    start: Date.now(),
                                    end: Date.now()
                                }
                            }
                        });
                        continue;
                    }
                    processedToolCallsThisStep++;
                    for await (const event of this.executeToolAndAddToMessage(toolCall, parsedArgs, agent, messageID, assistantMessage)){
                        yield event;
                    }
                }
            }
        } else {
            this.state.lastToolLoopSignature = null;
            this.state.toolLoopStreak = 0;
        }
        assistantMessage.time.completed = Date.now();
        assistantMessage.finish = finishReason;
        assistantMessage.tokens = {
            input: usage.promptTokens,
            output: usage.completionTokens,
            reasoning: this.state.tokens.reasoning
        };
        this.state.messages.push(assistantMessage);
        await this.executeHook('llm.response', {
            sessionID: this.state.sessionID,
            step: this.state.step,
            agent,
            messageID
        }, {
            usage,
            finishReason,
            modelID: completionOptions.model
        });
        return {
            finishReason,
            messageID
        };
    }
    /**
   * Execute a tool call with permission checking
   */ async *executeToolCall(toolCall, agent, messageID) {
        if (!this.state) throw new Error('Runtime not initialized');
        const toolName = toolCall.function.name;
        const startedAt = Date.now();
        let args;
        try {
            args = JSON.parse(toolCall.function.arguments);
        } catch  {
            const error = `Invalid tool arguments for ${toolName}`;
            yield this.createToolResultEvent({
                toolCallId: toolCall.id,
                toolName,
                args: {},
                output: '',
                error,
                startedAt
            });
            return {
                output: '',
                error
            };
        }
        const patterns = this.extractPatterns(toolName, args);
        const riskTier = this.classifyToolRisk(toolName, args);
        const riskPolicyDecision = this.resolveRiskPolicyDecision(toolName, riskTier);
        const hookContext = {
            sessionID: this.state.sessionID,
            step: this.state.step,
            agent,
            messageID
        };
        await this.executeHook('tool.execute.before', hookContext, {
            toolName,
            args
        });
        if (riskPolicyDecision === 'deny') {
            const error = this.config.toolRiskPolicy && [
                'write_files',
                'run_command',
                'update_memory_bank',
                'task'
            ].includes(toolName) ? `Eval mode denied tool: ${toolName}` : `Risk policy denied tool: ${toolName} (${riskTier})`;
            yield {
                type: 'interrupt_decision',
                content: error,
                interrupt: {
                    toolName,
                    riskTier,
                    decision: 'reject',
                    reason: 'Risk policy deny'
                }
            };
            yield this.createToolResultEvent({
                toolCallId: toolCall.id,
                toolName,
                args,
                output: '',
                error,
                startedAt
            });
            return {
                output: '',
                error,
                argsUsed: args
            };
        }
        if (riskPolicyDecision === 'ask') {
            const interruptResult = yield* this.requestToolInterrupt({
                sessionID: this.state.sessionID,
                messageID,
                toolCallId: toolCall.id,
                toolName,
                args,
                patterns,
                riskTier,
                reason: `Risk-tier policy requires approval for ${toolName}`
            });
            if (!interruptResult.approved) {
                return {
                    output: '',
                    error: interruptResult.error ?? 'Tool interrupted',
                    argsUsed: args
                };
            }
            args = interruptResult.args;
        }
        const effectivePermissions = (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$harness$2f$permissions$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["mergePermissions"])(agent.permission, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$harness$2f$permissions$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["permissions"].getSessionPermissions(this.state.sessionID) ?? {});
        for (const pattern of patterns){
            const decision = (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$harness$2f$permissions$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["checkPermission"])(effectivePermissions, toolName, pattern || undefined);
            if (decision === 'deny') {
                yield this.createToolResultEvent({
                    toolCallId: toolCall.id,
                    toolName,
                    args,
                    output: '',
                    error: `Permission denied for tool: ${toolName}${pattern ? ` (${pattern})` : ''}`,
                    startedAt
                });
                return {
                    output: '',
                    error: `Permission denied for tool: ${toolName}`,
                    argsUsed: args
                };
            }
        }
        const askPatterns = patterns.filter((pattern)=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$harness$2f$permissions$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["checkPermission"])(effectivePermissions, toolName, pattern || undefined) === 'ask');
        if (askPatterns.length > 0) {
            const primaryPattern = askPatterns[0];
            let permissionReason;
            const permissionMetadata = {
                args,
                target: primaryPattern
            };
            if (toolName === 'run_command') {
                const analysis = (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$command$2d$analysis$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["analyzeCommand"])(String(args.command ?? ''));
                permissionReason = analysis.reason;
                permissionMetadata.analysis = {
                    kind: analysis.kind,
                    riskTier: analysis.riskTier,
                    reason: analysis.reason,
                    requiresApproval: analysis.requiresApproval
                };
                permissionMetadata.reason = analysis.reason;
            }
            yield {
                type: 'permission_request',
                content: toolName === 'run_command' && permissionReason ? `Command approval required: ${permissionReason}` : `Permission requested for: ${toolName} (${askPatterns.length} target${askPatterns.length === 1 ? '' : 's'})`
            };
            for (const pattern of askPatterns){
                const result = await __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$harness$2f$permissions$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["permissions"].request(this.state.sessionID, messageID, toolName, pattern, {
                    ...permissionMetadata,
                    target: pattern
                });
                yield {
                    type: 'permission_decision',
                    content: `${pattern || toolName}: ${result.granted ? 'Granted' : 'Denied'}`
                };
                if (!result.granted) {
                    return {
                        output: '',
                        error: `Permission denied: ${result.reason}`,
                        argsUsed: args
                    };
                }
            }
        }
        if (toolName === 'task') {
            const subagentType = args.subagent_type;
            const prompt = args.prompt;
            const description = args.description;
            if (typeof subagentType !== 'string' || typeof prompt !== 'string' || typeof description !== 'string') {
                const error = 'Invalid task tool arguments';
                yield this.createToolResultEvent({
                    toolCallId: toolCall.id,
                    toolName,
                    args,
                    output: '',
                    error,
                    startedAt
                });
                return {
                    output: '',
                    error,
                    argsUsed: args
                };
            }
            const currentDepth = this.config.subagentDepth ?? 0;
            const maxDepth = this.config.maxSubagentDepth ?? 0;
            if (currentDepth >= maxDepth) {
                const error = 'Maximum subagent depth reached';
                yield this.createToolResultEvent({
                    toolCallId: toolCall.id,
                    toolName,
                    args,
                    output: '',
                    error,
                    startedAt
                });
                return {
                    output: '',
                    error,
                    argsUsed: args
                };
            }
            const result = {
                output: '',
                metadata: {
                    deferredTask: {
                        subagentType,
                        prompt,
                        description
                    }
                },
                argsUsed: args
            };
            await this.executeHook('tool.execute.after', hookContext, {
                toolName,
                args,
                result
            });
            return result;
        }
        const executor = this.toolExecutors.get(toolName);
        if (!executor) {
            const error = `Unknown tool: ${toolName}`;
            yield this.createToolResultEvent({
                toolCallId: toolCall.id,
                toolName,
                args,
                output: '',
                error,
                startedAt
            });
            return {
                output: '',
                error,
                argsUsed: args
            };
        }
        const cacheKey = this.createToolCallDedupKey(toolName, args);
        if (this.config.enableToolCallIdempotencyCache && this.isToolIdempotencyCacheAllowed(toolName)) {
            const cached = this.toolCallResultCache.get(cacheKey);
            if (cached) {
                yield {
                    type: 'status',
                    content: `Idempotency cache hit for ${toolName}; reusing prior result`
                };
                yield this.createToolResultEvent({
                    toolCallId: toolCall.id,
                    toolName,
                    args: cached.argsUsed ?? args,
                    output: cached.output,
                    error: cached.error,
                    startedAt
                });
                return cached;
            }
        }
        let lastError;
        const maxRetries = Math.max(0, this.config.maxToolExecutionRetries ?? 0);
        const retryableTool = this.isToolRetryAllowed(toolName);
        for(let attempt = 0; attempt <= maxRetries; attempt++){
            try {
                const result = await executor(args, {
                    sessionID: this.state.sessionID,
                    messageID,
                    agent,
                    abortSignal: this.state.abortController.signal,
                    metadata: ()=>{},
                    ask: async (question)=>{
                        return `User response: ${question}`;
                    }
                });
                if (this.config.enableToolCallIdempotencyCache && !result.error && this.isToolIdempotencyCacheAllowed(toolName)) {
                    this.toolCallResultCache.set(cacheKey, {
                        ...result,
                        argsUsed: args
                    });
                }
                yield this.createToolResultEvent({
                    toolCallId: toolCall.id,
                    toolName,
                    args,
                    output: result.output,
                    error: result.error,
                    startedAt
                });
                await this.executeHook('tool.execute.after', hookContext, {
                    toolName,
                    args,
                    result
                });
                return {
                    ...result,
                    argsUsed: args
                };
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Tool execution failed';
                lastError = errorMessage;
                const canRetry = retryableTool && attempt < maxRetries && this.isRetryableToolError(errorMessage);
                if (canRetry) {
                    yield {
                        type: 'status',
                        content: `Retrying ${toolName} after transient failure (${attempt + 1}/${maxRetries})`
                    };
                    await this.sleep(this.config.toolRetryBackoffMs ?? 200);
                    continue;
                }
                yield this.createToolResultEvent({
                    toolCallId: toolCall.id,
                    toolName,
                    args,
                    output: '',
                    error: errorMessage,
                    startedAt
                });
                return {
                    output: '',
                    error: errorMessage,
                    argsUsed: args
                };
            }
        }
        return {
            output: '',
            error: lastError ?? 'Tool execution failed',
            argsUsed: args
        };
    }
    async *executeToolAndAddToMessage(toolCall, parsedArgs, agent, messageID, assistantMessage) {
        if (!this.state) throw new Error('Runtime not initialized');
        const toolIterator = this.executeToolCall(toolCall, agent, messageID);
        let result;
        while(true){
            const next = await toolIterator.next();
            if (next.done) {
                result = next.value;
                break;
            }
            yield next.value;
        }
        const toolName = toolCall.function.name;
        const argsUsed = result?.argsUsed ?? parsedArgs;
        const deferredTask = result?.metadata?.deferredTask;
        if (deferredTask) {
            const deferredStartedAt = Date.now();
            const subtaskPart = (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$harness$2f$task$2d$tool$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["createSubtaskPart"])(messageID, this.state.sessionID, deferredTask.subagentType, deferredTask.prompt);
            assistantMessage.parts.push(subtaskPart);
            this.state.pendingSubtasks.push({
                part: subtaskPart,
                parentAgent: agent,
                description: deferredTask.description,
                toolCallId: toolCall.id,
                input: argsUsed,
                startedAt: deferredStartedAt
            });
            return;
        }
        assistantMessage.parts.push({
            id: (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$harness$2f$identifier$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["ascending"])('part_'),
            messageID,
            sessionID: this.state.sessionID,
            type: 'tool',
            tool: toolName,
            state: result?.error ? {
                status: 'error',
                input: argsUsed,
                error: result.error,
                time: {
                    start: Date.now(),
                    end: Date.now()
                }
            } : {
                status: 'completed',
                input: argsUsed,
                output: result?.output ?? '',
                metadata: result?.metadata,
                time: {
                    start: Date.now(),
                    end: Date.now()
                }
            }
        });
    }
    /**
   * Process pending subtasks
   */ async *processSubtasks(_agent) {
        if (!this.state || this.state.pendingSubtasks.length === 0) return;
        const subtasksToProcess = [
            ...this.state.pendingSubtasks
        ];
        this.state.pendingSubtasks = [];
        // 1. Yield start events for all subagents first (so the UI shows them running in parallel)
        for (const pending of subtasksToProcess){
            yield {
                type: 'subagent_start',
                subagent: {
                    agent: pending.part.agent,
                    sessionID: this.state.sessionID,
                    id: pending.part.id
                }
            };
        }
        // 2. Execute all subagents concurrently
        const results = await Promise.all(subtasksToProcess.map(async (pending)=>{
            const subtask = pending.part;
            const subagentConfig = __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$harness$2f$agents$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["agents"].get(subtask.agent);
            if (!subagentConfig) {
                const errorMessage = `Unknown subagent type: ${subtask.agent}`;
                return {
                    pending,
                    success: false,
                    errorMessage,
                    taskResult: null
                };
            }
            try {
                const taskResult = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$harness$2f$task$2d$tool$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["executeTaskTool"])({
                    subagent_type: subtask.agent,
                    prompt: subtask.prompt,
                    description: pending.description
                }, {
                    sessionID: this.state.sessionID,
                    messageID: subtask.messageID,
                    parentAgent: pending.parentAgent,
                    runSubagent: async (childAgent, prompt, childSessionID)=>this.runSubagent(childAgent, prompt, childSessionID)
                });
                return {
                    pending,
                    success: true,
                    errorMessage: taskResult.error,
                    taskResult
                };
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown subagent execution error';
                return {
                    pending,
                    success: false,
                    errorMessage,
                    taskResult: null
                };
            }
        }));
        // 3. Yield completion events for all subagents
        for (const res of results){
            const { pending, success, errorMessage, taskResult } = res;
            const subtask = pending.part;
            if (!success || !taskResult) {
                subtask.result = {
                    output: '',
                    parts: []
                };
                this.replaceSubtaskWithToolPart(subtask, {
                    toolName: 'task',
                    output: '',
                    error: errorMessage,
                    input: {
                        subagent_type: subtask.agent,
                        prompt: subtask.prompt,
                        description: pending.description
                    }
                });
                yield {
                    ...this.createToolResultEvent({
                        toolCallId: pending.toolCallId ?? subtask.id,
                        toolName: 'task',
                        args: pending.input ?? {
                            subagent_type: subtask.agent,
                            prompt: subtask.prompt,
                            description: pending.description
                        },
                        output: '',
                        error: errorMessage,
                        startedAt: pending.startedAt
                    })
                };
                yield {
                    type: 'subagent_complete',
                    subagent: {
                        agent: subtask.agent,
                        sessionID: this.state.sessionID,
                        id: subtask.id,
                        success: false,
                        error: errorMessage
                    }
                };
            } else {
                subtask.result = {
                    output: taskResult.output,
                    parts: []
                };
                this.replaceSubtaskWithToolPart(subtask, {
                    toolName: 'task',
                    output: taskResult.output,
                    error: taskResult.error,
                    input: {
                        subagent_type: subtask.agent,
                        prompt: subtask.prompt,
                        description: pending.description
                    }
                });
                yield {
                    ...this.createToolResultEvent({
                        toolCallId: pending.toolCallId ?? subtask.id,
                        toolName: 'task',
                        args: pending.input ?? {
                            subagent_type: subtask.agent,
                            prompt: subtask.prompt,
                            description: pending.description
                        },
                        output: taskResult.output,
                        ...taskResult.error ? {
                            error: taskResult.error
                        } : {},
                        startedAt: pending.startedAt
                    })
                };
                yield {
                    type: 'subagent_complete',
                    subagent: {
                        agent: subtask.agent,
                        sessionID: this.state.sessionID,
                        id: subtask.id,
                        success: !taskResult.error,
                        ...taskResult.error ? {
                            error: taskResult.error
                        } : {}
                    }
                };
            }
        }
    }
    replaceSubtaskWithToolPart(subtask, args) {
        if (!this.state) return;
        const parentMessage = this.state.messages.find((message)=>message.role === 'assistant' && message.id === subtask.messageID);
        if (!parentMessage) return;
        const partIndex = parentMessage.parts.findIndex((part)=>part.type === 'subtask' && part.id === subtask.id);
        if (partIndex === -1) return;
        parentMessage.parts[partIndex] = {
            id: (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$harness$2f$identifier$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["ascending"])('part_'),
            messageID: subtask.messageID,
            sessionID: subtask.sessionID,
            type: 'tool',
            tool: args.toolName,
            state: args.error ? {
                status: 'error',
                input: args.input,
                error: args.error,
                time: {
                    start: Date.now(),
                    end: Date.now()
                }
            } : {
                status: 'completed',
                input: args.input,
                output: args.output,
                time: {
                    start: Date.now(),
                    end: Date.now()
                }
            }
        };
    }
    async runSubagent(agent, prompt, childSessionID) {
        if (this.config.runSubagent) {
            return this.config.runSubagent(agent, prompt, childSessionID);
        }
        const currentDepth = this.config.subagentDepth ?? 0;
        const maxDepth = this.config.maxSubagentDepth ?? 2;
        if (currentDepth >= maxDepth) {
            return {
                sessionID: childSessionID,
                output: '',
                parts: [],
                error: 'Maximum subagent depth reached'
            };
        }
        const childRuntime = new Runtime(this.provider, this.toolExecutors, {
            ...this.config,
            subagentDepth: currentDepth + 1
        });
        const parentAbortSignal = this.state?.abortController.signal;
        const abortChild = ()=>childRuntime.abort();
        parentAbortSignal?.addEventListener('abort', abortChild, {
            once: true
        });
        const childMessageID = (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$harness$2f$identifier$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["ascending"])('msg_');
        const childUserMessage = {
            id: childMessageID,
            sessionID: childSessionID,
            role: 'user',
            time: {
                created: Date.now()
            },
            parts: [
                {
                    id: (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$harness$2f$identifier$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["ascending"])('part_'),
                    messageID: childMessageID,
                    sessionID: childSessionID,
                    type: 'text',
                    text: prompt
                }
            ],
            agent: agent.name,
            ...agent.prompt ? {
                system: agent.prompt
            } : {}
        };
        let output = '';
        let usage;
        let error;
        try {
            for await (const event of childRuntime.run(childSessionID, childUserMessage)){
                if (event.type === 'text' && event.content) {
                    output += event.content;
                }
                if (event.type === 'complete' && event.usage) {
                    usage = {
                        promptTokens: event.usage.input,
                        completionTokens: event.usage.output,
                        totalTokens: event.usage.input + event.usage.output + (event.usage.reasoning ?? 0)
                    };
                }
                if (event.type === 'error' && event.error) {
                    error = event.error;
                }
            }
        } finally{
            parentAbortSignal?.removeEventListener('abort', abortChild);
        }
        return {
            sessionID: childSessionID,
            output,
            parts: [],
            usage,
            error
        };
    }
    /**
   * Perform context compaction
   */ async *performCompaction(_agent) {
        if (!this.state) return false;
        yield {
            type: 'compaction',
            content: 'Compacting context...'
        };
        const compactionPromise = __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$harness$2f$compaction$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["compaction"].compact(this.state.sessionID, this.state.messages, 128000, async (messages)=>{
            // Build conversation text for summarization
            const content = messages.map((m)=>{
                if (m.role === 'user') {
                    return `User: ${m.parts.map((p)=>p.type === 'text' ? p.text : '').join(' ')}`;
                }
                if (m.role === 'assistant') {
                    return `Assistant: ${m.parts.map((p)=>p.type === 'text' ? p.text : '').join(' ')}`;
                }
                return '';
            }).join('\n\n');
            // Use LLM for intelligent summarization instead of naive truncation
            const model = _agent.model ?? this.provider.config.defaultModel ?? 'gpt-4o-mini';
            const summaryMessages = [
                {
                    role: 'user',
                    content: `${__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$harness$2f$compaction$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["SUMMARIZATION_PROMPT"]}\n\n${content}`
                }
            ];
            try {
                const completionOptions = {
                    model,
                    messages: summaryMessages,
                    temperature: 0.3,
                    maxTokens: 2000
                };
                const result = await this.provider.complete(completionOptions);
                return result.message.content || `Summary of conversation:\n\n${content.slice(0, 4000)}`;
            } catch (error) {
                // Fallback to naive truncation if LLM summarization fails
                console.warn('LLM compaction failed, falling back to truncation:', error);
                return `Summary of conversation:\n\n${content.slice(0, 4000)}`;
            }
        });
        const compactionBudgetMs = this.config.compactionTimeBudgetMs;
        const compactionOutcome = await this.raceWithTimeout(compactionPromise, compactionBudgetMs);
        if (compactionOutcome.timedOut) {
            yield {
                type: 'compaction',
                content: `Compaction budget exceeded (${compactionBudgetMs}ms); ` + 'deferring compaction and continuing step'
            };
            return false;
        }
        const result = compactionOutcome.value;
        if (!result.error) {
            if (result.messages) {
                this.state.messages = result.messages;
            }
            yield {
                type: 'compaction',
                content: `Compacted ${result.messagesCompacted} messages (${result.tokensBefore} → ${result.tokensAfter} tokens)`
            };
        }
        return true;
    }
    async *captureStepSnapshot(_agent, messageID) {
        if (!this.state || !this.config.enableSnapshots) return;
        const timeoutMs = this.config.snapshotTimeoutMs;
        const failureMode = this.config.snapshotFailureMode ?? 'warn';
        try {
            const outcome = await this.raceWithTimeout(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$harness$2f$snapshots$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["snapshots"].track(this.state.sessionID, messageID, this.state.step), timeoutMs);
            if (outcome.timedOut) {
                const timeoutError = new Error(`Snapshot timeout after ${timeoutMs}ms`);
                if (failureMode === 'error') {
                    throw timeoutError;
                }
                yield {
                    type: 'status',
                    content: `Snapshot warning: ${timeoutError.message}; continuing without snapshot`
                };
                return;
            }
            if (outcome.value) {
                yield {
                    type: 'snapshot',
                    content: `Step ${outcome.value.step} snapshot created`,
                    snapshot: {
                        hash: outcome.value.hash,
                        step: outcome.value.step,
                        files: outcome.value.files,
                        timestamp: outcome.value.timestamp
                    }
                };
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Snapshot failed';
            if (failureMode === 'error') {
                throw error;
            }
            yield {
                type: 'status',
                content: `Snapshot warning: ${errorMessage}; continuing without snapshot`
            };
        }
    }
    async raceWithTimeout(promise, timeoutMs) {
        if (typeof timeoutMs !== 'number') {
            return {
                timedOut: false,
                value: await promise
            };
        }
        let timer;
        const timeoutPromise = new Promise((resolve)=>{
            timer = setTimeout(()=>resolve({
                    timedOut: true
                }), timeoutMs);
        });
        // Prevent late rejections from timed-out work from becoming unhandled.
        void promise.catch(()=>undefined);
        try {
            const result = await Promise.race([
                promise.then((value)=>({
                        timedOut: false,
                        value
                    })),
                timeoutPromise
            ]);
            return result;
        } finally{
            if (timer) clearTimeout(timer);
        }
    }
    /**
   * Build completion messages from state
   */ buildCompletionMessages(isLastStep) {
        if (!this.state) return [];
        const messages = [];
        const latestUserWithSystem = [
            ...this.state.messages
        ].reverse().find((msg)=>msg.role === 'user' && typeof msg.system === 'string');
        if (latestUserWithSystem?.system) {
            messages.push({
                role: 'system',
                content: latestUserWithSystem.system
            });
        }
        for (const msg of this.state.messages){
            if (msg.role === 'user') {
                const content = msg.parts.map((p)=>{
                    if (p.type === 'text') return p.text;
                    if (p.type === 'compaction' && p.summary) {
                        return `[Previous conversation summary]\n${p.summary}`;
                    }
                    return '';
                }).filter(Boolean).join('\n');
                if (content) {
                    messages.push({
                        role: 'user',
                        content
                    });
                }
            } else if (msg.role === 'assistant') {
                const content = msg.parts.map((p)=>{
                    if (p.type === 'text') return p.text;
                    if (p.type === 'reasoning') return `<thinking>${p.text}</thinking>`;
                    return '';
                }).filter(Boolean).join('\n');
                const toolCalls = msg.parts.filter((p)=>p.type === 'tool').filter((p)=>p.state.status === 'completed' || p.state.status === 'error').map((p)=>({
                        id: (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$harness$2f$identifier$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["ascending"])('tc_'),
                        type: 'function',
                        function: {
                            name: p.tool,
                            arguments: JSON.stringify(p.state.input)
                        }
                    }));
                if (content || toolCalls.length > 0) {
                    const assistantMsg = {
                        role: 'assistant',
                        content: content || ' '
                    };
                    if (toolCalls.length > 0) {
                        assistantMsg.tool_calls = toolCalls;
                    }
                    messages.push(assistantMsg);
                    for (const tc of toolCalls){
                        const toolPart = msg.parts.find((p)=>p.type === 'tool' && p.tool === tc.function.name);
                        if (toolPart && (toolPart.state.status === 'completed' || toolPart.state.status === 'error')) {
                            const state = toolPart.state;
                            messages.push({
                                role: 'tool',
                                content: state.error || state.output || '',
                                tool_call_id: tc.id
                            });
                        }
                    }
                }
            }
        }
        if (isLastStep) {
            messages.push({
                role: 'user',
                content: 'You have reached the maximum number of steps. Please provide a final summary of what was accomplished and what remains to be done. Do not make any more tool calls.'
            });
        }
        return messages;
    }
    /**
   * Get tools available for an agent
   */ getToolsForAgent(agent) {
        const allTools = [
            ...__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$tools$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["AGENT_TOOLS"],
            ...(0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$harness$2f$task$2d$tool$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getTaskToolDefinitions"])(),
            ...__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$harness$2f$plugins$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["plugins"].getTools()
        ];
        const byName = new Map();
        for (const tool of allTools){
            byName.set(tool.function.name, tool);
        }
        return Array.from(byName.values()).filter((tool)=>{
            const decision = (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$harness$2f$permissions$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["checkPermission"])(agent.permission, tool.function.name);
            return decision !== 'deny';
        });
    }
    /**
   * Extract pattern for permission checking
   */ extractPatterns(toolName, args) {
        if (toolName === 'read_files' || toolName === 'write_files') {
            if (Array.isArray(args.paths)) {
                return args.paths.map((value)=>String(value)).filter(Boolean);
            }
            if (Array.isArray(args.files)) {
                return args.files.map((f)=>String(f.path ?? '')).filter(Boolean);
            }
        }
        if (toolName === 'list_directory' && typeof args.path === 'string') {
            return [
                args.path
            ];
        }
        if (toolName === 'run_command') {
            return [
                String(args.command ?? '')
            ];
        }
        return [
            ''
        ];
    }
    classifyToolRisk(toolName, args) {
        const override = this.config.toolRiskOverrides?.[toolName];
        if (override) return override;
        if (toolName === 'run_command') {
            const analysis = (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$command$2d$analysis$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["analyzeCommand"])(String(args.command ?? ''));
            if (analysis.kind === 'pipeline' && !analysis.requiresApproval) return 'low';
            if (analysis.kind === 'chain') return 'high';
            if (analysis.kind === 'redirect') return 'critical';
            return 'critical';
        }
        if (toolName === 'write_files') return 'high';
        if (toolName === 'update_memory_bank') return 'medium';
        if (toolName === 'task') return 'high';
        if (toolName.startsWith('search_') || toolName === 'read_files' || toolName === 'list_directory') {
            return 'low';
        }
        return 'medium';
    }
    resolveRiskPolicyDecision(toolName, riskTier) {
        const explicit = this.config.toolRiskPolicy?.[riskTier];
        if (explicit) return explicit;
        // Conservative defaults only for highest-risk operations, preserving current behavior elsewhere.
        if (toolName === 'run_command') return 'ask';
        if (toolName === 'write_files') return 'ask';
        return 'allow';
    }
    async *requestToolInterrupt(request) {
        yield {
            type: 'interrupt_request',
            content: request.reason,
            interrupt: {
                toolName: request.toolName,
                riskTier: request.riskTier,
                reason: request.reason
            }
        };
        const handler = this.config.onToolInterrupt;
        if (!handler) {
            yield {
                type: 'interrupt_decision',
                content: `No interrupt handler configured for ${request.toolName}; proceeding to standard permissions`,
                interrupt: {
                    toolName: request.toolName,
                    riskTier: request.riskTier,
                    decision: 'approve',
                    reason: 'No interrupt handler configured'
                }
            };
            return {
                approved: true,
                args: request.args
            };
        }
        let result;
        try {
            result = await handler(request);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Interrupt handler failed';
            yield {
                type: 'interrupt_decision',
                content: `Interrupt rejected ${request.toolName}: ${errorMessage}`,
                interrupt: {
                    toolName: request.toolName,
                    riskTier: request.riskTier,
                    decision: 'reject',
                    reason: errorMessage
                }
            };
            yield {
                ...this.createToolResultEvent({
                    toolCallId: request.toolCallId ?? request.messageID,
                    toolName: request.toolName,
                    args: request.args,
                    output: '',
                    error: `Interrupted: ${errorMessage}`
                })
            };
            return {
                approved: false,
                args: request.args,
                error: `Interrupted: ${errorMessage}`
            };
        }
        const decision = result.decision;
        if (decision === 'reject') {
            const error = `Interrupted: ${result.reason ?? 'Rejected by user'}`;
            yield {
                type: 'interrupt_decision',
                content: error,
                interrupt: {
                    toolName: request.toolName,
                    riskTier: request.riskTier,
                    decision,
                    reason: result.reason
                }
            };
            yield this.createToolResultEvent({
                toolCallId: request.toolCallId ?? request.messageID,
                toolName: request.toolName,
                args: request.args,
                output: '',
                error
            });
            return {
                approved: false,
                args: request.args,
                error
            };
        }
        const nextArgs = decision === 'edit' && result.args ? result.args : request.args;
        yield {
            type: 'interrupt_decision',
            content: decision === 'edit' ? `Interrupt edited arguments for ${request.toolName}` : `Interrupt approved ${request.toolName}`,
            interrupt: {
                toolName: request.toolName,
                riskTier: request.riskTier,
                decision,
                reason: result.reason
            }
        };
        return {
            approved: true,
            args: nextArgs
        };
    }
    isToolRetryAllowed(toolName) {
        return ![
            'write_files',
            'run_command',
            'task',
            'update_memory_bank'
        ].includes(toolName);
    }
    isToolIdempotencyCacheAllowed(toolName) {
        return ![
            'write_files',
            'run_command',
            'task',
            'update_memory_bank'
        ].includes(toolName);
    }
    createToolResultEvent(args) {
        const finishedAt = args.finishedAt ?? Date.now();
        const startedAt = args.startedAt ?? finishedAt;
        return {
            type: 'tool_result',
            toolResult: {
                toolCallId: args.toolCallId,
                toolName: args.toolName,
                args: args.args,
                output: args.output,
                ...args.error ? {
                    error: args.error
                } : {},
                durationMs: Math.max(0, finishedAt - startedAt)
            }
        };
    }
    isRetryableToolError(errorMessage) {
        const message = errorMessage.toLowerCase();
        return message.includes('timeout') || message.includes('timed out') || message.includes('econnreset') || message.includes('eai_again') || message.includes('temporar') || message.includes('429') || message.includes('rate limit');
    }
    async sleep(ms) {
        if (ms <= 0) return;
        await new Promise((resolve)=>setTimeout(resolve, ms));
    }
    createToolCallDedupKey(toolName, args) {
        return `${toolName}:${this.normalizeToolArgs(args)}`;
    }
    normalizeToolArgs(value) {
        if (value === null || typeof value !== 'object') {
            return JSON.stringify(value);
        }
        if (Array.isArray(value)) {
            return `[${value.map((item)=>this.normalizeToolArgs(item)).join(',')}]`;
        }
        const entries = Object.entries(value).sort(([a], [b])=>a.localeCompare(b));
        return `{${entries.map(([key, entryValue])=>`${JSON.stringify(key)}:${this.normalizeToolArgs(entryValue)}`).join(',')}}`;
    }
    applyToolLoopGuard(toolKeysForStep) {
        if (!this.state) return {
            triggered: false,
            warned: false
        };
        const threshold = this.config.toolLoopThreshold;
        if (typeof threshold !== 'number' || threshold <= 0) return {
            triggered: false,
            warned: false
        };
        // Track per-tool-call frequency across session
        for (const key of toolKeysForStep){
            const currentFreq = this.state.toolCallFrequency.get(key) ?? 0;
            this.state.toolCallFrequency.set(key, currentFreq + 1);
        }
        // Add to sliding window history
        const signature = toolKeysForStep.join('\x1f');
        this.state.toolCallHistory.push(signature);
        // Keep only recent history for pattern detection (sliding window)
        const windowSize = threshold * 4 // Allow for some variation
        ;
        if (this.state.toolCallHistory.length > windowSize) {
            this.state.toolCallHistory.shift();
        }
        // Check for cyclic pattern detection (A→B→A→B pattern)
        if (this.detectCyclicPattern()) {
            const shouldWarn = this.shouldWarnAboutDoomLoop();
            if (shouldWarn) {
                return {
                    triggered: false,
                    warned: true
                };
            }
            return {
                triggered: this.handleDoomLoop(toolKeysForStep),
                warned: false
            };
        }
        if (toolKeysForStep.length === 0) {
            this.state.lastToolLoopSignature = null;
            this.state.toolLoopStreak = 0;
            return {
                triggered: false,
                warned: false
            };
        }
        if (this.state.lastToolLoopSignature === signature) {
            const nextStreak = this.state.toolLoopStreak + 1;
            // Progressive intervention: warn at threshold - 1
            if (nextStreak === threshold - 1 && this.shouldWarnAboutDoomLoop()) {
                return {
                    triggered: false,
                    warned: true
                };
            }
            if (nextStreak > threshold) {
                return {
                    triggered: this.handleDoomLoop(toolKeysForStep),
                    warned: false
                };
            }
            this.state.toolLoopStreak = nextStreak;
            return {
                triggered: false,
                warned: false
            };
        }
        this.state.lastToolLoopSignature = signature;
        this.state.toolLoopStreak = 1;
        return {
            triggered: false,
            warned: false
        };
    }
    /**
   * Check if we should warn the LLM about potential doom loop
   * Only warn once per intervention point
   */ shouldWarnAboutDoomLoop() {
        if (!this.state) return false;
        const currentStep = this.state.step;
        // Only warn if we haven't warned in this step already
        if (currentStep === this.state.lastInterventionStep) {
            return false;
        }
        this.state.lastInterventionStep = currentStep;
        return true;
    }
    /**
   * Detect cyclic patterns like A→B→A→B in tool call history
   */ detectCyclicPattern() {
        if (!this.state) return false;
        const history = this.state.toolCallHistory;
        const threshold = this.config.toolLoopThreshold ?? 3;
        // Need at least 4 entries to detect a cycle (A→B→A→B)
        if (history.length < 4) return false;
        // Check for A→B→A→B pattern in recent history
        const recent = history.slice(-4);
        const [a, b, c, d] = recent;
        if (a === c && b === d && a !== b) {
            // Detected A→B→A→B pattern
            const toolFreq = this.state.toolCallFrequency;
            const toolNames = a?.split('\x1f').map((k)=>k.split(':')[0]) ?? [];
            // Only flag if tools are being called frequently
            const highFreqTools = toolNames.filter((name)=>{
                let count = 0;
                for (const [key, freq] of toolFreq){
                    if (key.startsWith(`${name}:`) && freq > threshold) {
                        count++;
                    }
                }
                return count > 0;
            });
            return highFreqTools.length > 0;
        }
        return false;
    }
    /**
   * Handle doom loop detection - returns true to indicate hard stop
   */ handleDoomLoop(_toolKeysForStep) {
        // Always hard stop when doom loop is detected
        return true;
    }
    serializeStateForCheckpoint() {
        if (!this.state) return null;
        return {
            sessionID: this.state.sessionID,
            messages: structuredClone(this.state.messages),
            step: this.state.step,
            isComplete: this.state.isComplete,
            isLastStep: this.state.isLastStep,
            pendingSubtasks: structuredClone(this.state.pendingSubtasks),
            cost: this.state.cost,
            tokens: {
                ...this.state.tokens
            },
            lastToolLoopSignature: this.state.lastToolLoopSignature,
            toolLoopStreak: this.state.toolLoopStreak,
            toolCallHistory: this.state.toolCallHistory,
            toolCallFrequency: Array.from(this.state.toolCallFrequency.entries()).map(([key, count])=>({
                    key,
                    count
                })),
            cyclicPatternDetected: this.state.cyclicPatternDetected,
            lastInterventionStep: this.state.lastInterventionStep
        };
    }
    restoreStateFromCheckpoint(checkpointState) {
        return {
            sessionID: checkpointState.sessionID,
            messages: structuredClone(checkpointState.messages),
            step: checkpointState.step,
            isComplete: checkpointState.isComplete,
            isLastStep: checkpointState.isLastStep,
            abortController: new AbortController(),
            pendingSubtasks: structuredClone(checkpointState.pendingSubtasks),
            cost: checkpointState.cost,
            tokens: {
                ...checkpointState.tokens
            },
            lastToolLoopSignature: checkpointState.lastToolLoopSignature,
            toolLoopStreak: checkpointState.toolLoopStreak,
            toolCallHistory: checkpointState.toolCallHistory ?? [],
            toolCallFrequency: new Map(normalizeCheckpointToolCallFrequency(checkpointState.toolCallFrequency).map(({ key, count })=>[
                    key,
                    count
                ])),
            cyclicPatternDetected: checkpointState.cyclicPatternDetected ?? false,
            lastInterventionStep: checkpointState.lastInterventionStep ?? 0
        };
    }
    async saveCheckpoint(agentName, reason) {
        const checkpointStore = this.config.checkpointStore;
        if (!checkpointStore) return;
        const state = this.serializeStateForCheckpoint();
        if (!state) return;
        const checkpoint = {
            version: 1,
            sessionID: state.sessionID,
            agentName,
            reason,
            savedAt: Date.now(),
            state
        };
        await checkpointStore.save(checkpoint);
    }
    /**
   * Map provider finish reason to our finish reason
   */ mapFinishReason(reason) {
        switch(reason){
            case 'stop':
                return 'stop';
            case 'length':
                return 'length';
            case 'tool_calls':
            case 'tool-calls':
                return 'tool-calls';
            case 'content_filter':
                return 'content-filter';
            case 'error':
                return 'error';
            default:
                return 'unknown';
        }
    }
    /**
   * Execute a plugin hook
   */ async executeHook(hookType, context, data) {
        return __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$harness$2f$plugins$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["plugins"].executeHooks(hookType, context, data);
    }
    /**
   * Verify and finalize the active specification
   */ async *verifyAndFinalizeSpec(sessionID, agent) {
        if (!this.state?.activeSpec) return;
        const spec = this.state.activeSpec;
        // Gather execution results
        const executionResults = {
            filesModified: this.gatherModifiedFiles(),
            commandsRun: this.gatherCommandsRun(),
            errors: this.gatherErrors(),
            output: this.gatherOutput()
        };
        // Execute verification
        const verification = await this.specEngine.verify(spec, executionResults);
        await this.executeHook('spec.verify', {
            sessionID,
            step: this.state.step,
            agent,
            messageID: ''
        }, verification);
        // Update spec status based on verification
        if (verification.passed) {
            this.state.activeSpec = this.specEngine.markVerified(spec, verification.criterionResults);
        } else {
            this.state.activeSpec = this.specEngine.markFailed(spec, verification.summary);
        }
        await this.executeHook('spec.execute.after', {
            sessionID,
            step: this.state.step,
            agent,
            messageID: ''
        }, {
            spec: this.state.activeSpec,
            verification
        });
        // Yield verification event
        yield {
            type: 'spec_verification',
            spec: this.state.activeSpec,
            verification: {
                passed: verification.passed,
                results: verification.criterionResults.map((r)=>({
                        criterionId: r.criterionId,
                        passed: r.passed,
                        message: r.message
                    }))
            }
        };
    }
    /**
   * Gather modified files from tool calls
   */ gatherModifiedFiles() {
        if (!this.state) return [];
        const modifiedFiles = [];
        for (const message of this.state.messages){
            if (message.role === 'assistant') {
                for (const part of message.parts){
                    if (part.type === 'tool' && part.state.status === 'completed') {
                        // Extract file paths from tool calls
                        const input = part.state.input;
                        if (input) {
                            if (Array.isArray(input.paths)) {
                                modifiedFiles.push(...input.paths.map((p)=>String(p)));
                            }
                            if (Array.isArray(input.files)) {
                                modifiedFiles.push(...input.files.map((f)=>f.path || '').filter(Boolean));
                            }
                            if (typeof input.path === 'string') {
                                modifiedFiles.push(input.path);
                            }
                            if (typeof input.file_path === 'string') {
                                modifiedFiles.push(input.file_path);
                            }
                        }
                    }
                }
            }
        }
        return [
            ...new Set(modifiedFiles)
        ];
    }
    /**
   * Gather commands run from tool calls
   */ gatherCommandsRun() {
        if (!this.state) return [];
        const commands = [];
        for (const message of this.state.messages){
            if (message.role === 'assistant') {
                for (const part of message.parts){
                    if (part.type === 'tool' && part.tool === 'run_command') {
                        const input = part.state.input;
                        if (input?.command) {
                            commands.push(input.command);
                        }
                    }
                }
            }
        }
        return commands;
    }
    /**
   * Gather errors from execution
   */ gatherErrors() {
        if (!this.state) return [];
        const errors = [];
        for (const message of this.state.messages){
            if (message.role === 'assistant') {
                for (const part of message.parts){
                    if (part.type === 'tool' && part.state.status === 'error') {
                        const errorState = part.state;
                        if (errorState.error) {
                            errors.push(errorState.error);
                        }
                    }
                }
            }
        }
        return errors;
    }
    /**
   * Gather output from assistant messages
   */ gatherOutput() {
        if (!this.state) return '';
        const outputs = [];
        for (const message of this.state.messages){
            if (message.role === 'assistant') {
                for (const part of message.parts){
                    if (part.type === 'text') {
                        outputs.push(part.text);
                    }
                }
            }
        }
        return outputs.join('\n');
    }
    /**
   * Abort the current execution
   */ abort() {
        if (this.state) {
            this.state.abortController.abort();
            this.state.isComplete = true;
        }
    }
}
function createRuntime(provider, toolExecutors, config) {
    return new Runtime(provider, toolExecutors, config);
}
}),
"[project]/apps/web/lib/agent/harness/mcp.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * MCP (Model Context Protocol) Support
 *
 * Implements OpenCode-style MCP integration for external tool servers.
 * Allows connecting to local or remote MCP servers to extend capabilities.
 */ __turbopack_context__.s([
    "MCPManager",
    ()=>MCPManager,
    "mcp",
    ()=>mcp
]);
/**
 * In-memory MCP client implementation (for testing/stub)
 */ class InMemoryMCPClient {
    serverID;
    isConnected = true;
    tools = [];
    resources = [];
    constructor(config){
        this.serverID = config.id;
    }
    async listTools() {
        return this.tools;
    }
    async listResources() {
        return this.resources;
    }
    async callTool(name, args) {
        return {
            content: `MCP tool "${name}" called with args: ${JSON.stringify(args)}`
        };
    }
    async readResource(uri) {
        return {
            contents: `Resource content for ${uri}`
        };
    }
    async close() {
        this.isConnected = false;
    }
}
/**
 * HTTP/SSE MCP client implementation (best-effort remote transport).
 *
 * Supports common proxy shapes:
 * - GET  {baseUrl}/tools
 * - GET  {baseUrl}/resources
 * - POST {baseUrl}/tools/call
 * - POST {baseUrl}/resources/read
 */ class RemoteMCPClient {
    config;
    fetchImpl;
    serverID;
    isConnected;
    constructor(config, fetchImpl){
        this.config = config;
        this.fetchImpl = fetchImpl;
        this.isConnected = true;
        this.serverID = config.id;
    }
    get baseUrl() {
        if (!this.config.url) {
            throw new Error(`MCP server "${this.serverID}" is missing a URL`);
        }
        return this.config.url.replace(/\/+$/, '');
    }
    async getJson(path) {
        const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
            method: 'GET',
            headers: {
                Accept: 'application/json'
            }
        });
        if (!response.ok) {
            throw new Error(`HTTP ${response.status} for ${path}`);
        }
        return await response.json();
    }
    async postJson(path, body) {
        const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json'
            },
            body: JSON.stringify(body)
        });
        if (!response.ok) {
            throw new Error(`HTTP ${response.status} for ${path}`);
        }
        return await response.json();
    }
    async listTools() {
        const payload = await this.getJson('/tools');
        if (Array.isArray(payload)) return payload;
        return Array.isArray(payload.tools) ? payload.tools : [];
    }
    async listResources() {
        const payload = await this.getJson('/resources');
        if (Array.isArray(payload)) return payload;
        return Array.isArray(payload.resources) ? payload.resources : [];
    }
    async callTool(name, args) {
        const payload = await this.postJson('/tools/call', {
            name,
            args
        });
        if (payload && typeof payload === 'object' && ('content' in payload || 'isError' in payload || 'error' in payload)) {
            const record = payload;
            if (typeof record.error === 'string') {
                return {
                    content: record.error,
                    isError: true
                };
            }
            return {
                content: record.content ?? record.result ?? null,
                isError: record.isError === true
            };
        }
        return {
            content: payload
        };
    }
    async readResource(uri) {
        const payload = await this.postJson('/resources/read', {
            uri
        });
        if (payload && typeof payload === 'object') {
            const record = payload;
            return {
                contents: record.contents ?? record.content ?? null
            };
        }
        return {
            contents: payload
        };
    }
    async close() {
        this.isConnected = false;
    }
}
class StdioBridgeMCPClient {
    bridge;
    serverID;
    isConnected;
    constructor(config, bridge){
        this.bridge = bridge;
        this.isConnected = true;
        this.serverID = config.id;
    }
    listTools() {
        return this.bridge.listTools();
    }
    listResources() {
        return this.bridge.listResources();
    }
    callTool(name, args) {
        return this.bridge.callTool(name, args);
    }
    readResource(uri) {
        return this.bridge.readResource(uri);
    }
    async close() {
        this.isConnected = false;
        await this.bridge.close();
    }
}
/**
 * MCP Manager - manages connections to MCP servers
 */ class MCPManager {
    clients = new Map();
    configs = new Map();
    fetchImpl;
    stdioBridgeFactory;
    constructor(options){
        this.fetchImpl = options?.fetchImpl ?? (typeof fetch === 'function' ? fetch.bind(globalThis) : null);
        this.stdioBridgeFactory = options?.stdioBridgeFactory ?? null;
    }
    /**
   * Register an MCP server configuration
   */ registerServer(config) {
        this.configs.set(config.id, config);
    }
    /**
   * Connect to an MCP server
   */ async connect(serverID) {
        const existing = this.clients.get(serverID);
        if (existing?.isConnected) {
            return existing;
        }
        const config = this.configs.get(serverID);
        if (!config) {
            throw new Error(`MCP server "${serverID}" not configured`);
        }
        const client = await this.createClient(config);
        this.clients.set(serverID, client);
        return client;
    }
    normalizeTransport(config) {
        if (config.transport) return config.transport;
        if (config.url) return 'sse';
        if (config.command) return 'stdio';
        return 'inmemory';
    }
    async createClient(config) {
        const transport = this.normalizeTransport(config);
        if (transport === 'inmemory') {
            return new InMemoryMCPClient(config);
        }
        if (transport === 'sse' || transport === 'http') {
            if (!this.fetchImpl) {
                throw new Error('Fetch is not available for remote MCP transport');
            }
            if (!config.url) {
                throw new Error('Remote MCP transport requires a URL');
            }
            return new RemoteMCPClient(config, this.fetchImpl);
        }
        if (transport === 'stdio') {
            if (!this.stdioBridgeFactory) {
                throw new Error('stdio MCP transport requires a server-side bridge factory (not available in browser runtime)');
            }
            const bridge = await this.stdioBridgeFactory(config);
            return new StdioBridgeMCPClient(config, bridge);
        }
        return new InMemoryMCPClient(config);
    }
    async testConnection(serverID) {
        const config = this.configs.get(serverID);
        if (!config) return {
            ok: false,
            transport: 'unknown',
            error: 'Server not configured'
        };
        const transport = this.normalizeTransport(config);
        try {
            const client = await this.connect(serverID);
            const [tools, resources] = await Promise.all([
                client.listTools(),
                client.listResources()
            ]);
            return {
                ok: true,
                transport,
                toolCount: tools.length,
                resourceCount: resources.length
            };
        } catch (error) {
            return {
                ok: false,
                transport,
                error: error instanceof Error ? error.message : 'Unknown MCP connection error'
            };
        }
    }
    /**
   * Disconnect from an MCP server
   */ async disconnect(serverID) {
        const client = this.clients.get(serverID);
        if (client) {
            await client.close();
            this.clients.delete(serverID);
        }
    }
    /**
   * Get all tools from all connected MCP servers
   */ async getAllTools() {
        const allTools = [];
        for (const client of this.clients.values()){
            if (client.isConnected) {
                const tools = await client.listTools();
                allTools.push(...tools);
            }
        }
        return allTools;
    }
    /**
   * Get all resources from all connected MCP servers
   */ async getAllResources() {
        const allResources = [];
        for (const client of this.clients.values()){
            if (client.isConnected) {
                const resources = await client.listResources();
                allResources.push(...resources);
            }
        }
        return allResources;
    }
    /**
   * Execute a tool on an MCP server
   */ async executeTool(serverID, toolName, args) {
        const client = this.clients.get(serverID);
        if (!client || !client.isConnected) {
            try {
                await this.connect(serverID);
            } catch (error) {
                return {
                    output: '',
                    error: `Failed to connect to MCP server "${serverID}": ${error instanceof Error ? error.message : 'Unknown error'}`
                };
            }
        }
        const connectedClient = this.clients.get(serverID);
        if (!connectedClient) {
            return {
                output: '',
                error: `MCP server "${serverID}" not connected`
            };
        }
        try {
            const result = await connectedClient.callTool(toolName, args);
            if (result.isError) {
                return {
                    output: '',
                    error: typeof result.content === 'string' ? result.content : JSON.stringify(result.content)
                };
            }
            return {
                output: typeof result.content === 'string' ? result.content : JSON.stringify(result.content, null, 2)
            };
        } catch (error) {
            return {
                output: '',
                error: error instanceof Error ? error.message : 'Unknown error executing MCP tool'
            };
        }
    }
    /**
   * Read a resource from an MCP server
   */ async readResource(serverID, uri) {
        const client = this.clients.get(serverID);
        if (!client || !client.isConnected) {
            return {
                content: null,
                error: `MCP server "${serverID}" not connected`
            };
        }
        try {
            const result = await client.readResource(uri);
            return {
                content: result.contents
            };
        } catch (error) {
            return {
                content: null,
                error: error instanceof Error ? error.message : 'Unknown error reading MCP resource'
            };
        }
    }
    /**
   * List all configured servers
   */ listServers() {
        return Array.from(this.configs.values());
    }
    /**
   * List all connected servers
   */ listConnected() {
        return Array.from(this.clients.entries()).filter(([_, client])=>client.isConnected).map(([id])=>id);
    }
    getServerStatus(serverID) {
        const config = this.configs.get(serverID);
        return {
            configured: !!config,
            connected: this.clients.get(serverID)?.isConnected === true,
            transport: config ? this.normalizeTransport(config) : undefined
        };
    }
    /**
   * Disconnect from all servers
   */ async disconnectAll() {
        for (const [id] of this.clients){
            await this.disconnect(id);
        }
    }
}
const mcp = new MCPManager();
;
}),
"[project]/apps/web/lib/agent/harness/evals.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "buildEvalScorecard",
    ()=>buildEvalScorecard,
    "containsTextScorer",
    ()=>containsTextScorer,
    "exactMatchScorer",
    ()=>exactMatchScorer,
    "normalizedTextExactScorer",
    ()=>normalizedTextExactScorer,
    "regexTextScorer",
    ()=>regexTextScorer,
    "runEvalSuite",
    ()=>runEvalSuite
]);
function exactMatchScorer() {
    return (scenario, output)=>{
        const passed = Object.is(output.output, scenario.expected);
        return {
            passed,
            score: passed ? 1 : 0,
            reason: passed ? 'exact-match' : 'exact-match-failed'
        };
    };
}
function containsTextScorer() {
    return (scenario, output)=>{
        const expected = typeof scenario.expected === 'string' ? scenario.expected : '';
        const actual = typeof output.output === 'string' ? output.output : JSON.stringify(output.output);
        const passed = expected.length > 0 && actual.includes(expected);
        return {
            passed,
            score: passed ? 1 : 0,
            reason: passed ? 'contains-match' : 'contains-miss'
        };
    };
}
function regexTextScorer(flags = 'i') {
    return (scenario, output)=>{
        const pattern = typeof scenario.expected === 'string' ? scenario.expected : '';
        if (!pattern) return {
            passed: false,
            score: 0,
            reason: 'regex-pattern-missing'
        };
        try {
            const regex = new RegExp(pattern, flags);
            const actual = typeof output.output === 'string' ? output.output : JSON.stringify(output.output, null, 2);
            const passed = regex.test(actual);
            return {
                passed,
                score: passed ? 1 : 0,
                reason: passed ? 'regex-match' : 'regex-miss'
            };
        } catch (error) {
            return {
                passed: false,
                score: 0,
                reason: error instanceof Error ? `regex-invalid:${error.message}` : 'regex-invalid'
            };
        }
    };
}
function normalizedTextExactScorer() {
    return (scenario, output)=>{
        const normalize = (value)=>String(typeof value === 'string' ? value : JSON.stringify(value)).replace(/\s+/g, ' ').trim().toLowerCase();
        const expected = normalize(scenario.expected ?? '');
        const actual = normalize(output.output);
        const passed = expected.length > 0 && expected === actual;
        return {
            passed,
            score: passed ? 1 : 0,
            reason: passed ? 'normalized-exact-match' : 'normalized-exact-miss'
        };
    };
}
async function runEvalSuite(options) {
    const startedAt = Date.now();
    const results = [];
    for (const scenario of options.scenarios){
        const caseStartedAt = Date.now();
        try {
            const runnerPromise = Promise.resolve(options.runner(scenario));
            const runnerOutput = await raceWithTimeout(runnerPromise, scenario.timeoutMs);
            if (runnerOutput.timedOut) {
                results.push({
                    scenarioId: scenario.id,
                    scenarioName: scenario.name,
                    status: 'error',
                    input: scenario.input,
                    expected: scenario.expected,
                    score: 0,
                    error: `Scenario timeout after ${scenario.timeoutMs}ms`,
                    tags: scenario.tags ?? [],
                    durationMs: Date.now() - caseStartedAt,
                    metadata: scenario.metadata
                });
                continue;
            }
            const score = await options.scorer(scenario, runnerOutput.value);
            results.push({
                scenarioId: scenario.id,
                scenarioName: scenario.name,
                status: score.passed ? 'passed' : 'failed',
                input: scenario.input,
                expected: scenario.expected,
                output: runnerOutput.value.output,
                score: clamp01(score.score),
                reason: score.reason,
                tags: scenario.tags ?? [],
                durationMs: Date.now() - caseStartedAt,
                metadata: mergeMetadata(scenario.metadata, runnerOutput.value.metadata)
            });
        } catch (error) {
            results.push({
                scenarioId: scenario.id,
                scenarioName: scenario.name,
                status: 'error',
                input: scenario.input,
                expected: scenario.expected,
                score: 0,
                error: error instanceof Error ? error.message : 'Eval runner failed',
                tags: scenario.tags ?? [],
                durationMs: Date.now() - caseStartedAt,
                metadata: scenario.metadata
            });
        }
    }
    const completedAt = Date.now();
    return {
        suiteId: options.suiteId,
        startedAt,
        completedAt,
        durationMs: completedAt - startedAt,
        results
    };
}
function buildEvalScorecard(report) {
    const total = report.results.length;
    const passed = report.results.filter((result)=>result.status === 'passed').length;
    const failed = report.results.filter((result)=>result.status === 'failed').length;
    const errored = report.results.filter((result)=>result.status === 'error').length;
    const averageScore = total === 0 ? 0 : report.results.reduce((sum, result)=>sum + result.score, 0) / total;
    const averageDurationMs = total === 0 ? 0 : report.results.reduce((sum, result)=>sum + result.durationMs, 0) / total;
    const byTag = {};
    for (const result of report.results){
        for (const tag of result.tags){
            const entry = byTag[tag] ?? {
                total: 0,
                passed: 0,
                failed: 0,
                errored: 0,
                averageScore: 0
            };
            entry.total += 1;
            if (result.status === 'passed') entry.passed += 1;
            if (result.status === 'failed') entry.failed += 1;
            if (result.status === 'error') entry.errored += 1;
            entry.averageScore += result.score;
            byTag[tag] = entry;
        }
    }
    for (const entry of Object.values(byTag)){
        entry.averageScore = entry.total === 0 ? 0 : entry.averageScore / entry.total;
    }
    return {
        suiteId: report.suiteId,
        total,
        passed,
        failed,
        errored,
        passRate: total === 0 ? 0 : passed / total,
        averageScore,
        averageDurationMs,
        byTag
    };
}
function clamp01(value) {
    if (!Number.isFinite(value)) return 0;
    if (value < 0) return 0;
    if (value > 1) return 1;
    return value;
}
function mergeMetadata(a, b) {
    if (!a && !b) return undefined;
    return {
        ...a ?? {},
        ...b ?? {}
    };
}
async function raceWithTimeout(promise, timeoutMs) {
    if (typeof timeoutMs !== 'number') {
        return {
            timedOut: false,
            value: await promise
        };
    }
    let timer;
    const timeoutPromise = new Promise((resolve)=>{
        timer = setTimeout(()=>resolve({
                timedOut: true
            }), timeoutMs);
    });
    void promise.catch(()=>undefined);
    try {
        return await Promise.race([
            promise.then((value)=>({
                    timedOut: false,
                    value
                })),
            timeoutPromise
        ]);
    } finally{
        if (timer) clearTimeout(timer);
    }
}
}),
"[project]/apps/web/lib/agent/harness/eval-templates.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "createEvalTemplateScenarios",
    ()=>createEvalTemplateScenarios
]);
function createEvalTemplateScenarios(template) {
    switch(template){
        case 'ask-smoke-exact':
            return [
                {
                    id: `tmpl-${Date.now()}-ask-exact`,
                    name: 'Ask mode exact response smoke',
                    input: 'Reply with exactly: PANDA_EVAL_OK',
                    mode: 'ask',
                    prompt: 'Reply with exactly: PANDA_EVAL_OK',
                    expected: 'PANDA_EVAL_OK',
                    tags: [
                        'template',
                        'smoke',
                        'ask',
                        'exact'
                    ]
                }
            ];
        case 'ask-smoke-contains':
            return [
                {
                    id: `tmpl-${Date.now()}-ask-contains`,
                    name: 'Ask mode contains keyword smoke',
                    input: 'Explain what this project does in one short sentence.',
                    mode: 'ask',
                    prompt: 'Explain what this project does in one short sentence.',
                    expected: 'panda',
                    tags: [
                        'template',
                        'smoke',
                        'ask',
                        'contains'
                    ]
                }
            ];
        case 'architect-plan-regex':
            return [
                {
                    id: `tmpl-${Date.now()}-architect-plan`,
                    name: 'Architect response resembles structured plan',
                    input: 'Give a 3-step plan to add logging to the app.',
                    mode: 'architect',
                    prompt: 'Give a 3-step plan to add logging to the app.',
                    expected: '(?s)(1\\.|- ).*(2\\.|- ).*(3\\.|- )',
                    tags: [
                        'template',
                        'architect',
                        'regex',
                        'plan'
                    ]
                }
            ];
        case 'code-readonly-regression':
            return [
                {
                    id: `tmpl-${Date.now()}-code-readonly`,
                    name: 'Code mode read-only eval should still analyze without writes',
                    input: 'Find where run progress events are rendered and summarize the component path.',
                    mode: 'code',
                    prompt: 'Find where run progress events are rendered and summarize the component path.',
                    expected: 'RunProgressPanel',
                    tags: [
                        'template',
                        'code',
                        'read-only',
                        'contains'
                    ]
                }
            ];
        default:
            return [];
    }
}
}),
"[project]/apps/web/lib/agent/harness/index.ts [app-ssr] (ecmascript) <locals>", ((__turbopack_context__) => {
"use strict";

/**
 * Agentic Harness - OpenCode-style agent system for Panda.ai
 *
 * Provider-agnostic agentic harness with:
 * - Multi-step reasoning with tool execution
 * - Subagent delegation for specialized tasks
 * - Context compaction for long conversations
 * - Permission-aware tool execution
 * - Plugin system for extensibility
 * - Real-time event streaming
 * - MCP (Model Context Protocol) support
 * - Git snapshot/undo capability
 */ __turbopack_context__.s([]);
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$harness$2f$identifier$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/lib/agent/harness/identifier.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$harness$2f$event$2d$bus$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/lib/agent/harness/event-bus.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$harness$2f$permissions$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/lib/agent/harness/permissions.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$harness$2f$agents$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/lib/agent/harness/agents.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$harness$2f$plugins$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/lib/agent/harness/plugins.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$harness$2f$compaction$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/lib/agent/harness/compaction.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$harness$2f$runtime$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/lib/agent/harness/runtime.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$harness$2f$task$2d$tool$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/lib/agent/harness/task-tool.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$harness$2f$mcp$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/lib/agent/harness/mcp.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$harness$2f$snapshots$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/lib/agent/harness/snapshots.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$harness$2f$evals$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/lib/agent/harness/evals.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$harness$2f$eval$2d$templates$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/lib/agent/harness/eval-templates.ts [app-ssr] (ecmascript)");
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
}),
"[project]/apps/web/lib/agents/registry.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * Agent Registry
 *
 * Manages subagent definitions and execution.
 * Supports built-in and custom agents for specialized tasks.
 */ __turbopack_context__.s([
    "AgentRegistry",
    ()=>AgentRegistry,
    "getAgent",
    ()=>getAgent,
    "getAgentRegistry",
    ()=>getAgentRegistry,
    "listAgents",
    ()=>listAgents,
    "listSubagents",
    ()=>listSubagents,
    "registerAgent",
    ()=>registerAgent,
    "resetAgentRegistry",
    ()=>resetAgentRegistry
]);
const BUILT_IN_AGENTS = [
    {
        id: 'build',
        name: 'Build',
        description: 'Full development work with all tools enabled',
        mode: 'primary',
        prompt: 'You are an expert software engineer. Write complete, working code.',
        temperature: 0.3,
        permissions: {
            tools: {
                '*': 'allow'
            },
            bash: {
                '*': 'allow'
            }
        }
    },
    {
        id: 'plan',
        name: 'Plan',
        description: 'Analysis and planning without making changes',
        mode: 'primary',
        prompt: 'You are a software architect. Analyze code, suggest changes, and create plans without making actual modifications.',
        temperature: 0.1,
        permissions: {
            tools: {
                read: 'allow',
                glob: 'allow',
                grep: 'allow',
                list: 'allow',
                webfetch: 'allow',
                websearch: 'allow',
                todoread: 'allow',
                todowrite: 'allow',
                question: 'allow',
                edit: 'ask',
                write: 'ask',
                bash: 'ask'
            },
            bash: {
                '*': 'ask',
                'git status*': 'allow',
                'git log*': 'allow',
                'git diff*': 'allow',
                'ls *': 'allow',
                'cat *': 'allow'
            }
        }
    },
    {
        id: 'explore',
        name: 'Explore',
        description: 'Fast codebase exploration and search',
        mode: 'subagent',
        prompt: 'You are a codebase explorer. Quickly find files, search code, and answer questions about the codebase. Do not modify files.',
        temperature: 0.2,
        permissions: {
            tools: {
                read: 'allow',
                glob: 'allow',
                grep: 'allow',
                list: 'allow',
                webfetch: 'allow',
                websearch: 'allow',
                question: 'allow',
                edit: 'deny',
                write: 'deny',
                bash: 'deny'
            }
        },
        maxSteps: 10
    },
    {
        id: 'general',
        name: 'General',
        description: 'General-purpose agent for multi-step tasks',
        mode: 'subagent',
        prompt: 'You are a general-purpose assistant. Handle complex tasks that may require multiple steps. You can read and modify files when needed.',
        temperature: 0.4,
        permissions: {
            tools: {
                '*': 'allow'
            },
            bash: {
                '*': 'ask',
                'git status*': 'allow',
                'git log*': 'allow',
                'git diff*': 'allow',
                'npm run *': 'allow',
                'bun run *': 'allow'
            }
        },
        maxSteps: 25
    },
    {
        id: 'review',
        name: 'Review',
        description: 'Code review without making changes',
        mode: 'subagent',
        prompt: 'You are a code reviewer. Analyze code for quality, security, and best practices. Provide constructive feedback without making changes.',
        temperature: 0.2,
        permissions: {
            tools: {
                read: 'allow',
                glob: 'allow',
                grep: 'allow',
                list: 'allow',
                question: 'allow',
                edit: 'deny',
                write: 'deny',
                bash: 'deny'
            }
        },
        maxSteps: 15
    }
];
class AgentRegistry {
    agents = new Map();
    constructor(){
        for (const agent of BUILT_IN_AGENTS){
            this.agents.set(agent.id, agent);
        }
    }
    register(config) {
        const id = config.name.toLowerCase().replace(/\s+/g, '-');
        const agent = {
            ...config,
            id
        };
        this.agents.set(id, agent);
        return agent;
    }
    unregister(id) {
        if (BUILT_IN_AGENTS.some((a)=>a.id === id)) {
            return false;
        }
        return this.agents.delete(id);
    }
    get(id) {
        return this.agents.get(id);
    }
    list() {
        return Array.from(this.agents.values());
    }
    listPrimary() {
        return this.list().filter((a)=>a.mode === 'primary' || a.mode === 'all');
    }
    listSubagents() {
        return this.list().filter((a)=>(a.mode === 'subagent' || a.mode === 'all') && !a.hidden);
    }
    getVisibleSubagents() {
        return this.listSubagents().filter((a)=>!a.hidden);
    }
    getByMode(mode) {
        return this.list().filter((a)=>a.mode === mode || a.mode === 'all');
    }
}
let globalRegistry = null;
function getAgentRegistry() {
    if (!globalRegistry) {
        globalRegistry = new AgentRegistry();
    }
    return globalRegistry;
}
function resetAgentRegistry() {
    globalRegistry = null;
}
function getAgent(id) {
    return getAgentRegistry().get(id);
}
function listAgents() {
    return getAgentRegistry().list();
}
function listSubagents() {
    return getAgentRegistry().listSubagents();
}
function registerAgent(config) {
    return getAgentRegistry().register(config);
}
}),
"[project]/apps/web/lib/chat/brainstorming.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "extractBrainstormPhase",
    ()=>extractBrainstormPhase,
    "stripBrainstormPhaseMarker",
    ()=>stripBrainstormPhaseMarker
]);
const PHASE_PATTERN = /brainstorm\s+phase\s*:\s*(discovery|options|validated_plan)/i;
function extractBrainstormPhase(content) {
    const match = content.match(PHASE_PATTERN);
    if (!match) return null;
    const phase = match[1]?.toLowerCase();
    if (phase === 'discovery' || phase === 'options' || phase === 'validated_plan') {
        return phase;
    }
    return null;
}
function stripBrainstormPhaseMarker(content) {
    return content.replace(/^.*brainstorm\s+phase\s*:\s*(?:discovery|options|validated_plan).*\n?/im, '');
}
}),
"[project]/apps/web/lib/agent/permission-presentation.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "describePermissionRequest",
    ()=>describePermissionRequest,
    "getCommandApprovalReason",
    ()=>getCommandApprovalReason
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$command$2d$analysis$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/lib/agent/command-analysis.ts [app-ssr] (ecmascript)");
;
const RISK_LABELS = {
    low: 'Low Risk',
    medium: 'Needs Review',
    high: 'High Risk'
};
function getMetadataArgs(request) {
    const metadata = request.metadata;
    if (!metadata || typeof metadata !== 'object' || !('args' in metadata)) return undefined;
    const args = metadata.args;
    return args && typeof args === 'object' ? args : undefined;
}
function formatCommandSummary(analysis) {
    switch(analysis.kind){
        case 'redirect':
            return 'This command writes output to a file.';
        case 'chain':
            return 'This command chains multiple operations.';
        case 'pipeline':
            return analysis.requiresApproval ? 'This pipeline includes steps beyond read-only inspection.' : 'This is a read-only inspection pipeline.';
        case 'single':
        default:
            return analysis.requiresApproval ? 'This command needs approval before it runs.' : 'This is a single command.';
    }
}
function getCommandApprovalReason(analysis) {
    switch(analysis.kind){
        case 'redirect':
            return 'Output redirection can create or overwrite files in the workspace.';
        case 'chain':
            return 'Command chaining hides multiple operations behind one approval in the web executor.';
        case 'pipeline':
            return analysis.requiresApproval ? 'Only read-only pipelines can run automatically in the web executor.' : 'This is a read-only pipeline.';
        case 'single':
        default:
            return analysis.requiresApproval ? 'This command requires review before execution.' : 'This command is safe to run without extra approval.';
    }
}
function describePermissionRequest(request) {
    const args = getMetadataArgs(request);
    if (request.tool === 'run_command') {
        const command = String(args?.command ?? request.pattern ?? '').trim();
        const analysis = (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$command$2d$analysis$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["analyzeCommand"])(command);
        return {
            title: 'Command Execution',
            summary: formatCommandSummary(analysis),
            detail: getCommandApprovalReason(analysis),
            riskTier: analysis.riskTier,
            riskLabel: RISK_LABELS[analysis.riskTier]
        };
    }
    if (request.tool === 'write_files' || request.tool === 'apply_patch') {
        return {
            title: 'File Edit',
            summary: 'This request can change files in the project workspace.',
            detail: request.pattern && request.pattern.trim() ? `Target: ${request.pattern}` : 'One or more project files will be changed.',
            riskTier: 'high',
            riskLabel: RISK_LABELS.high
        };
    }
    if (request.tool === 'task') {
        return {
            title: 'Subagent Task',
            summary: 'This request delegates work to another agent.',
            detail: 'Subagents can perform follow-up tool calls within their granted permissions.',
            riskTier: 'high',
            riskLabel: RISK_LABELS.high
        };
    }
    if (request.tool === 'update_memory_bank') {
        return {
            title: 'Memory Update',
            summary: 'This request changes persistent project memory used in future runs.',
            riskTier: 'medium',
            riskLabel: RISK_LABELS.medium
        };
    }
    if (request.tool.startsWith('search_') || request.tool === 'read_files' || request.tool === 'list_directory') {
        return {
            title: 'Workspace Read',
            summary: 'This request only inspects project files or structure.',
            detail: request.pattern && request.pattern.trim() ? `Target: ${request.pattern}` : undefined,
            riskTier: 'low',
            riskLabel: RISK_LABELS.low
        };
    }
    return {
        title: request.tool,
        summary: 'This request needs review before continuing.',
        detail: request.pattern && request.pattern.trim() ? `Target: ${request.pattern}` : undefined,
        riskTier: 'medium',
        riskLabel: RISK_LABELS.medium
    };
}
}),
"[project]/apps/web/lib/jobs/executeJob.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "executeQueuedJob",
    ()=>executeQueuedJob
]);
'use client';
async function executeQueuedJob({ jobId, command, workingDirectory, updateJobStatus }) {
    const startedAt = Date.now();
    const startedLog = `[${new Date(startedAt).toISOString()}] Running: ${command}`;
    await updateJobStatus(jobId, 'running', {
        startedAt,
        logs: [
            startedLog
        ]
    });
    const executeResponse = await fetch('/api/jobs/execute', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            jobId,
            command,
            workingDirectory
        })
    });
    if (!executeResponse.ok) {
        const errorText = await executeResponse.text();
        await updateJobStatus(jobId, 'failed', {
            completedAt: Date.now(),
            error: errorText
        });
        throw new Error(errorText);
    }
    const payload = await executeResponse.json();
    await updateJobStatus(jobId, payload.exitCode === 0 ? 'completed' : 'failed', {
        completedAt: Date.now(),
        output: payload.stdout || undefined,
        error: payload.stderr || undefined,
        logs: [
            startedLog,
            `[${new Date().toISOString()}] Exit code: ${payload.exitCode}`
        ]
    });
    return payload;
}
}),
"[project]/apps/web/lib/artifacts/executeArtifact.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "applyArtifact",
    ()=>applyArtifact,
    "getPrimaryArtifactAction",
    ()=>getPrimaryArtifactAction,
    "inferArtifactJobType",
    ()=>inferArtifactJobType
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$convex$2f$_generated$2f$api$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/convex/_generated/api.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$jobs$2f$executeJob$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/lib/jobs/executeJob.ts [app-ssr] (ecmascript)");
'use client';
;
;
function inferArtifactJobType(command) {
    const cmdLower = command.toLowerCase();
    if (cmdLower.includes('build') || cmdLower.includes('compile')) return 'build';
    if (cmdLower.includes('test')) return 'test';
    if (cmdLower.includes('deploy')) return 'deploy';
    if (cmdLower.includes('lint')) return 'lint';
    if (cmdLower.includes('format')) return 'format';
    return 'cli';
}
function getPrimaryArtifactAction(record) {
    const action = record.actions?.[0];
    if (!action || action.type !== 'file_write' && action.type !== 'command_run') return null;
    return action;
}
async function applyArtifact({ artifactId, action, projectId, convex, upsertFile, createAndExecuteJob, updateJobStatus, updateArtifactStatus }) {
    await updateArtifactStatus({
        id: artifactId,
        status: 'in_progress'
    });
    try {
        if (action.type === 'file_write') {
            const existing = await convex.query(__TURBOPACK__imported__module__$5b$project$5d2f$convex$2f$_generated$2f$api$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["api"].files.getByPath, {
                projectId,
                path: action.payload.filePath
            });
            await upsertFile({
                id: existing?._id,
                projectId,
                path: action.payload.filePath,
                content: action.payload.content,
                isBinary: false
            });
            await updateArtifactStatus({
                id: artifactId,
                status: 'completed'
            });
            return {
                kind: 'file',
                description: action.payload.filePath
            };
        }
        const { jobId } = await createAndExecuteJob({
            projectId,
            type: inferArtifactJobType(action.payload.command),
            command: action.payload.command,
            workingDirectory: action.payload.workingDirectory
        });
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$jobs$2f$executeJob$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["executeQueuedJob"])({
            jobId,
            command: action.payload.command,
            workingDirectory: action.payload.workingDirectory,
            updateJobStatus
        });
        await updateArtifactStatus({
            id: artifactId,
            status: 'completed'
        });
        return {
            kind: 'command',
            description: action.payload.command
        };
    } catch (error) {
        await updateArtifactStatus({
            id: artifactId,
            status: 'failed'
        });
        throw error;
    }
}
}),
"[project]/apps/web/lib/llm/types.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * LLM Types - Core type definitions for language model providers
 *
 * This module defines interfaces for:
 * - Model metadata and capabilities
 * - Message formats for completions
 * - Tool definitions for function calling
 * - Provider configurations
 */ /**
 * Provider type - supported LLM providers
 */ __turbopack_context__.s([
    "getDefaultProviderCapabilities",
    ()=>getDefaultProviderCapabilities
]);
function getDefaultProviderCapabilities(type) {
    switch(type){
        case 'anthropic':
            return {
                supportsReasoning: true,
                supportsInterleavedReasoning: true,
                supportsReasoningSummary: true,
                supportsToolStreaming: true,
                reasoningControl: 'budget'
            };
        case 'zai':
            return {
                supportsReasoning: true,
                supportsInterleavedReasoning: false,
                supportsReasoningSummary: false,
                supportsToolStreaming: true,
                reasoningControl: 'budget'
            };
        case 'deepseek':
            return {
                supportsReasoning: true,
                supportsInterleavedReasoning: false,
                supportsReasoningSummary: true,
                supportsToolStreaming: true,
                reasoningControl: 'effort'
            };
        case 'openai':
        case 'openrouter':
        case 'together':
        case 'chutes':
        case 'groq':
        case 'fireworks':
        case 'custom':
        default:
            return {
                supportsReasoning: false,
                supportsInterleavedReasoning: false,
                supportsReasoningSummary: false,
                supportsToolStreaming: true,
                reasoningControl: 'none'
            };
    }
}
}),
"[project]/apps/web/lib/llm/model-metadata.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "resolveContextWindow",
    ()=>resolveContextWindow
]);
const KNOWN_MODEL_CONTEXT_WINDOWS = {
    // OpenAI
    'gpt-4o': 128000,
    'gpt-4o-mini': 128000,
    'gpt-4-turbo': 128000,
    'gpt-3.5-turbo': 16385,
    // Anthropic
    'claude-opus-4-6': 1_000_000,
    'claude-sonnet-4-5': 200_000,
    // Z.ai
    'glm-4.7': 128000,
    'glm-4.7-flashx': 128000,
    'glm-4.7-flash': 128000,
    // Common routing defaults
    'anthropic/claude-3.5-sonnet': 200000,
    'openai/gpt-4o': 128000,
    'togethercomputer/llama-3.1-70b': 128000,
    'meta-llama/Llama-3.1-70B-Instruct-Turbo': 128000
};
const PROVIDER_FALLBACK_CONTEXT_WINDOWS = {
    openai: 128000,
    openrouter: 128000,
    together: 128000,
    anthropic: 200000,
    zai: 128000,
    chutes: 128000,
    deepseek: 64000,
    groq: 128000,
    fireworks: 128000,
    custom: 32000
};
function resolveContextWindow(args) {
    const model = args.model.trim();
    const known = KNOWN_MODEL_CONTEXT_WINDOWS[model];
    if (typeof known === 'number' && known > 0) {
        return {
            contextWindow: known,
            source: 'map'
        };
    }
    const providerModel = args.providerModels?.find((m)=>m.id === model);
    if (providerModel && Number.isFinite(providerModel.contextWindow) && providerModel.contextWindow > 0) {
        return {
            contextWindow: providerModel.contextWindow,
            source: 'provider'
        };
    }
    return {
        contextWindow: PROVIDER_FALLBACK_CONTEXT_WINDOWS[args.providerType] ?? 32000,
        source: 'fallback'
    };
}
}),
"[project]/apps/web/lib/llm/token-usage.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "computeContextMetrics",
    ()=>computeContextMetrics,
    "estimateCompletionTokens",
    ()=>estimateCompletionTokens,
    "estimatePromptTokens",
    ()=>estimatePromptTokens
]);
function tokensPerChar(providerType, model) {
    const normalized = model.toLowerCase();
    if (providerType === 'anthropic' || normalized.includes('claude')) return 1 / 3.6;
    if (providerType === 'zai' || normalized.includes('glm')) return 1 / 3.8;
    if (providerType === 'openrouter' || providerType === 'together') return 1 / 4.1;
    return 1 / 4;
}
function estimateTokensFromText(text, providerType, model) {
    const trimmed = text.trim();
    if (!trimmed) return 0;
    const chars = trimmed.length;
    const words = trimmed.split(/\s+/).length;
    const base = chars * tokensPerChar(providerType, model);
    const wordOverhead = words * 0.08;
    return Math.max(1, Math.ceil(base + wordOverhead));
}
function estimatePromptTokens(args) {
    const roleOverheadPerMessage = 4;
    let total = 0;
    for (const message of args.messages){
        total += roleOverheadPerMessage;
        total += estimateTokensFromText(message.content, args.providerType, args.model);
    }
    // Assistant priming overhead
    total += 2;
    return Math.max(1, total);
}
function estimateCompletionTokens(args) {
    return estimateTokensFromText(args.content, args.providerType, args.model);
}
function computeContextMetrics(args) {
    const windowSize = Math.max(1, Math.floor(args.contextWindow));
    const used = Math.min(Math.max(0, Math.floor(args.usedTokens)), windowSize);
    const remaining = Math.max(0, windowSize - used);
    const usagePct = Math.min(100, Math.max(0, Number((used / windowSize * 100).toFixed(1))));
    return {
        usedTokens: used,
        remainingTokens: remaining,
        usagePct
    };
}
}),
"[project]/apps/web/lib/agent/context/context-budget.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "allocateBudget",
    ()=>allocateBudget,
    "assembleContext",
    ()=>assembleContext
]);
/**
 * Context Budget Allocator
 *
 * Intelligent token budget management for LLM context windows.
 * Allocates tokens across system prompt, project context, files, and chat history.
 */ var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$llm$2f$token$2d$usage$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/lib/llm/token-usage.ts [app-ssr] (ecmascript)");
;
const DEFAULT_BUDGET_RATIOS = {
    systemPrompt: 0.1,
    projectContext: 0.15,
    fileContents: 0.4,
    chatHistory: 0.25,
    reserve: 0.1
};
function allocateBudget(contextWindowSize) {
    return {
        systemPrompt: Math.floor(contextWindowSize * DEFAULT_BUDGET_RATIOS.systemPrompt),
        projectContext: Math.floor(contextWindowSize * DEFAULT_BUDGET_RATIOS.projectContext),
        fileContents: Math.floor(contextWindowSize * DEFAULT_BUDGET_RATIOS.fileContents),
        chatHistory: Math.floor(contextWindowSize * DEFAULT_BUDGET_RATIOS.chatHistory),
        reserve: Math.floor(contextWindowSize * DEFAULT_BUDGET_RATIOS.reserve)
    };
}
function assembleContext(options) {
    const budget = allocateBudget(options.contextWindowSize);
    const providerType = options.providerType ?? 'openai';
    const model = options.model ?? 'gpt-4o';
    // 1. System prompt (always full, but check if it exceeds budget)
    const systemTokens = (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$llm$2f$token$2d$usage$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["estimatePromptTokens"])({
        providerType,
        model,
        messages: [
            {
                role: 'system',
                content: options.systemPrompt
            }
        ]
    });
    const systemPrompt = systemTokens > budget.systemPrompt ? truncateToTokens(options.systemPrompt, budget.systemPrompt, providerType, model) : options.systemPrompt;
    // 2. Project context (overview + memory bank, truncated to budget)
    const projectContextParts = [];
    if (options.projectOverview) {
        projectContextParts.push(`## Project Overview\n${options.projectOverview}`);
    }
    if (options.memoryBank) {
        projectContextParts.push(`## Project Memory Bank\n${options.memoryBank}`);
    }
    let projectContext = projectContextParts.join('\n\n');
    const projectTokens = (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$llm$2f$token$2d$usage$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["estimatePromptTokens"])({
        providerType,
        model,
        messages: [
            {
                role: 'system',
                content: projectContext
            }
        ]
    });
    if (projectTokens > budget.projectContext) {
        // Prioritize overview, truncate memory bank
        if (options.projectOverview) {
            const overviewTokens = (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$llm$2f$token$2d$usage$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["estimatePromptTokens"])({
                providerType,
                model,
                messages: [
                    {
                        role: 'system',
                        content: options.projectOverview
                    }
                ]
            });
            if (overviewTokens < budget.projectContext) {
                const remainingBudget = budget.projectContext - overviewTokens;
                const truncatedMemory = options.memoryBank ? truncateToTokens(options.memoryBank, remainingBudget, providerType, model) : '';
                projectContext = `## Project Overview\n${options.projectOverview}${truncatedMemory ? `\n\n## Project Memory Bank\n${truncatedMemory}` : ''}`;
            } else {
                // Overview itself is too large, truncate it
                projectContext = truncateToTokens(projectContext, budget.projectContext, providerType, model);
            }
        } else {
            projectContext = truncateToTokens(projectContext, budget.projectContext, providerType, model);
        }
    }
    // 3. Files (prioritized by score, with tiered content levels)
    const sortedFiles = [
        ...options.files
    ].sort((a, b)=>b.score - a.score);
    const fileBudget = budget.fileContents;
    const fileResult = assembleFilesWithinBudget(sortedFiles, fileBudget, providerType, model);
    // 4. Chat history (most recent first, truncated to budget)
    const chatBudget = budget.chatHistory;
    const chatResult = assembleChatHistoryWithinBudget(options.chatHistory, chatBudget, providerType, model);
    const totalTokens = (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$llm$2f$token$2d$usage$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["estimatePromptTokens"])({
        providerType,
        model,
        messages: [
            {
                role: 'system',
                content: systemPrompt
            }
        ]
    }) + (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$llm$2f$token$2d$usage$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["estimatePromptTokens"])({
        providerType,
        model,
        messages: [
            {
                role: 'system',
                content: projectContext
            }
        ]
    }) + (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$llm$2f$token$2d$usage$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["estimatePromptTokens"])({
        providerType,
        model,
        messages: [
            {
                role: 'system',
                content: fileResult.content
            }
        ]
    }) + (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$llm$2f$token$2d$usage$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["estimatePromptTokens"])({
        providerType,
        model,
        messages: chatResult.messages
    });
    return {
        systemPrompt,
        projectContext,
        fileContents: fileResult.content,
        chatHistory: chatResult.messages.map((m)=>`${m.role}: ${m.content}`).join('\n\n'),
        budgetUsage: {
            systemTokens: (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$llm$2f$token$2d$usage$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["estimatePromptTokens"])({
                providerType,
                model,
                messages: [
                    {
                        role: 'system',
                        content: systemPrompt
                    }
                ]
            }),
            projectTokens: (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$llm$2f$token$2d$usage$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["estimatePromptTokens"])({
                providerType,
                model,
                messages: [
                    {
                        role: 'system',
                        content: projectContext
                    }
                ]
            }),
            fileTokens: fileResult.tokens,
            chatTokens: chatResult.tokens,
            totalTokens,
            filesIncluded: fileResult.filesIncluded,
            filesWithFullContent: fileResult.filesWithFullContent,
            filesWithSignatures: fileResult.filesWithSignatures,
            filesWithPathsOnly: fileResult.filesWithPathsOnly
        }
    };
}
function assembleFilesWithinBudget(files, budget, providerType, model) {
    let currentTokens = 0;
    const sections = [];
    let filesIncluded = 0;
    let filesWithFullContent = 0;
    let filesWithSignatures = 0;
    let filesWithPathsOnly = 0;
    // Thresholds for content levels (based on file ranking position)
    const fullContentLimit = Math.max(5, Math.floor(files.length * 0.1));
    const signatureLimit = Math.max(15, Math.floor(files.length * 0.3));
    for(let i = 0; i < files.length; i++){
        const file = files[i];
        let fileContent;
        let contentLevel;
        if (i < fullContentLimit && file.content) {
            // Top-ranked files: full content
            fileContent = `--- ${file.path} ---\n${file.content}`;
            contentLevel = 'full';
        } else if (i < signatureLimit && file.content) {
            // Medium-ranked files: signatures only (exports, function names)
            const signatures = extractSignatures(file.content);
            if (signatures) {
                fileContent = `--- ${file.path} ---\n${signatures}`;
                contentLevel = 'signature';
            } else {
                fileContent = `- ${file.path}`;
                contentLevel = 'path';
            }
        } else {
            // Lower-ranked files: path only
            fileContent = `- ${file.path}`;
            contentLevel = 'path';
        }
        const fileTokens = (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$llm$2f$token$2d$usage$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["estimatePromptTokens"])({
            providerType,
            model,
            messages: [
                {
                    role: 'system',
                    content: fileContent
                }
            ]
        });
        if (currentTokens + fileTokens > budget && i > 0) {
            // Add a note about truncated files
            const remainingCount = files.length - i;
            if (remainingCount > 0) {
                sections.push(`\n[... ${remainingCount} more files not shown due to token budget]`);
            }
            break;
        }
        sections.push(fileContent);
        currentTokens += fileTokens;
        filesIncluded++;
        if (contentLevel === 'full') filesWithFullContent++;
        else if (contentLevel === 'signature') filesWithSignatures++;
        else filesWithPathsOnly++;
    }
    return {
        content: sections.join('\n\n'),
        tokens: currentTokens,
        filesIncluded,
        filesWithFullContent,
        filesWithSignatures,
        filesWithPathsOnly
    };
}
function assembleChatHistoryWithinBudget(messages, budget, providerType, model) {
    // Take most recent messages first
    const reversed = [
        ...messages
    ].reverse();
    let currentTokens = 0;
    const included = [];
    for (const message of reversed){
        const msgTokens = (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$llm$2f$token$2d$usage$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["estimatePromptTokens"])({
            providerType,
            model,
            messages: [
                message
            ]
        });
        if (currentTokens + msgTokens > budget && included.length > 0) {
            break;
        }
        included.unshift(message); // Add back in original order
        currentTokens += msgTokens;
    }
    return {
        messages: included,
        tokens: currentTokens
    };
}
/**
 * Extract function/class signatures from code content
 */ function extractSignatures(content) {
    const signatures = [];
    // Match function declarations
    const functionMatches = content.match(/^(export\s+)?(async\s+)?function\s+\w+\s*\([^)]*\)/gm);
    if (functionMatches) {
        signatures.push(...functionMatches);
    }
    // Match arrow function exports
    const arrowMatches = content.match(/^(export\s+)?(const|let|var)\s+\w+\s*=\s*(async\s*)?\([^)]*\)\s*=>/gm);
    if (arrowMatches) {
        signatures.push(...arrowMatches);
    }
    // Match class declarations
    const classMatches = content.match(/^(export\s+)?class\s+\w+/gm);
    if (classMatches) {
        signatures.push(...classMatches);
    }
    // Match interface declarations
    const interfaceMatches = content.match(/^(export\s+)?interface\s+\w+/gm);
    if (interfaceMatches) {
        signatures.push(...interfaceMatches);
    }
    // Match type declarations
    const typeMatches = content.match(/^(export\s+)?type\s+\w+/gm);
    if (typeMatches) {
        signatures.push(...typeMatches);
    }
    return signatures.length > 0 ? signatures.slice(0, 10).join('\n') : null;
}
/**
 * Truncate text to fit within token budget
 */ function truncateToTokens(text, maxTokens, providerType, model) {
    void providerType;
    void model;
    // Rough estimate: 1 token ≈ 4 chars
    const charsPerToken = 4;
    const maxChars = maxTokens * charsPerToken;
    if (text.length <= maxChars) return text;
    return text.slice(0, maxChars - 50) + '\n\n[... truncated]';
}
}),
"[project]/apps/web/lib/agent/prompt-library.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * Agent Prompt Library
 *
 * Contains prompt templates for different agent modes:
 * - ask: Read-only Q&A mode
 * - architect: System design and planning mode
 * - code: Default coding mode
 * - build: Full implementation mode
 */ __turbopack_context__.s([
    "MODE_CONFIGS",
    ()=>MODE_CONFIGS,
    "getPromptForMode",
    ()=>getPromptForMode,
    "getSystemPrompt",
    ()=>getSystemPrompt,
    "mapLegacyMode",
    ()=>mapLegacyMode,
    "normalizeChatMode",
    ()=>normalizeChatMode
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$context$2f$context$2d$budget$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/lib/agent/context/context-budget.ts [app-ssr] (ecmascript)");
;
const MODE_CONFIGS = {
    ask: {
        description: 'Read-only Q&A without modifications',
        fileAccess: 'read-only'
    },
    architect: {
        description: 'System design and planning',
        fileAccess: 'read-only'
    },
    code: {
        description: 'Default implementation mode',
        fileAccess: 'read-write'
    },
    build: {
        description: 'Full implementation',
        fileAccess: 'read-write'
    }
};
const ASK_SYSTEM_PROMPT = `You are Panda.ai, a senior engineer helping a teammate understand their codebase.

You are in **Ask Mode** — read-only access, no file modifications.

Your job is to explain, clarify, and answer questions about code.

INTENT RULES (read first, always):
- Respond like a senior engineer answering a Slack message. Be human, be direct.
- NEVER open with a plan, numbered steps, or clarifying questions unless the message explicitly asks you to plan something.
- For casual questions or explanations: 1-4 short paragraphs is perfect.
- Only use bullet points or headers if the content is genuinely list-like (e.g., a comparison or enumeration).
- If the user asks you to modify code, suggest switching to Code or Build mode.

When using tools:
- Use list_directory to quickly inspect structure when you need folder-level context.
- Use search_code or read_files to look up specific details before answering.
- Always cite file paths and line numbers in your answer.

Response style: short, precise, conversational. No preamble.`;
const ARCHITECT_SYSTEM_PROMPT = `You are Panda.ai, a senior software architect.

You are in **Architect Mode** — read-only access, focused on planning and design.

INTENT RULES (read first, always):
1. Determine the intent of the user's message BEFORE choosing a format.
2. For conventional questions, trade-off discussions, or opinions (e.g. "what do you think of X?", "is Y a good idea?", "how does Z compare to W?"): respond naturally in paragraphs. No plan format. No headers. Just a clear, opinionated engineering take.
3. For straightforward factual questions: answer directly in plain language (1-4 sentences).
4. For planning, architecture, or multi-step implementation requests (e.g. "plan out X", "design the architecture for Y"): ONLY THEN produce or update the plan artifact below.

Plan artifact format (for explicit architecture/planning requests only):
## Goal
- One short statement of the desired outcome

## Clarifications
- 0-2 bullets; only questions or assumptions that materially affect implementation

## Relevant Files
- File paths, symbols, routes, or systems likely impacted

## Implementation Plan
1. Ordered steps to execute

## Risks
- Trade-offs, regressions, unknowns

## Validation
- Checks, tests, or acceptance steps

## Open Questions
- Remaining unresolved questions, or "None"

Output constraints:
- Do NOT paste full implementations or large code blocks.
- If a snippet is necessary for explanation, keep it ≤10 lines and label it clearly.
- When generating a plan artifact, prefer file paths and code references over generic architecture prose.
- If asked to "write the code", produce a plan and suggest switching to Code or Build mode.

You have access to project files for context. Use them. Be opinionated and concrete.`;
const CODE_SYSTEM_PROMPT = `You are Panda.ai, a senior software engineer.

You are in **Code Mode** — read and write access. Your job is to implement changes precisely and efficiently.

INTENT RULES (read first, always):
- If the user asks a question or wants an explanation: answer it directly and concisely (< 3 sentences), then proceed with the implementation if needed. Do NOT produce a planning preamble.
- If the user asks for code changes: start working immediately. Briefly explain your approach (1-2 sentences), then use tools.
- Keep chat output to high-level progress updates and logic explanations ONLY.
- Do NOT include fenced code blocks (\`\`\`) in chat. All code goes through tools.

Tool usage:
1. **list_directory** — List files/directories to understand project structure quickly.
2. **read_files** — Read file contents before making changes. Prefer reading multiple files in parallel.
3. **search_code** — Search across project files. Prefer this for targeted lookups before broad reads.
4. **search_code_ast** — AST-aware search for TypeScript/TSX structural matching.
5. **write_files** — Write or modify files. Always provide complete file content. Generate ALL changed files in one iteration.
6. **run_command** — Validate work with tests, typecheck, or linting after changes.
7. **task** — Spawn specialized subagents (like debugger, tech-writer, etc.) to handle complex tasks in parallel.

Workflow: read → explain approach briefly → write → verify.

Do not describe what should be done. Do it.`;
const BUILD_SYSTEM_PROMPT = `You are Panda.ai, a senior software engineer executing a full build.

You are in **Build Mode** — full read, write, and execute access.

INTENT RULES (read first, always):
- Enter "Quiet Execution Mode" immediately. Your chat output should be minimal: a 1-2 sentence summary of your approach, then status updates as you work (e.g. "Reading X...", "Writing Y...", "Running tests...").
- Do NOT produce a planning preamble, clarifying questions, or a risk section before starting. Just build.
- Only pause and ask if the request is fundamentally ambiguous (e.g. you can't determine what to build without more information).
- Do NOT include fenced code blocks (\`\`\`) in chat. All code goes through write_files.

Tools:
1. **list_directory** — List files/directories to understand project structure quickly.
2. **read_files** — Read file contents (use in parallel for multiple files).
3. **search_code** — Search project files for context.
4. **search_code_ast** — AST-aware structural search for TypeScript/TSX.
5. **write_files** — Write or modify files with COMPLETE content. Generate ALL changed files in one iteration.
6. **run_command** — Run tests, typecheck, and linting to verify work.
7. **task** — Spawn specialized subagents (like debugger, tech-writer, explore) to handle complex tasks in parallel.

Workflow: understand → build incrementally → verify each step → report results.

Always follow existing project patterns, conventions, and error handling. Do not describe. Build.`;
const ARCHITECT_BRAINSTORM_PROTOCOL = `

Brainstorming protocol (enabled):
- Operate in phases and include this exact marker near the top of every response:
  Brainstorm phase: discovery | options | validated_plan
- In discovery phase:
  - Ask exactly one clarifying question per response.
  - Prefer multiple-choice questions when possible.
  - Do not produce a full implementation plan yet.
- In options phase:
  - Present 2-3 viable approaches with trade-offs.
  - Lead with your recommended option and why.
  - End with exactly one question to choose/confirm direction.
- In validated_plan phase:
  - Present the final plan using the required Architect Mode structure.
  - Keep implementation out of chat and suggest Code/Build mode for execution.
- Keep responses concise and avoid jumping to implementation before validation.`;
function getSystemPromptForMode(mode) {
    switch(mode){
        case 'ask':
            return ASK_SYSTEM_PROMPT;
        case 'architect':
            return ARCHITECT_SYSTEM_PROMPT;
        case 'code':
            return CODE_SYSTEM_PROMPT;
        case 'build':
            return BUILD_SYSTEM_PROMPT;
        default:
            return CODE_SYSTEM_PROMPT;
    }
}
/**
 * Check if provider requires system prompt to be embedded in user message
 * Some providers (Z.ai, some OpenRouter models, etc.) don't support separate system role
 */ function providerRequiresEmbeddedSystemPrompt(providerId) {
    if (!providerId) return false;
    const lower = providerId.toLowerCase();
    return lower === 'zai' || lower === 'z.ai' || lower.includes('zai') || lower.includes('arcee') || lower.includes('deepinfra') || lower.includes('fireworks');
}
function getPromptForMode(context) {
    const providerId = context.provider?.toLowerCase();
    const embedSystemInUser = providerRequiresEmbeddedSystemPrompt(providerId);
    const messages = [];
    let systemPrompt = getSystemPromptForMode(context.chatMode);
    const brainstormEnabled = context.chatMode === 'architect' && context.customInstructions?.toLowerCase().includes('architect brainstorming protocol: enabled');
    if (brainstormEnabled) {
        systemPrompt = `${systemPrompt}${ARCHITECT_BRAINSTORM_PROTOCOL}`;
    }
    let contextContent = '';
    // Use context budget allocation when window size is provided
    if (context.contextWindowSize && context.contextWindowSize > 0) {
        const fileBudgetInfo = context.files?.map((f)=>({
                path: f.path,
                content: f.content,
                score: f.score ?? 0.5
            })) ?? [];
        const chatHistory = context.previousMessages?.map((m)=>({
                role: m.role,
                content: m.content
            })) ?? [];
        const budgetOptions = {
            contextWindowSize: context.contextWindowSize,
            systemPrompt,
            projectOverview: context.projectOverview,
            memoryBank: context.memoryBank,
            files: fileBudgetInfo,
            chatHistory,
            providerType: context.providerType ?? 'openai',
            model: context.model ?? 'gpt-4o'
        };
        const budgetedContent = (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$context$2f$context$2d$budget$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["assembleContext"])(budgetOptions);
        // Build context content from budgeted results
        const parts = [];
        if (context.projectName) {
            parts.push(`Project: ${context.projectName}`);
        }
        if (context.projectDescription) {
            parts.push(`Description: ${context.projectDescription}`);
        }
        if (budgetedContent.projectContext) {
            parts.push(budgetedContent.projectContext);
        }
        if (context.sessionSummary) {
            parts.push(`\n## Previous Session Context\n${context.sessionSummary}`);
        }
        if (budgetedContent.fileContents) {
            const isReadOnly = MODE_CONFIGS[context.chatMode].fileAccess === 'read-only';
            if (isReadOnly) {
                parts.push('\nRelevant files:\n' + budgetedContent.fileContents);
            } else {
                parts.push('\nCurrent files in project:\n' + budgetedContent.fileContents);
            }
        }
        contextContent = parts.join('\n');
    } else {
        // Legacy context assembly without budget
        if (context.projectName) {
            contextContent += `Project: ${context.projectName}\n`;
        }
        if (context.projectDescription) {
            contextContent += `Description: ${context.projectDescription}\n`;
        }
        if (context.projectOverview) {
            contextContent += `\n## Project Overview\n${context.projectOverview}\n`;
        }
        if (context.memoryBank) {
            contextContent += `\n## Project Memory Bank\n${context.memoryBank}\n`;
        }
        if (context.sessionSummary) {
            contextContent += `\n## Previous Session Context\n${context.sessionSummary}\n`;
        }
        if (context.files && context.files.length > 0) {
            const isReadOnly = MODE_CONFIGS[context.chatMode].fileAccess === 'read-only';
            if (isReadOnly) {
                contextContent += '\nRelevant files:\n';
                contextContent += context.files.map((f)=>`- ${f.path}${f.content ? `\n\`\`\`\n${f.content}\n\`\`\`` : ''}`).join('\n\n');
            } else {
                contextContent += '\nCurrent files in project:\n';
                context.files.forEach((f)=>{
                    contextContent += `\n--- ${f.path} ---\n`;
                    if (f.content) {
                        contextContent += f.content;
                    } else {
                        contextContent += '[File content not loaded]';
                    }
                });
            }
        }
    }
    if (!embedSystemInUser) {
        messages.push({
            role: 'system',
            content: systemPrompt
        });
        if (contextContent) {
            messages.push({
                role: 'system',
                content: contextContent
            });
        }
    }
    if (context.previousMessages && context.previousMessages.length > 0) {
        messages.push(...context.previousMessages);
    }
    if (context.userMessage) {
        if (embedSystemInUser) {
            const systemBlock = contextContent ? `${systemPrompt}\n\n${contextContent}` : systemPrompt;
            const userBlock = `System:\n${systemBlock}\n\nUser:\n${context.userMessage}`;
            messages.push({
                role: 'user',
                content: userBlock
            });
        } else {
            messages.push({
                role: 'user',
                content: context.userMessage
            });
        }
    }
    return messages;
}
function getSystemPrompt(mode) {
    return getSystemPromptForMode(mode);
}
function normalizeChatMode(mode, fallback = 'code') {
    if (mode === 'ask' || mode === 'architect' || mode === 'code' || mode === 'build') {
        return mode;
    }
    if (mode === 'discuss') return 'architect';
    if (mode === 'debug') return 'code';
    if (mode === 'review') return 'ask';
    return fallback;
}
function mapLegacyMode(mode) {
    return normalizeChatMode(mode, 'code');
}
}),
"[project]/apps/web/lib/agent/runtime.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "AgentRuntime",
    ()=>AgentRuntime,
    "createAgentRuntime",
    ()=>createAgentRuntime,
    "runAgent",
    ()=>runAgent,
    "shouldRewriteBuildResponse",
    ()=>shouldRewriteBuildResponse,
    "shouldRewriteDiscussResponse",
    ()=>shouldRewriteDiscussResponse,
    "streamAgent",
    ()=>streamAgent
]);
/**
 * Agent Runtime
 *
 * Core runtime for executing agent tasks with streaming support.
 * Manages the conversation loop, tool execution, and response streaming.
 */ var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$logger$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/lib/logger.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$llm$2f$types$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/lib/llm/types.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$prompt$2d$library$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/lib/agent/prompt-library.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$tools$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/lib/agent/tools.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$harness$2f$index$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/apps/web/lib/agent/harness/index.ts [app-ssr] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$harness$2f$runtime$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/lib/agent/harness/runtime.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$harness$2f$permissions$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/lib/agent/harness/permissions.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$harness$2f$agents$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/lib/agent/harness/agents.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$harness$2f$identifier$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/lib/agent/harness/identifier.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$harness$2f$tool$2d$repair$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/lib/agent/harness/tool-repair.ts [app-ssr] (ecmascript)");
;
;
;
;
;
;
const isE2ESpecApprovalModeEnabled = ("TURBOPACK compile-time value", "spec-approval") === 'spec-approval';
/**
 * Generate a hash for a tool call to detect duplicates
 */ function hashToolCall(toolCall) {
    return `${toolCall.function.name}:${toolCall.function.arguments}`;
}
function buildToolCallPattern(toolCalls) {
    return toolCalls.map((toolCall)=>hashToolCall(toolCall)).join('||');
}
function summarizeToolCallNames(toolCalls) {
    const names = Array.from(new Set(toolCalls.map((toolCall)=>toolCall.function.name)));
    return names.join(', ');
}
function logRuntimeError(message, error) {
    __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$logger$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["appLog"].error(`[agent-runtime] ${message}`, error);
}
function shouldRewriteDiscussResponse(content) {
    // Claude Code Plan Mode expectation: no large code blocks / no fenced implementations.
    // For now we treat fenced code blocks as a hard violation and trigger a single rewrite pass.
    return content.includes('```');
}
function shouldRewriteBuildResponse(content) {
    // Build Mode expectation (Claude Code-style): code changes should go through tools/artifacts,
    // and the chat panel should not contain large code blocks.
    // For now we treat fenced code blocks as a hard violation and trigger a single rewrite pass.
    return content.includes('```');
}
function shouldRetryBuildForToolUse(args) {
    if (args.promptContext.chatMode !== 'build') return false;
    if (args.pendingToolCalls.length > 0) return false;
    const user = (args.promptContext.userMessage ?? '').toLowerCase();
    const userWantsExecution = /(build|implement|create|start|proceed|go ahead|let'?s do|do it|make it)/.test(user);
    if (!userWantsExecution) return false;
    const looksLikePlanningOutput = args.content.includes('### Proposed Plan') || args.content.includes('### Next Step') || args.content.includes('Clarifying Questions') || args.content.includes('### Risks') || /I will begin by/i.test(args.content);
    return looksLikePlanningOutput;
}
function extractInlineToolCalls(content) {
    const toolCalls = [];
    const toolCallIds = new Set();
    const validToolNames = [
        'read_files',
        'write_files',
        'run_command',
        'search_code',
        'search_code_ast',
        'update_memory_bank'
    ];
    const patterns = [
        /\{[^{}]*"name"\s*:\s*"([^"]+)"[^{}]*"arguments"\s*:\s*(\{[\s\S]*?\})\s*\}/g,
        /\{[^{}]*"function"\s*:\s*\{[^{}]*"name"\s*:\s*"([^"]+)"[^{}]*"arguments"\s*:\s*(\{[\s\S]*?\})[^{}]*\}[^{}]*\}/g,
        /```json\s*\n?\s*(\{[\s\S]*?"name"\s*:\s*"([^"]+)"[\s\S]*?"arguments"\s*:\s*(\{[\s\S]*?\})[\s\S]*?\})\s*\n?\s*```/g
    ];
    const extractFromMatch = (toolName, argsStr, _fullMatch)=>{
        if (!validToolNames.includes(toolName)) return false;
        try {
            const args = JSON.parse(argsStr);
            const id = `inline_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
            if (toolCallIds.has(id)) return false;
            toolCallIds.add(id);
            const toolCall = {
                id,
                type: 'function',
                function: {
                    name: toolName,
                    arguments: JSON.stringify(args)
                }
            };
            toolCalls.push(toolCall);
            return true;
        } catch (parseError) {
            void parseError;
            return false;
        }
    };
    for (const pattern of patterns){
        let match;
        while((match = pattern.exec(content)) !== null){
            if (pattern.source.includes('```json')) {
                extractFromMatch(match[2], match[3], match[0]);
            } else {
                extractFromMatch(match[1], match[2], match[0]);
            }
        }
    }
    let cleanedContent = content;
    if (toolCalls.length > 0) {
        for (const pattern of patterns){
            cleanedContent = cleanedContent.replace(pattern, '');
        }
        cleanedContent = cleanedContent.replace(/\n\s*\n\s*\n/g, '\n\n').replace(/^[\s\n]+|[\s\n]+$/g, '').trim();
    }
    return {
        cleanedContent,
        toolCalls
    };
}
class AgentRuntime {
    options;
    toolContext;
    constructor(options, toolContext){
        this.options = options;
        this.toolContext = toolContext;
    }
    /**
   * Run the agent with streaming output
   * This is a generator that yields events as they occur
   */ async *run(promptContext, config) {
        // Initialize state
        const state = {
            messages: (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$prompt$2d$library$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getPromptForMode"])(promptContext),
            iteration: 0,
            toolResults: [],
            isComplete: false,
            executedToolCalls: new Set(),
            toolCallHistory: []
        };
        if (!state.messages || state.messages.length === 0) {
            yield {
                type: 'error',
                error: 'Invalid prompt: messages must not be empty (no user message provided).'
            };
            return;
        }
        const maxIterations = this.options.maxIterations ?? config?.maxIterations ?? 10;
        const maxToolCallsPerIteration = config?.maxToolCallsPerIteration ?? 5;
        const enableDeduplication = config?.enableToolDeduplication ?? true;
        const toolLoopThreshold = config?.toolLoopThreshold ?? 3;
        const model = this.options.model ?? 'gpt-4o';
        const providerCapabilities = this.options.provider.config.capabilities ?? (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$llm$2f$types$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getDefaultProviderCapabilities"])(this.options.provider.config.provider);
        try {
            // Main agent loop
            while(state.iteration < maxIterations && !state.isComplete){
                state.iteration++;
                // Yield thinking event
                yield {
                    type: 'status_thinking',
                    content: `Iteration ${state.iteration}: Generating response...`
                };
                yield {
                    type: 'progress_step',
                    content: `Iteration ${state.iteration}: analyzing context and drafting response`,
                    progressStatus: 'running',
                    progressCategory: 'analysis'
                };
                // Create completion options
                const completionOptions = {
                    model,
                    messages: state.messages,
                    temperature: this.options.temperature ?? 0.7,
                    maxTokens: this.options.maxTokens,
                    tools: (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$tools$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getToolsForMode"])(promptContext.chatMode),
                    stream: true,
                    ...providerCapabilities.supportsReasoning && this.options.reasoning ? {
                        reasoning: this.options.reasoning
                    } : {}
                };
                // Stream the completion
                let fullContent = '';
                let pendingToolCalls = [];
                let usage;
                let didPlanModeRewrite = false;
                let didBuildModeRewrite = false;
                let buildRewriteTriggeredDuringStream = false;
                let planRewriteTriggeredDuringStream = false;
                for await (const chunk of this.options.provider.completionStream(completionOptions)){
                    // Handle different chunk types
                    switch(chunk.type){
                        case 'text':
                            if (chunk.content) {
                                // In Build mode, prevent fenced code blocks from ever streaming into the UI.
                                // If we detect a code fence, stop streaming and do a single rewrite pass that uses tools/artifacts.
                                if (promptContext.chatMode === 'build') {
                                    const combined = fullContent + chunk.content;
                                    const fenceIndex = combined.indexOf('```');
                                    if (fenceIndex !== -1) {
                                        const safePrefixLen = Math.max(0, fenceIndex - fullContent.length);
                                        if (safePrefixLen > 0) {
                                            const safe = chunk.content.slice(0, safePrefixLen);
                                            fullContent += safe;
                                            yield {
                                                type: 'text',
                                                content: safe
                                            };
                                        }
                                        buildRewriteTriggeredDuringStream = true;
                                        break;
                                    }
                                }
                                // In Architect mode, prevent fenced code blocks from ever streaming into the UI.
                                // If we detect a code fence, stop streaming and do a single rewrite pass into plan format.
                                if (promptContext.chatMode === 'architect') {
                                    const combined = fullContent + chunk.content;
                                    const fenceIndex = combined.indexOf('```');
                                    if (fenceIndex !== -1) {
                                        const safePrefixLen = Math.max(0, fenceIndex - fullContent.length);
                                        if (safePrefixLen > 0) {
                                            const safe = chunk.content.slice(0, safePrefixLen);
                                            fullContent += safe;
                                            yield {
                                                type: 'text',
                                                content: safe
                                            };
                                        }
                                        planRewriteTriggeredDuringStream = true;
                                        break;
                                    }
                                }
                                fullContent += chunk.content;
                                yield {
                                    type: 'text',
                                    content: chunk.content
                                };
                            }
                            break;
                        case 'status_thinking':
                            yield {
                                type: 'status_thinking',
                                content: chunk.content
                            };
                            break;
                        case 'reasoning':
                            if (chunk.reasoningContent || chunk.content) {
                                yield {
                                    type: 'reasoning',
                                    reasoningContent: chunk.reasoningContent ?? chunk.content
                                };
                            }
                            break;
                        case 'tool_call':
                            if (chunk.toolCall) {
                                pendingToolCalls.push(chunk.toolCall);
                                yield {
                                    type: 'tool_call',
                                    toolCall: chunk.toolCall
                                };
                            }
                            break;
                        case 'finish':
                            if (chunk.usage) {
                                usage = chunk.usage;
                            }
                            break;
                        case 'error':
                            yield {
                                type: 'error',
                                error: chunk.error ?? 'Unknown error during streaming'
                            };
                            return;
                    }
                    if (buildRewriteTriggeredDuringStream) {
                        break;
                    }
                    if (planRewriteTriggeredDuringStream) {
                        break;
                    }
                }
                // Claude Code-style Plan Mode enforcement:
                // If the model outputs code in architect mode, do one automatic rewrite pass into plan format.
                if (promptContext.chatMode === 'architect' && !didPlanModeRewrite && (planRewriteTriggeredDuringStream || shouldRewriteDiscussResponse(fullContent))) {
                    didPlanModeRewrite = true;
                    yield {
                        type: 'status_thinking',
                        content: 'Plan Mode: rewriting response into a plan (no code)…'
                    };
                    yield {
                        type: 'progress_step',
                        content: 'Plan mode guardrail triggered: rewriting response into plan format',
                        progressStatus: 'running',
                        progressCategory: 'rewrite'
                    };
                    yield {
                        type: 'reset',
                        resetReason: 'plan_mode_rewrite'
                    };
                    const retryMessages = [
                        ...state.messages,
                        {
                            role: 'user',
                            content: 'Rewrite your previous answer into Plan Mode format. Do not include any fenced code blocks. ' + 'Follow the required Plan Mode structure (clarifying questions, proposed plan, risks, next step). ' + `\n\nPrevious answer:\n${fullContent}`
                        }
                    ];
                    const retryOptions = {
                        ...completionOptions,
                        messages: retryMessages,
                        // No tools in architect mode anyway, but keep explicit.
                        tools: undefined
                    };
                    fullContent = '';
                    pendingToolCalls = [];
                    usage = undefined;
                    for await (const chunk of this.options.provider.completionStream(retryOptions)){
                        switch(chunk.type){
                            case 'text':
                                if (chunk.content) {
                                    fullContent += chunk.content;
                                    yield {
                                        type: 'text',
                                        content: chunk.content
                                    };
                                }
                                break;
                            case 'finish':
                                if (chunk.usage) usage = chunk.usage;
                                break;
                            case 'error':
                                yield {
                                    type: 'error',
                                    error: chunk.error ?? 'Unknown error during streaming'
                                };
                                return;
                            // Ignore tool events in plan rewrite (should not happen)
                            default:
                                break;
                        }
                    }
                }
                // Claude Code-style Build Mode enforcement:
                // If the model dumps code blocks into chat OR "plans" without any tool calls when the user asked to build,
                // do one automatic rewrite pass that uses tools/artifacts.
                if (promptContext.chatMode === 'build' && !didBuildModeRewrite && (buildRewriteTriggeredDuringStream || shouldRewriteBuildResponse(fullContent) || shouldRetryBuildForToolUse({
                    promptContext,
                    content: fullContent,
                    pendingToolCalls
                }))) {
                    didBuildModeRewrite = true;
                    yield {
                        type: 'status_thinking',
                        content: 'Build Mode: rewriting response to use artifacts (no code blocks)…'
                    };
                    yield {
                        type: 'progress_step',
                        content: 'Build mode guardrail triggered: rewriting response to execute via tools',
                        progressStatus: 'running',
                        progressCategory: 'rewrite'
                    };
                    yield {
                        type: 'reset',
                        resetReason: 'build_mode_rewrite'
                    };
                    const retryMessages = [
                        ...state.messages,
                        {
                            role: 'user',
                            content: 'Your previous answer included fenced code blocks, which are not allowed in Build Mode. ' + 'If you only provided a plan without using tools, you must now EXECUTE the plan. ' + 'Redo the work using tools only:\n' + '- Use search_code or search_code_ast to locate relevant code quickly.\n' + '- Use read_files to inspect context as needed.\n' + '- Use write_files to apply code changes (complete file contents).\n' + '- Use run_command to validate.\n' + 'In chat, output only a short summary and next steps. Do not include any fenced code blocks.\n\n' + `Previous answer:\n${fullContent}`
                        }
                    ];
                    const retryOptions = {
                        ...completionOptions,
                        messages: retryMessages,
                        tools: (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$tools$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getToolsForMode"])(promptContext.chatMode)
                    };
                    fullContent = '';
                    pendingToolCalls = [];
                    usage = undefined;
                    for await (const chunk of this.options.provider.completionStream(retryOptions)){
                        switch(chunk.type){
                            case 'text':
                                if (chunk.content) {
                                    fullContent += chunk.content;
                                    yield {
                                        type: 'text',
                                        content: chunk.content
                                    };
                                }
                                break;
                            case 'tool_call':
                                if (chunk.toolCall) {
                                    pendingToolCalls.push(chunk.toolCall);
                                    yield {
                                        type: 'tool_call',
                                        toolCall: chunk.toolCall
                                    };
                                }
                                break;
                            case 'finish':
                                if (chunk.usage) usage = chunk.usage;
                                break;
                            case 'error':
                                yield {
                                    type: 'error',
                                    error: chunk.error ?? 'Unknown error during streaming'
                                };
                                return;
                            default:
                                break;
                        }
                    }
                }
                // Detect and extract inline tool calls (models that output tool calls as text JSON)
                // This happens when models don't properly support function calling
                if (pendingToolCalls.length === 0 && fullContent.includes('"name"') && fullContent.includes('"arguments"')) {
                    const extracted = extractInlineToolCalls(fullContent);
                    if (extracted.toolCalls.length > 0) {
                        fullContent = extracted.cleanedContent;
                        pendingToolCalls = extracted.toolCalls;
                        yield {
                            type: 'status_thinking',
                            content: `Detected ${extracted.toolCalls.length} inline tool call(s) in response`
                        };
                        for (const tc of extracted.toolCalls){
                            yield {
                                type: 'tool_call',
                                toolCall: tc
                            };
                        }
                    }
                }
                // Check for empty response - this can happen if the provider doesn't support tools
                // or if there's an API issue that didn't trigger an error event
                if (!fullContent.trim() && pendingToolCalls.length === 0) {
                    logRuntimeError('Empty response detected - no content and no tool calls');
                    yield {
                        type: 'error',
                        error: 'Model produced no output. This may indicate:\n' + '1. The provider (Z.ai) does not support tools/function calling\n' + '2. The API endpoint is not responding correctly\n' + '3. The model configuration is incompatible\n\n' + 'Try using Plan mode (no tools) or switching to a different provider.'
                    };
                    state.isComplete = true;
                    break;
                }
                // Add assistant message to history
                const assistantMessage = {
                    role: 'assistant',
                    content: fullContent,
                    ...pendingToolCalls.length > 0 && {
                        tool_calls: pendingToolCalls
                    }
                };
                state.messages.push(assistantMessage);
                // Handle tool calls if any
                if (pendingToolCalls.length > 0) {
                    // Limit tool calls per iteration to prevent abuse
                    if (pendingToolCalls.length > maxToolCallsPerIteration) {
                        yield {
                            type: 'status_thinking',
                            content: `Limiting to ${maxToolCallsPerIteration} tool calls out of ${pendingToolCalls.length} requested...`
                        };
                        pendingToolCalls = pendingToolCalls.slice(0, maxToolCallsPerIteration);
                    }
                    // Deduplicate tool calls
                    if (enableDeduplication) {
                        const uniqueToolCalls = [];
                        for (const toolCall of pendingToolCalls){
                            const toolHash = hashToolCall(toolCall);
                            if (state.executedToolCalls.has(toolHash)) {
                                yield {
                                    type: 'status_thinking',
                                    content: `Skipping duplicate tool call: ${toolCall.function.name}`
                                };
                                continue;
                            }
                            uniqueToolCalls.push(toolCall);
                            state.executedToolCalls.add(toolHash);
                        }
                        pendingToolCalls = uniqueToolCalls;
                    }
                    // Track tool call patterns for loop detection using full call signatures
                    // (name + arguments), not just tool names.
                    // This avoids false positives for legitimate repeated tools with different targets.
                    const currentToolPattern = buildToolCallPattern(pendingToolCalls);
                    state.toolCallHistory.push(currentToolPattern);
                    // Detect repeated identical tool call batches across recent iterations.
                    if (state.toolCallHistory.length >= toolLoopThreshold) {
                        const recentPatterns = state.toolCallHistory.slice(-toolLoopThreshold);
                        if (recentPatterns.every((pattern)=>pattern === recentPatterns[0])) {
                            const toolSummary = summarizeToolCallNames(pendingToolCalls);
                            yield {
                                type: 'error',
                                error: `Detected repeated identical tool calls: ${toolSummary || 'unknown tools'}. ` + 'Stopping to prevent infinite iteration.'
                            };
                            state.isComplete = true;
                            break;
                        }
                    }
                    // Execute each tool call
                    for (const toolCall of pendingToolCalls){
                        yield {
                            type: 'status_thinking',
                            content: `Executing tool: ${toolCall.function.name}...`
                        };
                        yield {
                            type: 'progress_step',
                            content: `Executing tool: ${toolCall.function.name}`,
                            progressStatus: 'running',
                            progressCategory: 'tool',
                            progressToolName: toolCall.function.name,
                            progressHasArtifactTarget: toolCall.function.name === 'write_files' || toolCall.function.name === 'run_command',
                            progressArgs: (()=>{
                                try {
                                    return JSON.parse(toolCall.function.arguments);
                                } catch (parseError) {
                                    void parseError;
                                    return undefined;
                                }
                            })()
                        };
                        const result = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$tools$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["executeTool"])(toolCall, this.toolContext);
                        state.toolResults.push(result);
                        yield {
                            type: 'tool_result',
                            toolResult: result
                        };
                        yield {
                            type: 'progress_step',
                            content: result.error ? `Tool failed: ${toolCall.function.name}` : `Tool completed: ${toolCall.function.name}`,
                            progressStatus: result.error ? 'error' : 'completed',
                            progressCategory: 'tool',
                            progressToolName: toolCall.function.name,
                            progressHasArtifactTarget: toolCall.function.name === 'write_files' || toolCall.function.name === 'run_command',
                            progressDurationMs: result.durationMs,
                            progressError: result.error
                        };
                        // Add tool result to messages
                        state.messages.push({
                            role: 'tool',
                            content: result.error ? `Error: ${result.error}\n\nOutput: ${result.output}` : result.output,
                            tool_call_id: toolCall.id
                        });
                    }
                    continue;
                }
                // No tool calls - agent is done
                state.isComplete = true;
                // Yield complete event
                yield {
                    type: 'progress_step',
                    content: 'Run complete: final response ready',
                    progressStatus: 'completed',
                    progressCategory: 'complete'
                };
                yield {
                    type: 'complete',
                    content: fullContent,
                    usage
                };
            }
            // Check if we hit max iterations
            if (state.iteration >= maxIterations && !state.isComplete) {
                yield {
                    type: 'error',
                    error: `Agent reached maximum iterations (${maxIterations}) without completing`
                };
            }
        } catch (error) {
            yield {
                type: 'error',
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }
    /**
   * Run the agent without streaming (returns complete result)
   */ async runSync(promptContext) {
        const events = [];
        for await (const event of this.run(promptContext)){
            events.push(event);
        }
        const completeEvent = events.find((e)=>e.type === 'complete');
        const errorEvent = events.find((e)=>e.type === 'error');
        const toolResults = events.filter((e)=>e.type === 'tool_result' && e.toolResult).map((e)=>e.toolResult);
        return {
            content: completeEvent?.content ?? '',
            toolResults,
            usage: completeEvent?.usage,
            error: errorEvent?.error
        };
    }
}
function mapChatModeToHarnessAgent(chatMode) {
    switch(chatMode){
        case 'architect':
            return 'plan';
        case 'code':
            return 'code';
        default:
            return chatMode;
    }
}
function completionMessagesToHarnessMessages(args) {
    const systemMessages = args.messages.filter((msg)=>msg.role === 'system' && typeof msg.content === 'string').map((msg)=>msg.content).filter(Boolean);
    const nonSystemMessages = args.messages.filter((msg)=>msg.role !== 'system');
    const lastUserIndex = [
        ...nonSystemMessages
    ].map((msg, index)=>({
            msg,
            index
        })).filter(({ msg })=>msg.role === 'user').map(({ index })=>index).pop();
    const toText = (msg)=>{
        if (Array.isArray(msg.content)) {
            return msg.content.map((part)=>typeof part === 'string' ? part : JSON.stringify(part)).join('\n');
        }
        return typeof msg.content === 'string' ? msg.content : '';
    };
    const convertToHarness = (msg)=>{
        if (msg.role === 'user') {
            const id = (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$harness$2f$identifier$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["ascending"])('msg_');
            return {
                id,
                sessionID: args.sessionID,
                role: 'user',
                time: {
                    created: Date.now()
                },
                parts: [
                    {
                        id: (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$harness$2f$identifier$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["ascending"])('part_'),
                        messageID: id,
                        sessionID: args.sessionID,
                        type: 'text',
                        text: toText(msg)
                    }
                ],
                agent: 'build'
            };
        }
        if (msg.role === 'assistant') {
            const id = (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$harness$2f$identifier$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["ascending"])('msg_');
            return {
                id,
                sessionID: args.sessionID,
                role: 'assistant',
                parentID: (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$harness$2f$identifier$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["ascending"])('msg_parent_'),
                parts: [
                    {
                        id: (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$harness$2f$identifier$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["ascending"])('part_'),
                        messageID: id,
                        sessionID: args.sessionID,
                        type: 'text',
                        text: toText(msg)
                    }
                ],
                time: {
                    created: Date.now(),
                    completed: Date.now()
                },
                modelID: 'legacy-context',
                providerID: 'legacy-context',
                mode: 'legacy',
                agent: 'legacy'
            };
        }
        if (msg.role === 'tool') {
            const id = (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$harness$2f$identifier$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["ascending"])('msg_');
            return {
                id,
                sessionID: args.sessionID,
                role: 'assistant',
                parentID: (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$harness$2f$identifier$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["ascending"])('msg_parent_'),
                parts: [
                    {
                        id: (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$harness$2f$identifier$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["ascending"])('part_'),
                        messageID: id,
                        sessionID: args.sessionID,
                        type: 'text',
                        synthetic: true,
                        text: `[Tool output]\n${toText(msg)}`
                    }
                ],
                time: {
                    created: Date.now(),
                    completed: Date.now()
                },
                modelID: 'tool-context',
                providerID: 'tool-context',
                mode: 'legacy',
                agent: 'legacy'
            };
        }
        return null;
    };
    const initialMessages = nonSystemMessages.filter((_msg, index)=>index !== lastUserIndex).map(convertToHarness).filter((msg)=>msg !== null);
    const finalUserContent = (lastUserIndex !== undefined ? toText(nonSystemMessages[lastUserIndex]) : '').trim() || 'Continue.';
    const userMessageID = (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$harness$2f$identifier$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["ascending"])('msg_');
    const userMessage = {
        id: userMessageID,
        sessionID: args.sessionID,
        role: 'user',
        time: {
            created: Date.now()
        },
        parts: [
            {
                id: (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$harness$2f$identifier$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["ascending"])('part_'),
                messageID: userMessageID,
                sessionID: args.sessionID,
                type: 'text',
                text: finalUserContent
            }
        ],
        agent: 'build',
        ...systemMessages.length > 0 ? {
            system: systemMessages.join('\n\n')
        } : {}
    };
    return {
        initialMessages,
        userMessage
    };
}
function createHarnessToolExecutors(toolContext) {
    const toolNames = [
        'read_files',
        'list_directory',
        'write_files',
        'run_command',
        'search_codebase',
        'search_code',
        'search_code_ast',
        'update_memory_bank',
        'task'
    ];
    const executors = new Map();
    for (const toolName of toolNames){
        executors.set(toolName, async (args)=>{
            const toolCall = {
                id: `harness-tool-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                type: 'function',
                function: {
                    name: toolName,
                    arguments: JSON.stringify(args)
                }
            };
            const result = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$tools$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["executeTool"])(toolCall, toolContext);
            return {
                output: result.output,
                ...result.error ? {
                    error: result.error
                } : {}
            };
        });
    }
    return executors;
}
class HarnessAgentRuntimeAdapter {
    options;
    toolContext;
    pendingSpecApprovalResolver;
    constructor(options, toolContext){
        this.options = options;
        this.toolContext = toolContext;
        this.pendingSpecApprovalResolver = null;
    }
    resolveSpecApproval(decision, spec) {
        if (!this.pendingSpecApprovalResolver) return;
        this.pendingSpecApprovalResolver({
            decision,
            spec
        });
        this.pendingSpecApprovalResolver = null;
    }
    async *run(promptContext, config) {
        const sessionID = config?.harnessSessionID ?? `harness_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const riskInterruptsEnabled = config?.harnessEnableRiskInterrupts ?? this.options.harnessEnableRiskInterrupts ?? true;
        const harnessEvalMode = config?.harnessEvalMode ?? this.options.harnessEvalMode;
        const specApprovalMode = config?.harnessSpecApprovalMode ?? 'auto_approve';
        const sessionPermissions = this.options.harnessSessionPermissions;
        this.pendingSpecApprovalResolver = null;
        if (sessionPermissions && Object.keys(sessionPermissions).length > 0) {
            __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$harness$2f$permissions$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["permissions"].setSessionPermissions(sessionID, sessionPermissions);
        }
        const harnessRuntimeConfig = {
            ...typeof config?.maxIterations === 'number' ? {
                maxSteps: config.maxIterations
            } : {},
            ...typeof config?.maxToolCallsPerIteration === 'number' ? {
                maxToolCallsPerStep: config.maxToolCallsPerIteration
            } : {},
            ...typeof config?.enableToolDeduplication === 'boolean' ? {
                enableToolDeduplication: config.enableToolDeduplication
            } : {},
            ...typeof config?.toolLoopThreshold === 'number' ? {
                toolLoopThreshold: config.toolLoopThreshold
            } : {},
            ...config?.harnessCheckpointStore ?? this.options.harnessCheckpointStore ? {
                checkpointStore: config?.harnessCheckpointStore ?? this.options.harnessCheckpointStore
            } : {},
            ...riskInterruptsEnabled ? {
                toolRiskPolicy: {
                    high: 'ask',
                    critical: 'ask'
                },
                onToolInterrupt: async (request)=>{
                    const target = request.patterns[0] || request.toolName;
                    const permissionResult = await __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$harness$2f$permissions$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["permissions"].request(request.sessionID, request.messageID, request.toolName, target, {
                        interrupt: true,
                        riskTier: request.riskTier,
                        reason: request.reason,
                        args: request.args
                    });
                    return permissionResult.granted ? {
                        decision: 'approve',
                        reason: permissionResult.reason
                    } : {
                        decision: 'reject',
                        reason: permissionResult.reason ?? 'Denied'
                    };
                }
            } : {},
            ...harnessEvalMode === 'read_only' ? {
                toolRiskOverrides: {
                    write_files: 'critical',
                    run_command: 'critical',
                    update_memory_bank: 'critical',
                    task: 'critical'
                },
                toolRiskPolicy: {
                    low: 'allow',
                    medium: 'allow',
                    high: 'deny',
                    critical: 'deny'
                }
            } : {},
            maxToolExecutionRetries: 1,
            toolRetryBackoffMs: 200,
            specEngine: {
                enabled: true,
                autoApproveAmbient: true,
                ...("TURBOPACK compile-time truthy", 1) ? {
                    defaultTier: 'explicit'
                } : "TURBOPACK unreachable"
            },
            onSpecApproval: async ({ spec })=>{
                if (specApprovalMode !== 'interactive') {
                    return {
                        decision: 'approve',
                        spec
                    };
                }
                return await new Promise((resolve)=>{
                    this.pendingSpecApprovalResolver = resolve;
                });
            }
        };
        const harnessRuntime = new __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$harness$2f$runtime$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Runtime"](this.options.provider, createHarnessToolExecutors(this.toolContext), harnessRuntimeConfig);
        const completionMessages = (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$prompt$2d$library$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getPromptForMode"])(promptContext);
        const { initialMessages, userMessage } = completionMessagesToHarnessMessages({
            sessionID,
            messages: completionMessages
        });
        userMessage.agent = __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$harness$2f$agents$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["agents"].has(mapChatModeToHarnessAgent(promptContext.chatMode)) ? mapChatModeToHarnessAgent(promptContext.chatMode) : 'build';
        let attemptText = '';
        let sawToolCall = false;
        let fenceTriggered = false;
        let pendingComplete = null;
        let shouldResume = false;
        if (config?.harnessAutoResume === true && (config.harnessCheckpointStore ?? this.options.harnessCheckpointStore)) {
            try {
                const checkpointStore = config.harnessCheckpointStore ?? this.options.harnessCheckpointStore;
                const checkpoint = await checkpointStore.load(sessionID);
                shouldResume = checkpoint !== null && checkpoint.reason !== 'complete';
            } catch (error) {
                logRuntimeError('Failed to load harness checkpoint, falling back to fresh run', error);
                shouldResume = false;
            }
        }
        const source = shouldResume ? harnessRuntime.resume(sessionID) : harnessRuntime.run(sessionID, userMessage, initialMessages);
        for await (const event of source){
            const mapped = mapHarnessEventToAgentEvent(event);
            if (!mapped) continue;
            if (mapped.type === 'tool_call') {
                sawToolCall = true;
                yield {
                    type: 'progress_step',
                    content: `Running tool: ${mapped.toolCall?.function.name ?? 'unknown'}`,
                    progressStatus: 'running',
                    progressCategory: 'tool',
                    progressToolName: mapped.toolCall?.function.name,
                    progressToolCallId: mapped.toolCall?.id,
                    progressArgs: mapped.toolCall ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$harness$2f$tool$2d$repair$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["safeJSONParse"])(mapped.toolCall.function.arguments, {}) ?? {} : undefined
                };
                yield mapped;
                continue;
            }
            if (mapped.type === 'tool_result') {
                yield {
                    type: 'progress_step',
                    content: `Tool ${mapped.toolResult?.error ? 'failed' : 'completed'}: ${mapped.toolResult?.toolName ?? 'unknown'}`,
                    progressStatus: mapped.toolResult?.error ? 'error' : 'completed',
                    progressCategory: 'tool',
                    progressToolName: mapped.toolResult?.toolName,
                    progressToolCallId: mapped.toolResult?.toolCallId,
                    progressArgs: mapped.toolResult?.args,
                    progressDurationMs: mapped.toolResult?.durationMs,
                    progressError: mapped.toolResult?.error
                };
                yield mapped;
                continue;
            }
            if (mapped.type === 'text' && mapped.content) {
                const isGuardrailMode = promptContext.chatMode === 'build' || promptContext.chatMode === 'architect';
                if (isGuardrailMode) {
                    const combined = attemptText + mapped.content;
                    const fenceIndex = combined.indexOf('```');
                    if (fenceIndex !== -1) {
                        const safePrefixLength = Math.max(0, fenceIndex - attemptText.length);
                        if (safePrefixLength > 0) {
                            const safeText = mapped.content.slice(0, safePrefixLength);
                            attemptText += safeText;
                            yield {
                                ...mapped,
                                content: safeText
                            };
                        }
                        fenceTriggered = true;
                        break;
                    }
                }
                attemptText += mapped.content;
                yield mapped;
                continue;
            }
            if (mapped.type === 'complete') {
                pendingComplete = {
                    ...mapped
                };
                continue;
            }
            yield mapped;
        }
        const shouldFallbackForArchitect = promptContext.chatMode === 'architect' && (fenceTriggered || shouldRewriteDiscussResponse(attemptText));
        const shouldFallbackForBuild = promptContext.chatMode === 'build' && (fenceTriggered || shouldRewriteBuildResponse(attemptText) || shouldRetryBuildForToolUse({
            promptContext,
            content: attemptText,
            pendingToolCalls: sawToolCall ? [
                {
                    id: 'x',
                    type: 'function',
                    function: {
                        name: 'tool',
                        arguments: '{}'
                    }
                }
            ] : []
        }));
        if (shouldFallbackForArchitect || shouldFallbackForBuild) {
            yield {
                type: 'status_thinking',
                content: promptContext.chatMode === 'architect' ? 'Plan Mode: rewriting response into a plan (no code)…' : 'Build Mode: rewriting response to use artifacts (no code blocks)…'
            };
            yield {
                type: 'progress_step',
                content: promptContext.chatMode === 'architect' ? 'Plan mode guardrail triggered: rewriting response into plan format' : 'Build mode guardrail triggered: rewriting response to execute via tools',
                progressStatus: 'running',
                progressCategory: 'rewrite'
            };
            // Rewrite within the harness instead of falling back to legacy runtime
            const rewriteMessage = {
                role: 'user',
                content: promptContext.chatMode === 'architect' ? 'Rewrite your previous answer into Plan Mode format. Do not include any fenced code blocks. Focus on architecture, design decisions, and implementation approach.' : 'Your previous answer included fenced code blocks, which are not allowed in Build Mode. Use the write_files tool to create or modify files instead. In chat, output only a short summary and next steps. Do not include any fenced code blocks.'
            };
            const rewriteMessages = [
                ...completionMessages,
                rewriteMessage
            ];
            const { initialMessages: rewriteInitialMessages, userMessage: rewriteUserMessage } = completionMessagesToHarnessMessages({
                sessionID: sessionID + '-rewrite',
                messages: rewriteMessages
            });
            rewriteUserMessage.agent = userMessage.agent;
            // Create a fresh harness runtime for the rewrite
            const rewriteRuntime = new __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$harness$2f$runtime$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Runtime"](this.options.provider, createHarnessToolExecutors(this.toolContext), harnessRuntimeConfig);
            // Continue with harness runtime for the rewrite
            for await (const event of rewriteRuntime.run(sessionID + '-rewrite', rewriteUserMessage, rewriteInitialMessages)){
                const mapped = mapHarnessEventToAgentEvent(event);
                if (!mapped) continue;
                if (mapped.type === 'text' && mapped.content) {
                    yield mapped;
                } else if (mapped.type === 'tool_result') {
                    yield mapped;
                } else if (mapped.type === 'complete') {
                    yield mapped;
                    return;
                } else {
                    yield mapped;
                }
            }
            yield {
                type: 'complete'
            };
            return;
        }
        if (pendingComplete) {
            yield pendingComplete;
        }
    }
    async runSync(promptContext) {
        let content = '';
        const toolResults = [];
        let usage;
        let error;
        for await (const event of this.run(promptContext)){
            if (event.type === 'text' && event.content) {
                content += event.content;
            }
            if (event.type === 'tool_result' && event.toolResult) {
                toolResults.push(event.toolResult);
            }
            if (event.type === 'complete' && event.usage) {
                usage = event.usage;
            }
            if (event.type === 'error' && event.error) {
                error = event.error;
            }
        }
        return {
            content,
            toolResults,
            usage,
            error
        };
    }
}
function mapHarnessEventToAgentEvent(event) {
    switch(event.type){
        case 'step_start':
            return {
                type: 'status_thinking',
                content: `Step ${event.step}: generating response...`
            };
        case 'reasoning':
            return {
                type: 'reasoning',
                reasoningContent: event.reasoningContent
            };
        case 'text':
            return {
                type: 'text',
                content: event.content
            };
        case 'tool_call':
            {
                return {
                    type: 'tool_call',
                    toolCall: event.toolCall
                };
            }
        case 'tool_result':
            {
                const toolResult = {
                    toolCallId: event.toolResult?.toolCallId ?? `harness-result-${Date.now()}`,
                    toolName: event.toolResult?.toolName ?? 'unknown',
                    args: event.toolResult?.args ?? {},
                    output: event.toolResult?.output ?? '',
                    error: event.toolResult?.error,
                    durationMs: event.toolResult?.durationMs ?? 0,
                    timestamp: Date.now(),
                    retryCount: 0
                };
                return {
                    type: 'tool_result',
                    toolResult
                };
            }
        case 'spec_pending_approval':
            return {
                type: 'spec_pending_approval',
                spec: event.spec,
                specTier: event.tier
            };
        case 'spec_generated':
            return {
                type: 'spec_generated',
                spec: event.spec,
                specTier: event.tier
            };
        case 'spec_verification':
            return {
                type: 'spec_verification',
                spec: event.spec,
                verification: event.verification
            };
        case 'permission_request':
        case 'permission_decision':
        case 'interrupt_request':
        case 'interrupt_decision':
            return {
                type: 'progress_step',
                content: event.content ?? event.type,
                progressStatus: event.type === 'permission_decision' || event.type === 'interrupt_decision' ? event.interrupt?.decision === 'reject' ? 'error' : 'completed' : 'running',
                progressCategory: 'tool',
                progressToolName: event.interrupt?.toolName,
                progressError: event.type === 'interrupt_decision' && event.interrupt?.decision === 'reject' ? event.interrupt.reason : undefined
            };
        case 'subagent_start':
            return {
                type: 'progress_step',
                content: `Subagent started: ${event.subagent?.agent ?? 'unknown'}`,
                progressStatus: 'running',
                progressCategory: 'analysis',
                progressToolName: 'task',
                progressToolCallId: event.subagent?.id
            };
        case 'subagent_complete':
            return {
                type: 'progress_step',
                content: `Subagent completed: ${event.subagent?.agent ?? 'unknown'}`,
                progressStatus: event.subagent?.success === false ? 'error' : 'completed',
                progressCategory: 'analysis',
                progressToolName: 'task',
                progressToolCallId: event.subagent?.id,
                progressError: event.subagent?.error
            };
        case 'snapshot':
            return {
                type: 'snapshot',
                content: event.content,
                snapshot: event.snapshot
            };
        case 'error':
            return {
                type: 'error',
                error: event.error
            };
        case 'complete':
            return {
                type: 'complete',
                usage: event.usage ? {
                    promptTokens: event.usage.input,
                    completionTokens: event.usage.output,
                    totalTokens: event.usage.input + event.usage.output + (event.usage.reasoning ?? 0)
                } : undefined
            };
        default:
            return null;
    }
}
function createAgentRuntime(options, toolContext) {
    return new HarnessAgentRuntimeAdapter(options, toolContext);
}
async function runAgent(provider, promptContext, toolContext, options = {}) {
    const runtime = createAgentRuntime({
        provider,
        ...options
    }, toolContext);
    return runtime.runSync(promptContext);
}
async function* streamAgent(provider, promptContext, toolContext, options = {}, config) {
    const runtime = createAgentRuntime({
        provider,
        ...options
    }, toolContext);
    yield* runtime.run(promptContext, config);
}
}),
"[project]/apps/web/lib/agent/index.ts [app-ssr] (ecmascript) <locals>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([]);
/**
 * Agent Library
 *
 * Main exports for the agent runtime system.
 */ var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$prompt$2d$library$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/lib/agent/prompt-library.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$tools$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/lib/agent/tools.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$runtime$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/lib/agent/runtime.ts [app-ssr] (ecmascript)");
;
;
;
}),
"[project]/apps/web/lib/chat/error-messages.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "getUserFacingAgentError",
    ()=>getUserFacingAgentError,
    "isRateLimitError",
    ()=>isRateLimitError,
    "parseRetryAfterSeconds",
    ()=>parseRetryAfterSeconds
]);
function parseRetryAfterSeconds(message) {
    const directMatch = message.match(/retry[-\s_]?after[:=\s]+(\d{1,5})/i);
    if (directMatch) {
        const seconds = Number(directMatch[1]);
        return Number.isFinite(seconds) && seconds > 0 ? seconds : null;
    }
    const bracketMatch = message.match(/retry[-\s_]?after[^0-9]*(\d{1,5})/i);
    if (bracketMatch) {
        const seconds = Number(bracketMatch[1]);
        return Number.isFinite(seconds) && seconds > 0 ? seconds : null;
    }
    return null;
}
function isRateLimitError(rawError) {
    const message = (rawError || '').toLowerCase();
    return message.includes('status 429') || message.includes(' 429') || message.includes('rate limit') || message.includes('too many requests');
}
function getUserFacingAgentError(rawError) {
    const message = (rawError || 'Unknown error').trim();
    const isRateLimited = isRateLimitError(message);
    if (isRateLimited) {
        const retryAfterSeconds = parseRetryAfterSeconds(message);
        const retryHint = retryAfterSeconds ? ` Retry after about ${retryAfterSeconds} seconds.` : '';
        return {
            title: 'Provider rate limited (429)',
            description: `Your LLM provider rejected the request due to rate limits or quota.${retryHint}` + ' Try again shortly, switch to another model/provider, or increase provider credits/limits.'
        };
    }
    return {
        title: 'Agent error',
        description: message
    };
}
}),
"[project]/apps/web/lib/agent/automationPolicy.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "buildHarnessSessionPermissions",
    ()=>buildHarnessSessionPermissions,
    "getDefaultPolicyForMode",
    ()=>getDefaultPolicyForMode,
    "isCommandAllowedByPrefix",
    ()=>isCommandAllowedByPrefix,
    "normalizePrefixList",
    ()=>normalizePrefixList,
    "resolveEffectiveAgentPolicy",
    ()=>resolveEffectiveAgentPolicy,
    "shouldAutoApplyArtifact",
    ()=>shouldAutoApplyArtifact
]);
function normalizePrefixList(prefixes) {
    return (prefixes ?? []).map((p)=>p.trim()).filter(Boolean);
}
function isCommandAllowedByPrefix(command, allowedPrefixes) {
    const cmd = command.trim().toLowerCase();
    if (!cmd) return false;
    for (const rawPrefix of allowedPrefixes){
        const prefix = rawPrefix.trim().toLowerCase();
        if (!prefix) continue;
        if (cmd === prefix) return true;
        if (cmd.startsWith(prefix + ' ')) return true;
    }
    return false;
}
function getDefaultPolicyForMode(mode) {
    const isWriteMode = mode === 'code' || mode === 'build';
    return {
        autoApplyFiles: isWriteMode,
        autoRunCommands: false,
        allowedCommandPrefixes: []
    };
}
function resolveEffectiveAgentPolicy(args) {
    const modeDefaults = args.mode ? getDefaultPolicyForMode(args.mode) : getDefaultPolicyForMode('code');
    const defaults = modeDefaults;
    const base = args.userDefaults ?? defaults;
    const project = args.projectPolicy;
    if (!project) return base;
    return {
        autoApplyFiles: project.autoApplyFiles,
        autoRunCommands: project.autoRunCommands,
        allowedCommandPrefixes: normalizePrefixList(project.allowedCommandPrefixes)
    };
}
function shouldAutoApplyArtifact(policy, artifact) {
    if (artifact.type === 'file_write') return policy.autoApplyFiles;
    if (!policy.autoRunCommands) return false;
    return isCommandAllowedByPrefix(artifact.payload.command, policy.allowedCommandPrefixes);
}
function buildHarnessSessionPermissions(policy) {
    const permissions = {};
    if (!policy.autoRunCommands) {
        return permissions;
    }
    for (const prefix of normalizePrefixList(policy.allowedCommandPrefixes)){
        permissions[`run_command:${prefix}*`] = 'allow';
    }
    return permissions;
}
}),
"[project]/apps/web/lib/agent/context/repo-overview.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * Repo Overview Generator
 *
 * Generates a structured project overview from file tree and config files.
 * Zero LLM cost - deterministic analysis.
 */ __turbopack_context__.s([
    "formatOverviewForPrompt",
    ()=>formatOverviewForPrompt,
    "generateRepoOverview",
    ()=>generateRepoOverview
]);
const EXCLUDED_DIRS = [
    'node_modules',
    '.git',
    '.next',
    'dist',
    'build',
    '.turbo',
    'coverage',
    '.coverage'
];
const EXCLUDED_FILES = [
    '.DS_Store',
    '.gitignore',
    '.env',
    '.env.local',
    '.env.development',
    '.env.production',
    'package-lock.json',
    'yarn.lock',
    'bun.lockb',
    'pnpm-lock.yaml'
];
const ENTRY_POINT_PATTERNS = [
    /^index\.(ts|tsx|js|jsx)$/i,
    /^main\.(ts|tsx|js|jsx)$/i,
    /^app\.(ts|tsx|js|jsx)$/i,
    /^server\.(ts|tsx|js|jsx)$/i,
    /^cli\.(ts|tsx|js|jsx)$/i
];
const CONFIG_FILES = [
    'package.json',
    'tsconfig.json',
    'jsconfig.json',
    'vite.config.ts',
    'vite.config.js',
    'next.config.ts',
    'next.config.js',
    'tailwind.config.ts',
    'tailwind.config.js',
    'jest.config.ts',
    'jest.config.js',
    'vitest.config.ts',
    'vitest.config.js',
    'Cargo.toml',
    'go.mod',
    'requirements.txt',
    'pyproject.toml',
    'Dockerfile',
    'docker-compose.yml',
    'turbo.json'
];
function generateRepoOverview(files, projectName, projectDescription) {
    const validFiles = files.filter((f)=>isValidFile(f.path));
    const tree = buildDirectoryTree(validFiles.map((f)=>f.path));
    const techStack = detectTechStack(validFiles);
    const entryPoints = findEntryPoints(validFiles);
    const { buildCommands, testCommands } = extractCommands(validFiles, techStack.packageManager);
    const coreFiles = findCoreFiles(validFiles);
    const overview = {
        projectName,
        projectDescription,
        directoryTree: tree,
        techStack,
        entryPoints,
        buildCommands,
        testCommands,
        coreFiles,
        fileCount: validFiles.length,
        tokenCount: 0
    };
    overview.tokenCount = estimateTokenCount(overview);
    return overview;
}
function formatOverviewForPrompt(overview) {
    const lines = [];
    lines.push(`## Project: ${overview.projectName}`);
    if (overview.projectDescription) {
        lines.push(`**Description:** ${overview.projectDescription}`);
    }
    lines.push('');
    // Tech Stack
    if (overview.techStack.languages.length > 0) {
        lines.push(`**Stack:** ${overview.techStack.languages.join(', ')}`);
    }
    if (overview.techStack.frameworks.length > 0) {
        lines.push(`**Frameworks:** ${overview.techStack.frameworks.join(', ')}`);
    }
    if (overview.techStack.buildTools.length > 0) {
        lines.push(`**Build:** ${overview.techStack.buildTools.join(', ')}`);
    }
    lines.push('');
    // Directory Tree (limited depth)
    lines.push('**Structure:**');
    lines.push('```');
    lines.push(truncateTree(overview.directoryTree, 3));
    lines.push('```');
    lines.push('');
    // Entry Points
    if (overview.entryPoints.length > 0) {
        lines.push(`**Entry Points:** ${overview.entryPoints.slice(0, 5).join(', ')}`);
    }
    // Commands
    if (overview.buildCommands.length > 0) {
        lines.push(`**Build:** \`${overview.buildCommands.slice(0, 3).join('`, `')}\``);
    }
    if (overview.testCommands.length > 0) {
        lines.push(`**Test:** \`${overview.testCommands.slice(0, 3).join('`, `')}\``);
    }
    // Core Files
    if (overview.coreFiles.length > 0) {
        lines.push(`**Key Files:** ${overview.coreFiles.slice(0, 5).join(', ')}`);
    }
    lines.push(`**Total Files:** ${overview.fileCount}`);
    let output = lines.join('\n');
    // Hard cap at ~800 tokens (roughly 3200 chars)
    if (output.length > 3200) {
        output = output.slice(0, 3200) + '\n\n[... truncated to fit token budget]';
    }
    return output;
}
function isValidFile(path) {
    const parts = path.split('/');
    // Check excluded directories
    for (const part of parts){
        if (EXCLUDED_DIRS.includes(part)) return false;
    }
    // Check excluded files
    const filename = parts[parts.length - 1];
    if (EXCLUDED_FILES.includes(filename)) return false;
    return true;
}
function buildDirectoryTree(paths) {
    const tree = {};
    for (const path of paths){
        const parts = path.split('/').filter(Boolean);
        let current = tree;
        for (const part of parts){
            if (!current[part]) {
                current[part] = {};
            }
            current = current[part];
        }
    }
    return renderTree(tree, '', 0, 3);
}
function renderTree(node, prefix, depth, maxDepth) {
    if (depth > maxDepth) {
        return prefix + '[...]';
    }
    const entries = Object.entries(node).sort(([a], [b])=>a.localeCompare(b));
    const lines = [];
    for(let i = 0; i < entries.length; i++){
        const [name, children] = entries[i];
        const isLast = i === entries.length - 1;
        const connector = isLast ? '└── ' : '├── ';
        const childPrefix = isLast ? '    ' : '│   ';
        lines.push(prefix + connector + name);
        const childKeys = Object.keys(children);
        if (childKeys.length > 0) {
            if (depth < maxDepth) {
                const childTree = renderTree(children, prefix + childPrefix, depth + 1, maxDepth);
                lines.push(childTree);
            } else {
                lines.push(prefix + childPrefix + '[...]');
            }
        }
    }
    return lines.join('\n');
}
function truncateTree(tree, maxLines) {
    const lines = tree.split('\n');
    if (lines.length <= maxLines) return tree;
    return lines.slice(0, maxLines).join('\n') + '\n...';
}
function detectTechStack(files) {
    const stack = {
        languages: [],
        frameworks: [],
        buildTools: []
    };
    const fileSet = new Set(files.map((f)=>f.path.toLowerCase()));
    const hasFile = (name)=>fileSet.has(name.toLowerCase());
    // Detect languages and frameworks
    if (hasFile('package.json')) {
        const pkgFile = files.find((f)=>f.path.toLowerCase() === 'package.json');
        if (pkgFile?.content) {
            try {
                const pkg = JSON.parse(pkgFile.content);
                // Package manager
                if (hasFile('bun.lockb')) stack.packageManager = 'bun';
                else if (hasFile('pnpm-lock.yaml')) stack.packageManager = 'pnpm';
                else if (hasFile('yarn.lock')) stack.packageManager = 'yarn';
                else stack.packageManager = 'npm';
                // Runtime
                if (pkg.engines?.node) stack.runtime = `node${pkg.engines.node.replace('>=', '')}`;
                // Frameworks from dependencies
                const deps = {
                    ...pkg.dependencies,
                    ...pkg.devDependencies
                };
                if (deps.next) stack.frameworks.push('Next.js');
                if (deps.react) stack.frameworks.push('React');
                if (deps.vue) stack.frameworks.push('Vue');
                if (deps['@angular/core']) stack.frameworks.push('Angular');
                if (deps.express) stack.frameworks.push('Express');
                if (deps.fastify) stack.frameworks.push('Fastify');
                if (deps.nestjs) stack.frameworks.push('NestJS');
                if (deps.convex) stack.frameworks.push('Convex');
                // Build tools
                if (deps.vite) stack.buildTools.push('Vite');
                if (deps.webpack) stack.buildTools.push('Webpack');
                if (deps.turbo) stack.buildTools.push('Turborepo');
                if (deps['@tailwindcss/postcss'] || deps.tailwindcss) stack.buildTools.push('Tailwind');
                if (deps.typescript || hasFile('tsconfig.json')) {
                    if (!stack.languages.includes('TypeScript')) {
                        stack.languages.push('TypeScript');
                    }
                }
            } catch  {
            // Ignore parse errors
            }
        }
        if (!stack.languages.includes('JavaScript')) {
            stack.languages.push('JavaScript');
        }
    }
    if (hasFile('tsconfig.json') && !stack.languages.includes('TypeScript')) {
        stack.languages.push('TypeScript');
    }
    if (hasFile('cargo.toml')) {
        stack.languages.push('Rust');
        stack.buildTools.push('Cargo');
    }
    if (hasFile('go.mod')) {
        stack.languages.push('Go');
    }
    if (hasFile('requirements.txt') || hasFile('pyproject.toml')) {
        stack.languages.push('Python');
    }
    return stack;
}
function findEntryPoints(files) {
    const entryPoints = [];
    for (const file of files){
        const filename = file.path.split('/').pop() || '';
        if (ENTRY_POINT_PATTERNS.some((pattern)=>pattern.test(filename))) {
            entryPoints.push(file.path);
        }
    }
    return entryPoints.sort();
}
function extractCommands(files, packageManager = 'npm') {
    const buildCommands = [];
    const testCommands = [];
    const pkgFile = files.find((f)=>f.path.toLowerCase() === 'package.json');
    if (pkgFile?.content) {
        try {
            const pkg = JSON.parse(pkgFile.content);
            const scripts = pkg.scripts || {};
            // Determine run command based on package manager
            const runCmd = packageManager === 'npm' ? 'npm run' : `${packageManager} run`;
            const startCmd = packageManager === 'npm' ? 'npm start' : `${packageManager} start`;
            const testCmd = packageManager === 'npm' ? 'npm test' : `${packageManager} test`;
            // Build commands
            if (scripts.build) buildCommands.push(`${runCmd} build`);
            if (scripts.dev) buildCommands.push(`${runCmd} dev`);
            if (scripts.start) buildCommands.push(startCmd);
            // Test commands
            if (scripts.test) testCommands.push(testCmd);
            if (scripts['test:unit']) testCommands.push(`${runCmd} test:unit`);
            if (scripts['test:e2e']) testCommands.push(`${runCmd} test:e2e`);
        } catch  {
        // Ignore parse errors
        }
    }
    return {
        buildCommands,
        testCommands
    };
}
function findCoreFiles(files) {
    const coreFiles = [];
    for (const file of files){
        const filename = file.path.split('/').pop() || '';
        const dirDepth = file.path.split('/').length - 1;
        // Root-level config files
        if (dirDepth === 0 && CONFIG_FILES.includes(filename)) {
            coreFiles.push(file.path);
            continue;
        }
        // Main application files
        if (filename.startsWith('main.') || filename.startsWith('index.') || filename.startsWith('app.') || filename.startsWith('layout.') || filename.startsWith('page.') || filename.startsWith('route.')) {
            if (dirDepth <= 2) {
                coreFiles.push(file.path);
            }
        }
    }
    return coreFiles.slice(0, 10).sort();
}
function estimateTokenCount(overview) {
    // Rough estimate: 1 token ≈ 4 characters for English text
    const formatted = formatOverviewForPrompt(overview);
    return Math.ceil(formatted.length / 4);
}
}),
"[project]/apps/web/lib/agent/harness/convex-checkpoint-store.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ConvexCheckpointStore",
    ()=>ConvexCheckpointStore
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$convex$2f$_generated$2f$api$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/convex/_generated/api.js [app-ssr] (ecmascript)");
;
const typedHarnessApi = __TURBOPACK__imported__module__$5b$project$5d2f$convex$2f$_generated$2f$api$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["api"];
function isRecord(value) {
    return typeof value === 'object' && value !== null;
}
function isRuntimeCheckpoint(value) {
    if (!isRecord(value)) return false;
    if (value.version !== 1) return false;
    if (typeof value.sessionID !== 'string') return false;
    if (typeof value.agentName !== 'string') return false;
    if (value.reason !== 'step' && value.reason !== 'complete' && value.reason !== 'error') return false;
    if (typeof value.savedAt !== 'number') return false;
    if (!isRecord(value.state)) return false;
    return typeof value.state.sessionID === 'string';
}
class ConvexCheckpointStore {
    convex;
    scope;
    constructor(convex, scope){
        this.convex = convex;
        this.scope = scope;
    }
    async save(checkpoint) {
        if (!this.scope.runId && !this.scope.chatId) {
            throw new Error('ConvexCheckpointStore.save requires scope.runId or scope.chatId');
        }
        const args = {
            checkpoint,
            ...this.scope.runId ? {
                runId: this.scope.runId
            } : {},
            ...this.scope.chatId ? {
                chatId: this.scope.chatId
            } : {}
        };
        await this.convex.mutation(typedHarnessApi.agentRuns.saveRuntimeCheckpoint, args);
    }
    async load(sessionID) {
        const args = {
            sessionID,
            ...this.scope.runId ? {
                runId: this.scope.runId
            } : {},
            ...this.scope.chatId ? {
                chatId: this.scope.chatId
            } : {},
            ...this.scope.projectId ? {
                projectId: this.scope.projectId
            } : {}
        };
        const result = await this.convex.query(typedHarnessApi.agentRuns.getLatestRuntimeCheckpoint, args);
        if (result == null) return null;
        if (!isRuntimeCheckpoint(result)) {
            throw new Error('Invalid runtime checkpoint payload returned from Convex');
        }
        return result;
    }
}
}),
"[project]/apps/web/lib/agent/context/file-ranker.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * File Relevance Scorer
 *
 * Ranks files by relevance to the current user query and context.
 */ __turbopack_context__.s([
    "applyBudget",
    ()=>applyBudget,
    "rankFiles",
    ()=>rankFiles
]);
// Scoring weights
const WEIGHTS = {
    mentionedInMessage: 0.4,
    openInTab: 0.25,
    recentlyModified: 0.2,
    structuralImportance: 0.15
};
function rankFiles(options) {
    const { files, userMessage, openTabs = [], recentThresholdMinutes = 30 } = options;
    const now = Date.now();
    const recentThresholdMs = recentThresholdMinutes * 60 * 1000;
    const scored = files.map((file)=>{
        const scores = {
            mentionedInMessage: scoreMentionedInMessage(file, userMessage),
            openInTab: scoreOpenInTab(file, openTabs),
            recentlyModified: scoreRecentlyModified(file, now, recentThresholdMs),
            structuralImportance: scoreStructuralImportance(file)
        };
        const totalScore = scores.mentionedInMessage * WEIGHTS.mentionedInMessage + scores.openInTab * WEIGHTS.openInTab + scores.recentlyModified * WEIGHTS.recentlyModified + scores.structuralImportance * WEIGHTS.structuralImportance;
        return {
            ...file,
            score: totalScore,
            scores
        };
    });
    return scored.sort((a, b)=>b.score - a.score);
}
function applyBudget(rankedFiles, tokenBudget, options) {
    const fullContentLimit = options?.fullContentLimit ?? Math.max(5, Math.floor(rankedFiles.length * 0.1));
    const signatureLimit = options?.signatureLimit ?? Math.max(15, Math.floor(rankedFiles.length * 0.3));
    return rankedFiles.map((file, index)=>{
        if (index < fullContentLimit && file.content) {
            return {
                path: file.path,
                content: file.content,
                contentLevel: 'full',
                score: file.score
            };
        } else if (index < signatureLimit && file.content) {
            return {
                path: file.path,
                content: extractSignatures(file.content),
                contentLevel: 'signature',
                score: file.score
            };
        } else {
            return {
                path: file.path,
                contentLevel: 'path',
                score: file.score
            };
        }
    });
}
/**
 * Score: File path appears in user message
 */ function scoreMentionedInMessage(file, userMessage) {
    if (!userMessage) return 0;
    const normalizedMessage = userMessage.toLowerCase();
    const normalizedPath = file.path.toLowerCase();
    const filename = normalizedPath.split('/').pop() || '';
    // Direct path mention
    if (normalizedMessage.includes(normalizedPath)) return 1.0;
    // Filename mention
    if (normalizedMessage.includes(filename)) return 0.9;
    // Filename without extension
    const basename = filename.replace(/\.[^/.]+$/, '');
    if (basename && normalizedMessage.includes(basename)) return 0.8;
    // Partial path match (directory mentioned)
    const parts = normalizedPath.split('/');
    for (const part of parts){
        if (part.length > 2 && normalizedMessage.includes(part)) {
            return 0.5;
        }
    }
    return 0;
}
/**
 * Score: File is open in a workbench tab
 */ function scoreOpenInTab(file, openTabs) {
    return openTabs.some((tab)=>tab.toLowerCase() === file.path.toLowerCase()) ? 1.0 : 0;
}
/**
 * Score: File was recently modified
 */ function scoreRecentlyModified(file, now, thresholdMs) {
    if (!file.updatedAt) return 0;
    const ageMs = now - file.updatedAt;
    if (ageMs > thresholdMs) return 0;
    // Linear decay: 1.0 at time 0, 0.0 at threshold
    return 1.0 - ageMs / thresholdMs;
}
/**
 * Score: File has structural importance (root level, config, entry points)
 */ function scoreStructuralImportance(file) {
    const path = file.path.toLowerCase();
    const filename = path.split('/').pop() || '';
    const depth = path.split('/').length - 1;
    let score = 0;
    // Root-level files
    if (depth === 0) score += 0.3;
    // Config files
    const configPatterns = [
        /^package\.json$/,
        /^tsconfig\.json$/,
        /^next\.config\./,
        /^vite\.config\./,
        /^tailwind\.config\./,
        /^jest\.config\./,
        /^\.env/,
        /^dockerfile$/i,
        /^docker-compose/
    ];
    if (configPatterns.some((pattern)=>pattern.test(filename))) {
        score += 0.4;
    }
    // Entry points
    const entryPatterns = [
        /^index\.(ts|tsx|js|jsx|py|rs|go)$/,
        /^main\.(ts|tsx|js|jsx|py|rs|go)$/,
        /^app\.(ts|tsx|js|jsx|py|rs|go)$/,
        /^server\.(ts|tsx|js|jsx|py|rs|go)$/,
        /^cli\.(ts|tsx|js|jsx|py|rs|go)$/
    ];
    if (entryPatterns.some((pattern)=>pattern.test(filename))) {
        score += 0.3;
    }
    return Math.min(score, 1.0);
}
/**
 * Extract function/class signatures from code
 */ function extractSignatures(content) {
    const signatures = [];
    // Match exported functions
    const functionMatches = content.match(/^(export\s+)?(async\s+)?function\s+\w+\s*\([^)]*\)/gm);
    if (functionMatches) {
        signatures.push(...functionMatches.slice(0, 5));
    }
    // Match arrow function exports
    const arrowMatches = content.match(/^(export\s+)?(const|let|var)\s+\w+\s*=\s*(async\s*)?\([^)]*\)\s*=>/gm);
    if (arrowMatches) {
        signatures.push(...arrowMatches.slice(0, 5));
    }
    // Match class declarations
    const classMatches = content.match(/^(export\s+)?class\s+\w+/gm);
    if (classMatches) {
        signatures.push(...classMatches.slice(0, 3));
    }
    // Match interface/type declarations
    const typeMatches = content.match(/^(export\s+)?(interface|type)\s+\w+/gm);
    if (typeMatches) {
        signatures.push(...typeMatches.slice(0, 3));
    }
    return signatures.length > 0 ? signatures.join('\n') : undefined;
}
}),
"[project]/apps/web/lib/agent/context/plan-context.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "buildPlanContext",
    ()=>buildPlanContext
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$context$2f$file$2d$ranker$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/lib/agent/context/file-ranker.ts [app-ssr] (ecmascript)");
;
function scorePlanningPath(path) {
    const normalized = path.toLowerCase();
    if (normalized.includes('/app/') || normalized.includes('/pages/') || normalized.includes('schema') || normalized.includes('/api/') || normalized.includes('/components/') || normalized.includes('/hooks/') || normalized.includes('/e2e/') || normalized.endsWith('.test.ts') || normalized.endsWith('.spec.ts')) {
        return 1;
    }
    if (normalized.includes('/lib/') || normalized.includes('/convex/')) {
        return 0.6;
    }
    return 0;
}
function buildPlanContext({ files, userMessage, openTabs = [] }) {
    if (!userMessage.trim() || files.length === 0) return null;
    const ranked = (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$context$2f$file$2d$ranker$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["rankFiles"])({
        files,
        userMessage,
        openTabs
    }).map((file)=>({
            ...file,
            planningPathScore: scorePlanningPath(file.path),
            boostedScore: file.score + scorePlanningPath(file.path) * 0.35
        }));
    const prioritized = [
        ...ranked
    ].sort((a, b)=>b.boostedScore - a.boostedScore).filter((file)=>file.planningPathScore > 0 || file.scores.mentionedInMessage > 0 || file.scores.openInTab > 0 || file.scores.recentlyModified > 0);
    if (prioritized.length === 0) return null;
    const budgeted = (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$context$2f$file$2d$ranker$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["applyBudget"])(prioritized.map((file)=>({
            path: file.path,
            content: file.content,
            score: file.boostedScore,
            scores: file.scores,
            updatedAt: file.updatedAt
        })), 1200, {
        fullContentLimit: 2,
        signatureLimit: 6
    }).slice(0, 6);
    const lines = [
        '## Likely Relevant Files'
    ];
    for (const file of budgeted){
        if (file.contentLevel === 'path') {
            lines.push(`- ${file.path}`);
            continue;
        }
        lines.push(`- ${file.path}`);
        if (file.content) {
            lines.push('```');
            lines.push(file.content);
            lines.push('```');
        }
    }
    return lines.join('\n');
}
}),
"[project]/apps/web/lib/chat/backgroundExecution.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "resolveBackgroundExecutionPolicy",
    ()=>resolveBackgroundExecutionPolicy
]);
function resolveBackgroundExecutionPolicy(_mode) {
    return {
        harnessSpecApprovalMode: 'auto_approve',
        autoOpenInspectorOnExecutionStart: false,
        autoOpenInspectorOnPlanExecution: false,
        showInlinePlanReview: true,
        showInlineSpecReview: true,
        showInlineRunTimeline: true
    };
}
}),
"[project]/apps/web/lib/agent/session-controller.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "buildAgentPromptContext",
    ()=>buildAgentPromptContext,
    "buildAgentRuntimeConfig",
    ()=>buildAgentRuntimeConfig,
    "createAgentCheckpointStore",
    ()=>createAgentCheckpointStore
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$harness$2f$convex$2d$checkpoint$2d$store$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/lib/agent/harness/convex-checkpoint-store.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$context$2f$plan$2d$context$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/lib/agent/context/plan-context.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$chat$2f$backgroundExecution$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/lib/chat/backgroundExecution.ts [app-ssr] (ecmascript)");
;
;
;
function buildAgentPromptContext(args) {
    const projectOverview = args.mode === 'architect' && args.projectFiles ? [
        args.projectOverviewContent,
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$context$2f$plan$2d$context$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["buildPlanContext"])({
            files: args.projectFiles,
            userMessage: args.userContent
        })
    ].filter((value)=>Boolean(value)).join('\n\n') || undefined : args.projectOverviewContent ?? undefined;
    return {
        projectId: args.projectId,
        chatId: args.chatId,
        userId: args.userId,
        projectName: args.projectName,
        projectDescription: args.projectDescription,
        chatMode: args.mode,
        provider: args.provider,
        previousMessages: args.previousMessages,
        projectOverview,
        memoryBank: args.memoryBankContent ?? undefined,
        userMessage: args.contextFiles && args.contextFiles.length > 0 ? `${args.userContent}\n\n[Context files referenced by user: ${args.contextFiles.map((file)=>`@file:${file}`).join(', ')}. Read these files first when relevant to the request.]` : args.userContent,
        customInstructions: args.architectBrainstormEnabled ? 'Architect brainstorming protocol: enabled' : undefined
    };
}
function buildAgentRuntimeConfig(args) {
    return {
        maxIterations: 10,
        maxToolCallsPerIteration: 50,
        enableToolDeduplication: true,
        toolLoopThreshold: 3,
        harnessSessionID: args.harnessSessionID ?? `harness_run_${args.runId}`,
        harnessAutoResume: true,
        harnessSpecApprovalMode: (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$chat$2f$backgroundExecution$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["resolveBackgroundExecutionPolicy"])(args.mode).harnessSpecApprovalMode
    };
}
function createAgentCheckpointStore(args) {
    if (args.harnessSessionID) {
        return {
            async save (checkpoint) {
                await new __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$harness$2f$convex$2d$checkpoint$2d$store$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["ConvexCheckpointStore"](args.client, {
                    runId: args.runId,
                    chatId: args.chatId,
                    projectId: args.projectId
                }).save(checkpoint);
            },
            async load (sessionID) {
                return await new __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$harness$2f$convex$2d$checkpoint$2d$store$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["ConvexCheckpointStore"](args.client, {
                    chatId: args.chatId,
                    projectId: args.projectId
                }).load(sessionID);
            }
        };
    }
    return new __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$harness$2f$convex$2d$checkpoint$2d$store$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["ConvexCheckpointStore"](args.client, {
        runId: args.runId,
        chatId: args.chatId,
        projectId: args.projectId
    });
}
}),
"[project]/apps/web/lib/llm/providers/error-utils.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * Check if an error indicates context overflow
 * Parses provider-specific error messages for context length exceeded
 */ __turbopack_context__.s([
    "formatProviderError",
    ()=>formatProviderError,
    "isContextOverflowError",
    ()=>isContextOverflowError
]);
function isContextOverflowError(error) {
    if (!error) return false;
    const message = error instanceof Error ? error.message : String(error);
    const messageLower = message.toLowerCase();
    // Provider-specific context overflow patterns
    const contextOverflowPatterns = [
        'context_length_exceeded',
        'maximum context length',
        'prompt is too long',
        'tokens exceed',
        'context window exceeded',
        'input is too long',
        'message is too long',
        'token limit exceeded',
        'exceeds maximum tokens',
        'context size exceeded',
        'prompt tokens exceed',
        'input tokens exceed'
    ];
    return contextOverflowPatterns.some((pattern)=>messageLower.includes(pattern));
}
function formatProviderError(error) {
    const details = [];
    const seen = new Set();
    const visit = (value, depth = 0)=>{
        if (!value || depth > 3 || seen.has(value)) return;
        seen.add(value);
        if (value instanceof Error && value.message) {
            details.push(value.message);
        }
        if (typeof value === 'object') {
            const record = value;
            if (typeof record.statusCode === 'number') {
                details.push(`status ${record.statusCode}`);
            }
            if (typeof record.responseBody === 'string' && record.responseBody.trim()) {
                const body = record.responseBody.trim();
                try {
                    const parsed = JSON.parse(body);
                    const nestedError = parsed.error;
                    if (typeof nestedError === 'string') {
                        details.push(nestedError);
                    } else if (nestedError && typeof nestedError === 'object') {
                        const nestedMessage = nestedError.message;
                        if (typeof nestedMessage === 'string') {
                            details.push(nestedMessage);
                        }
                    }
                } catch (error) {
                    void error;
                    details.push(body.slice(0, 400));
                }
            }
            visit(record.cause, depth + 1);
        } else if (typeof value === 'string') {
            details.push(value);
        }
    };
    visit(error);
    const unique = Array.from(new Set(details.map((d)=>d.trim()).filter(Boolean)));
    return unique.length > 0 ? unique.join(' | ') : 'Provider request failed';
}
}),
"[project]/apps/web/lib/llm/reasoning-transform.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * Reasoning Transform - Multi-provider reasoning normalization
 *
 * Maps normalized reasoning options to provider-specific parameters:
 * - OpenAI o-series: reasoning_effort
 * - DeepSeek: reasoning_effort
 * - Anthropic: thinking.budgetTokens
 * - Gemini: thinkingConfig.thinkingLevel
 *
 * Also handles extracting <think> tags from inline reasoning.
 */ __turbopack_context__.s([
    "extractThinkTags",
    ()=>extractThinkTags,
    "mapReasoningToProvider",
    ()=>mapReasoningToProvider,
    "processChunkWithThinking",
    ()=>processChunkWithThinking
]);
function mapReasoningToProvider(options, provider, capabilities) {
    if (!options?.enabled) {
        return undefined;
    }
    // If provider doesn't support reasoning, don't add params
    if (!capabilities.supportsReasoning) {
        return undefined;
    }
    switch(provider){
        case 'openai':
        case 'openrouter':
            return mapToOpenAIReasoning(options, capabilities);
        case 'deepseek':
            return mapToDeepSeekReasoning(options, capabilities);
        case 'anthropic':
            return mapToAnthropicReasoning(options, capabilities);
        case 'zai':
            return mapToZaiReasoning(options, capabilities);
        default:
            return undefined;
    }
}
/**
 * Map reasoning options for OpenAI providers
 * Uses reasoning_effort for o-series models
 */ function mapToOpenAIReasoning(options, capabilities) {
    if (capabilities.reasoningControl !== 'effort') {
        return undefined;
    }
    const params = {};
    // Map effort level to OpenAI's reasoning_effort
    if (options.effort) {
        params.reasoning_effort = options.effort;
    } else if (options.budgetTokens) {
        // Convert budget tokens to effort level
        params.reasoning_effort = budgetToEffort(options.budgetTokens);
    } else if (options.level) {
        params.reasoning_effort = levelToEffort(options.level);
    }
    return Object.keys(params).length > 0 ? params : undefined;
}
/**
 * Map reasoning options for DeepSeek
 * Uses reasoning_effort parameter
 */ function mapToDeepSeekReasoning(options, _capabilities) {
    const params = {};
    if (options.effort) {
        params.reasoning_effort = options.effort;
    } else if (options.budgetTokens) {
        params.reasoning_effort = budgetToEffort(options.budgetTokens);
    } else if (options.level) {
        params.reasoning_effort = levelToEffort(options.level);
    }
    return Object.keys(params).length > 0 ? params : undefined;
}
/**
 * Map reasoning options for Anthropic
 * Uses thinking.budgetTokens
 */ function mapToAnthropicReasoning(options, capabilities) {
    if (capabilities.reasoningControl !== 'budget') {
        return undefined;
    }
    const params = {};
    // Map budget tokens to Anthropic's thinking configuration
    if (options.budgetTokens && options.budgetTokens > 0) {
        params.thinking = {
            type: 'enabled',
            budget_tokens: options.budgetTokens
        };
    } else if (options.effort) {
        // Convert effort to budget tokens
        params.thinking = {
            type: 'enabled',
            budget_tokens: effortToBudget(options.effort)
        };
    } else if (options.level) {
        params.thinking = {
            type: 'enabled',
            budget_tokens: levelToBudget(options.level)
        };
    }
    return params;
}
/**
 * Map reasoning options for Z.ai
 * Uses thinking.budgetTokens like Anthropic
 */ function mapToZaiReasoning(options, _capabilities) {
    const params = {};
    if (options.budgetTokens && options.budgetTokens > 0) {
        params.thinking = {
            type: 'enabled',
            budget_tokens: options.budgetTokens
        };
    } else if (options.effort) {
        params.thinking = {
            type: 'enabled',
            budget_tokens: effortToBudget(options.effort)
        };
    } else if (options.level) {
        params.thinking = {
            type: 'enabled',
            budget_tokens: levelToBudget(options.level)
        };
    }
    return params;
}
/**
 * Convert budget tokens to effort level
 */ function budgetToEffort(budgetTokens) {
    if (budgetTokens < 2000) return 'low';
    if (budgetTokens < 8000) return 'medium';
    return 'high';
}
/**
 * Convert effort level to budget tokens
 */ function effortToBudget(effort) {
    switch(effort){
        case 'low':
            return 2000;
        case 'medium':
            return 8000;
        case 'high':
        case 'max':
            return 16000;
        default:
            return 8000;
    }
}
/**
 * Convert level to effort
 */ function levelToEffort(level) {
    switch(level){
        case 'minimal':
        case 'low':
            return 'low';
        case 'medium':
            return 'medium';
        case 'high':
            return 'high';
        default:
            return 'medium';
    }
}
/**
 * Convert level to budget tokens
 */ function levelToBudget(level) {
    switch(level){
        case 'minimal':
            return 1000;
        case 'low':
            return 2000;
        case 'medium':
            return 8000;
        case 'high':
            return 16000;
        default:
            return 8000;
    }
}
function extractThinkTags(text) {
    if (!text) return [
        {
            type: 'text',
            content: ''
        }
    ];
    const result = [];
    const patterns = [
        /\u003cthink\u003e([\s\S]*?)\u003c\/think\u003e/g,
        /\u003cthinking\u003e([\s\S]*?)\u003c\/thinking\u003e/g
    ];
    let lastIndex = 0;
    for (const pattern of patterns){
        let match;
        pattern.lastIndex = 0;
        while((match = pattern.exec(text)) !== null){
            // Add text before the tag
            if (match.index > lastIndex) {
                const beforeText = text.slice(lastIndex, match.index).trim();
                if (beforeText) {
                    result.push({
                        type: 'text',
                        content: beforeText
                    });
                }
            }
            // Add the thinking content
            const thinkingContent = match[1]?.trim() || '';
            if (thinkingContent) {
                result.push({
                    type: 'reasoning',
                    content: thinkingContent
                });
            }
            lastIndex = match.index + match[0].length;
        }
    }
    // Add remaining text after last tag
    if (lastIndex < text.length) {
        const afterText = text.slice(lastIndex).trim();
        if (afterText) {
            result.push({
                type: 'text',
                content: afterText
            });
        }
    }
    // If no think tags found, return the whole text as text
    if (result.length === 0) {
        return [
            {
                type: 'text',
                content: text
            }
        ];
    }
    return result;
}
function processChunkWithThinking(chunk) {
    // Only process text chunks
    if (chunk.type !== 'text' || !chunk.content) {
        return [
            chunk
        ];
    }
    const extracted = extractThinkTags(chunk.content);
    // If no think tags found, return original chunk
    if (extracted.length === 1 && extracted[0].type === 'text') {
        return [
            chunk
        ];
    }
    // Convert extracted parts to stream chunks
    return extracted.map((part)=>{
        if (part.type === 'reasoning') {
            return {
                type: 'reasoning',
                reasoningContent: part.content
            };
        }
        return {
            type: 'text',
            content: part.content
        };
    });
}
}),
"[project]/apps/web/lib/llm/providers/zai-stream.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "zaiCompletionStream",
    ()=>zaiCompletionStream
]);
/**
 * Z.ai Direct Streaming Implementation
 *
 * This module provides a direct fetch-based streaming implementation for Z.ai,
 * which requires special handling for tool streaming (tool_stream=true parameter).
 *
 * The Vercel AI SDK's streamText doesn't support Z.ai's custom parameters,
 * so we implement our own streaming parser for Z.ai specifically.
 */ var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$logger$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/lib/logger.ts [app-ssr] (ecmascript)");
;
async function* zaiCompletionStream(options, config) {
    const url = `${config.baseUrl}/chat/completions`;
    // Build request body with Z.ai-specific parameters
    const requestBody = {
        model: options.model,
        messages: options.messages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens,
        top_p: options.topP,
        frequency_penalty: options.frequencyPenalty,
        presence_penalty: options.presencePenalty,
        stream: true
    };
    // Add tools if provided
    if (options.tools && options.tools.length > 0) {
        requestBody.tools = options.tools;
        requestBody.tool_choice = 'auto';
        // Z.ai-specific: enable tool streaming
        requestBody.tool_stream = true;
    }
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${config.apiKey}`
            },
            body: JSON.stringify(requestBody)
        });
        if (!response.ok) {
            const errorText = await response.text();
            __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$logger$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["appLog"].error('[zaiCompletionStream] HTTP error:', response.status, errorText);
            yield {
                type: 'error',
                error: `Z.ai API error (${response.status}): ${errorText}`
            };
            return;
        }
        if (!response.body) {
            yield {
                type: 'error',
                error: 'No response body from Z.ai API'
            };
            return;
        }
        // Parse SSE stream
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        const toolCalls = new Map();
        try {
            while(true){
                const { done, value } = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, {
                    stream: true
                });
                // Process complete lines
                const lines = buffer.split('\n');
                buffer = lines.pop() || ''; // Keep incomplete line in buffer
                for (const line of lines){
                    const trimmed = line.trim();
                    if (!trimmed || !trimmed.startsWith('data: ')) continue;
                    const data = trimmed.slice(6) // Remove 'data: ' prefix
                    ;
                    if (data === '[DONE]') {
                        continue;
                    }
                    try {
                        const chunk = JSON.parse(data);
                        const delta = chunk.choices?.[0]?.delta;
                        if (!delta) {
                            continue;
                        }
                        // Handle text content
                        if (delta.content) {
                            yield {
                                type: 'text',
                                content: delta.content
                            };
                        }
                        // Handle reasoning content (thinking mode)
                        if (delta.reasoning_content) {
                            yield {
                                type: 'reasoning',
                                reasoningContent: delta.reasoning_content
                            };
                        }
                        // Handle tool calls - collect them during streaming but DON'T yield yet
                        // We need to wait for all chunks to arrive to get complete arguments
                        if (delta.tool_calls) {
                            for (const toolCall of delta.tool_calls){
                                const index = toolCall.index ?? 0;
                                if (!toolCalls.has(index)) {
                                    // New tool call
                                    const newToolCall = {
                                        id: toolCall.id || `call_${index}_${Date.now()}`,
                                        type: 'function',
                                        function: {
                                            name: toolCall.function?.name || '',
                                            arguments: toolCall.function?.arguments || ''
                                        }
                                    };
                                    toolCalls.set(index, newToolCall);
                                } else {
                                    // Append to existing tool call
                                    const existing = toolCalls.get(index);
                                    if (toolCall.function?.arguments) {
                                        existing.function.arguments += toolCall.function.arguments;
                                    }
                                    if (toolCall.function?.name) {
                                        existing.function.name = toolCall.function.name;
                                    }
                                }
                            // DON'T yield here - arguments are still incomplete
                            // We'll yield all tool calls at the end of the stream
                            }
                        }
                    } catch (error) {
                        void error;
                    // Skip malformed SSE chunks
                    }
                }
            }
        } finally{
            reader.releaseLock();
        }
        // Yield final tool calls (now complete with all arguments)
        if (toolCalls.size > 0) {
            for (const [, toolCall] of toolCalls){
                // Validate the arguments are complete JSON
                try {
                    JSON.parse(toolCall.function.arguments);
                } catch (error) {
                    void error;
                // Skip validation failures here; downstream tool execution can still surface errors.
                }
                yield {
                    type: 'tool_call',
                    toolCall
                };
            }
        }
        // Yield finish event
        yield {
            type: 'finish',
            finishReason: toolCalls.size > 0 ? 'tool_calls' : 'stop'
        };
    } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$logger$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["appLog"].error('[zaiCompletionStream] Error:', error);
        yield {
            type: 'error',
            error: `Z.ai streaming error: ${errorMsg}`
        };
    }
}
}),
"[project]/apps/web/lib/llm/providers/openai-compatible.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "OpenAICompatibleProvider",
    ()=>OpenAICompatibleProvider,
    "createOpenAICompatibleProvider",
    ()=>createOpenAICompatibleProvider
]);
/**
 * OpenAI Compatible Provider
 *
 * Supports OpenAI, OpenRouter, Together.ai, and other OpenAI-compatible APIs.
 * Uses the Vercel AI SDK for streaming completions.
 */ var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$logger$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/lib/logger.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$ai$40$4$2e$3$2e$19$2b$24fd839cbbf67b29$2f$node_modules$2f$ai$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/.bun/ai@4.3.19+24fd839cbbf67b29/node_modules/ai/dist/index.mjs [app-ssr] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$ai$2d$sdk$2b$ui$2d$utils$40$1$2e$2$2e$11$2b$27912429049419a2$2f$node_modules$2f40$ai$2d$sdk$2f$ui$2d$utils$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/.bun/@ai-sdk+ui-utils@1.2.11+27912429049419a2/node_modules/@ai-sdk/ui-utils/dist/index.mjs [app-ssr] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$ai$2d$sdk$2b$openai$40$1$2e$3$2e$24$2b$27912429049419a2$2f$node_modules$2f40$ai$2d$sdk$2f$openai$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.bun/@ai-sdk+openai@1.3.24+27912429049419a2/node_modules/@ai-sdk/openai/dist/index.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$llm$2f$providers$2f$error$2d$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/lib/llm/providers/error-utils.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$llm$2f$types$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/lib/llm/types.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$llm$2f$reasoning$2d$transform$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/lib/llm/reasoning-transform.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$llm$2f$providers$2f$zai$2d$stream$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/lib/llm/providers/zai-stream.ts [app-ssr] (ecmascript)");
;
;
;
;
;
;
;
function normalizeFinishReason(value) {
    switch(value){
        case 'stop':
        case 'length':
        case 'tool_calls':
        case 'error':
            return value;
        default:
            return 'stop';
    }
}
function splitForPerceivedStreaming(text, maxChunkChars = 12) {
    if (!text) return [];
    if (text.length <= maxChunkChars) return [
        text
    ];
    // Prefer splitting on whitespace, but fall back to fixed-size chunks.
    const parts = text.split(/(\s+)/);
    const chunks = [];
    let buf = '';
    const flush = ()=>{
        if (buf) chunks.push(buf);
        buf = '';
    };
    for (const part of parts){
        if (!part) continue;
        if (part.length > maxChunkChars) {
            // Flush any buffered content before chunking a long token.
            flush();
            for(let i = 0; i < part.length; i += maxChunkChars){
                chunks.push(part.slice(i, i + maxChunkChars));
            }
            continue;
        }
        if ((buf + part).length > maxChunkChars) {
            flush();
        }
        buf += part;
    }
    flush();
    return chunks;
}
class OpenAICompatibleProvider {
    name = 'openai-compatible';
    config;
    client;
    constructor(config){
        this.config = config;
        // Create AI SDK client with custom configuration
        this.client = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$ai$2d$sdk$2b$openai$40$1$2e$3$2e$24$2b$27912429049419a2$2f$node_modules$2f40$ai$2d$sdk$2f$openai$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["createOpenAI"])({
            apiKey: config.auth.apiKey,
            baseURL: config.auth.baseUrl,
            headers: config.customHeaders
        });
    }
    /**
   * List available models
   * For OpenAI-compatible APIs, we return common models
   * For OpenRouter, we fetch from their API
   */ async listModels() {
        // If using OpenRouter, fetch models from their API
        if (this.config.auth.baseUrl?.includes('openrouter')) {
            return this.listOpenRouterModels();
        }
        // If using Together.ai, fetch models from their API
        if (this.config.auth.baseUrl?.includes('together')) {
            return this.listTogetherModels();
        }
        // Default OpenAI models
        return this.getDefaultOpenAIModels();
    }
    /**
   * Create a non-streaming completion
   */ async complete(options) {
        const result = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$ai$40$4$2e$3$2e$19$2b$24fd839cbbf67b29$2f$node_modules$2f$ai$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["generateText"])({
            model: this.client(options.model),
            messages: this.convertMessages(options.messages),
            temperature: options.temperature ?? 0.7,
            maxTokens: options.maxTokens,
            maxRetries: this.config.maxRetries ?? 0,
            topP: options.topP,
            frequencyPenalty: options.frequencyPenalty,
            presencePenalty: options.presencePenalty,
            tools: this.convertTools(options.tools)
        });
        return {
            message: {
                role: 'assistant',
                content: result.text
            },
            finishReason: normalizeFinishReason(result.finishReason),
            usage: {
                promptTokens: result.usage.promptTokens,
                completionTokens: result.usage.completionTokens,
                totalTokens: result.usage.totalTokens
            },
            model: options.model
        };
    }
    /**
   * Create a streaming completion
   * Yields chunks of text, tool calls, and finish events
   */ async *completionStream(options) {
        // Detect Z.ai provider
        const isZai = this.config.auth.baseUrl?.includes('z.ai') ?? false;
        // Z.ai requires special handling for tool streaming
        // Use direct fetch implementation that properly handles tool_stream parameter
        if (isZai && options.tools && options.tools.length > 0) {
            yield* (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$llm$2f$providers$2f$zai$2d$stream$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["zaiCompletionStream"])(options, {
                apiKey: this.config.auth.apiKey,
                baseUrl: this.config.auth.baseUrl || 'https://api.z.ai/api/coding/paas/v4'
            });
            return;
        }
        try {
            const tools = options.tools && options.tools.length > 0 ? this.convertTools(options.tools) : undefined;
            // Apply reasoning options if available
            const providerType = this.config.provider;
            const capabilities = this.config.capabilities ?? (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$llm$2f$types$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getDefaultProviderCapabilities"])(providerType);
            const reasoningParams = (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$llm$2f$reasoning$2d$transform$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["mapReasoningToProvider"])(options.reasoning, providerType, capabilities);
            // Build stream options with reasoning support
            const streamOptions = {
                model: this.client(options.model),
                messages: this.convertMessages(options.messages),
                temperature: options.temperature ?? 0.7,
                maxTokens: options.maxTokens,
                maxRetries: this.config.maxRetries ?? 0,
                topP: options.topP,
                frequencyPenalty: options.frequencyPenalty,
                presencePenalty: options.presencePenalty,
                ...tools && {
                    tools
                },
                ...reasoningParams && {
                    providerOptions: {
                        [providerType]: reasoningParams
                    }
                }
            };
            const result = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$ai$40$4$2e$3$2e$19$2b$24fd839cbbf67b29$2f$node_modules$2f$ai$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["streamText"])(streamOptions);
            for await (const part of result.fullStream){
                switch(part.type){
                    case 'text-delta':
                        {
                            const delta = part.textDelta ?? part.text;
                            if (!delta) break;
                            const chunks = splitForPerceivedStreaming(delta);
                            for (const chunkText of chunks){
                                const chunk = {
                                    type: 'text',
                                    content: chunkText
                                };
                                // Process for think tags (DeepSeek, open-source models)
                                const processed = (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$llm$2f$reasoning$2d$transform$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["processChunkWithThinking"])(chunk);
                                for (const processedChunk of processed){
                                    yield processedChunk;
                                }
                            }
                            break;
                        }
                    case 'reasoning-delta':
                        {
                            const reasoning = part.textDelta ?? part.text;
                            if (!reasoning) break;
                            yield {
                                type: 'reasoning',
                                reasoningContent: reasoning
                            };
                            break;
                        }
                    case 'tool-call':
                        {
                            if (!part.toolCallId || !part.toolName) break;
                            const toolCall = {
                                id: part.toolCallId,
                                type: 'function',
                                function: {
                                    name: part.toolName,
                                    arguments: JSON.stringify(part.input ?? part.args ?? {})
                                }
                            };
                            yield {
                                type: 'tool_call',
                                toolCall
                            };
                            break;
                        }
                    case 'error':
                        yield {
                            type: 'error',
                            error: (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$llm$2f$providers$2f$error$2d$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["formatProviderError"])(part.error ?? 'Unknown stream error')
                        };
                        return;
                    case 'finish':
                        yield {
                            type: 'finish',
                            finishReason: normalizeFinishReason(part.finishReason),
                            usage: part.totalUsage ? {
                                promptTokens: part.totalUsage.inputTokens ?? 0,
                                completionTokens: part.totalUsage.outputTokens ?? 0,
                                totalTokens: (part.totalUsage.inputTokens ?? 0) + (part.totalUsage.outputTokens ?? 0)
                            } : undefined
                        };
                        break;
                    default:
                        break;
                }
            }
        } catch (outerError) {
            yield {
                type: 'error',
                error: (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$llm$2f$providers$2f$error$2d$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["formatProviderError"])(outerError)
            };
        }
    }
    /**
   * Convert our message format to AI SDK format
   * Z.ai doesn't support system role, so we filter it out
   * Chutes doesn't support tool role, so we convert to assistant messages
   */ convertMessages(messages) {
        const isZai = this.config.auth.baseUrl?.includes('z.ai');
        const isChutes = this.config.auth.baseUrl?.includes('chutes.ai');
        let filteredMessages = messages;
        // Filter out system messages for Z.ai
        if (isZai) {
            filteredMessages = filteredMessages.filter((msg)=>msg.role !== 'system');
        }
        // Z.ai rejects system messages. If we filtered everything out, surface a clear error
        // instead of letting downstream validation fail with a generic message.
        if (isZai && filteredMessages.length === 0) {
            throw new Error('Invalid prompt: messages must not be empty (Z.ai does not support system role; ensure a user message is present).');
        }
        // Chutes doesn't support role: "tool" - convert to assistant messages with tool results
        if (isChutes) {
            filteredMessages = this.convertChutesToolMessages(filteredMessages);
        }
        return filteredMessages.map((msg)=>{
            const baseMessage = {
                role: msg.role,
                content: msg.content
            };
            if (msg.name) {
                baseMessage.name = msg.name;
            }
            if (msg.tool_calls) {
                baseMessage.tool_calls = msg.tool_calls;
            }
            if (msg.tool_call_id) {
                baseMessage.tool_call_id = msg.tool_call_id;
            }
            return baseMessage;
        });
    }
    /**
   * Convert tool role messages for Chutes which doesn't support them
   * Merges tool results into assistant messages with tool_calls
   */ convertChutesToolMessages(messages) {
        const result = [];
        const toolResults = new Map();
        // Collect all tool results
        for (const msg of messages){
            if (msg.role === 'tool' && msg.tool_call_id) {
                toolResults.set(msg.tool_call_id, {
                    content: msg.content,
                    name: msg.name
                });
            }
        }
        // Process messages, merging tool results into assistant messages
        for(let i = 0; i < messages.length; i++){
            const msg = messages[i];
            if (msg.role === 'tool') {
                continue;
            }
            if (msg.role === 'assistant' && msg.tool_calls && msg.tool_calls.length > 0) {
                // Check if we have tool results to merge
                const hasResults = msg.tool_calls.some((tc)=>toolResults.has(tc.id));
                if (hasResults) {
                    // Create assistant message with tool results embedded in content
                    const toolResultsContent = msg.tool_calls.filter((tc)=>toolResults.has(tc.id)).map((tc)=>{
                        const result = toolResults.get(tc.id);
                        return `[Tool Result: ${tc.function.name}]\n${result.content}`;
                    }).join('\n\n');
                    result.push({
                        role: 'assistant',
                        content: msg.content ? `${msg.content}\n\n${toolResultsContent}` : toolResultsContent,
                        tool_calls: msg.tool_calls
                    });
                } else {
                    result.push(msg);
                }
            } else {
                result.push(msg);
            }
        }
        return result;
    }
    /**
   * Convert our tool format to AI SDK format
   */ convertTools(tools) {
        if (!tools || tools.length === 0) return undefined;
        const toolSet = {};
        tools.forEach((tool)=>{
            toolSet[tool.function.name] = {
                description: tool.function.description,
                parameters: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$ai$2d$sdk$2b$ui$2d$utils$40$1$2e$2$2e$11$2b$27912429049419a2$2f$node_modules$2f40$ai$2d$sdk$2f$ui$2d$utils$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["jsonSchema"])(tool.function.parameters)
            };
        });
        return toolSet;
    }
    /**
   * Fetch models from OpenRouter API
   */ async listOpenRouterModels() {
        try {
            const response = await fetch('https://openrouter.ai/api/v1/models', {
                headers: {
                    Authorization: `Bearer ${this.config.auth.apiKey}`
                }
            });
            if (!response.ok) {
                throw new Error(`Failed to fetch OpenRouter models: ${response.statusText}`);
            }
            const data = await response.json();
            return (data.data ?? []).map((model)=>{
                const id = model.id ?? '';
                const features = model.features ?? [];
                return {
                    id,
                    name: model.name || id,
                    provider: 'openrouter',
                    description: model.description,
                    maxTokens: model.top_provider?.max_completion_tokens || 4096,
                    contextWindow: model.context_length || 8192,
                    capabilities: {
                        streaming: true,
                        functionCalling: features.includes('tools'),
                        vision: features.includes('vision') || id.includes('vision') || id.includes('claude-3'),
                        jsonMode: true,
                        toolUse: features.includes('tools')
                    },
                    pricing: {
                        inputPerToken: model.pricing?.prompt || 0,
                        outputPerToken: model.pricing?.completion || 0
                    }
                };
            });
        } catch (error) {
            __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$logger$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["appLog"].error('Error fetching OpenRouter models:', error);
            return this.getFallbackModels('openrouter');
        }
    }
    /**
   * Fetch models from Together.ai API
   */ async listTogetherModels() {
        try {
            const response = await fetch('https://api.together.xyz/v1/models', {
                headers: {
                    Authorization: `Bearer ${this.config.auth.apiKey}`
                }
            });
            if (!response.ok) {
                throw new Error(`Failed to fetch Together models: ${response.statusText}`);
            }
            const data = await response.json();
            return data.map((model)=>{
                const id = model.id ?? '';
                return {
                    id,
                    name: model.display_name || id,
                    provider: 'together',
                    description: model.description,
                    maxTokens: model.context_length || 4096,
                    contextWindow: model.context_length || 8192,
                    capabilities: {
                        streaming: true,
                        functionCalling: model.supports_tools || false,
                        vision: model.supports_vision || id.includes('llava') || false,
                        jsonMode: true,
                        toolUse: model.supports_tools || false
                    }
                };
            });
        } catch (error) {
            __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$logger$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["appLog"].error('Error fetching Together models:', error);
            return this.getFallbackModels('together');
        }
    }
    /**
   * Get default OpenAI models
   */ getDefaultOpenAIModels() {
        return [
            {
                id: 'gpt-4o',
                name: 'GPT-4o',
                provider: 'openai',
                description: 'Most capable multimodal model',
                maxTokens: 4096,
                contextWindow: 128000,
                capabilities: {
                    streaming: true,
                    functionCalling: true,
                    vision: true,
                    jsonMode: true,
                    toolUse: true
                }
            },
            {
                id: 'gpt-4o-mini',
                name: 'GPT-4o Mini',
                provider: 'openai',
                description: 'Fast, affordable small model for focused tasks',
                maxTokens: 4096,
                contextWindow: 128000,
                capabilities: {
                    streaming: true,
                    functionCalling: true,
                    vision: true,
                    jsonMode: true,
                    toolUse: true
                }
            },
            {
                id: 'gpt-4-turbo',
                name: 'GPT-4 Turbo',
                provider: 'openai',
                description: 'Previous generation model with 128k context',
                maxTokens: 4096,
                contextWindow: 128000,
                capabilities: {
                    streaming: true,
                    functionCalling: true,
                    vision: true,
                    jsonMode: true,
                    toolUse: true
                }
            },
            {
                id: 'gpt-3.5-turbo',
                name: 'GPT-3.5 Turbo',
                provider: 'openai',
                description: 'Fast, cost-effective model for simpler tasks',
                maxTokens: 4096,
                contextWindow: 16385,
                capabilities: {
                    streaming: true,
                    functionCalling: true,
                    vision: false,
                    jsonMode: true,
                    toolUse: true
                }
            }
        ];
    }
    /**
   * Get fallback models when API fetch fails
   */ getFallbackModels(provider) {
        if (provider === 'openrouter') {
            return [
                {
                    id: 'anthropic/claude-3.5-sonnet',
                    name: 'Claude 3.5 Sonnet',
                    provider: 'openrouter',
                    maxTokens: 8192,
                    contextWindow: 200000,
                    capabilities: {
                        streaming: true,
                        functionCalling: true,
                        vision: true,
                        jsonMode: true,
                        toolUse: true
                    }
                },
                {
                    id: 'openai/gpt-4o',
                    name: 'GPT-4o',
                    provider: 'openrouter',
                    maxTokens: 4096,
                    contextWindow: 128000,
                    capabilities: {
                        streaming: true,
                        functionCalling: true,
                        vision: true,
                        jsonMode: true,
                        toolUse: true
                    }
                }
            ];
        }
        return [
            {
                id: 'togethercomputer/llama-3.1-70b',
                name: 'Llama 3.1 70B',
                provider: 'together',
                maxTokens: 4096,
                contextWindow: 128000,
                capabilities: {
                    streaming: true,
                    functionCalling: true,
                    vision: false,
                    jsonMode: true,
                    toolUse: true
                }
            }
        ];
    }
}
function createOpenAICompatibleProvider(config) {
    return new OpenAICompatibleProvider(config);
}
}),
"[project]/apps/web/lib/llm/providers/anthropic.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "AnthropicProvider",
    ()=>AnthropicProvider,
    "createAnthropicProvider",
    ()=>createAnthropicProvider
]);
/**
 * Anthropic Provider
 *
 * Native Anthropic provider with reasoning-aware stream mapping.
 */ var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$ai$2d$sdk$2b$anthropic$40$1$2e$2$2e$12$2b$27912429049419a2$2f$node_modules$2f40$ai$2d$sdk$2f$anthropic$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.bun/@ai-sdk+anthropic@1.2.12+27912429049419a2/node_modules/@ai-sdk/anthropic/dist/index.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$ai$40$4$2e$3$2e$19$2b$24fd839cbbf67b29$2f$node_modules$2f$ai$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/.bun/ai@4.3.19+24fd839cbbf67b29/node_modules/ai/dist/index.mjs [app-ssr] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$ai$2d$sdk$2b$ui$2d$utils$40$1$2e$2$2e$11$2b$27912429049419a2$2f$node_modules$2f40$ai$2d$sdk$2f$ui$2d$utils$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/.bun/@ai-sdk+ui-utils@1.2.11+27912429049419a2/node_modules/@ai-sdk/ui-utils/dist/index.mjs [app-ssr] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$llm$2f$providers$2f$error$2d$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/lib/llm/providers/error-utils.ts [app-ssr] (ecmascript)");
;
;
;
function normalizeFinishReason(value) {
    switch(value){
        case 'stop':
        case 'length':
        case 'tool_calls':
        case 'error':
            return value;
        default:
            return 'stop';
    }
}
class AnthropicProvider {
    name = 'anthropic';
    config;
    client;
    constructor(config){
        this.config = config;
        this.client = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$ai$2d$sdk$2b$anthropic$40$1$2e$2$2e$12$2b$27912429049419a2$2f$node_modules$2f40$ai$2d$sdk$2f$anthropic$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["createAnthropic"])({
            apiKey: config.auth.apiKey,
            baseURL: config.auth.baseUrl,
            headers: config.customHeaders
        });
    }
    async listModels() {
        return [
            {
                id: 'claude-opus-4-6',
                name: 'Claude Opus 4.6',
                provider: 'anthropic',
                maxTokens: 8192,
                contextWindow: 1_000_000,
                capabilities: {
                    streaming: true,
                    functionCalling: true,
                    vision: true,
                    jsonMode: true,
                    toolUse: true,
                    supportsReasoning: true,
                    supportsInterleavedReasoning: true,
                    supportsReasoningSummary: true,
                    supportsToolStreaming: true,
                    reasoningControl: 'budget'
                }
            },
            {
                id: 'claude-sonnet-4-5',
                name: 'Claude Sonnet 4.5',
                provider: 'anthropic',
                maxTokens: 8192,
                contextWindow: 200_000,
                capabilities: {
                    streaming: true,
                    functionCalling: true,
                    vision: true,
                    jsonMode: true,
                    toolUse: true,
                    supportsReasoning: true,
                    supportsInterleavedReasoning: true,
                    supportsReasoningSummary: true,
                    supportsToolStreaming: true,
                    reasoningControl: 'budget'
                }
            }
        ];
    }
    async complete(options) {
        const result = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$ai$40$4$2e$3$2e$19$2b$24fd839cbbf67b29$2f$node_modules$2f$ai$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["generateText"])({
            model: this.client(options.model),
            messages: this.convertMessages(options.messages),
            temperature: options.temperature ?? 0.7,
            maxTokens: options.maxTokens,
            maxRetries: this.config.maxRetries ?? 0,
            topP: options.topP,
            tools: this.convertTools(options.tools)
        });
        return {
            message: {
                role: 'assistant',
                content: result.text
            },
            finishReason: normalizeFinishReason(result.finishReason),
            usage: {
                promptTokens: result.usage.promptTokens,
                completionTokens: result.usage.completionTokens,
                totalTokens: result.usage.totalTokens
            },
            model: options.model
        };
    }
    async *completionStream(options) {
        const tools = this.convertTools(options.tools);
        const anthropicOptions = {};
        if (options.reasoning?.enabled) {
            anthropicOptions.thinking = {
                type: 'enabled',
                ...options.reasoning.budgetTokens ? {
                    budgetTokens: options.reasoning.budgetTokens
                } : {},
                ...options.reasoning.effort ? {
                    effort: options.reasoning.effort
                } : {}
            };
        }
        const result = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$ai$40$4$2e$3$2e$19$2b$24fd839cbbf67b29$2f$node_modules$2f$ai$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["streamText"])({
            model: this.client(options.model),
            messages: this.convertMessages(options.messages),
            temperature: options.temperature ?? 0.7,
            maxTokens: options.maxTokens,
            maxRetries: this.config.maxRetries ?? 0,
            topP: options.topP,
            ...tools ? {
                tools
            } : {},
            providerOptions: {
                anthropic: anthropicOptions
            }
        });
        try {
            for await (const part of result.fullStream){
                switch(part.type){
                    case 'text-delta':
                        if (part.textDelta || part.text) {
                            yield {
                                type: 'text',
                                content: part.textDelta ?? part.text
                            };
                        }
                        break;
                    case 'reasoning-delta':
                        if (part.textDelta || part.text) {
                            yield {
                                type: 'reasoning',
                                reasoningContent: part.textDelta ?? part.text
                            };
                        }
                        break;
                    case 'tool-call':
                        {
                            if (!part.toolCallId || !part.toolName) break;
                            const toolCall = {
                                id: part.toolCallId,
                                type: 'function',
                                function: {
                                    name: part.toolName,
                                    arguments: JSON.stringify(part.input ?? part.args ?? {})
                                }
                            };
                            yield {
                                type: 'tool_call',
                                toolCall
                            };
                            break;
                        }
                    case 'error':
                        yield {
                            type: 'error',
                            error: (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$llm$2f$providers$2f$error$2d$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["formatProviderError"])(part.error ?? 'Unknown Anthropic stream error')
                        };
                        return;
                    case 'finish':
                        {
                            // Extract usage data including Anthropic-specific cache tokens
                            const usage = part.totalUsage;
                            const inputTokens = usage?.inputTokens ?? 0;
                            const outputTokens = usage?.outputTokens ?? 0;
                            // Type assertion for Anthropic-specific usage fields
                            const anthropicUsage = usage;
                            yield {
                                type: 'finish',
                                finishReason: normalizeFinishReason(part.finishReason),
                                usage: usage ? {
                                    promptTokens: inputTokens,
                                    completionTokens: outputTokens,
                                    totalTokens: inputTokens + outputTokens,
                                    reasoningTokens: usage.reasoningTokens,
                                    cacheWriteTokens: anthropicUsage.cacheCreationInputTokens,
                                    cacheReadTokens: anthropicUsage.cacheReadInputTokens
                                } : undefined
                            };
                            break;
                        }
                    default:
                        break;
                }
            }
        } catch (error) {
            yield {
                type: 'error',
                error: (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$llm$2f$providers$2f$error$2d$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["formatProviderError"])(error)
            };
        }
    }
    convertMessages(messages) {
        return messages.map((msg)=>{
            const baseMessage = {
                role: msg.role,
                content: msg.content
            };
            if (msg.name) {
                baseMessage.name = msg.name;
            }
            if (msg.tool_calls) {
                baseMessage.tool_calls = msg.tool_calls;
            }
            if (msg.tool_call_id) {
                baseMessage.tool_call_id = msg.tool_call_id;
            }
            return baseMessage;
        });
    }
    convertTools(tools) {
        if (!tools || tools.length === 0) return undefined;
        const toolSet = {};
        tools.forEach((tool)=>{
            toolSet[tool.function.name] = {
                description: tool.function.description,
                parameters: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$ai$2d$sdk$2b$ui$2d$utils$40$1$2e$2$2e$11$2b$27912429049419a2$2f$node_modules$2f40$ai$2d$sdk$2f$ui$2d$utils$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["jsonSchema"])(tool.function.parameters)
            };
        });
        return toolSet;
    }
}
function createAnthropicProvider(config) {
    return new AnthropicProvider(config);
}
}),
"[project]/apps/web/lib/llm/providers/chutes.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ChutesProvider",
    ()=>ChutesProvider,
    "createChutesProvider",
    ()=>createChutesProvider,
    "createChutesProviderFromApiKey",
    ()=>createChutesProviderFromApiKey,
    "createChutesProviderFromTokens",
    ()=>createChutesProviderFromTokens
]);
/**
 * Chutes AI Provider
 *
 * Supports Chutes.ai platform - a decentralized AI model serving platform.
 * Uses OpenAI-compatible API with custom model fetching.
 * Supports both API Key authentication and OAuth tokens.
 *
 * Base URL: https://llm.chutes.ai/v1/
 * Authentication: Authorization: Bearer <API_KEY> or <OAuth_ACCESS_TOKEN>
 *
 * @see https://chutes.ai/docs/sign-in-with-chutes
 */ var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$logger$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/lib/logger.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$llm$2f$providers$2f$openai$2d$compatible$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/lib/llm/providers/openai-compatible.ts [app-ssr] (ecmascript)");
;
;
const CHUTES_LLM_BASE_URL = 'https://llm.chutes.ai/v1';
class ChutesProvider {
    name = 'chutes';
    config;
    baseProvider;
    baseUrl;
    tokenRefreshCallback;
    static normalizeBaseUrl(baseUrl) {
        return (baseUrl || CHUTES_LLM_BASE_URL).replace(/\/+$/, '');
    }
    getAuthHeaders() {
        return {
            Authorization: `Bearer ${this.config.auth.apiKey}`,
            'Content-Type': 'application/json'
        };
    }
    constructor(config, tokenRefreshCallback){
        const normalizedBaseUrl = ChutesProvider.normalizeBaseUrl(config.auth.baseUrl);
        this.baseUrl = normalizedBaseUrl;
        this.tokenRefreshCallback = tokenRefreshCallback;
        const chutesConfig = {
            ...config,
            provider: 'chutes',
            auth: {
                ...config.auth,
                baseUrl: normalizedBaseUrl
            },
            customHeaders: {
                ...config.customHeaders,
                Authorization: `Bearer ${config.auth.apiKey}`
            }
        };
        this.config = chutesConfig;
        this.baseProvider = new __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$llm$2f$providers$2f$openai$2d$compatible$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["OpenAICompatibleProvider"](chutesConfig);
    }
    setTokenRefreshCallback(callback) {
        this.tokenRefreshCallback = callback;
    }
    async updateAccessToken(accessToken) {
        this.config = {
            ...this.config,
            auth: {
                ...this.config.auth,
                apiKey: accessToken
            },
            customHeaders: {
                ...this.config.customHeaders,
                Authorization: `Bearer ${accessToken}`
            }
        };
        this.baseProvider = new __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$llm$2f$providers$2f$openai$2d$compatible$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["OpenAICompatibleProvider"](this.config);
    }
    async ensureValidToken() {
        if (!this.tokenRefreshCallback) return;
        try {
            const tokens = await this.tokenRefreshCallback();
            if (tokens?.accessToken && tokens.accessToken !== this.config.auth.apiKey) {
                await this.updateAccessToken(tokens.accessToken);
            }
        } catch (error) {
            __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$logger$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["appLog"].error('Failed to refresh Chutes token:', error);
        }
    }
    /**
   * Fetch available models from Chutes LLM endpoint
   * Uses the OpenAI-compatible /v1/models endpoint
   */ async listModels() {
        await this.ensureValidToken();
        try {
            const response = await fetch(`${this.baseUrl}/models`, {
                headers: this.getAuthHeaders()
            });
            if (!response.ok) {
                const errorText = await response.text();
                __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$logger$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["appLog"].error('Chutes API error:', response.status, errorText);
                throw new Error(`Failed to fetch Chutes models: ${response.statusText}`);
            }
            const data = await response.json();
            const models = data.data || data || [];
            if (models.length === 0) {
                __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$logger$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["appLog"].warn('No models returned from Chutes API, using fallback');
                return this.getFallbackModels();
            }
            const modelInfos = models.map((model)=>this.transformModelToModelInfo(model));
            return modelInfos.sort((a, b)=>a.name.localeCompare(b.name));
        } catch (error) {
            __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$logger$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["appLog"].error('Error fetching Chutes models:', error);
            return this.getFallbackModels();
        }
    }
    /**
   * Transform OpenAI model format to ModelInfo
   */ transformModelToModelInfo(model) {
        const modelId = String(model.id ?? model.name ?? '');
        const displayName = this.formatModelName(modelId);
        // Get context window from model id patterns
        const contextWindow = this.getDefaultContextLength(modelId);
        const maxTokens = Math.min(Math.floor(contextWindow / 2), 16384);
        // Determine capabilities based on model name patterns
        const name = modelId.toLowerCase();
        const hasVision = name.includes('vision') || name.includes('vl') || name.includes('llava');
        const hasTools = name.includes('llama-3') || name.includes('qwen2.5') || name.includes('qwen3') || name.includes('deepseek') || name.includes('gpt') || name.includes('claude');
        return {
            id: modelId,
            name: displayName,
            provider: 'chutes',
            description: typeof model.description === 'string' && model.description.length > 0 ? model.description : `Chutes model: ${displayName}`,
            maxTokens: maxTokens,
            contextWindow: contextWindow,
            capabilities: {
                streaming: true,
                functionCalling: hasTools,
                vision: hasVision,
                jsonMode: true,
                toolUse: hasTools
            }
        };
    }
    /**
   * Format model ID to readable name
   */ formatModelName(modelId) {
        // Extract model name from path like "meta-llama/Llama-3.1-8B-Instruct"
        const parts = modelId.split('/');
        const name = parts.length > 1 ? parts[1] : parts[0];
        // Add spaces before capitals and clean up
        return name.replace(/-/g, ' ').replace(/([A-Z])/g, ' $1').replace(/\s+/g, ' ').trim();
    }
    /**
   * Get default context length based on model name patterns
   */ getDefaultContextLength(modelName) {
        const name = modelName.toLowerCase();
        if (name.includes('llama-3.1') || name.includes('llama-3.2') || name.includes('llama-3.3')) {
            return 128000;
        }
        if (name.includes('llama-3')) {
            return 8192;
        }
        if (name.includes('qwen2.5-72b') || name.includes('qwen2.5-32b')) {
            return 131072;
        }
        if (name.includes('qwen')) {
            return 32768;
        }
        if (name.includes('deepseek-v3')) {
            return 64000;
        }
        if (name.includes('deepseek')) {
            return 32768;
        }
        if (name.includes('mistral') || name.includes('mixtral')) {
            return 32768;
        }
        return 8192;
    }
    /**
   * Get fallback models when API fetch fails
   */ getFallbackModels() {
        return [
            {
                id: 'deepseek-ai/DeepSeek-V3',
                name: 'DeepSeek V3',
                provider: 'chutes',
                description: 'DeepSeek V3 - Advanced reasoning model',
                maxTokens: 8192,
                contextWindow: 64000,
                capabilities: {
                    streaming: true,
                    functionCalling: true,
                    vision: false,
                    jsonMode: true,
                    toolUse: true
                }
            },
            {
                id: 'meta-llama/Llama-3.1-70B-Instruct',
                name: 'Llama 3.1 70B Instruct',
                provider: 'chutes',
                description: 'Meta Llama 3.1 70B - High performance',
                maxTokens: 4096,
                contextWindow: 128000,
                capabilities: {
                    streaming: true,
                    functionCalling: true,
                    vision: false,
                    jsonMode: true,
                    toolUse: true
                }
            },
            {
                id: 'meta-llama/Llama-3.1-8B-Instruct',
                name: 'Llama 3.1 8B Instruct',
                provider: 'chutes',
                description: 'Meta Llama 3.1 8B - Fast and efficient',
                maxTokens: 4096,
                contextWindow: 128000,
                capabilities: {
                    streaming: true,
                    functionCalling: true,
                    vision: false,
                    jsonMode: true,
                    toolUse: true
                }
            },
            {
                id: 'meta-llama/Llama-3.2-11B-Vision-Instruct',
                name: 'Llama 3.2 11B Vision',
                provider: 'chutes',
                description: 'Meta Llama 3.2 11B with vision capabilities',
                maxTokens: 4096,
                contextWindow: 128000,
                capabilities: {
                    streaming: true,
                    functionCalling: true,
                    vision: true,
                    jsonMode: true,
                    toolUse: true
                }
            },
            {
                id: 'Qwen/Qwen2.5-72B-Instruct',
                name: 'Qwen 2.5 72B',
                provider: 'chutes',
                description: 'Qwen 2.5 72B - Strong multilingual model',
                maxTokens: 4096,
                contextWindow: 131072,
                capabilities: {
                    streaming: true,
                    functionCalling: true,
                    vision: false,
                    jsonMode: true,
                    toolUse: true
                }
            }
        ];
    }
    /**
   * Create a non-streaming completion
   * Delegates to OpenAI-compatible provider
   */ async complete(options) {
        await this.ensureValidToken();
        return this.baseProvider.complete(options);
    }
    /**
   * Create a streaming completion
   * Delegates to OpenAI-compatible provider
   */ async *completionStream(options) {
        await this.ensureValidToken();
        yield* this.baseProvider.completionStream(options);
    }
    /**
   * Validate API key by making a test request to the LLM endpoint
   */ async validateApiKey() {
        await this.ensureValidToken();
        try {
            const response = await fetch(`${this.baseUrl}/models`, {
                headers: this.getAuthHeaders()
            });
            return response.ok;
        } catch (error) {
            void error;
            return false;
        }
    }
}
function createChutesProvider(config, tokenRefreshCallback) {
    return new ChutesProvider(config, tokenRefreshCallback);
}
function createChutesProviderFromApiKey(apiKey, defaultModel) {
    return new ChutesProvider({
        provider: 'chutes',
        auth: {
            apiKey,
            baseUrl: CHUTES_LLM_BASE_URL
        },
        defaultModel: defaultModel || 'meta-llama/Llama-3.1-8B-Instruct'
    });
}
function createChutesProviderFromTokens(tokens, tokenRefreshCallback, defaultModel) {
    return new ChutesProvider({
        provider: 'chutes',
        auth: {
            apiKey: tokens.accessToken,
            baseUrl: CHUTES_LLM_BASE_URL
        },
        defaultModel: defaultModel || 'meta-llama/Llama-3.1-8B-Instruct'
    }, tokenRefreshCallback);
}
}),
"[project]/apps/web/lib/llm/providers/deepseek.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * DeepSeek Provider
 *
 * Supports DeepSeek AI platform with reasoning capabilities.
 * Uses OpenAI-compatible API with DeepSeek-specific features.
 *
 * Base URL: https://api.deepseek.com/v1/
 * Authentication: Authorization: Bearer <API_KEY>
 *
 * Key features:
 * - DeepSeek V3 with advanced reasoning
 * - R1 models with chain-of-thought
 * - Supports function calling
 */ __turbopack_context__.s([
    "DeepSeekProvider",
    ()=>DeepSeekProvider,
    "createDeepSeekProvider",
    ()=>createDeepSeekProvider,
    "createDeepSeekProviderFromApiKey",
    ()=>createDeepSeekProviderFromApiKey
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$llm$2f$providers$2f$openai$2d$compatible$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/lib/llm/providers/openai-compatible.ts [app-ssr] (ecmascript)");
;
const DEEPSEEK_BASE_URL = 'https://api.deepseek.com/v1';
class DeepSeekProvider {
    name = 'deepseek';
    config;
    baseProvider;
    constructor(config){
        const deepseekConfig = {
            ...config,
            provider: 'deepseek',
            auth: {
                ...config.auth,
                baseUrl: config.auth.baseUrl || DEEPSEEK_BASE_URL
            },
            capabilities: {
                supportsReasoning: true,
                supportsInterleavedReasoning: false,
                supportsReasoningSummary: true,
                supportsToolStreaming: true,
                reasoningControl: 'effort'
            }
        };
        this.config = deepseekConfig;
        this.baseProvider = new __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$llm$2f$providers$2f$openai$2d$compatible$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["OpenAICompatibleProvider"](deepseekConfig);
    }
    async listModels() {
        try {
            const response = await fetch(`${this.config.auth.baseUrl || DEEPSEEK_BASE_URL}/models`, {
                headers: {
                    Authorization: `Bearer ${this.config.auth.apiKey}`
                }
            });
            if (!response.ok) {
                return this.getDefaultModels();
            }
            const data = await response.json();
            const models = data.data || [];
            if (models.length === 0) {
                return this.getDefaultModels();
            }
            return models.map((model)=>this.transformModel(model));
        } catch (error) {
            void error;
            return this.getDefaultModels();
        }
    }
    transformModel(model) {
        const id = String(model.id ?? '');
        const isReasoning = id.includes('reasoner') || id.includes('r1');
        const hasVision = id.includes('vision');
        return {
            id,
            name: this.formatModelName(id),
            provider: 'deepseek',
            description: typeof model.description === 'string' && model.description.length > 0 ? model.description : `DeepSeek ${id}`,
            maxTokens: typeof model.max_output_tokens === 'number' ? model.max_output_tokens : 8192,
            contextWindow: typeof model.context_length === 'number' ? model.context_length : 64000,
            capabilities: {
                streaming: true,
                functionCalling: !isReasoning,
                vision: hasVision,
                jsonMode: true,
                toolUse: !isReasoning,
                supportsReasoning: isReasoning
            }
        };
    }
    formatModelName(id) {
        return id.split('-').map((part)=>part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
    }
    getDefaultModels() {
        return [
            {
                id: 'deepseek-chat',
                name: 'DeepSeek Chat',
                provider: 'deepseek',
                description: 'DeepSeek V3 - Advanced reasoning and coding',
                maxTokens: 8192,
                contextWindow: 64000,
                capabilities: {
                    streaming: true,
                    functionCalling: true,
                    vision: false,
                    jsonMode: true,
                    toolUse: true,
                    supportsReasoning: true
                }
            },
            {
                id: 'deepseek-reasoner',
                name: 'DeepSeek Reasoner',
                provider: 'deepseek',
                description: 'DeepSeek R1 - Chain-of-thought reasoning',
                maxTokens: 8192,
                contextWindow: 64000,
                capabilities: {
                    streaming: true,
                    functionCalling: false,
                    vision: false,
                    jsonMode: true,
                    toolUse: false,
                    supportsReasoning: true
                }
            }
        ];
    }
    async complete(options) {
        return this.baseProvider.complete(options);
    }
    async *completionStream(options) {
        yield* this.baseProvider.completionStream(options);
    }
}
function createDeepSeekProvider(config) {
    return new DeepSeekProvider(config);
}
function createDeepSeekProviderFromApiKey(apiKey, defaultModel) {
    return new DeepSeekProvider({
        provider: 'deepseek',
        auth: {
            apiKey,
            baseUrl: DEEPSEEK_BASE_URL
        },
        defaultModel: defaultModel || 'deepseek-chat'
    });
}
}),
"[project]/apps/web/lib/llm/providers/groq.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * Groq Provider
 *
 * Supports Groq platform - ultra-fast LLM inference.
 * Uses OpenAI-compatible API.
 *
 * Base URL: https://api.groq.com/openai/v1/
 * Authentication: Authorization: Bearer <API_KEY>
 *
 * Key features:
 * - Ultra-fast inference
 * - Llama, Mixtral, Gemma models
 * - Supports function calling
 */ __turbopack_context__.s([
    "GroqProvider",
    ()=>GroqProvider,
    "createGroqProvider",
    ()=>createGroqProvider,
    "createGroqProviderFromApiKey",
    ()=>createGroqProviderFromApiKey
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$llm$2f$providers$2f$openai$2d$compatible$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/lib/llm/providers/openai-compatible.ts [app-ssr] (ecmascript)");
;
const GROQ_BASE_URL = 'https://api.groq.com/openai/v1';
class GroqProvider {
    name = 'groq';
    config;
    baseProvider;
    constructor(config){
        const groqConfig = {
            ...config,
            provider: 'groq',
            auth: {
                ...config.auth,
                baseUrl: config.auth.baseUrl || GROQ_BASE_URL
            },
            capabilities: {
                supportsReasoning: false,
                supportsInterleavedReasoning: false,
                supportsReasoningSummary: false,
                supportsToolStreaming: true,
                reasoningControl: 'none'
            }
        };
        this.config = groqConfig;
        this.baseProvider = new __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$llm$2f$providers$2f$openai$2d$compatible$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["OpenAICompatibleProvider"](groqConfig);
    }
    async listModels() {
        try {
            const response = await fetch(`${this.config.auth.baseUrl || GROQ_BASE_URL}/models`, {
                headers: {
                    Authorization: `Bearer ${this.config.auth.apiKey}`
                }
            });
            if (!response.ok) {
                return this.getDefaultModels();
            }
            const data = await response.json();
            const models = data.data || [];
            if (models.length === 0) {
                return this.getDefaultModels();
            }
            return models.map((model)=>this.transformModel(model));
        } catch (error) {
            void error;
            return this.getDefaultModels();
        }
    }
    transformModel(model) {
        const id = String(model.id ?? '');
        const hasTools = id.includes('llama') || id.includes('mixtral') || id.includes('gemma2');
        return {
            id,
            name: this.formatModelName(id),
            provider: 'groq',
            description: typeof model.description === 'string' && model.description.length > 0 ? model.description : `Groq ${id}`,
            maxTokens: 8192,
            contextWindow: typeof model.context_window === 'number' ? model.context_window : 131072,
            capabilities: {
                streaming: true,
                functionCalling: hasTools,
                vision: false,
                jsonMode: true,
                toolUse: hasTools
            }
        };
    }
    formatModelName(id) {
        return id.split('-').map((part)=>part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
    }
    getDefaultModels() {
        return [
            {
                id: 'llama-3.3-70b-versatile',
                name: 'Llama 3.3 70B Versatile',
                provider: 'groq',
                description: 'Meta Llama 3.3 70B - Versatile and fast',
                maxTokens: 8192,
                contextWindow: 128000,
                capabilities: {
                    streaming: true,
                    functionCalling: true,
                    vision: false,
                    jsonMode: true,
                    toolUse: true
                }
            },
            {
                id: 'llama-3.1-8b-instant',
                name: 'Llama 3.1 8B Instant',
                provider: 'groq',
                description: 'Meta Llama 3.1 8B - Ultra fast',
                maxTokens: 8192,
                contextWindow: 128000,
                capabilities: {
                    streaming: true,
                    functionCalling: true,
                    vision: false,
                    jsonMode: true,
                    toolUse: true
                }
            },
            {
                id: 'mixtral-8x7b-32768',
                name: 'Mixtral 8x7B',
                provider: 'groq',
                description: 'Mistral Mixtral 8x7B - Efficient MoE',
                maxTokens: 32768,
                contextWindow: 32768,
                capabilities: {
                    streaming: true,
                    functionCalling: true,
                    vision: false,
                    jsonMode: true,
                    toolUse: true
                }
            },
            {
                id: 'gemma2-9b-it',
                name: 'Gemma 2 9B IT',
                provider: 'groq',
                description: 'Google Gemma 2 9B - Instruction tuned',
                maxTokens: 8192,
                contextWindow: 8192,
                capabilities: {
                    streaming: true,
                    functionCalling: true,
                    vision: false,
                    jsonMode: true,
                    toolUse: true
                }
            }
        ];
    }
    async complete(options) {
        return this.baseProvider.complete(options);
    }
    async *completionStream(options) {
        yield* this.baseProvider.completionStream(options);
    }
}
function createGroqProvider(config) {
    return new GroqProvider(config);
}
function createGroqProviderFromApiKey(apiKey, defaultModel) {
    return new GroqProvider({
        provider: 'groq',
        auth: {
            apiKey,
            baseUrl: GROQ_BASE_URL
        },
        defaultModel: defaultModel || 'llama-3.3-70b-versatile'
    });
}
}),
"[project]/apps/web/lib/llm/providers/fireworks.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * Fireworks AI Provider
 *
 * Supports Fireworks AI platform - fast inference with fine-tuning support.
 * Uses OpenAI-compatible API.
 *
 * Base URL: https://api.fireworks.ai/inference/v1/
 * Authentication: Authorization: Bearer <API_KEY>
 *
 * Key features:
 * - Fast inference
 * - Fine-tuned models
 * - Multiple model families
 */ __turbopack_context__.s([
    "FireworksProvider",
    ()=>FireworksProvider,
    "createFireworksProvider",
    ()=>createFireworksProvider,
    "createFireworksProviderFromApiKey",
    ()=>createFireworksProviderFromApiKey
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$llm$2f$providers$2f$openai$2d$compatible$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/lib/llm/providers/openai-compatible.ts [app-ssr] (ecmascript)");
;
const FIREWORKS_BASE_URL = 'https://api.fireworks.ai/inference/v1';
class FireworksProvider {
    name = 'fireworks';
    config;
    baseProvider;
    constructor(config){
        const fireworksConfig = {
            ...config,
            provider: 'fireworks',
            auth: {
                ...config.auth,
                baseUrl: config.auth.baseUrl || FIREWORKS_BASE_URL
            },
            capabilities: {
                supportsReasoning: false,
                supportsInterleavedReasoning: false,
                supportsReasoningSummary: false,
                supportsToolStreaming: true,
                reasoningControl: 'none'
            }
        };
        this.config = fireworksConfig;
        this.baseProvider = new __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$llm$2f$providers$2f$openai$2d$compatible$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["OpenAICompatibleProvider"](fireworksConfig);
    }
    async listModels() {
        try {
            const response = await fetch(`${this.config.auth.baseUrl || FIREWORKS_BASE_URL}/models`, {
                headers: {
                    Authorization: `Bearer ${this.config.auth.apiKey}`
                }
            });
            if (!response.ok) {
                return this.getDefaultModels();
            }
            const data = await response.json();
            const models = data.data || [];
            if (models.length === 0) {
                return this.getDefaultModels();
            }
            return models.filter((model)=>model.type === 'text').map((model)=>this.transformModel(model));
        } catch (error) {
            void error;
            return this.getDefaultModels();
        }
    }
    transformModel(model) {
        const id = String(model.id ?? '');
        const hasTools = id.includes('llama') || id.includes('mixtral') || id.includes('qwen') || id.includes('phi');
        return {
            id,
            name: this.formatModelName(id),
            provider: 'fireworks',
            description: typeof model.description === 'string' && model.description.length > 0 ? model.description : `Fireworks ${id}`,
            maxTokens: typeof model.max_output_tokens === 'number' ? model.max_output_tokens : 4096,
            contextWindow: typeof model.context_length === 'number' ? model.context_length : 32768,
            capabilities: {
                streaming: true,
                functionCalling: hasTools,
                vision: false,
                jsonMode: true,
                toolUse: hasTools
            }
        };
    }
    formatModelName(id) {
        const parts = id.split('/');
        const name = parts.length > 1 ? parts[1] : parts[0];
        return name.split('-').map((part)=>part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
    }
    getDefaultModels() {
        return [
            {
                id: 'accounts/fireworks/models/llama-v3p3-70b-instruct',
                name: 'Llama 3.3 70B Instruct',
                provider: 'fireworks',
                description: 'Meta Llama 3.3 70B - High performance',
                maxTokens: 16384,
                contextWindow: 131072,
                capabilities: {
                    streaming: true,
                    functionCalling: true,
                    vision: false,
                    jsonMode: true,
                    toolUse: true
                }
            },
            {
                id: 'accounts/fireworks/models/qwen2p5-72b-instruct',
                name: 'Qwen 2.5 72B Instruct',
                provider: 'fireworks',
                description: 'Alibaba Qwen 2.5 72B - Strong multilingual',
                maxTokens: 16384,
                contextWindow: 131072,
                capabilities: {
                    streaming: true,
                    functionCalling: true,
                    vision: false,
                    jsonMode: true,
                    toolUse: true
                }
            },
            {
                id: 'accounts/fireworks/models/phi-4',
                name: 'Phi 4',
                provider: 'fireworks',
                description: 'Microsoft Phi 4 - Compact and capable',
                maxTokens: 16384,
                contextWindow: 16384,
                capabilities: {
                    streaming: true,
                    functionCalling: true,
                    vision: false,
                    jsonMode: true,
                    toolUse: true
                }
            }
        ];
    }
    async complete(options) {
        return this.baseProvider.complete(options);
    }
    async *completionStream(options) {
        yield* this.baseProvider.completionStream(options);
    }
}
function createFireworksProvider(config) {
    return new FireworksProvider(config);
}
function createFireworksProviderFromApiKey(apiKey, defaultModel) {
    return new FireworksProvider({
        provider: 'fireworks',
        auth: {
            apiKey,
            baseUrl: FIREWORKS_BASE_URL
        },
        defaultModel: defaultModel || 'accounts/fireworks/models/llama-v3p3-70b-instruct'
    });
}
}),
"[project]/apps/web/lib/llm/models-dev.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "clearModelsDevCache",
    ()=>clearModelsDevCache,
    "fetchModelsDevMetadata",
    ()=>fetchModelsDevMetadata,
    "getAllModels",
    ()=>getAllModels,
    "getProviderBaseUrl",
    ()=>getProviderBaseUrl,
    "getSupportedProviders",
    ()=>getSupportedProviders,
    "mapModelsDevToModelInfo",
    ()=>mapModelsDevToModelInfo
]);
/**
 * Models.dev Metadata Integration
 *
 * Fetches model metadata from models.dev to dynamically populate
 * available models across all supported providers.
 *
 * @see https://models.dev
 */ var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$logger$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/lib/logger.ts [app-ssr] (ecmascript)");
;
const MODELS_DEV_URL = 'https://models.dev/api/models.json';
const PROVIDER_ID_MAP = {
    openai: 'openai',
    anthropic: 'anthropic',
    openrouter: 'openrouter',
    together: 'together',
    deepseek: 'deepseek',
    groq: 'groq',
    fireworks: 'fireworks',
    chutes: 'chutes',
    zai: 'zai',
    zhipu: 'zai'
};
let cachedMetadata = null;
let cacheTimestamp = 0;
const CACHE_TTL = 1000 * 60 * 60 // 1 hour
;
async function fetchModelsDevMetadata() {
    const now = Date.now();
    if (cachedMetadata && now - cacheTimestamp < CACHE_TTL) {
        return cachedMetadata;
    }
    try {
        const response = await fetch(MODELS_DEV_URL);
        if (!response.ok) {
            throw new Error(`Failed to fetch from models.dev: ${response.statusText}`);
        }
        cachedMetadata = await response.json();
        cacheTimestamp = now;
        return cachedMetadata;
    } catch (error) {
        __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$logger$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["appLog"].error('Error fetching models.dev metadata:', error);
        return cachedMetadata || {};
    }
}
function mapModelsDevToModelInfo(providerId, data) {
    const provider = data[providerId];
    if (!provider || !provider.models) return [];
    const pandaProviderId = PROVIDER_ID_MAP[providerId] || providerId;
    return Object.values(provider.models).map((model)=>{
        const capabilities = parseCapabilities(model.capabilities || []);
        return {
            id: model.id,
            name: model.name || model.id,
            provider: pandaProviderId,
            description: `${model.name || model.id} via ${provider.provider_name}`,
            maxTokens: model.max_output_tokens || model.top_provider?.max_completion_tokens || 4096,
            contextWindow: model.context_length || model.top_provider?.context_length || 8192,
            capabilities: {
                streaming: true,
                functionCalling: capabilities.functionCalling,
                vision: capabilities.vision,
                jsonMode: true,
                toolUse: capabilities.toolUse,
                supportsReasoning: capabilities.supportsReasoning
            },
            pricing: model.pricing ? {
                inputPerToken: model.pricing.input,
                outputPerToken: model.pricing.output
            } : undefined
        };
    });
}
function parseCapabilities(capabilities) {
    const result = {
        functionCalling: false,
        vision: false,
        toolUse: false,
        supportsReasoning: false
    };
    for (const cap of capabilities){
        const normalized = cap.toLowerCase().replace(/[-\s]/g, '_');
        if (normalized === 'tools' || normalized === 'function_calling') {
            result.functionCalling = true;
            result.toolUse = true;
        }
        if (normalized === 'tool_use') {
            result.toolUse = true;
        }
        if (normalized === 'vision') {
            result.vision = true;
        }
        if (normalized === 'reasoning') {
            result.supportsReasoning = true;
        }
    }
    return result;
}
function getProviderBaseUrl(providerId, data) {
    const provider = data[providerId];
    return provider?.base_url;
}
function getSupportedProviders(data) {
    return Object.keys(data).filter((id)=>PROVIDER_ID_MAP[id] || id);
}
function clearModelsDevCache() {
    cachedMetadata = null;
    cacheTimestamp = 0;
}
async function getAllModels(data) {
    const results = [];
    for (const providerId of Object.keys(data)){
        const models = mapModelsDevToModelInfo(providerId, data);
        if (models.length > 0) {
            results.push({
                providerId,
                models
            });
        }
    }
    return results;
}
}),
"[project]/apps/web/lib/llm/registry.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ProviderRegistry",
    ()=>ProviderRegistry,
    "createProviderFromEnv",
    ()=>createProviderFromEnv,
    "getGlobalRegistry",
    ()=>getGlobalRegistry,
    "resetGlobalRegistry",
    ()=>resetGlobalRegistry
]);
/**
 * Provider Registry
 *
 * Manages LLM provider instances and handles provider selection.
 * Supports multiple providers with different configurations.
 */ var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$logger$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/lib/logger.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$llm$2f$providers$2f$openai$2d$compatible$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/lib/llm/providers/openai-compatible.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$llm$2f$providers$2f$anthropic$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/lib/llm/providers/anthropic.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$llm$2f$providers$2f$chutes$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/lib/llm/providers/chutes.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$llm$2f$providers$2f$deepseek$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/lib/llm/providers/deepseek.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$llm$2f$providers$2f$groq$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/lib/llm/providers/groq.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$llm$2f$providers$2f$fireworks$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/lib/llm/providers/fireworks.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$llm$2f$models$2d$dev$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/lib/llm/models-dev.ts [app-ssr] (ecmascript)");
;
;
;
;
;
;
;
;
class ProviderRegistry {
    providers = new Map();
    defaultProviderId = null;
    modelsDevCache = null;
    /**
   * Create a new provider instance
   * @param id - Unique identifier for this provider instance
   * @param config - Provider configuration
   * @param setAsDefault - Whether to set as default provider
   */ createProvider(id, config, setAsDefault = false) {
        let provider;
        // Create appropriate provider based on type
        switch(config.provider){
            case 'openai':
            case 'openrouter':
            case 'together':
            case 'zai':
            case 'custom':
                provider = new __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$llm$2f$providers$2f$openai$2d$compatible$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["OpenAICompatibleProvider"](config);
                break;
            case 'anthropic':
                provider = new __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$llm$2f$providers$2f$anthropic$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["AnthropicProvider"](config);
                break;
            case 'chutes':
                provider = new __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$llm$2f$providers$2f$chutes$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["ChutesProvider"](config);
                break;
            case 'deepseek':
                provider = new __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$llm$2f$providers$2f$deepseek$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["DeepSeekProvider"](config);
                break;
            case 'groq':
                provider = new __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$llm$2f$providers$2f$groq$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["GroqProvider"](config);
                break;
            case 'fireworks':
                provider = new __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$llm$2f$providers$2f$fireworks$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["FireworksProvider"](config);
                break;
            default:
                throw new Error(`Unsupported provider type: ${config.provider}`);
        }
        // Store provider instance
        this.providers.set(id, {
            id,
            provider,
            config,
            createdAt: Date.now()
        });
        // Set as default if requested
        if (setAsDefault) {
            this.defaultProviderId = id;
        }
        return provider;
    }
    /**
   * Get a provider by ID
   * @param id - Provider instance ID
   */ getProvider(id) {
        const entry = this.providers.get(id);
        return entry?.provider;
    }
    /**
   * Get the default provider
   */ getDefaultProvider() {
        if (!this.defaultProviderId) {
            // Return first provider if no default set
            const first = this.providers.values().next().value;
            return first?.provider;
        }
        return this.getProvider(this.defaultProviderId);
    }
    /**
   * Set the default provider
   */ setDefaultProvider(id) {
        if (!this.providers.has(id)) {
            throw new Error(`Provider '${id}' not found`);
        }
        this.defaultProviderId = id;
    }
    /**
   * Remove a provider
   */ removeProvider(id) {
        if (this.defaultProviderId === id) {
            this.defaultProviderId = null;
        }
        return this.providers.delete(id);
    }
    /**
   * List all registered providers
   */ listProviders() {
        return Array.from(this.providers.values()).map((entry)=>({
                id: entry.id,
                type: entry.config.provider,
                createdAt: entry.createdAt
            }));
    }
    /**
   * Get provider configuration
   */ getProviderConfig(id) {
        const entry = this.providers.get(id);
        return entry?.config;
    }
    /**
   * Update provider configuration
   */ updateProviderConfig(id, config) {
        const entry = this.providers.get(id);
        if (!entry) return false;
        // Create new provider with updated config
        const newConfig = {
            ...entry.config,
            ...config
        };
        // Recreate provider with new config
        this.createProvider(id, newConfig, this.defaultProviderId === id);
        return true;
    }
    /**
   * Fetch all models from all providers
   */ async listAllModels() {
        const allModels = [];
        for (const [id, entry] of this.providers){
            try {
                const models = await entry.provider.listModels();
                allModels.push(...models.map((m)=>({
                        ...m,
                        providerId: id
                    })));
            } catch (error) {
                __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$logger$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["appLog"].error(`Failed to list models for provider '${id}':`, error);
            }
        }
        return allModels;
    }
    /**
   * Refresh models from Models.dev
   */ async refreshModelsFromModelsDev() {
        try {
            this.modelsDevCache = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$llm$2f$models$2d$dev$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["fetchModelsDevMetadata"])();
        } catch (error) {
            __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$logger$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["appLog"].error('Failed to fetch Models.dev metadata:', error);
        }
    }
    /**
   * Get models from Models.dev for a specific provider
   */ getModelsFromModelsDev(providerId) {
        if (!this.modelsDevCache) return [];
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$llm$2f$models$2d$dev$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["mapModelsDevToModelInfo"])(providerId, this.modelsDevCache);
    }
    /**
   * Get all models from Models.dev
   */ async getAllModelsFromModelsDev() {
        if (!this.modelsDevCache) {
            await this.refreshModelsFromModelsDev();
        }
        if (!this.modelsDevCache) return [];
        return Object.keys(this.modelsDevCache).map((providerId)=>({
                providerId,
                models: (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$llm$2f$models$2d$dev$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["mapModelsDevToModelInfo"])(providerId, this.modelsDevCache)
            }));
    }
    /**
   * Clear all providers
   */ clear() {
        this.providers.clear();
        this.defaultProviderId = null;
        this.modelsDevCache = null;
    }
}
/**
 * Singleton instance for global use
 */ let globalRegistry = null;
function getGlobalRegistry() {
    if (!globalRegistry) {
        globalRegistry = new ProviderRegistry();
    }
    return globalRegistry;
}
function resetGlobalRegistry() {
    globalRegistry = null;
}
function createProviderFromEnv() {
    const registry = getGlobalRegistry();
    // Try OpenRouter
    if (process.env.OPENROUTER_API_KEY) {
        return registry.createProvider('openrouter', {
            provider: 'openrouter',
            auth: {
                apiKey: process.env.OPENROUTER_API_KEY,
                baseUrl: 'https://openrouter.ai/api/v1'
            },
            defaultModel: process.env.OPENROUTER_DEFAULT_MODEL || 'anthropic/claude-3.5-sonnet'
        }, true);
    }
    // Try Together.ai
    if (process.env.TOGETHER_API_KEY) {
        return registry.createProvider('together', {
            provider: 'together',
            auth: {
                apiKey: process.env.TOGETHER_API_KEY,
                baseUrl: 'https://api.together.xyz/v1'
            },
            defaultModel: process.env.TOGETHER_DEFAULT_MODEL || 'togethercomputer/llama-3.1-70b'
        }, true);
    }
    // Try Anthropic
    if (process.env.ANTHROPIC_API_KEY) {
        return registry.createProvider('anthropic', {
            provider: 'anthropic',
            auth: {
                apiKey: process.env.ANTHROPIC_API_KEY,
                baseUrl: process.env.ANTHROPIC_BASE_URL
            },
            defaultModel: process.env.ANTHROPIC_DEFAULT_MODEL || 'claude-sonnet-4-5'
        }, true);
    }
    // Try OpenAI
    if (process.env.OPENAI_API_KEY) {
        return registry.createProvider('openai', {
            provider: 'openai',
            auth: {
                apiKey: process.env.OPENAI_API_KEY,
                baseUrl: process.env.OPENAI_BASE_URL
            },
            defaultModel: process.env.OPENAI_DEFAULT_MODEL || 'gpt-4o'
        }, true);
    }
    // Try Z.ai - supports both API key and coding plan
    const zaiApiKey = process.env.ZAI_API_KEY || process.env.ZAI_CODING_PLAN_KEY;
    if (zaiApiKey) {
        return registry.createProvider('zai', {
            provider: 'zai',
            auth: {
                apiKey: zaiApiKey,
                baseUrl: process.env.ZAI_BASE_URL || 'https://api.z.ai/api/paas/v4'
            },
            defaultModel: process.env.ZAI_DEFAULT_MODEL || 'glm-4.7'
        }, true);
    }
    // Try Chutes.ai
    if (process.env.CHUTES_API_KEY) {
        return registry.createProvider('chutes', {
            provider: 'chutes',
            auth: {
                apiKey: process.env.CHUTES_API_KEY,
                baseUrl: process.env.CHUTES_BASE_URL || 'https://llm.chutes.ai/v1'
            },
            defaultModel: process.env.CHUTES_DEFAULT_MODEL || 'meta-llama/Llama-3.1-8B-Instruct'
        }, true);
    }
    // Try DeepSeek
    if (process.env.DEEPSEEK_API_KEY) {
        return registry.createProvider('deepseek', {
            provider: 'deepseek',
            auth: {
                apiKey: process.env.DEEPSEEK_API_KEY,
                baseUrl: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1'
            },
            defaultModel: process.env.DEEPSEEK_DEFAULT_MODEL || 'deepseek-chat'
        }, true);
    }
    // Try Groq
    if (process.env.GROQ_API_KEY) {
        return registry.createProvider('groq', {
            provider: 'groq',
            auth: {
                apiKey: process.env.GROQ_API_KEY,
                baseUrl: process.env.GROQ_BASE_URL || 'https://api.groq.com/openai/v1'
            },
            defaultModel: process.env.GROQ_DEFAULT_MODEL || 'llama-3.3-70b-versatile'
        }, true);
    }
    // Try Fireworks AI
    if (process.env.FIREWORKS_API_KEY) {
        return registry.createProvider('fireworks', {
            provider: 'fireworks',
            auth: {
                apiKey: process.env.FIREWORKS_API_KEY,
                baseUrl: process.env.FIREWORKS_BASE_URL || 'https://api.fireworks.ai/inference/v1'
            },
            defaultModel: process.env.FIREWORKS_DEFAULT_MODEL || 'accounts/fireworks/models/llama-v3p3-70b-instruct'
        }, true);
    }
    return null;
}
}),
"[project]/apps/web/lib/llm/e2e-provider.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "createE2EProvider",
    ()=>createE2EProvider,
    "isE2ESpecApprovalModeEnabled",
    ()=>isE2ESpecApprovalModeEnabled
]);
const E2E_PROVIDER_CONFIG = {
    provider: 'custom',
    auth: {
        apiKey: 'e2e-local'
    },
    defaultModel: 'e2e-spec-model'
};
const E2E_MODEL = {
    id: 'e2e-spec-model',
    name: 'E2E Spec Model',
    provider: 'custom',
    description: 'Deterministic local-only provider for browser E2E flows.',
    maxTokens: 2048,
    contextWindow: 8192,
    capabilities: {
        streaming: true,
        functionCalling: false,
        vision: false,
        jsonMode: false,
        toolUse: false,
        supportsReasoning: false
    }
};
function buildE2EResponse(_options) {
    return 'E2E agent completed approved specification.';
}
function isE2ESpecApprovalModeEnabled() {
    return ("TURBOPACK compile-time value", "spec-approval") === 'spec-approval';
}
function createE2EProvider() {
    return {
        name: 'E2E Provider',
        config: E2E_PROVIDER_CONFIG,
        async listModels () {
            return [
                E2E_MODEL
            ];
        },
        async complete (options) {
            const content = buildE2EResponse(options);
            return {
                message: {
                    role: 'assistant',
                    content
                },
                finishReason: 'stop',
                usage: {
                    promptTokens: 16,
                    completionTokens: 8,
                    totalTokens: 24
                },
                model: E2E_MODEL.id
            };
        },
        async *completionStream (options) {
            const content = buildE2EResponse(options);
            yield {
                type: 'text',
                content
            };
            yield {
                type: 'finish',
                finishReason: 'stop',
                usage: {
                    promptTokens: 16,
                    completionTokens: 8,
                    totalTokens: 24
                }
            };
        }
    };
}
}),
"[project]/apps/web/lib/chat/planDraft.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "buildApprovedPlanExecutionMessage",
    ()=>buildApprovedPlanExecutionMessage,
    "buildMessageWithPlanDraft",
    ()=>buildMessageWithPlanDraft,
    "canApprovePlan",
    ()=>canApprovePlan,
    "canBuildFromPlan",
    ()=>canBuildFromPlan,
    "deriveNextPlanDraft",
    ()=>deriveNextPlanDraft,
    "getNextPlanStatusAfterDraftChange",
    ()=>getNextPlanStatusAfterDraftChange,
    "getNextPlanStatusAfterGeneration",
    ()=>getNextPlanStatusAfterGeneration,
    "pickLatestArchitectAssistantPlan",
    ()=>pickLatestArchitectAssistantPlan
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$chat$2f$brainstorming$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/lib/chat/brainstorming.ts [app-ssr] (ecmascript)");
;
function normalizePlanDraft(value) {
    return value?.trim() ?? '';
}
function buildMessageWithPlanDraft(planDraft, userContent, previousMessages) {
    const plan = planDraft?.trim();
    if (!plan) return userContent;
    // Avoid re-prefixing if we already included a plan block.
    if (userContent.startsWith('Plan draft:\n')) return userContent;
    if (userContent.includes('\nPlan draft:\n') || userContent.startsWith('Plan draft:')) return userContent;
    // Avoid appending if the exact same plan draft was already sent in history
    if (previousMessages && previousMessages.length > 0) {
        const planTextSnippet = `Plan draft:\n${plan}`;
        for (const msg of previousMessages){
            if (msg.role === 'user' && msg.content.includes(planTextSnippet)) {
                return userContent;
            }
        }
    }
    return `Plan draft:\n${plan}\n\nUser request:\n${userContent}`;
}
function buildApprovedPlanExecutionMessage(planDraft, originalRequest = 'Execute the approved plan.') {
    const plan = planDraft?.trim();
    if (!plan) return originalRequest;
    return `We are switching from Architect (Plan Mode) to Build (Execute Mode).

Approved plan:
${plan}

Execution contract:
- Treat the approved plan as the primary execution contract.
- Execute it step-by-step.
- Use the active specification as a secondary constraint if present.
- Report progress against the plan while implementing.

Original request:
${originalRequest}`;
}
function pickLatestArchitectAssistantPlan(messages) {
    for(let i = messages.length - 1; i >= 0; i--){
        const m = messages[i];
        if (m.role === 'assistant' && m.mode === 'architect' && m.content.trim()) {
            return m.content;
        }
    }
    return null;
}
function deriveNextPlanDraft({ mode, agentStatus, currentPlanDraft, messages, requireValidatedBrainstorm = false }) {
    if (mode !== 'architect') return null;
    if (agentStatus !== 'complete') return null;
    const latest = pickLatestArchitectAssistantPlan(messages);
    if (!latest) return null;
    if (requireValidatedBrainstorm && (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$chat$2f$brainstorming$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["extractBrainstormPhase"])(latest) !== 'validated_plan') {
        return null;
    }
    const normalizedLatest = (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$chat$2f$brainstorming$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["stripBrainstormPhaseMarker"])(latest).trim();
    if (!normalizedLatest) return null;
    const current = currentPlanDraft?.trim() ?? '';
    if (current && current === normalizedLatest) return null;
    return normalizedLatest;
}
function getNextPlanStatusAfterDraftChange(args) {
    const previousDraft = normalizePlanDraft(args.previousDraft);
    const nextDraft = normalizePlanDraft(args.nextDraft);
    const currentStatus = args.currentStatus ?? 'idle';
    if (previousDraft === nextDraft) {
        return currentStatus;
    }
    if (currentStatus === 'approved' || currentStatus === 'executing') {
        return 'stale';
    }
    return nextDraft ? 'drafting' : 'idle';
}
function getNextPlanStatusAfterGeneration(args) {
    const previousDraft = normalizePlanDraft(args.previousDraft);
    const nextDraft = normalizePlanDraft(args.nextDraft);
    void args.currentStatus;
    if (!nextDraft) return null;
    if (previousDraft === nextDraft) return null;
    return 'awaiting_review';
}
function canApprovePlan(status, planDraft) {
    const normalizedDraft = normalizePlanDraft(planDraft);
    if (!normalizedDraft) return false;
    return status === 'awaiting_review' || status === 'stale';
}
function canBuildFromPlan(status, planDraft) {
    const normalizedDraft = normalizePlanDraft(planDraft);
    if (!normalizedDraft) return false;
    return status === 'approved' || status === 'executing';
}
}),
];

//# sourceMappingURL=apps_web_lib_73796192._.js.map