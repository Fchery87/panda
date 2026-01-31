"use client"

import * as React from "react"
import { useMutation } from "convex/react"
import { api } from "@convex/_generated/api"
import { toast } from "sonner"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Github, Loader2, CheckCircle2, AlertCircle, GitBranch } from "lucide-react"
import { cn } from "@/lib/utils"

interface GitHubImportDialogProps {
  projectId: string
  children: React.ReactNode
  onImportComplete?: () => void
}

type ImportStatus = "idle" | "fetching_branches" | "importing" | "success" | "error"

interface ImportProgress {
  totalFiles: number
  processedFiles: number
  importedFiles: number
  skippedFiles: number
  currentFile: string | null
  errors: string[]
}

export function GitHubImportDialog({
  projectId,
  children,
  onImportComplete,
}: GitHubImportDialogProps) {
  const [open, setOpen] = React.useState(false)
  const [repoUrl, setRepoUrl] = React.useState("")
  const [branch, setBranch] = React.useState("")
  const [branches, setBranches] = React.useState<string[]>([])
  const [status, setStatus] = React.useState<ImportStatus>("idle")
  const [progress, setProgress] = React.useState<ImportProgress | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  const getBranches = useMutation(api.github.getBranches)
  const importRepo = useMutation(api.github.importRepo)

  // Validate GitHub URL format
  const isValidUrl = (url: string): boolean => {
    const patterns = [
      /github\.com\/[^\/]+\/[^\/]+/,
      /https:\/\/github\.com\/[^\/]+\/[^\/]+/,
    ]
    return patterns.some((pattern) => pattern.test(url))
  }

  // Fetch available branches when URL changes
  const handleUrlChange = async (url: string) => {
    setRepoUrl(url)
    setBranch("")
    setBranches([])
    setError(null)

    if (isValidUrl(url)) {
      setStatus("fetching_branches")
      try {
        const availableBranches = await getBranches({ repoUrl: url })
        setBranches(availableBranches)
        // Default to main or master if available
        const defaultBranch = availableBranches.find((b) => b === "main") ||
                             availableBranches.find((b) => b === "master") ||
                             availableBranches[0]
        if (defaultBranch) {
          setBranch(defaultBranch)
        }
      } catch (err) {
        console.error("Failed to fetch branches:", err)
        // Don't show error for branch fetching, just use default
        setBranches(["main", "master"])
        setBranch("main")
      } finally {
        setStatus("idle")
      }
    }
  }

  // Handle import
  const handleImport = async () => {
    if (!isValidUrl(repoUrl)) {
      setError("Please enter a valid GitHub URL (e.g., github.com/owner/repo)")
      return
    }

    setStatus("importing")
    setError(null)
    setProgress({
      totalFiles: 0,
      processedFiles: 0,
      importedFiles: 0,
      skippedFiles: 0,
      currentFile: null,
      errors: [],
    })

    try {
      const result = await importRepo({
        repoUrl,
        projectId,
        branch: branch || undefined,
      })

      setProgress(result)
      setStatus("success")
      
      toast.success(
        `Imported ${result.importedFiles} files (${result.skippedFiles} skipped)`
      )

      if (onImportComplete) {
        onImportComplete()
      }

      // Close dialog after success (with delay to show success state)
      setTimeout(() => {
        setOpen(false)
        resetState()
      }, 2000)
    } catch (err) {
      setStatus("error")
      const errorMsg = err instanceof Error ? err.message : "Import failed"
      setError(errorMsg)
      toast.error(errorMsg)
    }
  }

  // Reset state
  const resetState = () => {
    setRepoUrl("")
    setBranch("")
    setBranches([])
    setStatus("idle")
    setProgress(null)
    setError(null)
  }

  // Calculate progress percentage
  const progressPercentage = progress?.totalFiles
    ? Math.round((progress.processedFiles / progress.totalFiles) * 100)
    : 0

  return (
    <Dialog
      open={open}
      onOpenChange={(newOpen) => {
        setOpen(newOpen)
        if (!newOpen) {
          resetState()
        }
      }}
    >
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Github className="h-5 w-5" />
            Import from GitHub
          </DialogTitle>
          <DialogDescription>
            Import a public GitHub repository into your project. Text files up to 1MB will be imported.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* URL Input */}
          <div className="space-y-2">
            <Label htmlFor="repo-url">Repository URL</Label>
            <div className="relative">
              <Github className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="repo-url"
                placeholder="github.com/owner/repo"
                value={repoUrl}
                onChange={(e) => handleUrlChange(e.target.value)}
                disabled={status === "importing"}
                className={cn(
                  "pl-10",
                  repoUrl && !isValidUrl(repoUrl) && "border-destructive"
                )}
              />
            </div>
            {repoUrl && !isValidUrl(repoUrl) && (
              <p className="text-sm text-destructive">
                Please enter a valid GitHub URL
              </p>
            )}
          </div>

          {/* Branch Selector */}
          <div className="space-y-2">
            <Label htmlFor="branch" className="flex items-center gap-2">
              <GitBranch className="h-4 w-4" />
              Branch
            </Label>
            <Select
              value={branch}
              onValueChange={setBranch}
              disabled={status === "importing" || branches.length === 0}
            >
              <SelectTrigger id="branch">
                <SelectValue placeholder="Select branch" />
              </SelectTrigger>
              <SelectContent>
                {branches.map((b) => (
                  <SelectItem key={b} value={b}>
                    {b}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Import Progress */}
          {status === "importing" && progress && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  Importing files...
                </span>
                <span className="font-medium">{progressPercentage}%</span>
              </div>
              <Progress value={progressPercentage} className="h-2" />
              <div className="space-y-1 text-xs text-muted-foreground">
                {progress.currentFile && (
                  <p className="truncate">Current: {progress.currentFile}</p>
                )}
                <p>
                  Imported: {progress.importedFiles} | Skipped: {progress.skippedFiles} | Total: {progress.totalFiles}
                </p>
              </div>
            </div>
          )}

          {/* Success State */}
          {status === "success" && progress && (
            <Alert className="border-green-500/50 bg-green-500/10">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-700">
                Successfully imported {progress.importedFiles} files!
                {progress.skippedFiles > 0 && ` (${progress.skippedFiles} skipped)`}
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={status === "importing"}
          >
            Cancel
          </Button>
          <Button
            onClick={handleImport}
            disabled={
              !isValidUrl(repoUrl) ||
              status === "importing" ||
              status === "success"
            }
          >
            {status === "importing" ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Importing...
              </>
            ) : status === "success" ? (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Done
              </>
            ) : (
              <>
                <Github className="mr-2 h-4 w-4" />
                Import Repository
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
