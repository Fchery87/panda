"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useJobs, type Job, type JobStatus } from "@/hooks/useJobs";
import { api } from '../../../../convex/_generated/api';
import { useAction } from "convex/react";
import { toast } from "sonner";
import type { Id } from '../../../../convex/_generated/dataModel';
import {
  Terminal as TerminalIcon,
  TerminalSquare,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  Play,
  Square,
  Trash2,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

interface TerminalProps {
  projectId: string;
}

// Status badge component with color coding
const StatusBadge: React.FC<{ status: JobStatus }> = ({ status }) => {
  const config = {
    queued: {
      icon: Clock,
      label: "Queued",
      className: "bg-secondary text-muted-foreground border-border",
    },
    running: {
      icon: Loader2,
      label: "Running",
      className: "bg-primary/20 text-primary border-primary/30",
    },
    completed: {
      icon: CheckCircle2,
      label: "Complete",
      className: "bg-secondary text-foreground border-border",
    },
    failed: {
      icon: XCircle,
      label: "Failed",
      className: "bg-destructive/20 text-destructive border-destructive/30",
    },
    cancelled: {
      icon: Square,
      label: "Cancelled",
      className: "bg-muted text-muted-foreground border-border",
    },
  };

  const { icon: Icon, label, className } = config[status];

  return (
    <Badge
      variant="outline"
      className={cn(
        "flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium border",
        className
      )}
    >
      <Icon className={cn("w-3 h-3", status === "running" && "animate-spin")} />
      {label}
    </Badge>
  );
};

// Job log entry component
const LogEntry: React.FC<{
  log: string;
  index: number;
  isLast: boolean;
}> = ({ log, index, isLast }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isLast && scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [isLast]);

  // Parse log for color coding
  const isError = log.includes("[ERR]") || log.includes("error") || log.includes("Error");
  const isSuccess = log.includes("✓") || log.includes("success") || log.includes("Success");
  const isWarning = log.includes("⚠") || log.includes("warning") || log.includes("Warning");

  // Extract timestamp if present
  const timestampMatch = log.match(/^\[(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[\d.]*)\]/);
  const timestamp = timestampMatch ? timestampMatch[1] : null;
  const content = timestamp ? log.replace(/^\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[\d.]*\]\s*/, "") : log;

  return (
    <motion.div
      ref={scrollRef}
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.15, delay: index * 0.01 }}
      className={cn(
        "flex items-start gap-2 py-1 px-3 font-mono text-xs leading-relaxed",
        "hover:bg-white/5 transition-colors",
        isError && "text-rose-300",
        isSuccess && "text-emerald-300",
        isWarning && "text-amber-300",
        !isError && !isSuccess && !isWarning && "text-zinc-300"
      )}
    >
      {timestamp && (
        <span className="text-zinc-500 shrink-0 tabular-nums text-[10px] pt-0.5">
          {timestamp.split("T")[1]?.replace("Z", "") || timestamp}
        </span>
      )}
      <span className="break-all">{content}</span>
    </motion.div>
  );
};

// Job card component
const JobCard: React.FC<{
  job: Job;
  isExpanded: boolean;
  onToggle: () => void;
  onCancel?: () => void;
  onDelete?: () => void;
}> = ({ job, isExpanded, onToggle, onCancel, onDelete }) => {
  const canCancel = job.status === "queued" || job.status === "running";
  const canDelete = job.status !== "running";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="border border-border/50 rounded-lg overflow-hidden surface-2"
    >
      {/* Job Header */}
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-primary/5 transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-center gap-3">
          <button className="text-muted-foreground hover:text-foreground">
            {isExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium text-foreground font-mono">
              {job.command}
            </span>
            <span className="text-xs text-muted-foreground">
              {new Date(job.createdAt).toLocaleString()}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <StatusBadge status={job.status} />
          {canCancel && onCancel && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-primary hover:bg-primary/10"
              onClick={(e) => {
                e.stopPropagation();
                onCancel();
              }}
            >
              <Square className="w-3.5 h-3.5" />
            </Button>
          )}
          {canDelete && onDelete && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* Job Logs */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="border-t border-zinc-800">
              {job.logs && job.logs.length > 0 ? (
                <div className="max-h-64 overflow-y-auto py-2 bg-black/30">
                  {job.logs.map((log, index) => (
                    <LogEntry
                      key={index}
                      log={log}
                      index={index}
                      isLast={index === job.logs!.length - 1}
                    />
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-zinc-500 text-sm">
                  No logs available
                </div>
              )}

              {/* Output/Error Display */}
              {job.output && (
                <div className="border-t border-zinc-800 px-4 py-3 bg-emerald-500/5">
                  <div className="text-xs text-emerald-400 font-medium mb-1">Output:</div>
                  <pre className="text-xs text-emerald-300 font-mono whitespace-pre-wrap break-all">
                    {job.output}
                  </pre>
                </div>
              )}

              {job.error && (
                <div className="border-t border-zinc-800 px-4 py-3 bg-rose-500/5">
                  <div className="text-xs text-rose-400 font-medium mb-1">Error:</div>
                  <pre className="text-xs text-rose-300 font-mono whitespace-pre-wrap break-all">
                    {job.error}
                  </pre>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export function Terminal({ projectId }: TerminalProps) {
  const {
    jobs,
    runningJobs,
    streamingLogs,
    isLoading,
    isAnyJobRunning,
    createAndExecute,
    cancelJob,
    removeJob,
  } = useJobs(projectId as Id<"projects">);

  const executeAction = useAction(api.jobsExecution.execute);

  const [command, setCommand] = useState("");
  const [expandedJobs, setExpandedJobs] = useState<Set<string>>(new Set());
  const [isExecuting, setIsExecuting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Auto-scroll when streaming logs update
  useEffect(() => {
    if (scrollAreaRef.current && streamingLogs?.logs) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [streamingLogs?.logs]);

  // Toggle job expansion
  const toggleJob = useCallback((jobId: string) => {
    setExpandedJobs((prev) => {
      const next = new Set(prev);
      if (next.has(jobId)) {
        next.delete(jobId);
      } else {
        next.add(jobId);
      }
      return next;
    });
  }, []);

  // Handle command submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!command.trim() || isExecuting) return;

    setIsExecuting(true);
    try {
      // Create job and get the jobId
      const result = await createAndExecute({
        projectId: projectId as Id<"projects">,
        type: "cli",
        command: command.trim(),
      });

      // Trigger execution via action
      if (result?.jobId) {
        // Auto-expand the new job
        setExpandedJobs((prev) => new Set(prev).add(result.jobId));

        // Execute the job
        executeAction({
          jobId: result.jobId,
          command: command.trim(),
        }).catch((error) => {
          console.error("Execution failed:", error);
          toast.error("Command execution failed", {
            description: error.message,
          });
        });
      }

      setCommand("");
    } catch (error) {
      console.error("Failed to submit command:", error);
      toast.error("Failed to submit command");
    } finally {
      setIsExecuting(false);
    }
  };

  // Handle cancel job
  const handleCancelJob = async (jobId: Id<"jobs">) => {
    try {
      await cancelJob(jobId);
    } catch (error) {
      console.error("Failed to cancel job:", error);
    }
  };

  // Handle delete job
  const handleDeleteJob = async (jobId: Id<"jobs">) => {
    try {
      await removeJob(jobId);
      // Remove from expanded set
      setExpandedJobs((prev) => {
        const next = new Set(prev);
        next.delete(jobId);
        return next;
      });
    } catch (error) {
      console.error("Failed to delete job:", error);
    }
  };

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <div className="flex flex-col h-full surface-0">
      {/* Terminal Header */}
      <div className="flex items-center justify-between px-3 py-2.5 surface-2 border-b border-border/50">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <TerminalSquare className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Terminal
            </span>
          </div>
          {isAnyJobRunning && (
            <Badge
              variant="outline"
              className="bg-primary/20 text-primary border-primary/30 text-xs"
            >
              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
              {runningJobs.length} running
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          {jobs.length > 0 && (
            <span className="text-xs text-muted-foreground">
              {jobs.length} job{jobs.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      </div>

      {/* Jobs List */}
      <ScrollArea className="flex-1" ref={scrollAreaRef}>
        <div className="p-4 space-y-2">
          {isLoading ? (
            <div className="flex items-center justify-center h-32 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              Loading jobs...
            </div>
          ) : jobs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-muted-foreground/60">
              <TerminalSquare className="w-8 h-8 mb-2 opacity-50" />
              <span className="text-sm">No jobs yet</span>
              <span className="text-xs mt-1">Type a command below to get started</span>
            </div>
          ) : (
            <AnimatePresence mode="popLayout">
              {jobs.map((job) => (
                <JobCard
                  key={job._id}
                  job={job}
                  isExpanded={expandedJobs.has(job._id)}
                  onToggle={() => toggleJob(job._id)}
                  onCancel={
                    job.status === "running" || job.status === "queued"
                      ? () => handleCancelJob(job._id)
                      : undefined
                  }
                  onDelete={
                    job.status !== "running"
                      ? () => handleDeleteJob(job._id)
                      : undefined
                  }
                />
              ))}
            </AnimatePresence>
          )}
        </div>
      </ScrollArea>

      {/* Command Input */}
      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-3 px-4 py-3 surface-2 border-t border-border/50"
      >
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-primary font-mono text-sm">➜</span>
          <span className="text-accent font-mono text-sm">~</span>
        </div>

        <input
          ref={inputRef}
          type="text"
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          placeholder="Type a command (e.g., npm install, git status)..."
          disabled={isExecuting}
          className="flex-1 bg-transparent border-none outline-none text-foreground font-mono text-sm placeholder:text-muted-foreground/50 disabled:opacity-50"
        />

        <Button
          type="submit"
          disabled={!command.trim() || isExecuting}
          size="sm"
          className="shrink-0 gap-1.5"
        >
          {isExecuting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <Play className="w-3.5 h-3.5" />
              Run
            </>
          )}
        </Button>
      </form>
    </div>
  );
}
