import { v } from 'convex/values'
import { action } from './_generated/server'
import { api } from './_generated/api'
import type { Id } from './_generated/dataModel'

/**
 * Stub implementation for job execution
 *
 * IMPORTANT: Convex actions run in a V8 isolate, not Node.js.
 * They have no access to child_process, fs, or Node built-ins.
 *
 * Job execution should be handled via:
 * 1. Next.js API routes (recommended)
 * 2. Serverless functions (AWS Lambda, Vercel Functions, etc.)
 *
 * This stub marks jobs as "requires client-side execution" which the
 * frontend can detect and route to the appropriate execution method.
 */

/**
 * Result type for job execution
 */
interface ExecuteResult {
  success: boolean
  message: string
  requiresExternalExecution: boolean
  jobId: Id<'jobs'>
  command: string
}

/**
 * Helper function to execute job logic
 */
async function executeJobLogic(
  ctx: any,
  args: { jobId: Id<'jobs'>; command: string; workingDirectory?: string }
): Promise<ExecuteResult> {
  const { jobId, command } = args

  // Mark job as requiring client-side execution
  await ctx.runMutation(api.jobs.updateStatus, {
    id: jobId,
    status: 'queued',
    logs: [
      `[${new Date().toISOString()}] Job queued for execution: ${command}`,
      `[${new Date().toISOString()}] NOTE: Job execution happens via Next.js API route or serverless function`,
      `[${new Date().toISOString()}] Convex cannot execute commands (no child_process access in V8 isolate)`,
    ],
  })

  return {
    success: true,
    message:
      'Job marked for client-side execution. Call /api/jobs/execute endpoint to run the command.',
    requiresExternalExecution: true,
    jobId: args.jobId,
    command,
  }
}

/**
 * Execute a job action - STUB
 * Updates the job to indicate it requires client-side execution via Next.js API
 */
export const execute = action({
  args: {
    jobId: v.id('jobs'),
    command: v.string(),
    workingDirectory: v.optional(v.string()),
  },
  returns: v.object({
    success: v.boolean(),
    message: v.string(),
    requiresExternalExecution: v.boolean(),
    jobId: v.id('jobs'),
    command: v.string(),
  }),
  handler: async (ctx, args): Promise<ExecuteResult> => {
    return await executeJobLogic(ctx, args)
  },
})

/**
 * HTTP action for job execution webhook - STUB
 * Redirects to client-side execution method
 */
export const executeHttp = action({
  args: {
    jobId: v.id('jobs'),
    command: v.string(),
    workingDirectory: v.optional(v.string()),
  },
  returns: v.object({
    success: v.boolean(),
    message: v.string(),
    requiresExternalExecution: v.boolean(),
    jobId: v.id('jobs'),
    command: v.string(),
  }),
  handler: async (ctx, args): Promise<ExecuteResult> => {
    return await executeJobLogic(ctx, args)
  },
})
