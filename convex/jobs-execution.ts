import { v } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api";
import { internal } from "./_generated/api";

// Allowed commands whitelist - only safe commands permitted
const ALLOWED_COMMANDS = [
  "npm",
  "node",
  "git",
  "pnpm",
  "yarn",
  "bun",
  "ls",
  "cat",
  "pwd",
  "echo",
  "grep",
  "find",
  "head",
  "tail",
  "mkdir",
  "touch",
  "cp",
  "mv",
  "rm",
  "npx",
];

// Blocked dangerous patterns
const BLOCKED_PATTERNS = [
  /rm\s+-rf\s+\/\s*$/i, // rm -rf /
  />\s*\/dev\/null.*>/i, // output redirection abuse
  /mkfs/i, // filesystem formatting
  /dd\s+if/i, // disk writing
  /:\(\)\s*\{\s*:\|\:/i, // fork bomb
  /curl.*\|.*sh/i, // piping curl to shell
  /wget.*\|.*sh/i, // piping wget to shell
];

// Maximum execution time (5 minutes in ms)
const MAX_EXECUTION_TIME = 5 * 60 * 1000;

/**
 * Validates if a command is safe to execute
 */
function validateCommand(command: string): { valid: boolean; error?: string } {
  // Check for blocked patterns
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(command)) {
      return {
        valid: false,
        error: `Command contains dangerous pattern: ${pattern}`,
      };
    }
  }

  // Check if command starts with allowed command
  const trimmedCommand = command.trim();
  const baseCommand = trimmedCommand.split(/\s+/)[0];

  if (!ALLOWED_COMMANDS.includes(baseCommand)) {
    return {
      valid: false,
      error: `Command '${baseCommand}' is not in the allowed commands list`,
    };
  }

  return { valid: true };
}

/**
 * Sanitizes a command by removing dangerous characters
 */
function sanitizeCommand(command: string): string {
  // Remove null bytes and control characters
  return command
    .replace(/\x00/g, "")
    .replace(/[\x01-\x08\x0b\x0c\x0e-\x1f\x7f]/g, "")
    .trim();
}

/**
 * Execute a job action - runs commands in a sandboxed environment
 * This action streams output back to the job record in real-time
 */
export const execute = action({
  args: {
    jobId: v.id("jobs"),
    command: v.string(),
    workingDirectory: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { jobId, command, workingDirectory } = args;

    // Validate command
    const validation = validateCommand(command);
    if (!validation.valid) {
      await ctx.runMutation(api.jobs.updateStatus, {
        id: jobId,
        status: "failed",
        error: `Security validation failed: ${validation.error}`,
        completedAt: Date.now(),
      });
      return { success: false, error: validation.error };
    }

    // Sanitize command
    const sanitizedCommand = sanitizeCommand(command);

    try {
      // Update job to running status
      await ctx.runMutation(api.jobs.updateStatus, {
        id: jobId,
        status: "running",
        startedAt: Date.now(),
        logs: [`[${new Date().toISOString()}] Starting: ${sanitizedCommand}`],
      });

      // Dynamically import child_process (Node.js only)
      const { spawn } = await import("child_process");
      const path = await import("path");
      const os = await import("os");

      // Determine shell and working directory
      const shell = process.platform === "win32" ? "cmd.exe" : "/bin/sh";
      const cwd = workingDirectory || process.cwd();

      // Parse command for execution
      const isWindows = process.platform === "win32";
      let shellFlag = isWindows ? "/c" : "-c";

      // Spawn the process
      const childProcess = spawn(shell, [shellFlag, sanitizedCommand], {
        cwd,
        env: {
          ...process.env,
          PATH: process.env.PATH,
          HOME: os.homedir(),
        },
        timeout: MAX_EXECUTION_TIME,
        killSignal: "SIGTERM",
      });

      let stdout = "";
      let stderr = "";
      const logs: string[] = [];

      // Helper to append log and update job
      const appendLog = async (line: string, type: "stdout" | "stderr" = "stdout") => {
        const timestamp = new Date().toISOString();
        const logLine = `[${timestamp}] ${type === "stderr" ? "[ERR] " : ""}${line}`;
        logs.push(logLine);

        // Keep only last 1000 logs to prevent memory issues
        if (logs.length > 1000) {
          logs.shift();
        }

        // Update job with new logs (throttle updates)
        await ctx.runMutation(api.jobs.updateStatus, {
          id: jobId,
          status: "running",
          logs: [...logs],
        });
      };

      // Collect stdout
      childProcess.stdout?.on("data", async (data: Buffer) => {
        const chunk = data.toString();
        stdout += chunk;

        // Split by lines and append each
        const lines = chunk.split("\n").filter((line) => line.trim());
        for (const line of lines) {
          await appendLog(line, "stdout");
        }
      });

      // Collect stderr
      childProcess.stderr?.on("data", async (data: Buffer) => {
        const chunk = data.toString();
        stderr += chunk;

        // Split by lines and append each
        const lines = chunk.split("\n").filter((line) => line.trim());
        for (const line of lines) {
          await appendLog(line, "stderr");
        }
      });

      // Wait for process to complete
      const exitCode = await new Promise<number | null>((resolve, reject) => {
        const timeout = setTimeout(() => {
          childProcess.kill("SIGTERM");
          reject(new Error(`Command timed out after ${MAX_EXECUTION_TIME}ms`));
        }, MAX_EXECUTION_TIME);

        childProcess.on("close", (code) => {
          clearTimeout(timeout);
          resolve(code);
        });

        childProcess.on("error", (error) => {
          clearTimeout(timeout);
          reject(error);
        });
      });

      const isSuccess = exitCode === 0;
      const now = Date.now();

      // Final update with complete output
      await ctx.runMutation(api.jobs.updateStatus, {
        id: jobId,
        status: isSuccess ? "completed" : "failed",
        logs: [
          ...logs,
          `[${new Date().toISOString()}] Process exited with code ${exitCode}`,
        ],
        output: stdout || undefined,
        error: stderr || undefined,
        completedAt: now,
      });

      return {
        success: isSuccess,
        exitCode,
        output: stdout,
        error: stderr,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      // Update job with error
      await ctx.runMutation(api.jobs.updateStatus, {
        id: jobId,
        status: "failed",
        error: errorMessage,
        completedAt: Date.now(),
      });

      return {
        success: false,
        error: errorMessage,
      };
    }
  },
});

/**
 * HTTP action for job execution webhook
 * Can be triggered externally to execute jobs
 */
export const executeHttp = action({
  args: {
    jobId: v.id("jobs"),
    command: v.string(),
    workingDirectory: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Reuse the main execute action
    return await ctx.runAction(api.jobsExecution.execute, args);
  },
});
