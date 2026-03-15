(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/apps/web/lib/agent/context/session-summary.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * Session Summary Generator
 *
 * Generates structured session summaries for context handoffs between sessions.
 * Extracts key decisions, file modifications, current state, and next steps.
 */ __turbopack_context__.s([
    "formatSummaryForHandoff",
    ()=>formatSummaryForHandoff,
    "generateStructuredSummary",
    ()=>generateStructuredSummary
]);
function generateStructuredSummary(options) {
    const { messages } = options;
    if (messages.length === 0) {
        return {
            decisions: [],
            filesModified: [],
            currentState: 'No previous activity',
            nextSteps: [],
            keyContext: []
        };
    }
    // Extract information from messages
    const decisions = extractDecisions(messages);
    const filesModified = extractFilesModified(messages);
    const currentState = extractCurrentState(messages);
    const nextSteps = extractNextSteps(messages);
    const keyContext = extractKeyContext(messages);
    return {
        decisions: limitArray(decisions, 5),
        filesModified: limitArray(filesModified, 10),
        currentState: truncateText(currentState, 200),
        nextSteps: limitArray(nextSteps, 5),
        keyContext: limitArray(keyContext, 5)
    };
}
function formatSummaryForHandoff(summary) {
    const sections = [];
    // Current State (most important)
    if (summary.currentState) {
        sections.push(`**Current State:** ${summary.currentState}`);
    }
    // Files Modified
    if (summary.filesModified.length > 0) {
        sections.push('**Files Modified:**\n' + summary.filesModified.map((f)=>`- ${f.path}${f.description ? `: ${f.description}` : ''}`).join('\n'));
    }
    // Decisions
    if (summary.decisions.length > 0) {
        sections.push('**Decisions Made:**\n' + summary.decisions.map((d)=>`- ${d}`).join('\n'));
    }
    // Next Steps
    if (summary.nextSteps.length > 0) {
        sections.push('**Next Steps:**\n' + summary.nextSteps.map((s)=>`- ${s}`).join('\n'));
    }
    // Key Context
    if (summary.keyContext.length > 0) {
        sections.push('**Key Context:**\n' + summary.keyContext.map((c)=>`- ${c}`).join('\n'));
    }
    let output = sections.join('\n\n');
    // Hard cap at ~400 tokens (roughly 1600 chars)
    if (output.length > 1600) {
        output = output.slice(0, 1600) + '\n\n[... additional context available]';
    }
    return output;
}
/**
 * Extract key decisions from assistant messages
 */ function extractDecisions(messages) {
    const decisions = [];
    const decisionPatterns = [
        /decided to\s+(.+?)(?:\.|\n|$)/i,
        /we('ll| will)\s+(.+?)(?:\.|\n|$)/i,
        /let('s| us)\s+(.+?)(?:\.|\n|$)/i,
        /agreed (?:to|on)\s+(.+?)(?:\.|\n|$)/i,
        /conclusion:?\s*(.+?)(?:\.|\n|$)/i,
        /chosen:?\s*(.+?)(?:\.|\n|$)/i,
        /selected:?\s*(.+?)(?:\.|\n|$)/i
    ];
    for (const message of messages){
        if (message.role !== 'assistant') continue;
        for (const pattern of decisionPatterns){
            const match = message.content.match(pattern);
            if (match) {
                const decision = match[1] || match[2];
                if (decision && decision.length > 10 && decision.length < 200) {
                    const cleanDecision = decision.trim().replace(/\s+/g, ' ');
                    if (!decisions.includes(cleanDecision)) {
                        decisions.push(cleanDecision);
                    }
                }
            }
        }
    }
    return decisions;
}
/**
 * Extract files modified from tool calls
 */ function extractFilesModified(messages) {
    const filesMap = new Map();
    for (const message of messages){
        if (message.role !== 'assistant' || !message.toolCalls) continue;
        for (const toolCall of message.toolCalls){
            // Extract from write_files tool calls
            if (toolCall.name === 'write_files' || toolCall.name === 'writeFile') {
                const args = toolCall.args;
                if (args.files) {
                    for (const file of args.files){
                        if (file.path) {
                            const existingCount = filesMap.get(file.path) || '';
                            filesMap.set(file.path, existingCount ? `${existingCount} (updated)` : 'modified');
                        }
                    }
                }
            }
            // Extract from write_file (singular) tool calls
            if (toolCall.name === 'write_file') {
                const args = toolCall.args;
                if (args.path) {
                    filesMap.set(args.path, args.description || 'modified');
                }
            }
        }
    }
    // Also look for file mentions in assistant responses
    for (const message of messages){
        if (message.role !== 'assistant') continue;
        const fileMentions = message.content.match(/(?:created|updated|modified|edited)\s+(?:the\s+)?[`']?([^`\s]+\.[a-zA-Z0-9]+)[`']?/gi);
        if (fileMentions) {
            for (const mention of fileMentions){
                const match = mention.match(/[`']?([^`\s]+\.[a-zA-Z0-9]+)[`']?/i);
                if (match) {
                    const path = match[1];
                    if (!filesMap.has(path)) {
                        filesMap.set(path, 'modified');
                    }
                }
            }
        }
    }
    return Array.from(filesMap.entries()).map(([path, description])=>({
            path,
            description
        })).sort((a, b)=>a.path.localeCompare(b.path));
}
/**
 * Extract current state from last few messages
 */ function extractCurrentState(messages) {
    // Get last assistant message
    const lastAssistantMessage = [
        ...messages
    ].reverse().find((m)=>m.role === 'assistant');
    if (!lastAssistantMessage) {
        return 'Session ended without assistant response';
    }
    const content = lastAssistantMessage.content;
    // Look for explicit status/state mentions
    const statusMatch = content.match(/(?:status|state|progress):\s*(.+?)(?:\n|$)/i);
    if (statusMatch) {
        return statusMatch[1].trim();
    }
    // Look for completion indicators
    if (/completed|done|finished|ready/i.test(content)) {
        return 'Task completed';
    }
    // Look for blockers
    if (/blocked|error|failed|issue|problem/i.test(content)) {
        return 'Encountered issues - needs attention';
    }
    // Look for waiting/confirmation
    if (/waiting|pending|need confirmation|let me know/i.test(content)) {
        return 'Awaiting user input or confirmation';
    }
    // Default: summarize last action
    const firstSentence = content.split(/[.!?]\s+/)[0];
    if (firstSentence && firstSentence.length > 10) {
        return truncateText(firstSentence, 150);
    }
    return 'In progress';
}
/**
 * Extract next steps/outstanding tasks
 */ function extractNextSteps(messages) {
    const steps = [];
    const stepPatterns = [
        /next:?\s*(.+?)(?:\.|\n|$)/i,
        /next step:?\s*(.+?)(?:\.|\n|$)/i,
        /todo:?\s*(.+?)(?:\.|\n|$)/i,
        /remaining:?\s*(.+?)(?:\.|\n|$)/i,
        /still need to\s+(.+?)(?:\.|\n|$)/i,
        /we should\s+(.+?)(?:\.|\n|$)/i,
        /\d+\.\s*(.+?)(?:\.|\n|$)/
    ];
    // Look at last few messages for next steps
    const recentMessages = messages.slice(-5);
    for (const message of recentMessages){
        if (message.role !== 'assistant') continue;
        for (const pattern of stepPatterns){
            const matches = message.content.match(new RegExp(pattern, 'gi'));
            if (matches) {
                for (const match of matches){
                    const stepMatch = match.match(pattern);
                    if (stepMatch) {
                        const step = stepMatch[1].trim();
                        if (step.length > 5 && step.length < 150 && !steps.includes(step)) {
                            steps.push(step);
                        }
                    }
                }
            }
        }
    }
    return steps;
}
/**
 * Extract important context/facts discovered
 */ function extractKeyContext(messages) {
    const context = [];
    const contextPatterns = [
        /important:?\s*(.+?)(?:\.|\n|$)/i,
        /note:?\s*(.+?)(?:\.|\n|$)/i,
        /discovered:?\s*(.+?)(?:\.|\n|$)/i,
        /found that\s+(.+?)(?:\.|\n|$)/i,
        /realized (?:that )?(.+?)(?:\.|\n|$)/i,
        /key (?:point|fact|insight):?\s*(.+?)(?:\.|\n|$)/i
    ];
    for (const message of messages){
        if (message.role !== 'assistant') continue;
        for (const pattern of contextPatterns){
            const matches = message.content.match(new RegExp(pattern, 'gi'));
            if (matches) {
                for (const match of matches){
                    const ctxMatch = match.match(pattern);
                    if (ctxMatch) {
                        const ctx = ctxMatch[1].trim();
                        if (ctx.length > 10 && ctx.length < 200 && !context.includes(ctx)) {
                            context.push(ctx);
                        }
                    }
                }
            }
        }
    }
    return context;
}
/**
 * Limit array to max items
 */ function limitArray(arr, max) {
    return arr.slice(0, max);
}
/**
 * Truncate text to max length
 */ function truncateText(text, maxLength) {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength - 3) + '...';
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
]);

//# sourceMappingURL=apps_web_lib_agent_context_session-summary_ts_b0ea2228._.js.map