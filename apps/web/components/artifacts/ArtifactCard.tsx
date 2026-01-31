"use client"

import React from "react"
import { motion } from "framer-motion"
import { FileText, Terminal, Check, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type {
  Artifact,
  FileWritePayload,
  CommandRunPayload,
} from "@/stores/artifactStore"

interface ArtifactCardProps {
  artifact: Artifact
  onApply: (id: string) => void
  onReject: (id: string) => void
  isBatchAction?: boolean
}

function isFileWritePayload(payload: unknown): payload is FileWritePayload {
  return (
    typeof payload === "object" &&
    payload !== null &&
    "filePath" in payload &&
    typeof (payload as FileWritePayload).filePath === "string"
  )
}

function isCommandRunPayload(payload: unknown): payload is CommandRunPayload {
  return (
    typeof payload === "object" &&
    payload !== null &&
    "command" in payload &&
    typeof (payload as CommandRunPayload).command === "string"
  )
}

export function ArtifactCard({
  artifact,
  onApply,
  onReject,
  isBatchAction = false,
}: ArtifactCardProps) {
  const isFileWrite = artifact.type === "file_write"
  const isPending = artifact.status === "pending"
  const isApplied = artifact.status === "applied"
  const isRejected = artifact.status === "rejected"

  const payload = artifact.payload

  const getArtifactTitle = () => {
    if (isFileWritePayload(payload)) {
      return payload.filePath.split("/").pop() || "Unknown File"
    }
    if (isCommandRunPayload(payload)) {
      return payload.command.split(" ")[0] || "Unknown Command"
    }
    return "Unknown Artifact"
  }

  const getArtifactSubtitle = () => {
    if (isFileWritePayload(payload)) {
      return payload.filePath
    }
    if (isCommandRunPayload(payload)) {
      return payload.command
    }
    return ""
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 100, scale: 0.95 }}
      transition={{
        duration: 0.3,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
      layout
    >
      <Card
        className={cn(
          "relative overflow-hidden transition-all duration-300",
          "border-l-4",
          isPending && "border-l-amber-500 bg-amber-50/30 dark:bg-amber-950/10",
          isApplied && "border-l-emerald-500 bg-emerald-50/30 dark:bg-emerald-950/10",
          isRejected && "border-l-rose-500 bg-rose-50/30 dark:bg-rose-950/10",
          "hover:shadow-lg hover:shadow-black/5"
        )}
      >
        {/* Subtle grain texture overlay */}
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          }}
        />

        <CardHeader className="pb-2 relative z-10">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <motion.div
                initial={{ scale: 0.8, rotate: -10 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
                className={cn(
                  "p-2.5 rounded-lg",
                  isFileWrite
                    ? "bg-gradient-to-br from-blue-500/20 to-indigo-500/20 text-blue-600 dark:text-blue-400"
                    : "bg-gradient-to-br from-violet-500/20 to-purple-500/20 text-violet-600 dark:text-violet-400"
                )}
              >
                {isFileWrite ? (
                  <FileText className="h-5 w-5" />
                ) : (
                  <Terminal className="h-5 w-5" />
                )}
              </motion.div>
              <div className="space-y-1">
                <CardTitle className="text-base font-semibold tracking-tight">
                  {getArtifactTitle()}
                </CardTitle>
                <CardDescription className="text-xs font-mono line-clamp-1">
                  {getArtifactSubtitle()}
                </CardDescription>
              </div>
            </div>

            <Badge
              variant="outline"
              className={cn(
                "text-xs font-medium uppercase tracking-wider transition-colors",
                isPending && "border-amber-500/50 text-amber-700 dark:text-amber-400",
                isApplied && "border-emerald-500/50 text-emerald-700 dark:text-emerald-400",
                isRejected && "border-rose-500/50 text-rose-700 dark:text-rose-400"
              )}
            >
              {artifact.status}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="pt-2 relative z-10">
          {isFileWritePayload(payload) && payload.originalContent !== undefined && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="mb-4"
            >
              <div className="text-xs text-muted-foreground mb-1.5 font-medium uppercase tracking-wider">
                Changes Preview
              </div>
              <div className="relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500/20 via-amber-500/20 to-rose-500/20 rounded-lg blur opacity-0 group-hover:opacity-100 transition duration-500" />
                <div className="relative bg-muted/50 rounded-lg p-3 font-mono text-xs overflow-hidden">
                  <div className="flex gap-2">
                    <div className="flex-1 space-y-1">
                      {payload.originalContent && (
                        <div className="text-rose-600/80 dark:text-rose-400/80 line-through opacity-60">
                          - {payload.originalContent.slice(0, 60)}
                          {payload.originalContent.length > 60 ? "..." : ""}
                        </div>
                      )}
                      <div className="text-emerald-600/80 dark:text-emerald-400/80">
                        + {payload.content.slice(0, 60)}
                        {payload.content.length > 60 ? "..." : ""}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {isCommandRunPayload(payload) && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="mb-4"
            >
              <div className="text-xs text-muted-foreground mb-1.5 font-medium uppercase tracking-wider">
                Command Details
              </div>
              <div className="relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-violet-500/20 to-purple-500/20 rounded-lg blur opacity-0 group-hover:opacity-100 transition duration-500" />
                <div className="relative bg-muted/50 rounded-lg p-3 font-mono text-xs">
                  <span className="text-violet-600 dark:text-violet-400">$</span>{" "}
                  {payload.command}
                  {payload.workingDirectory && (
                    <div className="mt-1 text-muted-foreground">
                      cd {payload.workingDirectory}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {artifact.description && (
            <p className="text-sm text-muted-foreground mb-3 italic">
              {artifact.description}
            </p>
          )}

          {isPending && !isBatchAction && (
            <div className="flex gap-2">
              <motion.div
                className="flex-1"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Button
                  onClick={() => onApply(artifact.id)}
                  className="w-full bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white shadow-lg shadow-emerald-500/20 transition-all"
                  size="sm"
                >
                  <Check className="h-4 w-4 mr-1.5" />
                  Apply
                </Button>
              </motion.div>
              <motion.div
                className="flex-1"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Button
                  onClick={() => onReject(artifact.id)}
                  variant="outline"
                  className="w-full border-rose-500/30 text-rose-700 hover:bg-rose-50 hover:text-rose-800 dark:hover:bg-rose-950/30 transition-all"
                  size="sm"
                >
                  <X className="h-4 w-4 mr-1.5" />
                  Reject
                </Button>
              </motion.div>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}
