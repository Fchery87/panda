/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as admin from "../admin.js";
import type * as agentRuns from "../agentRuns.js";
import type * as artifacts from "../artifacts.js";
import type * as auth from "../auth.js";
import type * as chatAttachments from "../chatAttachments.js";
import type * as chats from "../chats.js";
import type * as checkpoints from "../checkpoints.js";
import type * as crons from "../crons.js";
import type * as customSkills from "../customSkills.js";
import type * as enhancePrompt from "../enhancePrompt.js";
import type * as evals from "../evals.js";
import type * as files from "../files.js";
import type * as github from "../github.js";
import type * as githubConnections from "../githubConnections.js";
import type * as http from "../http.js";
import type * as jobs from "../jobs.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_authz from "../lib/authz.js";
import type * as lib_http_security from "../lib/http_security.js";
import type * as lib_logger from "../lib/logger.js";
import type * as lib_providerSecrets from "../lib/providerSecrets.js";
import type * as lib_userAnalytics from "../lib/userAnalytics.js";
import type * as llm from "../llm.js";
import type * as mcpServers from "../mcpServers.js";
import type * as memoryBank from "../memoryBank.js";
import type * as messages from "../messages.js";
import type * as permissionAuditLog from "../permissionAuditLog.js";
import type * as planningSessions from "../planningSessions.js";
import type * as projectOverview from "../projectOverview.js";
import type * as projects from "../projects.js";
import type * as providers from "../providers.js";
import type * as retention from "../retention.js";
import type * as seed from "../seed.js";
import type * as sessionSummaries from "../sessionSummaries.js";
import type * as settings from "../settings.js";
import type * as sharing from "../sharing.js";
import type * as specifications from "../specifications.js";
import type * as subagents from "../subagents.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  admin: typeof admin;
  agentRuns: typeof agentRuns;
  artifacts: typeof artifacts;
  auth: typeof auth;
  chatAttachments: typeof chatAttachments;
  chats: typeof chats;
  checkpoints: typeof checkpoints;
  crons: typeof crons;
  customSkills: typeof customSkills;
  enhancePrompt: typeof enhancePrompt;
  evals: typeof evals;
  files: typeof files;
  github: typeof github;
  githubConnections: typeof githubConnections;
  http: typeof http;
  jobs: typeof jobs;
  "lib/auth": typeof lib_auth;
  "lib/authz": typeof lib_authz;
  "lib/http_security": typeof lib_http_security;
  "lib/logger": typeof lib_logger;
  "lib/providerSecrets": typeof lib_providerSecrets;
  "lib/userAnalytics": typeof lib_userAnalytics;
  llm: typeof llm;
  mcpServers: typeof mcpServers;
  memoryBank: typeof memoryBank;
  messages: typeof messages;
  permissionAuditLog: typeof permissionAuditLog;
  planningSessions: typeof planningSessions;
  projectOverview: typeof projectOverview;
  projects: typeof projects;
  providers: typeof providers;
  retention: typeof retention;
  seed: typeof seed;
  sessionSummaries: typeof sessionSummaries;
  settings: typeof settings;
  sharing: typeof sharing;
  specifications: typeof specifications;
  subagents: typeof subagents;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
