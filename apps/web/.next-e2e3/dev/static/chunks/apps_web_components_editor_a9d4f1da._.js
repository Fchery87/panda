(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/apps/web/components/editor/panda-theme.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "pandaTheme",
    ()=>pandaTheme
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$uiw$2b$codemirror$2d$themes$40$4$2e$25$2e$4$2f$node_modules$2f40$uiw$2f$codemirror$2d$themes$2f$esm$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.bun/@uiw+codemirror-themes@4.25.4/node_modules/@uiw/codemirror-themes/esm/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$lezer$2b$highlight$40$1$2e$2$2e$3$2f$node_modules$2f40$lezer$2f$highlight$2f$dist$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.bun/@lezer+highlight@1.2.3/node_modules/@lezer/highlight/dist/index.js [app-client] (ecmascript)");
;
;
const pandaTheme = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$uiw$2b$codemirror$2d$themes$40$4$2e$25$2e$4$2f$node_modules$2f40$uiw$2f$codemirror$2d$themes$2f$esm$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createTheme"])({
    theme: 'dark',
    settings: {
        background: 'hsl(var(--surface-0))',
        foreground: 'hsl(var(--foreground))',
        caret: 'hsl(var(--primary))',
        selection: 'hsl(var(--primary) / 0.2)',
        selectionMatch: 'hsl(var(--primary) / 0.15)',
        lineHighlight: 'hsl(var(--primary) / 0.06)',
        gutterBackground: 'hsl(var(--surface-1))',
        gutterForeground: 'hsl(var(--muted-foreground))',
        gutterActiveForeground: 'hsl(var(--foreground))'
    },
    styles: [
        // Keywords - primary accent color
        {
            tag: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$lezer$2b$highlight$40$1$2e$2$2e$3$2f$node_modules$2f40$lezer$2f$highlight$2f$dist$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["tags"].keyword,
            color: 'hsl(var(--primary))'
        },
        {
            tag: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$lezer$2b$highlight$40$1$2e$2$2e$3$2f$node_modules$2f40$lezer$2f$highlight$2f$dist$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["tags"].operator,
            color: 'hsl(var(--primary))'
        },
        // Variables and identifiers
        {
            tag: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$lezer$2b$highlight$40$1$2e$2$2e$3$2f$node_modules$2f40$lezer$2f$highlight$2f$dist$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["tags"].variableName,
            color: 'hsl(var(--foreground))'
        },
        {
            tag: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$lezer$2b$highlight$40$1$2e$2$2e$3$2f$node_modules$2f40$lezer$2f$highlight$2f$dist$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["tags"].propertyName,
            color: 'hsl(var(--foreground))'
        },
        // Types and classes - slightly muted
        {
            tag: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$lezer$2b$highlight$40$1$2e$2$2e$3$2f$node_modules$2f40$lezer$2f$highlight$2f$dist$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["tags"].typeName,
            color: 'hsl(38 60% 65%)'
        },
        {
            tag: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$lezer$2b$highlight$40$1$2e$2$2e$3$2f$node_modules$2f40$lezer$2f$highlight$2f$dist$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["tags"].className,
            color: 'hsl(38 60% 65%)'
        },
        {
            tag: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$lezer$2b$highlight$40$1$2e$2$2e$3$2f$node_modules$2f40$lezer$2f$highlight$2f$dist$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["tags"].tagName,
            color: 'hsl(38 60% 65%)'
        },
        // Functions - distinct but subtle
        {
            tag: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$lezer$2b$highlight$40$1$2e$2$2e$3$2f$node_modules$2f40$lezer$2f$highlight$2f$dist$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["tags"].function(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$lezer$2b$highlight$40$1$2e$2$2e$3$2f$node_modules$2f40$lezer$2f$highlight$2f$dist$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["tags"].variableName),
            color: 'hsl(210 60% 70%)'
        },
        // Strings - warm tone
        {
            tag: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$lezer$2b$highlight$40$1$2e$2$2e$3$2f$node_modules$2f40$lezer$2f$highlight$2f$dist$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["tags"].string,
            color: 'hsl(35 50% 60%)'
        },
        {
            tag: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$lezer$2b$highlight$40$1$2e$2$2e$3$2f$node_modules$2f40$lezer$2f$highlight$2f$dist$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["tags"].regexp,
            color: 'hsl(35 50% 60%)'
        },
        // Numbers and literals
        {
            tag: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$lezer$2b$highlight$40$1$2e$2$2e$3$2f$node_modules$2f40$lezer$2f$highlight$2f$dist$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["tags"].number,
            color: 'hsl(160 40% 60%)'
        },
        {
            tag: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$lezer$2b$highlight$40$1$2e$2$2e$3$2f$node_modules$2f40$lezer$2f$highlight$2f$dist$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["tags"].bool,
            color: 'hsl(160 40% 60%)'
        },
        // Comments - muted
        {
            tag: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$lezer$2b$highlight$40$1$2e$2$2e$3$2f$node_modules$2f40$lezer$2f$highlight$2f$dist$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["tags"].comment,
            color: 'hsl(var(--muted-foreground) / 0.7)',
            fontStyle: 'italic'
        },
        {
            tag: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$lezer$2b$highlight$40$1$2e$2$2e$3$2f$node_modules$2f40$lezer$2f$highlight$2f$dist$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["tags"].lineComment,
            color: 'hsl(var(--muted-foreground) / 0.7)',
            fontStyle: 'italic'
        },
        {
            tag: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$lezer$2b$highlight$40$1$2e$2$2e$3$2f$node_modules$2f40$lezer$2f$highlight$2f$dist$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["tags"].blockComment,
            color: 'hsl(var(--muted-foreground) / 0.7)',
            fontStyle: 'italic'
        },
        // Punctuation and brackets
        {
            tag: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$lezer$2b$highlight$40$1$2e$2$2e$3$2f$node_modules$2f40$lezer$2f$highlight$2f$dist$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["tags"].punctuation,
            color: 'hsl(var(--muted-foreground))'
        },
        {
            tag: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$lezer$2b$highlight$40$1$2e$2$2e$3$2f$node_modules$2f40$lezer$2f$highlight$2f$dist$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["tags"].bracket,
            color: 'hsl(var(--muted-foreground))'
        },
        // Meta and annotations
        {
            tag: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$lezer$2b$highlight$40$1$2e$2$2e$3$2f$node_modules$2f40$lezer$2f$highlight$2f$dist$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["tags"].meta,
            color: 'hsl(280 40% 65%)'
        },
        {
            tag: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$lezer$2b$highlight$40$1$2e$2$2e$3$2f$node_modules$2f40$lezer$2f$highlight$2f$dist$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["tags"].annotation,
            color: 'hsl(280 40% 65%)'
        },
        // Invalid/Error - status error color
        {
            tag: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$lezer$2b$highlight$40$1$2e$2$2e$3$2f$node_modules$2f40$lezer$2f$highlight$2f$dist$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["tags"].invalid,
            color: 'hsl(var(--status-error))'
        },
        // Definition links
        {
            tag: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$lezer$2b$highlight$40$1$2e$2$2e$3$2f$node_modules$2f40$lezer$2f$highlight$2f$dist$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["tags"].definition(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$lezer$2b$highlight$40$1$2e$2$2e$3$2f$node_modules$2f40$lezer$2f$highlight$2f$dist$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["tags"].variableName),
            color: 'hsl(var(--foreground))'
        },
        {
            tag: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$lezer$2b$highlight$40$1$2e$2$2e$3$2f$node_modules$2f40$lezer$2f$highlight$2f$dist$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["tags"].definition(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$lezer$2b$highlight$40$1$2e$2$2e$3$2f$node_modules$2f40$lezer$2f$highlight$2f$dist$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["tags"].propertyName),
            color: 'hsl(var(--foreground))'
        },
        // Local variables
        {
            tag: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$lezer$2b$highlight$40$1$2e$2$2e$3$2f$node_modules$2f40$lezer$2f$highlight$2f$dist$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["tags"].local(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$lezer$2b$highlight$40$1$2e$2$2e$3$2f$node_modules$2f40$lezer$2f$highlight$2f$dist$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["tags"].variableName),
            color: 'hsl(var(--foreground))'
        },
        // Special tags
        {
            tag: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$lezer$2b$highlight$40$1$2e$2$2e$3$2f$node_modules$2f40$lezer$2f$highlight$2f$dist$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["tags"].special(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$lezer$2b$highlight$40$1$2e$2$2e$3$2f$node_modules$2f40$lezer$2f$highlight$2f$dist$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["tags"].string),
            color: 'hsl(35 50% 60%)'
        },
        // Strong/emphasis
        {
            tag: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$lezer$2b$highlight$40$1$2e$2$2e$3$2f$node_modules$2f40$lezer$2f$highlight$2f$dist$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["tags"].strong,
            fontWeight: 'bold'
        },
        {
            tag: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$lezer$2b$highlight$40$1$2e$2$2e$3$2f$node_modules$2f40$lezer$2f$highlight$2f$dist$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["tags"].emphasis,
            fontStyle: 'italic'
        },
        // Heading
        {
            tag: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$lezer$2b$highlight$40$1$2e$2$2e$3$2f$node_modules$2f40$lezer$2f$highlight$2f$dist$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["tags"].heading,
            color: 'hsl(var(--primary))',
            fontWeight: 'bold'
        },
        // Links
        {
            tag: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$lezer$2b$highlight$40$1$2e$2$2e$3$2f$node_modules$2f40$lezer$2f$highlight$2f$dist$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["tags"].link,
            color: 'hsl(var(--primary))',
            textDecoration: 'underline'
        }
    ]
});
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/apps/web/components/editor/InlineChat.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "InlineChat",
    ()=>InlineChat
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.bun/next@16.1.6+f27840211c12abb1/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$logger$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/lib/logger.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.bun/next@16.1.6+f27840211c12abb1/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$framer$2d$motion$40$12$2e$29$2e$2$2b$bf16f8eded5e12ee$2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.bun/framer-motion@12.29.2+bf16f8eded5e12ee/node_modules/framer-motion/dist/es/render/components/motion/proxy.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$framer$2d$motion$40$12$2e$29$2e$2$2b$bf16f8eded5e12ee$2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$components$2f$AnimatePresence$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.bun/framer-motion@12.29.2+bf16f8eded5e12ee/node_modules/framer-motion/dist/es/components/AnimatePresence/index.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$lucide$2d$react$40$0$2e$474$2e$0$2b$b1ab299f0a400331$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$send$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Send$3e$__ = __turbopack_context__.i("[project]/node_modules/.bun/lucide-react@0.474.0+b1ab299f0a400331/node_modules/lucide-react/dist/esm/icons/send.js [app-client] (ecmascript) <export default as Send>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$lucide$2d$react$40$0$2e$474$2e$0$2b$b1ab299f0a400331$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$x$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__X$3e$__ = __turbopack_context__.i("[project]/node_modules/.bun/lucide-react@0.474.0+b1ab299f0a400331/node_modules/lucide-react/dist/esm/icons/x.js [app-client] (ecmascript) <export default as X>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$lucide$2d$react$40$0$2e$474$2e$0$2b$b1ab299f0a400331$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$sparkles$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Sparkles$3e$__ = __turbopack_context__.i("[project]/node_modules/.bun/lucide-react@0.474.0+b1ab299f0a400331/node_modules/lucide-react/dist/esm/icons/sparkles.js [app-client] (ecmascript) <export default as Sparkles>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$lucide$2d$react$40$0$2e$474$2e$0$2b$b1ab299f0a400331$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$loader$2d$circle$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Loader2$3e$__ = __turbopack_context__.i("[project]/node_modules/.bun/lucide-react@0.474.0+b1ab299f0a400331/node_modules/lucide-react/dist/esm/icons/loader-circle.js [app-client] (ecmascript) <export default as Loader2>");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/components/ui/button.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$components$2f$ui$2f$textarea$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/components/ui/textarea.tsx [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
'use client';
;
;
;
;
;
;
function InlineChat({ selectedText, position, onClose, onSubmit }) {
    _s();
    const [prompt, setPrompt] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('');
    const [isLoading, setIsLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const textareaRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    const containerRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "InlineChat.useEffect": ()=>{
            textareaRef.current?.focus();
        }
    }["InlineChat.useEffect"], []);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "InlineChat.useEffect": ()=>{
            const handleClickOutside = {
                "InlineChat.useEffect.handleClickOutside": (event)=>{
                    if (containerRef.current && !containerRef.current.contains(event.target)) {
                        onClose();
                    }
                }
            }["InlineChat.useEffect.handleClickOutside"];
            document.addEventListener('mousedown', handleClickOutside);
            return ({
                "InlineChat.useEffect": ()=>document.removeEventListener('mousedown', handleClickOutside)
            })["InlineChat.useEffect"];
        }
    }["InlineChat.useEffect"], [
        onClose
    ]);
    const handleSubmit = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "InlineChat.useCallback[handleSubmit]": async ()=>{
            if (!prompt.trim() || isLoading) return;
            setIsLoading(true);
            try {
                await onSubmit(prompt.trim(), selectedText);
                onClose();
            } catch (error) {
                __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$logger$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["appLog"].error('Inline chat error:', error);
            } finally{
                setIsLoading(false);
            }
        }
    }["InlineChat.useCallback[handleSubmit]"], [
        prompt,
        selectedText,
        isLoading,
        onSubmit,
        onClose
    ]);
    const handleKeyDown = (e)=>{
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
        if (e.key === 'Escape') {
            onClose();
        }
    };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$framer$2d$motion$40$12$2e$29$2e$2$2b$bf16f8eded5e12ee$2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$components$2f$AnimatePresence$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["AnimatePresence"], {
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$framer$2d$motion$40$12$2e$29$2e$2$2b$bf16f8eded5e12ee$2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["motion"].div, {
            ref: containerRef,
            initial: {
                opacity: 0,
                y: -10,
                scale: 0.95
            },
            animate: {
                opacity: 1,
                y: 0,
                scale: 1
            },
            exit: {
                opacity: 0,
                y: -10,
                scale: 0.95
            },
            transition: {
                duration: 0.15,
                ease: [
                    0.4,
                    0,
                    0.2,
                    1
                ]
            },
            className: "fixed z-50 w-[420px] rounded-none border border-border bg-background shadow-lg",
            style: {
                top: Math.min(position.top + 24, window.innerHeight - 300),
                left: Math.min(position.left, window.innerWidth - 440)
            },
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "flex items-center justify-between border-b border-border bg-muted/50 px-4 py-2",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "flex items-center gap-2",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$lucide$2d$react$40$0$2e$474$2e$0$2b$b1ab299f0a400331$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$sparkles$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Sparkles$3e$__["Sparkles"], {
                                    className: "h-4 w-4 text-primary"
                                }, void 0, false, {
                                    fileName: "[project]/apps/web/components/editor/InlineChat.tsx",
                                    lineNumber: 78,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    className: "font-mono text-xs uppercase tracking-wider",
                                    children: "Edit with AI"
                                }, void 0, false, {
                                    fileName: "[project]/apps/web/components/editor/InlineChat.tsx",
                                    lineNumber: 79,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/apps/web/components/editor/InlineChat.tsx",
                            lineNumber: 77,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Button"], {
                            variant: "ghost",
                            size: "icon",
                            className: "h-6 w-6 rounded-none",
                            onClick: onClose,
                            "aria-label": "Close inline chat",
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$lucide$2d$react$40$0$2e$474$2e$0$2b$b1ab299f0a400331$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$x$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__X$3e$__["X"], {
                                className: "h-3.5 w-3.5"
                            }, void 0, false, {
                                fileName: "[project]/apps/web/components/editor/InlineChat.tsx",
                                lineNumber: 88,
                                columnNumber: 13
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/apps/web/components/editor/InlineChat.tsx",
                            lineNumber: 81,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/apps/web/components/editor/InlineChat.tsx",
                    lineNumber: 76,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "p-3",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$components$2f$ui$2f$textarea$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Textarea"], {
                            ref: textareaRef,
                            value: prompt,
                            onChange: (e)=>setPrompt(e.target.value),
                            onKeyDown: handleKeyDown,
                            placeholder: "Describe the change you want...",
                            className: "min-h-[80px] resize-none rounded-none border-border bg-background font-mono text-sm focus-visible:ring-primary",
                            disabled: isLoading
                        }, void 0, false, {
                            fileName: "[project]/apps/web/components/editor/InlineChat.tsx",
                            lineNumber: 93,
                            columnNumber: 11
                        }, this),
                        selectedText && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "mt-2 max-h-[100px] overflow-auto rounded-none border border-border bg-muted p-2",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "mb-1 font-mono text-xs uppercase tracking-wider text-muted-foreground",
                                    children: "Selected Code"
                                }, void 0, false, {
                                    fileName: "[project]/apps/web/components/editor/InlineChat.tsx",
                                    lineNumber: 105,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("pre", {
                                    className: "whitespace-pre-wrap break-all font-mono text-xs text-muted-foreground",
                                    children: selectedText.length > 200 ? `${selectedText.slice(0, 200)}...` : selectedText
                                }, void 0, false, {
                                    fileName: "[project]/apps/web/components/editor/InlineChat.tsx",
                                    lineNumber: 108,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/apps/web/components/editor/InlineChat.tsx",
                            lineNumber: 104,
                            columnNumber: 13
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/apps/web/components/editor/InlineChat.tsx",
                    lineNumber: 92,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "flex items-center justify-between border-t border-border px-3 py-2",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                            className: "font-mono text-xs text-muted-foreground",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("kbd", {
                                    className: "mx-0.5 rounded-none bg-muted px-1.5 py-0.5",
                                    children: "Enter"
                                }, void 0, false, {
                                    fileName: "[project]/apps/web/components/editor/InlineChat.tsx",
                                    lineNumber: 117,
                                    columnNumber: 13
                                }, this),
                                " to submit",
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    className: "mx-1",
                                    children: "·"
                                }, void 0, false, {
                                    fileName: "[project]/apps/web/components/editor/InlineChat.tsx",
                                    lineNumber: 118,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("kbd", {
                                    className: "mx-0.5 rounded-none bg-muted px-1.5 py-0.5",
                                    children: "Esc"
                                }, void 0, false, {
                                    fileName: "[project]/apps/web/components/editor/InlineChat.tsx",
                                    lineNumber: 119,
                                    columnNumber: 13
                                }, this),
                                " to cancel"
                            ]
                        }, void 0, true, {
                            fileName: "[project]/apps/web/components/editor/InlineChat.tsx",
                            lineNumber: 116,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Button"], {
                            size: "sm",
                            disabled: !prompt.trim() || isLoading,
                            onClick: handleSubmit,
                            className: "h-7 rounded-none px-3 font-mono text-xs",
                            children: isLoading ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$lucide$2d$react$40$0$2e$474$2e$0$2b$b1ab299f0a400331$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$loader$2d$circle$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Loader2$3e$__["Loader2"], {
                                className: "h-3.5 w-3.5 animate-spin"
                            }, void 0, false, {
                                fileName: "[project]/apps/web/components/editor/InlineChat.tsx",
                                lineNumber: 128,
                                columnNumber: 15
                            }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$lucide$2d$react$40$0$2e$474$2e$0$2b$b1ab299f0a400331$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$send$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Send$3e$__["Send"], {
                                        className: "mr-1.5 h-3.5 w-3.5"
                                    }, void 0, false, {
                                        fileName: "[project]/apps/web/components/editor/InlineChat.tsx",
                                        lineNumber: 131,
                                        columnNumber: 17
                                    }, this),
                                    "Submit"
                                ]
                            }, void 0, true)
                        }, void 0, false, {
                            fileName: "[project]/apps/web/components/editor/InlineChat.tsx",
                            lineNumber: 121,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/apps/web/components/editor/InlineChat.tsx",
                    lineNumber: 115,
                    columnNumber: 9
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/apps/web/components/editor/InlineChat.tsx",
            lineNumber: 64,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/apps/web/components/editor/InlineChat.tsx",
        lineNumber: 63,
        columnNumber: 5
    }, this);
}
_s(InlineChat, "H6xZNYqeuY1mmRYJiMq7VtUlGfM=");
_c = InlineChat;
var _c;
__turbopack_context__.k.register(_c, "InlineChat");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/apps/web/components/editor/CodeMirrorEditor.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "CodeMirrorEditor",
    ()=>CodeMirrorEditor
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.bun/next@16.1.6+f27840211c12abb1/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.bun/next@16.1.6+f27840211c12abb1/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$codemirror$2b$state$40$6$2e$5$2e$4$2f$node_modules$2f40$codemirror$2f$state$2f$dist$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.bun/@codemirror+state@6.5.4/node_modules/@codemirror/state/dist/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$codemirror$2b$view$40$6$2e$39$2e$12$2f$node_modules$2f40$codemirror$2f$view$2f$dist$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.bun/@codemirror+view@6.39.12/node_modules/@codemirror/view/dist/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$uiw$2b$react$2d$codemirror$40$4$2e$25$2e$4$2b$ad9830b2e3d9676c$2f$node_modules$2f40$uiw$2f$react$2d$codemirror$2f$esm$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/.bun/@uiw+react-codemirror@4.25.4+ad9830b2e3d9676c/node_modules/@uiw/react-codemirror/esm/index.js [app-client] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$codemirror$2b$lang$2d$javascript$40$6$2e$2$2e$4$2f$node_modules$2f40$codemirror$2f$lang$2d$javascript$2f$dist$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.bun/@codemirror+lang-javascript@6.2.4/node_modules/@codemirror/lang-javascript/dist/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$components$2f$editor$2f$panda$2d$theme$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/components/editor/panda-theme.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$react$2d$hotkeys$2d$hook$40$5$2e$2$2e$4$2b$bf16f8eded5e12ee$2f$node_modules$2f$react$2d$hotkeys$2d$hook$2f$dist$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.bun/react-hotkeys-hook@5.2.4+bf16f8eded5e12ee/node_modules/react-hotkeys-hook/dist/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$components$2f$editor$2f$InlineChat$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/components/editor/InlineChat.tsx [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
'use client';
;
;
;
;
;
;
;
;
const addJumpHighlightEffect = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$codemirror$2b$state$40$6$2e$5$2e$4$2f$node_modules$2f40$codemirror$2f$state$2f$dist$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["StateEffect"].define();
const clearJumpHighlightEffect = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$codemirror$2b$state$40$6$2e$5$2e$4$2f$node_modules$2f40$codemirror$2f$state$2f$dist$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["StateEffect"].define();
const jumpHighlightField = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$codemirror$2b$state$40$6$2e$5$2e$4$2f$node_modules$2f40$codemirror$2f$state$2f$dist$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["StateField"].define({
    create () {
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$codemirror$2b$view$40$6$2e$39$2e$12$2f$node_modules$2f40$codemirror$2f$view$2f$dist$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Decoration"].none;
    },
    update (decorations, tr) {
        decorations = decorations.map(tr.changes);
        for (const effect of tr.effects){
            if (effect.is(addJumpHighlightEffect)) {
                const marker = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$codemirror$2b$view$40$6$2e$39$2e$12$2f$node_modules$2f40$codemirror$2f$view$2f$dist$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Decoration"].line({
                    attributes: {
                        class: 'cm-jump-highlight'
                    }
                });
                return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$codemirror$2b$view$40$6$2e$39$2e$12$2f$node_modules$2f40$codemirror$2f$view$2f$dist$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Decoration"].set([
                    marker.range(effect.value.from, effect.value.to)
                ]);
            }
            if (effect.is(clearJumpHighlightEffect)) {
                return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$codemirror$2b$view$40$6$2e$39$2e$12$2f$node_modules$2f40$codemirror$2f$view$2f$dist$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Decoration"].none;
            }
        }
        return decorations;
    },
    provide: (f)=>__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$codemirror$2b$view$40$6$2e$39$2e$12$2f$node_modules$2f40$codemirror$2f$view$2f$dist$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["EditorView"].decorations.from(f)
});
const jumpHighlightTheme = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$codemirror$2b$view$40$6$2e$39$2e$12$2f$node_modules$2f40$codemirror$2f$view$2f$dist$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["EditorView"].theme({
    '.cm-line.cm-jump-highlight': {
        backgroundColor: 'rgba(250, 204, 21, 0.18)',
        transition: 'background-color 180ms ease-out'
    }
});
function CodeMirrorEditor({ filePath, content, jumpTo, onSave, onInlineChat }) {
    _s();
    const editorViewRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    const clearHighlightTimerRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    const [inlineChatState, setInlineChatState] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const isTypeScript = filePath.endsWith('.ts') || filePath.endsWith('.tsx') || filePath.endsWith('.mts') || filePath.endsWith('.cts');
    const handleChange = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "CodeMirrorEditor.useCallback[handleChange]": (value)=>{
            onSave?.(value);
        }
    }["CodeMirrorEditor.useCallback[handleChange]"], [
        onSave
    ]);
    const openInlineChat = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "CodeMirrorEditor.useCallback[openInlineChat]": ()=>{
            const view = editorViewRef.current;
            if (!view) return;
            const selection = view.state.selection.main;
            if (selection.from === selection.to) return;
            const selectedText = view.state.doc.sliceString(selection.from, selection.to);
            const coords = view.coordsAtPos(selection.from);
            if (!coords) return;
            setInlineChatState({
                isOpen: true,
                selectedText,
                position: {
                    top: coords.top,
                    left: coords.left
                }
            });
        }
    }["CodeMirrorEditor.useCallback[openInlineChat]"], []);
    const closeInlineChat = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "CodeMirrorEditor.useCallback[closeInlineChat]": ()=>{
            setInlineChatState(null);
        }
    }["CodeMirrorEditor.useCallback[closeInlineChat]"], []);
    const handleInlineChatSubmit = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "CodeMirrorEditor.useCallback[handleInlineChatSubmit]": async (prompt, selectedText)=>{
            if (!onInlineChat) return;
            const result = await onInlineChat(prompt, selectedText, filePath);
            if (result !== null && editorViewRef.current) {
                const view = editorViewRef.current;
                const selection = view.state.selection.main;
                view.dispatch({
                    changes: {
                        from: selection.from,
                        to: selection.to,
                        insert: result
                    }
                });
            }
            closeInlineChat();
        }
    }["CodeMirrorEditor.useCallback[handleInlineChatSubmit]"], [
        onInlineChat,
        filePath,
        closeInlineChat
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$react$2d$hotkeys$2d$hook$40$5$2e$2$2e$4$2b$bf16f8eded5e12ee$2f$node_modules$2f$react$2d$hotkeys$2d$hook$2f$dist$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useHotkeys"])('mod+k', {
        "CodeMirrorEditor.useHotkeys": (e)=>{
            e.preventDefault();
            if (inlineChatState?.isOpen) {
                closeInlineChat();
            } else {
                openInlineChat();
            }
        }
    }["CodeMirrorEditor.useHotkeys"]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "CodeMirrorEditor.useEffect": ()=>{
            if (!jumpTo) return;
            const view = editorViewRef.current;
            if (!view) return;
            const line = Math.max(1, Math.min(jumpTo.line, view.state.doc.lines));
            const lineInfo = view.state.doc.line(line);
            const maxColumn = lineInfo.to - lineInfo.from + 1;
            const column = Math.max(1, Math.min(jumpTo.column, maxColumn));
            const pos = lineInfo.from + (column - 1);
            if (clearHighlightTimerRef.current) {
                clearTimeout(clearHighlightTimerRef.current);
                clearHighlightTimerRef.current = null;
            }
            view.dispatch({
                selection: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$codemirror$2b$state$40$6$2e$5$2e$4$2f$node_modules$2f40$codemirror$2f$state$2f$dist$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["EditorSelection"].cursor(pos),
                scrollIntoView: true,
                effects: addJumpHighlightEffect.of({
                    from: lineInfo.from,
                    to: lineInfo.to
                })
            });
            view.focus();
            clearHighlightTimerRef.current = setTimeout({
                "CodeMirrorEditor.useEffect": ()=>{
                    view.dispatch({
                        effects: clearJumpHighlightEffect.of(null)
                    });
                    clearHighlightTimerRef.current = null;
                }
            }["CodeMirrorEditor.useEffect"], 900);
        }
    }["CodeMirrorEditor.useEffect"], [
        filePath,
        jumpTo
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "CodeMirrorEditor.useEffect": ()=>{
            return ({
                "CodeMirrorEditor.useEffect": ()=>{
                    if (clearHighlightTimerRef.current) {
                        clearTimeout(clearHighlightTimerRef.current);
                        clearHighlightTimerRef.current = null;
                    }
                }
            })["CodeMirrorEditor.useEffect"];
        }
    }["CodeMirrorEditor.useEffect"], []);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "h-full w-full",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$uiw$2b$react$2d$codemirror$40$4$2e$25$2e$4$2b$ad9830b2e3d9676c$2f$node_modules$2f40$uiw$2f$react$2d$codemirror$2f$esm$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["default"], {
                value: content,
                height: "100%",
                theme: __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$components$2f$editor$2f$panda$2d$theme$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["pandaTheme"],
                extensions: [
                    jumpHighlightField,
                    jumpHighlightTheme,
                    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$codemirror$2b$lang$2d$javascript$40$6$2e$2$2e$4$2f$node_modules$2f40$codemirror$2f$lang$2d$javascript$2f$dist$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["javascript"])({
                        jsx: true,
                        typescript: isTypeScript
                    })
                ],
                basicSetup: {
                    lineNumbers: true,
                    highlightActiveLineGutter: true,
                    highlightActiveLine: true,
                    foldGutter: true,
                    dropCursor: true,
                    allowMultipleSelections: true,
                    indentOnInput: true,
                    bracketMatching: true,
                    closeBrackets: true,
                    autocompletion: true,
                    highlightSelectionMatches: true,
                    searchKeymap: true,
                    lintKeymap: true
                },
                onCreateEditor: (view)=>{
                    editorViewRef.current = view;
                },
                onChange: handleChange,
                className: "h-full text-sm"
            }, void 0, false, {
                fileName: "[project]/apps/web/components/editor/CodeMirrorEditor.tsx",
                lineNumber: 178,
                columnNumber: 7
            }, this),
            inlineChatState?.isOpen && onInlineChat && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$components$2f$editor$2f$InlineChat$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["InlineChat"], {
                selectedText: inlineChatState.selectedText,
                position: inlineChatState.position,
                onClose: closeInlineChat,
                onSubmit: handleInlineChatSubmit
            }, void 0, false, {
                fileName: "[project]/apps/web/components/editor/CodeMirrorEditor.tsx",
                lineNumber: 212,
                columnNumber: 9
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/apps/web/components/editor/CodeMirrorEditor.tsx",
        lineNumber: 177,
        columnNumber: 5
    }, this);
}
_s(CodeMirrorEditor, "ulBJqjesAfCOy/+qKDI6ZT5/9AY=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$react$2d$hotkeys$2d$hook$40$5$2e$2$2e$4$2b$bf16f8eded5e12ee$2f$node_modules$2f$react$2d$hotkeys$2d$hook$2f$dist$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useHotkeys"]
    ];
});
_c = CodeMirrorEditor;
var _c;
__turbopack_context__.k.register(_c, "CodeMirrorEditor");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/apps/web/components/editor/CodeMirrorEditor.tsx [app-client] (ecmascript, next/dynamic entry)", ((__turbopack_context__) => {

__turbopack_context__.n(__turbopack_context__.i("[project]/apps/web/components/editor/CodeMirrorEditor.tsx [app-client] (ecmascript)"));
}),
]);

//# sourceMappingURL=apps_web_components_editor_a9d4f1da._.js.map