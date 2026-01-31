"use client";

import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Terminal as TerminalIcon,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
} from "lucide-react";

interface TerminalProps {
  projectId: string;
}

interface LogEntry {
  id: string;
  timestamp: Date;
  content: string;
  type: "info" | "success" | "error" | "warning";
}

interface JobStatus {
  status: "idle" | "running" | "success" | "error";
  message?: string;
  startedAt?: Date;
}

// Status badge component
const StatusBadge: React.FC<{ status: JobStatus["status"] }> = ({
  status,
}) => {
  const config = {
    idle: {
      icon: Clock,
      label: "Idle",
      className: "bg-zinc-800 text-zinc-400",
    },
    running: {
      icon: Loader2,
      label: "Running",
      className: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    },
    success: {
      icon: CheckCircle2,
      label: "Success",
      className: "bg-green-500/20 text-green-400 border-green-500/30",
    },
    error: {
      icon: XCircle,
      label: "Error",
      className: "bg-red-500/20 text-red-400 border-red-500/30",
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

// Log line component with color coding
const LogLine: React.FC<{ entry: LogEntry; isLast: boolean }> = ({
  entry,
  isLast,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isLast && scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [isLast]);

  const typeStyles = {
    info: "text-zinc-300",
    success: "text-green-400",
    error: "text-red-400",
    warning: "text-amber-400",
  };

  const typeIndicators = {
    info: "•",
    success: "✓",
    error: "✗",
    warning: "⚠",
  };

  const formatTimestamp = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  return (
    <motion.div
      ref={scrollRef}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="flex items-start gap-2 py-0.5 px-2 font-mono text-xs leading-relaxed hover:bg-zinc-800/50"
    >
      <span className="text-zinc-500 shrink-0 tabular-nums">
        [{formatTimestamp(entry.timestamp)}]
      </span>
      <span
        className={cn(
          "shrink-0 w-4 text-center",
          typeStyles[entry.type],
          entry.type === "success" && "text-green-500",
          entry.type === "error" && "text-red-500",
          entry.type === "warning" && "text-amber-500"
        )}
      >
        {typeIndicators[entry.type]}
      </span>
      <span className={cn("break-all", typeStyles[entry.type])}>
        {entry.content}
      </span>
    </motion.div>
  );
};

export function Terminal({ projectId }: TerminalProps) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [jobStatus, setJobStatus] = useState<JobStatus>({ status: "idle" });
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new logs are added
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs]);

  // Example: Add a log entry (this would be replaced with real job log subscription)
  const addLog = (content: string, type: LogEntry["type"] = "info") => {
    setLogs((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random()}`,
        timestamp: new Date(),
        content,
        type,
      },
    ]);
  };

  // Clear logs
  const clearLogs = () => {
    setLogs([]);
  };

  // Example logs for demonstration
  useEffect(() => {
    // This is just for demo - in production, this would subscribe to actual job logs
    const demoLogs = [
      { content: "Starting build process...", type: "info" as const },
      { content: "Installing dependencies...", type: "info" as const },
      { content: "✓ Dependencies installed successfully", type: "success" as const },
      { content: "Running tests...", type: "info" as const },
      { content: "⚠ Some tests are slow", type: "warning" as const },
    ];

    let delay = 0;
    demoLogs.forEach((log, index) => {
      setTimeout(() => {
        addLog(log.content, log.type);
        if (index === 0) {
          setJobStatus({ status: "running", startedAt: new Date() });
        }
        if (index === demoLogs.length - 1) {
          setJobStatus({ status: "success" });
        }
      }, delay);
      delay += 800;
    });
  }, [projectId]);

  return (
    <div className="flex flex-col h-full bg-zinc-950 border-t border-zinc-800">
      {/* Terminal Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-zinc-900 border-b border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <TerminalIcon className="w-4 h-4 text-zinc-400" />
            <span className="text-sm font-semibold text-zinc-300">
              Terminal
            </span>
          </div>
          <StatusBadge status={jobStatus.status} />
        </div>
        <div className="flex items-center gap-2">
          {logs.length > 0 && (
            <button
              onClick={clearLogs}
              className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors px-2 py-1 rounded hover:bg-zinc-800"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Terminal Content */}
      <ScrollArea className="flex-1">
        <div className="min-h-full">
          {logs.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-zinc-600 text-sm">
              <span className="flex items-center gap-2">
                <TerminalIcon className="w-4 h-4" />
                No logs yet. Waiting for job output...
              </span>
            </div>
          ) : (
            <div className="py-2">
              <AnimatePresence initial={false}>
                {logs.map((entry, index) => (
                  <LogLine
                    key={entry.id}
                    entry={entry}
                    isLast={index === logs.length - 1}
                  />
                ))}
              </AnimatePresence>
              <div ref={logsEndRef} />
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Terminal Input (optional - for interactive terminal) */}
      <div className="flex items-center gap-2 px-4 py-2 bg-zinc-900 border-t border-zinc-800">
        <span className="text-green-500 font-mono text-sm">➜</span>
        <span className="text-blue-400 font-mono text-sm">~</span>
        <input
          type="text"
          placeholder="Type a command..."
          className="flex-1 bg-transparent border-none outline-none text-zinc-300 font-mono text-sm placeholder:text-zinc-600"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              const value = (e.target as HTMLInputElement).value;
              if (value.trim()) {
                addLog(`$ ${value}`, "info");
                addLog(`Command executed: ${value}`, "info");
                (e.target as HTMLInputElement).value = "";
              }
            }
          }}
        />
      </div>
    </div>
  );
}
