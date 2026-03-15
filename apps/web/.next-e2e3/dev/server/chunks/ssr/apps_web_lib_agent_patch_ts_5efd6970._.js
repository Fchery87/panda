module.exports = [
"[project]/apps/web/lib/agent/patch.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * Patch System - Diff-based file application
 *
 * Implements OpenCode-style patch system:
 * - Parse unified diff format
 * - Apply patches with fuzzy line matching
 * - Generate unified diffs from file contents
 */ /**
 * Represents a single hunk in a unified diff
 */ __turbopack_context__.s([
    "applyPatch",
    ()=>applyPatch,
    "applyPatchText",
    ()=>applyPatchText,
    "createPatchFromDiff",
    ()=>createPatchFromDiff,
    "parsePatch",
    ()=>parsePatch
]);
function parsePatch(patchText) {
    const patches = [];
    const lines = patchText.split('\n');
    let currentPatch = null;
    let currentHunk = null;
    for(let i = 0; i < lines.length; i++){
        const line = lines[i];
        // Start of a new file patch
        if (line.startsWith('diff --git')) {
            if (currentPatch) {
                patches.push(currentPatch);
            }
            currentPatch = null;
            currentHunk = null;
            continue;
        }
        // Old file path
        if (line.startsWith('--- ')) {
            const oldPath = line.slice(4).split('\t')[0];
            if (!currentPatch) {
                currentPatch = {
                    path: '',
                    hunks: [],
                    isNewFile: false,
                    isDeletedFile: false,
                    isRename: false
                };
            }
            currentPatch.oldPath = oldPath === '/dev/null' ? undefined : oldPath;
            currentPatch.isDeletedFile = oldPath === '/dev/null';
            continue;
        }
        // New file path
        if (line.startsWith('+++ ')) {
            const newPath = line.slice(4).split('\t')[0];
            if (currentPatch) {
                currentPatch.newPath = newPath === '/dev/null' ? undefined : newPath;
                currentPatch.path = newPath === '/dev/null' ? currentPatch.oldPath || '' : newPath;
                currentPatch.isNewFile = newPath === '/dev/null';
            }
            continue;
        }
        // File mode changes
        if (line.startsWith('old mode ') && currentPatch) {
            currentPatch.oldMode = line.slice(9);
            continue;
        }
        if (line.startsWith('new mode ') && currentPatch) {
            currentPatch.newMode = line.slice(9);
            continue;
        }
        if (line.startsWith('rename from ') && currentPatch) {
            currentPatch.oldPath = line.slice(12);
            currentPatch.isRename = true;
            continue;
        }
        if (line.startsWith('rename to ') && currentPatch) {
            currentPatch.newPath = line.slice(10);
            currentPatch.path = line.slice(10);
            continue;
        }
        // New file / deleted file markers
        if (line.startsWith('new file mode ') && currentPatch) {
            currentPatch.isNewFile = true;
            currentPatch.newMode = line.slice(14);
            continue;
        }
        if (line.startsWith('deleted file mode ') && currentPatch) {
            currentPatch.isDeletedFile = true;
            continue;
        }
        // Hunk header: @@ -oldStart,oldLength +newStart,newLength @@
        const hunkMatch = line.match(/^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/);
        if (hunkMatch && currentPatch) {
            if (currentHunk) {
                currentPatch.hunks.push(currentHunk);
            }
            currentHunk = {
                oldStart: parseInt(hunkMatch[1], 10),
                oldLength: parseInt(hunkMatch[2] || '1', 10),
                newStart: parseInt(hunkMatch[3], 10),
                newLength: parseInt(hunkMatch[4] || '1', 10),
                lines: []
            };
            continue;
        }
        // Hunk content lines
        if (currentHunk) {
            if (line.startsWith('+')) {
                currentHunk.lines.push({
                    type: 'add',
                    content: line.slice(1)
                });
            } else if (line.startsWith('-')) {
                currentHunk.lines.push({
                    type: 'remove',
                    content: line.slice(1)
                });
            } else if (line.startsWith(' ')) {
                currentHunk.lines.push({
                    type: 'context',
                    content: line.slice(1)
                });
            } else if (line.startsWith('\\')) {
                continue;
            }
        }
    }
    // Push final hunk and patch
    if (currentHunk && currentPatch) {
        currentPatch.hunks.push(currentHunk);
    }
    if (currentPatch) {
        patches.push(currentPatch);
    }
    return patches;
}
function applyPatch(original, patch, options = {}) {
    const { fuzzyLines = 0 } = options;
    // Handle new file creation
    if (patch.isNewFile) {
        const content = patch.hunks.flatMap((h)=>h.lines.filter((l)=>l.type === 'add').map((l)=>l.content)).join('\n');
        return {
            success: true,
            content,
            appliedHunks: patch.hunks.length,
            failedHunks: 0,
            fuzzyMatches: 0
        };
    }
    // Handle file deletion
    if (patch.isDeletedFile) {
        return {
            success: true,
            content: '',
            appliedHunks: patch.hunks.length,
            failedHunks: 0,
            fuzzyMatches: 0
        };
    }
    const lines = original.split('\n');
    let appliedHunks = 0;
    let failedHunks = 0;
    let fuzzyMatches = 0;
    // Apply hunks in reverse order (from end to start) to maintain line numbers
    const sortedHunks = [
        ...patch.hunks
    ].sort((a, b)=>b.oldStart - a.oldStart);
    for (const hunk of sortedHunks){
        // Try to apply hunk at the specified location
        let result = tryApplyHunk(lines, hunk, hunk.oldStart - 1);
        if (!result.success && fuzzyLines > 0) {
            // Try fuzzy matching
            for(let offset = 1; offset <= fuzzyLines; offset++){
                // Try forward
                result = tryApplyHunk(lines, hunk, hunk.oldStart - 1 + offset);
                if (result.success) {
                    fuzzyMatches++;
                    break;
                }
                // Try backward
                result = tryApplyHunk(lines, hunk, hunk.oldStart - 1 - offset);
                if (result.success) {
                    fuzzyMatches++;
                    break;
                }
            }
        }
        if (result.success) {
            appliedHunks++;
        } else {
            failedHunks++;
        }
    }
    if (failedHunks > 0) {
        return {
            success: false,
            error: `Failed to apply ${failedHunks} hunk(s)`,
            appliedHunks,
            failedHunks,
            fuzzyMatches
        };
    }
    return {
        success: true,
        content: lines.join('\n'),
        appliedHunks,
        failedHunks,
        fuzzyMatches
    };
}
/**
 * Try to apply a single hunk at a specific line offset
 */ function tryApplyHunk(lines, hunk, startIndex) {
    if (startIndex < 0 || startIndex > lines.length) {
        return {
            success: false
        };
    }
    // Build expected content from context and removed lines
    const contextLines = [];
    const removedLines = [];
    for (const line of hunk.lines){
        if (line.type === 'context') {
            contextLines.push(line.content);
        } else if (line.type === 'remove') {
            removedLines.push(line.content);
        }
    }
    // Check if the original content matches
    const originalLines = [
        ...contextLines,
        ...removedLines
    ];
    let matchIndex = startIndex;
    for (const originalLine of originalLines){
        if (matchIndex >= lines.length || lines[matchIndex] !== originalLine) {
            return {
                success: false
            };
        }
        matchIndex++;
    }
    // Apply the hunk
    const newLines = [];
    for (const line of hunk.lines){
        if (line.type === 'context') {
            newLines.push(line.content);
        } else if (line.type === 'remove') {
        // Skip removed line
        } else if (line.type === 'add') {
            newLines.push(line.content);
        }
    }
    // Replace the old lines with new lines
    lines.splice(startIndex, originalLines.length, ...newLines);
    return {
        success: true
    };
}
function createPatchFromDiff(original, modified, path, oldPath) {
    const originalLines = original.split('\n');
    const modifiedLines = modified.split('\n');
    // Simple LCS-based diff (simplified version)
    const hunks = [];
    let oldLine = 1;
    let newLine = 1;
    let i = 0;
    let j = 0;
    while(i < originalLines.length || j < modifiedLines.length){
        const hunkLines = [];
        const hunkOldStart = oldLine;
        const hunkNewStart = newLine;
        // Find differences
        while(i < originalLines.length && j < modifiedLines.length && originalLines[i] === modifiedLines[j]){
            // Add context line (limit to 3 lines before)
            if (hunkLines.length < 3) {
                hunkLines.push({
                    type: 'context',
                    content: originalLines[i],
                    oldLineNo: oldLine,
                    newLineNo: newLine
                });
            }
            i++;
            j++;
            oldLine++;
            newLine++;
        }
        // Check if we're at the end
        if (i >= originalLines.length && j >= modifiedLines.length) {
            break;
        }
        // Collect differences
        while(i < originalLines.length || j < modifiedLines.length){
            if (i < originalLines.length && j < modifiedLines.length && originalLines[i] === modifiedLines[j]) {
                // Found match - check if we have enough context to end hunk
                let lookAhead = 0;
                while(i + lookAhead < originalLines.length && j + lookAhead < modifiedLines.length && originalLines[i + lookAhead] === modifiedLines[j + lookAhead] && lookAhead < 3){
                    lookAhead++;
                }
                if (lookAhead >= 3 || i + lookAhead >= originalLines.length && j + lookAhead >= modifiedLines.length) {
                    // Add context lines
                    for(let k = 0; k < lookAhead; k++){
                        hunkLines.push({
                            type: 'context',
                            content: originalLines[i],
                            oldLineNo: oldLine,
                            newLineNo: newLine
                        });
                        i++;
                        j++;
                        oldLine++;
                        newLine++;
                    }
                    break;
                }
            }
            if (i < originalLines.length && (j >= modifiedLines.length || originalLines[i] !== modifiedLines[j])) {
                hunkLines.push({
                    type: 'remove',
                    content: originalLines[i],
                    oldLineNo: oldLine
                });
                i++;
                oldLine++;
            } else if (j < modifiedLines.length) {
                hunkLines.push({
                    type: 'add',
                    content: modifiedLines[j],
                    newLineNo: newLine
                });
                j++;
                newLine++;
            }
        }
        // Calculate hunk lengths
        const oldCount = hunkLines.filter((l)=>l.type !== 'add').length;
        const newCount = hunkLines.filter((l)=>l.type !== 'remove').length;
        if (oldCount > 0 || newCount > 0) {
            hunks.push({
                oldStart: hunkOldStart,
                oldLength: oldCount,
                newStart: hunkNewStart,
                newLength: newCount,
                lines: hunkLines
            });
        }
    }
    // Generate unified diff text
    if (hunks.length === 0) {
        return '';
    }
    let output = `diff --git a/${path} b/${path}\n`;
    if (oldPath && oldPath !== path) {
        output += `rename from ${oldPath}\nrename to ${path}\n`;
    }
    output += `--- a/${oldPath || path}\n`;
    output += `+++ b/${path}\n`;
    for (const hunk of hunks){
        output += `@@ -${hunk.oldStart},${hunk.oldLength} +${hunk.newStart},${hunk.newLength} @@\n`;
        for (const line of hunk.lines){
            if (line.type === 'context') {
                output += ` ${line.content}\n`;
            } else if (line.type === 'add') {
                output += `+${line.content}\n`;
            } else if (line.type === 'remove') {
                output += `-${line.content}\n`;
            }
        }
    }
    return output;
}
function applyPatchText(original, patchText, options) {
    const patches = parsePatch(patchText);
    if (patches.length === 0) {
        return {
            success: false,
            error: 'No patches found in patch text',
            appliedHunks: 0,
            failedHunks: 0,
            fuzzyMatches: 0
        };
    }
    // For now, we only support single file patches
    const patch = patches[0];
    return applyPatch(original, patch, options);
}
}),
];

//# sourceMappingURL=apps_web_lib_agent_patch_ts_5efd6970._.js.map