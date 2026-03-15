module.exports = [
"[project]/apps/web/contexts/WorkspaceContext.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "WorkspaceProvider",
    ()=>WorkspaceProvider,
    "useWorkspace",
    ()=>useWorkspace
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.bun/next@16.1.6+f27840211c12abb1/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.bun/next@16.1.6+f27840211c12abb1/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
'use client';
;
;
const WorkspaceContext = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["createContext"])(null);
function WorkspaceProvider({ value, children }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(WorkspaceContext.Provider, {
        value: value,
        children: children
    }, void 0, false, {
        fileName: "[project]/apps/web/contexts/WorkspaceContext.tsx",
        lineNumber: 83,
        columnNumber: 10
    }, this);
}
function useWorkspace() {
    const context = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useContext"])(WorkspaceContext);
    if (!context) {
        throw new Error('useWorkspace must be used within a WorkspaceProvider');
    }
    return context;
}
}),
"[project]/apps/web/app/(dashboard)/projects/[projectId]/page.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>ProjectPage
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.bun/next@16.1.6+f27840211c12abb1/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.bun/next@16.1.6+f27840211c12abb1/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.bun/next@16.1.6+f27840211c12abb1/node_modules/next/navigation.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$convex$40$1$2e$32$2e$0$2b$b1ab299f0a400331$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$react$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/.bun/convex@1.32.0+b1ab299f0a400331/node_modules/convex/dist/esm/react/index.js [app-ssr] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$convex$40$1$2e$32$2e$0$2b$b1ab299f0a400331$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$react$2f$client$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.bun/convex@1.32.0+b1ab299f0a400331/node_modules/convex/dist/esm/react/client.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$convex$2f$_generated$2f$api$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/convex/_generated/api.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$framer$2d$motion$40$12$2e$29$2e$2$2b$bf16f8eded5e12ee$2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.bun/framer-motion@12.29.2+bf16f8eded5e12ee/node_modules/framer-motion/dist/es/render/components/motion/proxy.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$sonner$40$2$2e$0$2e$7$2b$bf16f8eded5e12ee$2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.bun/sonner@2.0.7+bf16f8eded5e12ee/node_modules/sonner/dist/index.mjs [app-ssr] (ecmascript)");
// Components
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$components$2f$workbench$2f$Breadcrumb$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/components/workbench/Breadcrumb.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$components$2f$chat$2f$live$2d$run$2d$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/components/chat/live-run-utils.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$components$2f$projects$2f$ProjectChatPanel$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/components/projects/ProjectChatPanel.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$components$2f$projects$2f$ProjectShareDialog$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/components/projects/ProjectShareDialog.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$components$2f$projects$2f$ProjectWorkspaceLayout$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/components/projects/ProjectWorkspaceLayout.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$components$2f$review$2f$ReviewPanel$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/components/review/ReviewPanel.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/components/ui/button.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$contexts$2f$WorkspaceContext$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/contexts/WorkspaceContext.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$components$2f$ui$2f$dropdown$2d$menu$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/components/ui/dropdown-menu.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$lucide$2d$react$40$0$2e$474$2e$0$2b$b1ab299f0a400331$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$chevron$2d$left$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__ChevronLeft$3e$__ = __turbopack_context__.i("[project]/node_modules/.bun/lucide-react@0.474.0+b1ab299f0a400331/node_modules/lucide-react/dist/esm/icons/chevron-left.js [app-ssr] (ecmascript) <export default as ChevronLeft>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$lucide$2d$react$40$0$2e$474$2e$0$2b$b1ab299f0a400331$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$rotate$2d$ccw$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__RotateCcw$3e$__ = __turbopack_context__.i("[project]/node_modules/.bun/lucide-react@0.474.0+b1ab299f0a400331/node_modules/lucide-react/dist/esm/icons/rotate-ccw.js [app-ssr] (ecmascript) <export default as RotateCcw>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$lucide$2d$react$40$0$2e$474$2e$0$2b$b1ab299f0a400331$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$ellipsis$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__MoreHorizontal$3e$__ = __turbopack_context__.i("[project]/node_modules/.bun/lucide-react@0.474.0+b1ab299f0a400331/node_modules/lucide-react/dist/esm/icons/ellipsis.js [app-ssr] (ecmascript) <export default as MoreHorizontal>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$lucide$2d$react$40$0$2e$474$2e$0$2b$b1ab299f0a400331$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$panel$2d$left$2d$open$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__PanelLeftOpen$3e$__ = __turbopack_context__.i("[project]/node_modules/.bun/lucide-react@0.474.0+b1ab299f0a400331/node_modules/lucide-react/dist/esm/icons/panel-left-open.js [app-ssr] (ecmascript) <export default as PanelLeftOpen>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$lucide$2d$react$40$0$2e$474$2e$0$2b$b1ab299f0a400331$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$panel$2d$left$2d$close$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__PanelLeftClose$3e$__ = __turbopack_context__.i("[project]/node_modules/.bun/lucide-react@0.474.0+b1ab299f0a400331/node_modules/lucide-react/dist/esm/icons/panel-left-close.js [app-ssr] (ecmascript) <export default as PanelLeftClose>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.bun/next@16.1.6+f27840211c12abb1/node_modules/next/dist/client/app-dir/link.js [app-ssr] (ecmascript)");
// UI Components
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$components$2f$ui$2f$panda$2d$logo$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/components/ui/panda-logo.tsx [app-ssr] (ecmascript)");
// Hooks
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$hooks$2f$useJobs$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/hooks/useJobs.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$hooks$2f$useAgent$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/hooks/useAgent.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$hooks$2f$useSidebar$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/hooks/useSidebar.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$hooks$2f$useProjectChatSession$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/hooks/useProjectChatSession.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$hooks$2f$useProjectMessageWorkflow$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/hooks/useProjectMessageWorkflow.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$hooks$2f$useProjectPlanDraft$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/hooks/useProjectPlanDraft.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$hooks$2f$useProjectWorkbenchFiles$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/hooks/useProjectWorkbenchFiles.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$hooks$2f$useProjectWorkspaceUi$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/hooks/useProjectWorkspaceUi.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$hooks$2f$useShortcuts$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/hooks/useShortcuts.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$hooks$2f$useSpecDriftDetection$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/hooks/useSpecDriftDetection.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$components$2f$workbench$2f$artifact$2d$preview$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/components/workbench/artifact-preview.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$chat$2f$planDraft$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/lib/chat/planDraft.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$chat$2f$error$2d$messages$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/lib/chat/error-messages.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$chat$2f$backgroundExecution$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/lib/chat/backgroundExecution.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$prompt$2d$library$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/lib/agent/prompt-library.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$artifacts$2f$executeArtifact$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/lib/artifacts/executeArtifact.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$components$2f$artifacts$2f$ArtifactPanel$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/components/artifacts/ArtifactPanel.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$components$2f$projects$2f$ProjectChatInspector$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/components/projects/ProjectChatInspector.tsx [app-ssr] (ecmascript)");
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
;
;
;
;
;
;
;
;
;
const URL_PATTERN = /https?:\/\/[^\s)]+/gi;
function extractLatestPreviewUrl(messages) {
    const candidates = [
        ...messages
    ].reverse();
    for (const message of candidates){
        if (message.role !== 'assistant' || typeof message.content !== 'string') continue;
        const matches = message.content.match(URL_PATTERN);
        if (!matches) continue;
        for (const match of matches.reverse()){
            try {
                const parsed = new URL(match);
                if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') continue;
                return parsed.toString();
            } catch  {
                continue;
            }
        }
    }
    return null;
}
function readAgentPolicyField(source, key) {
    if (!source || typeof source !== 'object') return undefined;
    return source[key];
}
const FALLBACK_PROVIDER = {};
function ProjectPage() {
    const params = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useParams"])();
    const projectId = params.projectId;
    const { isChatPanelOpen, setIsChatPanelOpen, selectedFilePath, setSelectedFilePath, selectedFileLocation, setSelectedFileLocation, openTabs, setOpenTabs, cursorPosition, setCursorPosition, isMobileLayout, isCompactDesktopLayout, mobilePrimaryPanel, setMobilePrimaryPanel, mobileUnreadCount, setMobileUnreadCount, isMobileKeyboardOpen, setIsMobileKeyboardOpen, isChatInspectorOpen, setIsChatInspectorOpen, chatInspectorTab, setChatInspectorTab, isSpecDrawerOpen, setIsSpecDrawerOpen, isSpecPanelOpen, setIsSpecPanelOpen, isShareDialogOpen, setIsShareDialogOpen, previewUrl, setPreviewUrl, previewState, setPreviewState, isPreviewOpen, setIsPreviewOpen, openPreview, closePreview } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$hooks$2f$useProjectWorkspaceUi$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useProjectWorkspaceUi"])();
    const { activeSection, isFlyoutOpen, handleSectionChange, toggleFlyout } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$hooks$2f$useSidebar$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useSidebar"])();
    const [automationMode, setAutomationMode] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])('manual');
    const lastAssistantMessageIdRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(null);
    const seenPendingArtifactIdsRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(new Set());
    // Fetch project data
    const project = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$convex$40$1$2e$32$2e$0$2b$b1ab299f0a400331$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$react$2f$client$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useQuery"])(__TURBOPACK__imported__module__$5b$project$5d2f$convex$2f$_generated$2f$api$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["api"].projects.get, {
        id: projectId
    });
    // Spec Drift Hook
    // The hook internally manages showing toasts via showSpecSyncToast
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$hooks$2f$useSpecDriftDetection$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useSpecDriftDetection"])({
        projectId
    });
    // Fetch files
    const files = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$convex$40$1$2e$32$2e$0$2b$b1ab299f0a400331$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$react$2f$client$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useQuery"])(__TURBOPACK__imported__module__$5b$project$5d2f$convex$2f$_generated$2f$api$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["api"].files.list, {
        projectId
    });
    // Fetch chats
    const chats = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$convex$40$1$2e$32$2e$0$2b$b1ab299f0a400331$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$react$2f$client$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useQuery"])(__TURBOPACK__imported__module__$5b$project$5d2f$convex$2f$_generated$2f$api$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["api"].chats.list, {
        projectId
    });
    // Jobs (Terminal)
    const { isAnyJobRunning } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$hooks$2f$useJobs$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useJobs"])(projectId);
    const convex = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$convex$40$1$2e$32$2e$0$2b$b1ab299f0a400331$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$react$2f$client$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useConvex"])();
    const projectAgentPolicy = readAgentPolicyField(project, 'agentPolicy');
    const createChatMutation = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$convex$40$1$2e$32$2e$0$2b$b1ab299f0a400331$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$react$2f$client$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMutation"])(__TURBOPACK__imported__module__$5b$project$5d2f$convex$2f$_generated$2f$api$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["api"].chats.create);
    const updateChatMutation = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$convex$40$1$2e$32$2e$0$2b$b1ab299f0a400331$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$react$2f$client$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMutation"])(__TURBOPACK__imported__module__$5b$project$5d2f$convex$2f$_generated$2f$api$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["api"].chats.update);
    const upsertFileMutation = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$convex$40$1$2e$32$2e$0$2b$b1ab299f0a400331$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$react$2f$client$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMutation"])(__TURBOPACK__imported__module__$5b$project$5d2f$convex$2f$_generated$2f$api$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["api"].files.upsert);
    const createAndExecuteJobMutation = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$convex$40$1$2e$32$2e$0$2b$b1ab299f0a400331$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$react$2f$client$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMutation"])(__TURBOPACK__imported__module__$5b$project$5d2f$convex$2f$_generated$2f$api$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["api"].jobs.createAndExecute);
    const updateJobStatusMutation = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$convex$40$1$2e$32$2e$0$2b$b1ab299f0a400331$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$react$2f$client$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMutation"])(__TURBOPACK__imported__module__$5b$project$5d2f$convex$2f$_generated$2f$api$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["api"].jobs.updateStatus);
    const updateArtifactStatusMutation = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$convex$40$1$2e$32$2e$0$2b$b1ab299f0a400331$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$react$2f$client$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMutation"])(__TURBOPACK__imported__module__$5b$project$5d2f$convex$2f$_generated$2f$api$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["api"].artifacts.updateStatus);
    const { setActiveChatId, activeChat, chatMode, setChatMode, architectBrainstormEnabled, setArchitectBrainstormEnabled, uiSelectedModel, setUiSelectedModel, reasoningVariant, setReasoningVariant, specTier, setSpecTier, provider, selectedModel, availableModels, supportsReasoning, effectiveAutomationPolicy } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$hooks$2f$useProjectChatSession$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useProjectChatSession"])({
        projectId,
        chats,
        projectAgentPolicy
    });
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$hooks$2f$useShortcuts$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useShortcutListener"])();
    const persistedPlanDraft = activeChat?.planDraft ?? '';
    // Initialize agent hook when activeChat and provider exist
    // Skip the hook if provider is not available - we'll show an error when user tries to send
    const agent = (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$hooks$2f$useAgent$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useAgent"])({
        chatId: activeChat?._id,
        projectId,
        projectName: project?.name,
        projectDescription: project?.description,
        mode: chatMode,
        architectBrainstormEnabled,
        provider: provider ?? FALLBACK_PROVIDER,
        model: selectedModel,
        planDraft: persistedPlanDraft,
        automationPolicy: effectiveAutomationPolicy,
        onRunCreated: async ({ runId, approvedPlanExecution })=>{
            if (!approvedPlanExecution || !activeChat?._id) return;
            await updateChatMutation({
                id: activeChat._id,
                planBuildRunId: runId,
                planStatus: 'executing'
            });
        }
    });
    const sendAgentMessage = agent.sendMessage;
    const { planDraft, setPlanDraft, isSavingPlanDraft, handleSavePlanDraft, handleApprovePlan } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$hooks$2f$useProjectPlanDraft$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useProjectPlanDraft"])({
        activeChat,
        chatMode,
        architectBrainstormEnabled,
        agentStatus: agent.status,
        agentMessages: agent.messages,
        updateChatMutation
    });
    const { handleSendMessage, handleSuggestedAction, handleBuildFromPlan, handleModeChange } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$hooks$2f$useProjectMessageWorkflow$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useProjectMessageWorkflow"])({
        projectId,
        activeChat,
        chatMode,
        setChatMode,
        planDraft,
        providerAvailable: Boolean(provider),
        createChatMutation,
        updateChatMutation,
        sendAgentMessage,
        setActiveChatId,
        setMobilePrimaryPanel
    });
    const artifactRecords = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$convex$40$1$2e$32$2e$0$2b$b1ab299f0a400331$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$react$2f$client$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useQuery"])(__TURBOPACK__imported__module__$5b$project$5d2f$convex$2f$_generated$2f$api$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["api"].artifacts.list, activeChat ? {
        chatId: activeChat._id
    } : 'skip');
    const pendingArtifactPreviews = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMemo"])(()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$components$2f$workbench$2f$artifact$2d$preview$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["deriveWorkspaceArtifactPreviews"])((artifactRecords ?? []).map((record)=>({
                ...record
            }))), [
        artifactRecords
    ]);
    const pendingArtifactPreview = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMemo"])(()=>{
        if (!selectedFilePath) return null;
        return pendingArtifactPreviews.find((preview)=>preview.filePath === selectedFilePath) ?? null;
    }, [
        pendingArtifactPreviews,
        selectedFilePath
    ]);
    // Reset workspace handler
    const handleSelectChat = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])((chatId)=>{
        setActiveChatId(chatId);
    }, [
        setActiveChatId
    ]);
    const handleNewChat = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])(async ()=>{
        const id = await createChatMutation({
            projectId,
            title: 'New Chat',
            mode: chatMode
        });
        setActiveChatId(id);
    }, [
        createChatMutation,
        projectId,
        chatMode,
        setActiveChatId
    ]);
    const handleResetWorkspace = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])(()=>{
        // Stop any running agent
        agent.stop();
        // Clear chat messages
        agent.clear();
        // Clear input
        agent.setInput('');
        // Clear plan draft
        setPlanDraft('');
        // Reset mode to architect
        setChatMode('architect');
        // Show confirmation
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$sonner$40$2$2e$0$2e$7$2b$bf16f8eded5e12ee$2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["toast"].success('Workspace reset', {
            description: 'Chat, artifacts, and plan draft have been cleared'
        });
    }, [
        agent,
        setChatMode,
        setPlanDraft
    ]);
    // Fetch messages for active chat (fallback when not streaming)
    const convexMessages = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$convex$40$1$2e$32$2e$0$2b$b1ab299f0a400331$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$react$2f$client$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useQuery"])(__TURBOPACK__imported__module__$5b$project$5d2f$convex$2f$_generated$2f$api$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["api"].messages.list, activeChat ? {
        chatId: activeChat._id
    } : 'skip');
    const runEvents = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$convex$40$1$2e$32$2e$0$2b$b1ab299f0a400331$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$react$2f$client$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useQuery"])(__TURBOPACK__imported__module__$5b$project$5d2f$convex$2f$_generated$2f$api$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["api"].agentRuns.listEventsByChat, activeChat ? {
        chatId: activeChat._id,
        limit: 120
    } : 'skip');
    // Convert agent messages to MessageList format
    const chatMessages = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMemo"])(()=>{
        if (!activeChat) {
            return convexMessages?.map((msg)=>{
                const firstAnnotation = msg.annotations?.[0];
                return {
                    _id: msg._id,
                    role: msg.role,
                    content: msg.content,
                    reasoningContent: firstAnnotation?.reasoningSummary,
                    annotations: firstAnnotation ? {
                        ...firstAnnotation,
                        mode: (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$agent$2f$prompt$2d$library$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["normalizeChatMode"])(firstAnnotation.mode, chatMode)
                    } : undefined,
                    toolCalls: firstAnnotation?.toolCalls,
                    createdAt: msg.createdAt
                };
            }) || [];
        }
        // Use agent messages when available, converting format
        return agent.messages.filter((msg)=>msg.role === 'user' || msg.role === 'assistant').map((msg)=>({
                _id: msg.id,
                role: msg.role,
                content: msg.content,
                reasoningContent: msg.reasoningContent,
                toolCalls: msg.toolCalls,
                annotations: {
                    ...msg.annotations || {},
                    mode: msg.mode
                },
                createdAt: msg.createdAt
            }));
    }, [
        agent.messages,
        activeChat,
        chatMode,
        convexMessages
    ]);
    const replayProgressSteps = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMemo"])(()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$components$2f$chat$2f$live$2d$run$2d$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["mapLatestRunProgressSteps"])(runEvents ?? []).slice(-24), [
        runEvents
    ]);
    const liveRunSteps = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMemo"])(()=>{
        return agent.progressSteps.length > 0 ? agent.progressSteps : replayProgressSteps;
    }, [
        agent.progressSteps,
        replayProgressSteps
    ]);
    const snapshotRunEvents = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMemo"])(()=>(runEvents ?? []).filter((event)=>event.type === 'snapshot'), [
        runEvents
    ]);
    const subagentToolCalls = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMemo"])(()=>chatMessages.flatMap((message)=>message.toolCalls ?? []).filter((call)=>call.name === 'task'), [
        chatMessages
    ]);
    const latestUserPrompt = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMemo"])(()=>[
            ...chatMessages
        ].reverse().find((msg)=>msg.role === 'user' && typeof msg.content === 'string' && msg.content.trim())?.content ?? null, [
        chatMessages
    ]);
    const latestAssistantReply = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMemo"])(()=>[
            ...chatMessages
        ].reverse().find((msg)=>msg.role === 'assistant' && typeof msg.content === 'string' && msg.content.trim())?.content ?? null, [
        chatMessages
    ]);
    const latestPreviewUrl = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMemo"])(()=>extractLatestPreviewUrl(chatMessages), [
        chatMessages
    ]);
    const backgroundExecutionPolicy = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMemo"])(()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$chat$2f$backgroundExecution$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["resolveBackgroundExecutionPolicy"])(chatMode), [
        chatMode
    ]);
    const inlineRateLimitError = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMemo"])(()=>{
        if (!agent.error || !(0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$chat$2f$error$2d$messages$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["isRateLimitError"])(agent.error)) return null;
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$chat$2f$error$2d$messages$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getUserFacingAgentError"])(agent.error);
    }, [
        agent.error
    ]);
    // Note: Inspector no longer auto-opens on agent start - user opens it manually
    const { handleFileSelect, handleTabClose, handleFileCreate, handleFileRename, handleFileDelete, handleEditorSave, handleEditorDirtyChange } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$hooks$2f$useProjectWorkbenchFiles$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useProjectWorkbenchFiles"])({
        projectId,
        files,
        selectedFilePath,
        setSelectedFilePath,
        setSelectedFileLocation,
        setCursorPosition,
        setOpenTabs,
        setMobilePrimaryPanel
    });
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        seenPendingArtifactIdsRef.current.clear();
    }, [
        activeChat?._id
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        if (pendingArtifactPreviews.length === 0) return;
        const newPreviews = pendingArtifactPreviews.filter((preview)=>!seenPendingArtifactIdsRef.current.has(preview.artifactId));
        if (newPreviews.length === 0) return;
        for (const preview of newPreviews){
            seenPendingArtifactIdsRef.current.add(preview.artifactId);
        }
        const targetPreview = newPreviews[0];
        const navigation = (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$components$2f$workbench$2f$artifact$2d$preview$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["resolveArtifactPreviewNavigation"])({
            preview: targetPreview,
            openTabs,
            selectedFilePath
        });
        if (navigation.shouldOpenTab) {
            setOpenTabs((prev)=>{
                if (prev.some((tab)=>tab.path === targetPreview.filePath)) return prev;
                return [
                    ...prev,
                    {
                        path: targetPreview.filePath
                    }
                ];
            });
        }
        if (navigation.shouldSelectFile) {
            setMobilePrimaryPanel('workspace');
            setSelectedFilePath(targetPreview.filePath);
            setSelectedFileLocation(null);
            setCursorPosition(null);
        }
    }, [
        openTabs,
        pendingArtifactPreviews,
        selectedFilePath,
        setCursorPosition,
        setMobilePrimaryPanel,
        setOpenTabs,
        setSelectedFileLocation,
        setSelectedFilePath
    ]);
    const handleApplyPendingArtifact = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])(async (artifactId)=>{
        const record = artifactRecords?.find((artifact)=>artifact._id === artifactId);
        const action = record ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$artifacts$2f$executeArtifact$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getPrimaryArtifactAction"])(record) : null;
        if (!record || !action) return;
        try {
            await (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$artifacts$2f$executeArtifact$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["applyArtifact"])({
                artifactId: record._id,
                action,
                projectId,
                convex,
                upsertFile: upsertFileMutation,
                createAndExecuteJob: createAndExecuteJobMutation,
                updateJobStatus: (jobId, status, updates)=>updateJobStatusMutation({
                        id: jobId,
                        status,
                        ...updates
                    }),
                updateArtifactStatus: updateArtifactStatusMutation
            });
            __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$sonner$40$2$2e$0$2e$7$2b$bf16f8eded5e12ee$2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["toast"].success('Applied pending artifact', {
                description: action.type === 'file_write' ? action.payload.filePath : action.payload.command
            });
        } catch (error) {
            __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$sonner$40$2$2e$0$2e$7$2b$bf16f8eded5e12ee$2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["toast"].error('Failed to apply pending artifact', {
                description: error instanceof Error ? error.message : String(error)
            });
        }
    }, [
        artifactRecords,
        convex,
        createAndExecuteJobMutation,
        projectId,
        updateArtifactStatusMutation,
        updateJobStatusMutation,
        upsertFileMutation
    ]);
    const handleRejectPendingArtifact = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])(async (artifactId)=>{
        await updateArtifactStatusMutation({
            id: artifactId,
            status: 'rejected'
        });
    }, [
        updateArtifactStatusMutation
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        if (latestPreviewUrl) {
            setPreviewUrl((current)=>current === latestPreviewUrl ? current : latestPreviewUrl);
            setPreviewState('running');
            return;
        }
        setPreviewState(agent.isLoading ? 'building' : 'idle');
    }, [
        agent.isLoading,
        latestPreviewUrl,
        setPreviewState,
        setPreviewUrl
    ]);
    const openReviewTab = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])((tab)=>{
        setChatInspectorTab(tab);
        if (isMobileLayout) {
            setMobilePrimaryPanel('review');
            setIsChatInspectorOpen(false);
            return;
        }
        setIsChatInspectorOpen(true);
    }, [
        isMobileLayout,
        setChatInspectorTab,
        setIsChatInspectorOpen,
        setMobilePrimaryPanel
    ]);
    const handleOpenPreview = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])(()=>{
        if (!latestPreviewUrl) return;
        if (isMobileLayout) {
            setMobilePrimaryPanel('workspace');
        }
        openPreview({
            url: latestPreviewUrl,
            state: 'running'
        });
    }, [
        isMobileLayout,
        latestPreviewUrl,
        openPreview,
        setMobilePrimaryPanel
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        if (!isMobileLayout || mobilePrimaryPanel === 'chat') {
            setMobileUnreadCount(0);
        }
    }, [
        isMobileLayout,
        mobilePrimaryPanel,
        setMobileUnreadCount
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        const latestAssistant = [
            ...chatMessages
        ].reverse().find((msg)=>msg.role === 'assistant');
        if (!latestAssistant) return;
        if (!lastAssistantMessageIdRef.current) {
            lastAssistantMessageIdRef.current = latestAssistant._id;
            return;
        }
        if (latestAssistant._id !== lastAssistantMessageIdRef.current) {
            lastAssistantMessageIdRef.current = latestAssistant._id;
            if (isMobileLayout && mobilePrimaryPanel === 'workspace') {
                setMobileUnreadCount((count)=>Math.min(99, count + 1));
            }
        }
    }, [
        chatMessages,
        isMobileLayout,
        mobilePrimaryPanel,
        setMobileUnreadCount
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        if (!isMobileLayout) {
            setIsMobileKeyboardOpen(false);
            return;
        }
        let focusedInput = false;
        let viewportKeyboardOpen = false;
        const commitState = ()=>setIsMobileKeyboardOpen(focusedInput || viewportKeyboardOpen);
        const isTextInputTarget = (target)=>{
            if (!(target instanceof HTMLElement)) return false;
            if (target.isContentEditable) return true;
            return Boolean(target.closest('input, textarea, [contenteditable="true"]'));
        };
        const onFocusIn = (event)=>{
            focusedInput = isTextInputTarget(event.target);
            commitState();
        };
        const onFocusOut = ()=>{
            window.setTimeout(()=>{
                focusedInput = isTextInputTarget(document.activeElement);
                commitState();
            }, 0);
        };
        const onViewportChange = ()=>{
            if (!window.visualViewport) return;
            const heightDelta = window.innerHeight - window.visualViewport.height;
            viewportKeyboardOpen = heightDelta > 140;
            commitState();
        };
        document.addEventListener('focusin', onFocusIn);
        document.addEventListener('focusout', onFocusOut);
        window.visualViewport?.addEventListener('resize', onViewportChange);
        window.visualViewport?.addEventListener('scroll', onViewportChange);
        onViewportChange();
        commitState();
        return ()=>{
            document.removeEventListener('focusin', onFocusIn);
            document.removeEventListener('focusout', onFocusOut);
            window.visualViewport?.removeEventListener('resize', onViewportChange);
            window.visualViewport?.removeEventListener('scroll', onViewportChange);
        };
    }, [
        isMobileLayout,
        setIsMobileKeyboardOpen
    ]);
    const selectedChatModel = uiSelectedModel || selectedModel;
    const chatPanelContent = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$components$2f$projects$2f$ProjectChatPanel$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["ProjectChatPanel"], {
        projectId: projectId,
        activeChatId: activeChat?._id,
        activeChatPlanStatus: activeChat?.planStatus,
        activeChatPlanUpdatedAt: activeChat?.planUpdatedAt,
        activeChatPlanLastGeneratedAt: activeChat?.planLastGeneratedAt,
        activeChatExists: Boolean(activeChat?._id),
        chatMessages: chatMessages,
        chatMode: chatMode,
        architectBrainstormEnabled: architectBrainstormEnabled,
        onArchitectBrainstormEnabledChange: setArchitectBrainstormEnabled,
        onModeChange: handleModeChange,
        onSendMessage: handleSendMessage,
        onSuggestedAction: handleSuggestedAction,
        isStreaming: agent.isLoading,
        onStopStreaming: agent.stop,
        filePaths: files?.map((f)=>f.path) ?? [],
        model: selectedChatModel,
        onModelChange: setUiSelectedModel,
        availableModels: availableModels,
        variant: reasoningVariant,
        onVariantChange: setReasoningVariant,
        supportsReasoning: supportsReasoning,
        specTier: specTier,
        onSpecTierChange: setSpecTier,
        inlineRateLimitError: inlineRateLimitError,
        onToggleInspector: ()=>{
            if (isMobileLayout) {
                openReviewTab(chatInspectorTab);
                return;
            }
            setIsChatInspectorOpen((prev)=>!prev);
        },
        onOpenHistory: ()=>{
            openReviewTab('run');
        },
        onOpenShare: ()=>setIsShareDialogOpen(true),
        previewUrl: latestPreviewUrl,
        onOpenPreview: handleOpenPreview,
        onResetWorkspace: handleResetWorkspace,
        onNewChat: ()=>{
            void handleNewChat();
        },
        planDraft: planDraft,
        onPlanReview: ()=>{
            openReviewTab('plan');
        },
        onPlanApprove: ()=>{
            void handleApprovePlan();
        },
        onBuildFromPlan: ()=>{
            void handleBuildFromPlan();
        },
        planApproveDisabled: !(0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$chat$2f$planDraft$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["canApprovePlan"])(activeChat?.planStatus, planDraft) || agent.isLoading,
        planBuildDisabled: !(0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$chat$2f$planDraft$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["canBuildFromPlan"])(activeChat?.planStatus, planDraft) || agent.isLoading,
        showInlinePlanReview: backgroundExecutionPolicy.showInlinePlanReview,
        pendingSpec: agent.pendingSpec,
        onSpecApprove: agent.approvePendingSpec,
        onSpecEdit: ()=>setIsSpecPanelOpen(true),
        onSpecCancel: agent.cancelPendingSpec,
        showInlineSpecReview: backgroundExecutionPolicy.showInlineSpecReview,
        currentSpecTier: agent.currentSpec?.tier || specTier,
        isSpecPanelOpen: isSpecPanelOpen,
        onCloseSpecPanel: ()=>setIsSpecPanelOpen(false),
        onEditPendingSpec: agent.updatePendingSpecDraft,
        onExecutePendingSpec: (spec)=>{
            agent.approvePendingSpec(spec);
            setIsSpecPanelOpen(false);
        },
        isMobileLayout: isMobileLayout,
        isInspectorOpen: false,
        inspectorTab: chatInspectorTab,
        onInspectorOpenChange: ()=>{},
        onInspectorTabChange: ()=>{},
        liveSteps: liveRunSteps,
        tracePersistenceStatus: agent.tracePersistenceStatus,
        onOpenFile: handleFileSelect,
        onOpenArtifacts: ()=>{
            openReviewTab('artifacts');
        },
        currentSpec: agent.currentSpec,
        onSpecClick: ()=>setIsSpecDrawerOpen(true),
        onPlanClick: ()=>{
            openReviewTab('plan');
        },
        onResumeRuntimeSession: agent.resumeRuntimeSession,
        snapshotEvents: snapshotRunEvents,
        subagentToolCalls: subagentToolCalls,
        onPlanDraftChange: setPlanDraft,
        onSavePlanDraft: ()=>{
            void handleSavePlanDraft();
        },
        isSavingPlanDraft: isSavingPlanDraft,
        memoryBank: agent.memoryBank,
        onSaveMemoryBank: agent.updateMemoryBank,
        lastUserPrompt: latestUserPrompt,
        lastAssistantReply: latestAssistantReply,
        onRunEvalScenario: agent.runEvalScenario,
        renderInspectorInline: false
    }, void 0, false, {
        fileName: "[project]/apps/web/app/(dashboard)/projects/[projectId]/page.tsx",
        lineNumber: 676,
        columnNumber: 5
    }, this);
    const reviewPanelContent = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$components$2f$review$2f$ReviewPanel$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["ReviewPanel"], {
        activeTab: chatInspectorTab,
        onTabChange: (tab)=>setChatInspectorTab(tab),
        runContent: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$components$2f$projects$2f$ProjectChatInspector$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["InspectorRunContent"], {
            chatId: activeChat?._id,
            liveSteps: liveRunSteps,
            isStreaming: agent.isLoading,
            tracePersistenceStatus: agent.tracePersistenceStatus,
            onOpenFile: handleFileSelect,
            onOpenArtifacts: ()=>openReviewTab('artifacts'),
            currentSpec: agent.currentSpec,
            planStatus: activeChat?.planStatus,
            planDraft: planDraft,
            onSpecClick: ()=>setIsSpecDrawerOpen(true),
            onPlanClick: ()=>openReviewTab('plan'),
            onResumeRuntimeSession: agent.resumeRuntimeSession,
            snapshotEvents: snapshotRunEvents,
            subagentToolCalls: subagentToolCalls
        }, void 0, false, {
            fileName: "[project]/apps/web/app/(dashboard)/projects/[projectId]/page.tsx",
            lineNumber: 783,
            columnNumber: 9
        }, void 0),
        planContent: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$components$2f$projects$2f$ProjectChatInspector$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["InspectorPlanContent"], {
            planDraft: planDraft,
            planStatus: activeChat?.planStatus,
            onPlanDraftChange: setPlanDraft,
            onSavePlanDraft: ()=>{
                void handleSavePlanDraft();
            },
            onApprovePlan: ()=>{
                void handleApprovePlan();
            },
            onBuildFromPlan: ()=>{
                void handleBuildFromPlan();
            },
            isSavingPlanDraft: isSavingPlanDraft,
            lastSavedAt: activeChat?.planUpdatedAt,
            lastGeneratedAt: activeChat?.planLastGeneratedAt,
            approveDisabled: !(0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$chat$2f$planDraft$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["canApprovePlan"])(activeChat?.planStatus, planDraft) || agent.isLoading,
            buildDisabled: !(0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$chat$2f$planDraft$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["canBuildFromPlan"])(activeChat?.planStatus, planDraft) || agent.isLoading
        }, void 0, false, {
            fileName: "[project]/apps/web/app/(dashboard)/projects/[projectId]/page.tsx",
            lineNumber: 801,
            columnNumber: 9
        }, void 0),
        artifactsContent: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$components$2f$artifacts$2f$ArtifactPanel$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["ArtifactPanel"], {
            projectId: projectId,
            chatId: activeChat?._id,
            position: "right"
        }, void 0, false, {
            fileName: "[project]/apps/web/app/(dashboard)/projects/[projectId]/page.tsx",
            lineNumber: 822,
            columnNumber: 9
        }, void 0),
        memoryContent: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$components$2f$projects$2f$ProjectChatInspector$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["InspectorMemoryContent"], {
            memoryBank: agent.memoryBank,
            onSaveMemoryBank: agent.updateMemoryBank
        }, void 0, false, {
            fileName: "[project]/apps/web/app/(dashboard)/projects/[projectId]/page.tsx",
            lineNumber: 825,
            columnNumber: 9
        }, void 0),
        evalsContent: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$components$2f$projects$2f$ProjectChatInspector$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["InspectorEvalsContent"], {
            projectId: projectId,
            chatId: activeChat?._id,
            lastUserPrompt: latestUserPrompt,
            lastAssistantReply: latestAssistantReply,
            onRunEvalScenario: agent.runEvalScenario
        }, void 0, false, {
            fileName: "[project]/apps/web/app/(dashboard)/projects/[projectId]/page.tsx",
            lineNumber: 831,
            columnNumber: 9
        }, void 0)
    }, void 0, false, {
        fileName: "[project]/apps/web/app/(dashboard)/projects/[projectId]/page.tsx",
        lineNumber: 779,
        columnNumber: 5
    }, this);
    // Loading state
    if (!project || !files) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "flex h-screen w-full items-center justify-center bg-background",
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$framer$2d$motion$40$12$2e$29$2e$2$2b$bf16f8eded5e12ee$2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["motion"].div, {
                initial: {
                    opacity: 0,
                    scale: 0.9
                },
                animate: {
                    opacity: 1,
                    scale: 1
                },
                className: "space-y-4 text-center",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "mx-auto h-12 w-12 animate-spin rounded-full border-2 border-primary/30 border-t-primary"
                    }, void 0, false, {
                        fileName: "[project]/apps/web/app/(dashboard)/projects/[projectId]/page.tsx",
                        lineNumber: 851,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "font-mono text-sm text-muted-foreground",
                        children: "Loading project..."
                    }, void 0, false, {
                        fileName: "[project]/apps/web/app/(dashboard)/projects/[projectId]/page.tsx",
                        lineNumber: 852,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/apps/web/app/(dashboard)/projects/[projectId]/page.tsx",
                lineNumber: 846,
                columnNumber: 9
            }, this)
        }, void 0, false, {
            fileName: "[project]/apps/web/app/(dashboard)/projects/[projectId]/page.tsx",
            lineNumber: 845,
            columnNumber: 7
        }, this);
    }
    const workspaceContextValue = {
        selectedFilePath,
        setSelectedFilePath,
        selectedFileLocation,
        setSelectedFileLocation,
        openTabs,
        setOpenTabs,
        cursorPosition,
        setCursorPosition,
        activeSection,
        isFlyoutOpen,
        handleSectionChange,
        toggleFlyout,
        isMobileLayout,
        isCompactDesktopLayout,
        mobilePrimaryPanel,
        setMobilePrimaryPanel,
        isChatPanelOpen,
        setIsChatPanelOpen,
        projectId,
        activeChatId: activeChat?._id,
        chatMode,
        onSelectChat: handleSelectChat,
        onNewChat: ()=>{
            void handleNewChat();
        },
        previewUrl,
        setPreviewUrl,
        previewState,
        setPreviewState,
        isPreviewOpen,
        setIsPreviewOpen,
        openPreview,
        closePreview
    };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$contexts$2f$WorkspaceContext$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["WorkspaceProvider"], {
        value: workspaceContextValue,
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "fixed inset-0 top-0 z-10 flex flex-col overflow-hidden bg-background",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$components$2f$projects$2f$ProjectShareDialog$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["ProjectShareDialog"], {
                    open: isShareDialogOpen,
                    onOpenChange: setIsShareDialogOpen,
                    chatId: activeChat?._id,
                    chatTitle: activeChat?.title
                }, void 0, false, {
                    fileName: "[project]/apps/web/app/(dashboard)/projects/[projectId]/page.tsx",
                    lineNumber: 897,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$framer$2d$motion$40$12$2e$29$2e$2$2b$bf16f8eded5e12ee$2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["motion"].div, {
                    initial: {
                        y: -20,
                        opacity: 0
                    },
                    animate: {
                        y: 0,
                        opacity: 1
                    },
                    className: "surface-1 flex h-14 shrink-0 items-center justify-between border-b border-border px-4",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "flex min-w-0 flex-1 items-center gap-2",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "flex shrink-0 items-center gap-1",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Button"], {
                                            variant: "ghost",
                                            size: "sm",
                                            className: "h-8 w-8 rounded-none p-0",
                                            onClick: toggleFlyout,
                                            title: isFlyoutOpen ? 'Close sidebar' : 'Open sidebar',
                                            "aria-label": isFlyoutOpen ? 'Close sidebar' : 'Open sidebar',
                                            children: isFlyoutOpen ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$lucide$2d$react$40$0$2e$474$2e$0$2b$b1ab299f0a400331$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$panel$2d$left$2d$close$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__PanelLeftClose$3e$__["PanelLeftClose"], {
                                                className: "h-4 w-4"
                                            }, void 0, false, {
                                                fileName: "[project]/apps/web/app/(dashboard)/projects/[projectId]/page.tsx",
                                                lineNumber: 921,
                                                columnNumber: 19
                                            }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$lucide$2d$react$40$0$2e$474$2e$0$2b$b1ab299f0a400331$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$panel$2d$left$2d$open$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__PanelLeftOpen$3e$__["PanelLeftOpen"], {
                                                className: "h-4 w-4"
                                            }, void 0, false, {
                                                fileName: "[project]/apps/web/app/(dashboard)/projects/[projectId]/page.tsx",
                                                lineNumber: 923,
                                                columnNumber: 19
                                            }, this)
                                        }, void 0, false, {
                                            fileName: "[project]/apps/web/app/(dashboard)/projects/[projectId]/page.tsx",
                                            lineNumber: 912,
                                            columnNumber: 15
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                                            href: "/",
                                            className: "flex shrink-0 items-center",
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$components$2f$ui$2f$panda$2d$logo$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["PandaLogo"], {
                                                size: "md",
                                                variant: "icon"
                                            }, void 0, false, {
                                                fileName: "[project]/apps/web/app/(dashboard)/projects/[projectId]/page.tsx",
                                                lineNumber: 927,
                                                columnNumber: 17
                                            }, this)
                                        }, void 0, false, {
                                            fileName: "[project]/apps/web/app/(dashboard)/projects/[projectId]/page.tsx",
                                            lineNumber: 926,
                                            columnNumber: 15
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/apps/web/app/(dashboard)/projects/[projectId]/page.tsx",
                                    lineNumber: 911,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "h-6 w-px bg-border"
                                }, void 0, false, {
                                    fileName: "[project]/apps/web/app/(dashboard)/projects/[projectId]/page.tsx",
                                    lineNumber: 931,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                                    href: "/projects",
                                    className: "shrink-0",
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Button"], {
                                        variant: "ghost",
                                        size: "sm",
                                        className: "h-9 gap-1 rounded-none font-mono text-xs",
                                        "aria-label": "Back to projects",
                                        title: "Back to projects",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$lucide$2d$react$40$0$2e$474$2e$0$2b$b1ab299f0a400331$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$chevron$2d$left$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__ChevronLeft$3e$__["ChevronLeft"], {
                                                className: "h-4 w-4"
                                            }, void 0, false, {
                                                fileName: "[project]/apps/web/app/(dashboard)/projects/[projectId]/page.tsx",
                                                lineNumber: 941,
                                                columnNumber: 17
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                className: "hidden sm:inline",
                                                children: "Projects"
                                            }, void 0, false, {
                                                fileName: "[project]/apps/web/app/(dashboard)/projects/[projectId]/page.tsx",
                                                lineNumber: 942,
                                                columnNumber: 17
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/apps/web/app/(dashboard)/projects/[projectId]/page.tsx",
                                        lineNumber: 934,
                                        columnNumber: 15
                                    }, this)
                                }, void 0, false, {
                                    fileName: "[project]/apps/web/app/(dashboard)/projects/[projectId]/page.tsx",
                                    lineNumber: 933,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "h-6 w-px bg-border"
                                }, void 0, false, {
                                    fileName: "[project]/apps/web/app/(dashboard)/projects/[projectId]/page.tsx",
                                    lineNumber: 946,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$components$2f$workbench$2f$Breadcrumb$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Breadcrumb"], {
                                    projectName: project.name,
                                    projectId: projectId,
                                    items: (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$components$2f$workbench$2f$Breadcrumb$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["buildBreadcrumbItems"])(selectedFilePath)
                                }, void 0, false, {
                                    fileName: "[project]/apps/web/app/(dashboard)/projects/[projectId]/page.tsx",
                                    lineNumber: 948,
                                    columnNumber: 13
                                }, this),
                                isAnyJobRunning && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    className: "ml-2 flex h-2 w-2 animate-pulse rounded-full bg-primary",
                                    title: "Jobs running"
                                }, void 0, false, {
                                    fileName: "[project]/apps/web/app/(dashboard)/projects/[projectId]/page.tsx",
                                    lineNumber: 955,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/apps/web/app/(dashboard)/projects/[projectId]/page.tsx",
                            lineNumber: 909,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "flex items-center gap-1",
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$components$2f$ui$2f$dropdown$2d$menu$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["DropdownMenu"], {
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$components$2f$ui$2f$dropdown$2d$menu$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["DropdownMenuTrigger"], {
                                        asChild: true,
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Button"], {
                                            variant: "ghost",
                                            size: "sm",
                                            className: "h-8 gap-1 rounded-none font-mono text-xs",
                                            title: "More actions",
                                            "aria-label": "More actions",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$lucide$2d$react$40$0$2e$474$2e$0$2b$b1ab299f0a400331$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$ellipsis$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__MoreHorizontal$3e$__["MoreHorizontal"], {
                                                    className: "h-4 w-4"
                                                }, void 0, false, {
                                                    fileName: "[project]/apps/web/app/(dashboard)/projects/[projectId]/page.tsx",
                                                    lineNumber: 972,
                                                    columnNumber: 19
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    className: "hidden xl:inline",
                                                    children: "More"
                                                }, void 0, false, {
                                                    fileName: "[project]/apps/web/app/(dashboard)/projects/[projectId]/page.tsx",
                                                    lineNumber: 973,
                                                    columnNumber: 19
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/apps/web/app/(dashboard)/projects/[projectId]/page.tsx",
                                            lineNumber: 965,
                                            columnNumber: 17
                                        }, this)
                                    }, void 0, false, {
                                        fileName: "[project]/apps/web/app/(dashboard)/projects/[projectId]/page.tsx",
                                        lineNumber: 964,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$components$2f$ui$2f$dropdown$2d$menu$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["DropdownMenuContent"], {
                                        align: "end",
                                        className: "rounded-none border-border font-mono",
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$components$2f$ui$2f$dropdown$2d$menu$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["DropdownMenuItem"], {
                                            onClick: handleResetWorkspace,
                                            className: "rounded-none text-xs uppercase tracking-wide",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$lucide$2d$react$40$0$2e$474$2e$0$2b$b1ab299f0a400331$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$rotate$2d$ccw$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__RotateCcw$3e$__["RotateCcw"], {
                                                    className: "mr-2 h-3.5 w-3.5"
                                                }, void 0, false, {
                                                    fileName: "[project]/apps/web/app/(dashboard)/projects/[projectId]/page.tsx",
                                                    lineNumber: 981,
                                                    columnNumber: 19
                                                }, this),
                                                "Reset Workspace"
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/apps/web/app/(dashboard)/projects/[projectId]/page.tsx",
                                            lineNumber: 977,
                                            columnNumber: 17
                                        }, this)
                                    }, void 0, false, {
                                        fileName: "[project]/apps/web/app/(dashboard)/projects/[projectId]/page.tsx",
                                        lineNumber: 976,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/apps/web/app/(dashboard)/projects/[projectId]/page.tsx",
                                lineNumber: 963,
                                columnNumber: 13
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/apps/web/app/(dashboard)/projects/[projectId]/page.tsx",
                            lineNumber: 962,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/apps/web/app/(dashboard)/projects/[projectId]/page.tsx",
                    lineNumber: 904,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$components$2f$projects$2f$ProjectWorkspaceLayout$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["ProjectWorkspaceLayout"], {
                    projectId: projectId,
                    activeChatId: activeChat?._id,
                    files: files,
                    selectedFilePath: selectedFilePath,
                    selectedFileLocation: selectedFileLocation,
                    openTabs: openTabs,
                    onSelectFile: handleFileSelect,
                    onCloseTab: handleTabClose,
                    onCreateFile: handleFileCreate,
                    onRenameFile: handleFileRename,
                    onDeleteFile: handleFileDelete,
                    onSaveFile: handleEditorSave,
                    onEditorDirtyChange: handleEditorDirtyChange,
                    isMobileLayout: isMobileLayout,
                    isCompactDesktopLayout: isCompactDesktopLayout,
                    mobilePrimaryPanel: mobilePrimaryPanel,
                    onMobilePrimaryPanelChange: setMobilePrimaryPanel,
                    mobileUnreadCount: mobileUnreadCount,
                    isMobileKeyboardOpen: isMobileKeyboardOpen,
                    chatPanel: chatPanelContent,
                    reviewPanel: reviewPanelContent,
                    isReviewPanelOpen: isChatInspectorOpen,
                    onReviewPanelOpenChange: setIsChatInspectorOpen,
                    isChatPanelOpen: isChatPanelOpen,
                    automationMode: automationMode,
                    onAutomationModeChange: setAutomationMode,
                    pendingArtifactPreview: pendingArtifactPreview,
                    onApplyPendingArtifact: handleApplyPendingArtifact,
                    onRejectPendingArtifact: handleRejectPendingArtifact,
                    onOpenArtifacts: ()=>openReviewTab('artifacts'),
                    chatMode: chatMode,
                    onModeChange: handleModeChange,
                    cursorPosition: cursorPosition,
                    isStreaming: agent.isLoading,
                    currentSpec: agent.currentSpec,
                    isSpecDrawerOpen: isSpecDrawerOpen,
                    onSpecDrawerOpenChange: setIsSpecDrawerOpen,
                    previewUrl: previewUrl,
                    previewState: previewState,
                    isPreviewOpen: isPreviewOpen,
                    onPreviewOpenChange: setIsPreviewOpen
                }, void 0, false, {
                    fileName: "[project]/apps/web/app/(dashboard)/projects/[projectId]/page.tsx",
                    lineNumber: 989,
                    columnNumber: 9
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/apps/web/app/(dashboard)/projects/[projectId]/page.tsx",
            lineNumber: 896,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/apps/web/app/(dashboard)/projects/[projectId]/page.tsx",
        lineNumber: 895,
        columnNumber: 5
    }, this);
}
}),
];

//# sourceMappingURL=apps_web_1dbf3553._.js.map