module.exports = [
"[project]/node_modules/.bun/next@16.1.6+f27840211c12abb1/node_modules/next/dist/build/webpack/loaders/next-flight-loader/server-reference.js [app-rsc] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

/* eslint-disable import/no-extraneous-dependencies */ Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "registerServerReference", {
    enumerable: true,
    get: function() {
        return _server.registerServerReference;
    }
});
const _server = __turbopack_context__.r("[project]/node_modules/.bun/next@16.1.6+f27840211c12abb1/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react-server-dom-turbopack-server.js [app-rsc] (ecmascript)"); //# sourceMappingURL=server-reference.js.map
}),
"[project]/node_modules/.bun/next@16.1.6+f27840211c12abb1/node_modules/next/dist/build/webpack/loaders/next-flight-loader/action-validate.js [app-rsc] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

// This function ensures that all the exported values are valid server actions,
// during the runtime. By definition all actions are required to be async
// functions, but here we can only check that they are functions.
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "ensureServerEntryExports", {
    enumerable: true,
    get: function() {
        return ensureServerEntryExports;
    }
});
function ensureServerEntryExports(actions) {
    for(let i = 0; i < actions.length; i++){
        const action = actions[i];
        if (typeof action !== 'function') {
            throw Object.defineProperty(new Error(`A "use server" file can only export async functions, found ${typeof action}.\nRead more: https://nextjs.org/docs/messages/invalid-use-server-value`), "__NEXT_ERROR_CODE", {
                value: "E352",
                enumerable: false,
                configurable: true
            });
        }
    }
} //# sourceMappingURL=action-validate.js.map
}),
"[project]/node_modules/.bun/@convex-dev+auth@0.0.90+c40c709e16b8c960/node_modules/@convex-dev/auth/dist/nextjs/server/invalidateCache.js [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/* __next_internal_action_entry_do_not_use__ [{"000a45780af9a87d5a08e51cde0366f2062bf52c67":"invalidateCache"},"",""] */ __turbopack_context__.s([
    "invalidateCache",
    ()=>invalidateCache
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.bun/next@16.1.6+f27840211c12abb1/node_modules/next/dist/build/webpack/loaders/next-flight-loader/server-reference.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$headers$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.bun/next@16.1.6+f27840211c12abb1/node_modules/next/headers.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$validate$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.bun/next@16.1.6+f27840211c12abb1/node_modules/next/dist/build/webpack/loaders/next-flight-loader/action-validate.js [app-rsc] (ecmascript)");
;
;
async function invalidateCache() {
    // Dummy cookie, just to set the header which will invalidate
    // the client Router Cache.
    (await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$headers$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["cookies"])()).delete(`__convexAuthCookieForRouterCacheInvalidation${Date.now()}`);
    return null;
} //# sourceMappingURL=invalidateCache.js.map
;
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$validate$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["ensureServerEntryExports"])([
    invalidateCache
]);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$6$2b$f27840211c12abb1$2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(invalidateCache, "000a45780af9a87d5a08e51cde0366f2062bf52c67", null);
}),
"[project]/apps/web/.next-internal/server/app/(dashboard)/projects/page/actions.js { ACTIONS_MODULE0 => \"[project]/node_modules/.bun/@convex-dev+auth@0.0.90+c40c709e16b8c960/node_modules/@convex-dev/auth/dist/nextjs/server/invalidateCache.js [app-rsc] (ecmascript)\" } [app-rsc] (server actions loader, ecmascript) <locals>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$convex$2d$dev$2b$auth$40$0$2e$0$2e$90$2b$c40c709e16b8c960$2f$node_modules$2f40$convex$2d$dev$2f$auth$2f$dist$2f$nextjs$2f$server$2f$invalidateCache$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.bun/@convex-dev+auth@0.0.90+c40c709e16b8c960/node_modules/@convex-dev/auth/dist/nextjs/server/invalidateCache.js [app-rsc] (ecmascript)");
;
}),
"[project]/apps/web/.next-internal/server/app/(dashboard)/projects/page/actions.js { ACTIONS_MODULE0 => \"[project]/node_modules/.bun/@convex-dev+auth@0.0.90+c40c709e16b8c960/node_modules/@convex-dev/auth/dist/nextjs/server/invalidateCache.js [app-rsc] (ecmascript)\" } [app-rsc] (server actions loader, ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "000a45780af9a87d5a08e51cde0366f2062bf52c67",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$convex$2d$dev$2b$auth$40$0$2e$0$2e$90$2b$c40c709e16b8c960$2f$node_modules$2f40$convex$2d$dev$2f$auth$2f$dist$2f$nextjs$2f$server$2f$invalidateCache$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["invalidateCache"]
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f2e$next$2d$internal$2f$server$2f$app$2f28$dashboard$292f$projects$2f$page$2f$actions$2e$js__$7b$__ACTIONS_MODULE0__$3d3e$__$225b$project$5d2f$node_modules$2f2e$bun$2f40$convex$2d$dev$2b$auth$40$0$2e$0$2e$90$2b$c40c709e16b8c960$2f$node_modules$2f40$convex$2d$dev$2f$auth$2f$dist$2f$nextjs$2f$server$2f$invalidateCache$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$2922$__$7d$__$5b$app$2d$rsc$5d$__$28$server__actions__loader$2c$__ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i('[project]/apps/web/.next-internal/server/app/(dashboard)/projects/page/actions.js { ACTIONS_MODULE0 => "[project]/node_modules/.bun/@convex-dev+auth@0.0.90+c40c709e16b8c960/node_modules/@convex-dev/auth/dist/nextjs/server/invalidateCache.js [app-rsc] (ecmascript)" } [app-rsc] (server actions loader, ecmascript) <locals>');
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$convex$2d$dev$2b$auth$40$0$2e$0$2e$90$2b$c40c709e16b8c960$2f$node_modules$2f40$convex$2d$dev$2f$auth$2f$dist$2f$nextjs$2f$server$2f$invalidateCache$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.bun/@convex-dev+auth@0.0.90+c40c709e16b8c960/node_modules/@convex-dev/auth/dist/nextjs/server/invalidateCache.js [app-rsc] (ecmascript)");
}),
];

//# sourceMappingURL=_3ede4b01._.js.map