"use client"

import { useState } from "react"
import {
  Panel,
  PanelGroup,
  PanelResizeHandle,
} from "react-resizable-panels"
import { FileTree } from "./FileTree"
import { Terminal } from "./Terminal"
import { EditorContainer } from "../editor/EditorContainer"
import { Preview } from "./Preview"
import { cn } from "@/lib/utils"
import { Code2, Eye } from "lucide-react"
import type { Id } from "@convex/_generated/dataModel"

interface WorkbenchProps {
  projectId: Id<"projects">
  files: Array<{
    _id: Id<"files">
    path: string
    content?: string
    isBinary: boolean
    updatedAt: number
  }>
  selectedFilePath: string | null
  onSelectFile: (path: string) => void
  onCreateFile: (path: string) => void
  onRenameFile: (oldPath: string, newPath: string) => void
  onDeleteFile: (path: string) => void
  onSaveFile: (filePath: string, content: string) => void
}

function VerticalResizeHandle({ className }: { className?: string }) {
  return (
    <PanelResizeHandle className={cn("group relative", className)}>
      <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-px bg-border group-hover:bg-primary group-data-[resize-handle-state=drag]:bg-primary transition-colors" />
    </PanelResizeHandle>
  )
}

function HorizontalResizeHandle({ className }: { className?: string }) {
  return (
    <PanelResizeHandle className={cn("group relative h-px", className)}>
      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-px bg-border group-hover:bg-primary group-data-[resize-handle-state=drag]:bg-primary transition-colors" />
    </PanelResizeHandle>
  )
}

type EditorTab = "code" | "preview"

export function Workbench({
  projectId,
  files,
  selectedFilePath,
  onSelectFile,
  onCreateFile,
  onRenameFile,
  onDeleteFile,
  onSaveFile,
}: WorkbenchProps) {
  const [activeTab, setActiveTab] = useState<EditorTab>("code")
  const selectedFile = selectedFilePath ? files.find((f) => f.path === selectedFilePath) : undefined

  return (
    <div className="h-full w-full surface-0">
      <PanelGroup direction="horizontal" className="h-full">
        {/* Left sidebar - File Explorer */}
        <Panel 
          defaultSize={18} 
          minSize={15} 
          maxSize={30}
          className="surface-1 border-r border-border"
        >
          <div className="h-full flex flex-col">
            {/* Header */}
            <div className="panel-header flex items-center justify-between" data-number="01">
              <span>Explorer</span>
            </div>
            
            {/* Content */}
            <div className="flex-1 overflow-auto scrollbar-thin">
              <FileTree 
                files={files.map((f) => ({
                  _id: f._id,
                  path: f.path,
                  content: f.content ?? "",
                  isBinary: f.isBinary,
                  updatedAt: f.updatedAt,
                }))}
                selectedPath={selectedFilePath}
                onSelect={onSelectFile}
                onCreate={onCreateFile}
                onRename={onRenameFile}
                onDelete={onDeleteFile}
              />
            </div>
          </div>
        </Panel>

        <VerticalResizeHandle />

        {/* Main content area - Editor with tabs */}
        <Panel defaultSize={82}>
          <PanelGroup direction="vertical" className="h-full">
            {/* Editor + Preview (tabbed) */}
            <Panel defaultSize={70}>
              <div className="h-full flex flex-col surface-0">
                {/* Tab Header */}
                <div className="panel-header flex items-center gap-0 p-0" data-number="02">
                  <button
                    onClick={() => setActiveTab("code")}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 font-mono text-xs uppercase tracking-widest transition-sharp",
                      activeTab === "code"
                        ? "text-primary border-b-2 border-primary bg-background"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Code2 className="h-3.5 w-3.5" />
                    Code
                  </button>
                  <button
                    onClick={() => setActiveTab("preview")}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 font-mono text-xs uppercase tracking-widest transition-sharp",
                      activeTab === "preview"
                        ? "text-primary border-b-2 border-primary bg-background"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Eye className="h-3.5 w-3.5" />
                    Preview
                  </button>
                </div>
                
                {/* Tab Content */}
                <div className="flex-1 overflow-hidden">
                  {activeTab === "code" ? (
                    selectedFile ? (
                      <EditorContainer
                        filePath={selectedFile.path}
                        content={selectedFile.content ?? ""}
                        onSave={(content) => onSaveFile(selectedFile.path, content)}
                      />
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-4">
                        <div className="font-mono text-sm">
                          <span className="text-primary">{"{"}</span>
                          <span className="mx-2">No file selected</span>
                          <span className="text-primary">{"}"}</span>
                        </div>
                        <p className="text-xs text-muted-foreground/60">
                          Select a file from the explorer
                        </p>
                      </div>
                    )
                  ) : (
                    <Preview />
                  )}
                </div>
              </div>
            </Panel>

            <HorizontalResizeHandle />

            {/* Terminal */}
            <Panel defaultSize={30} minSize={15}>
              <div className="h-full flex flex-col surface-1 border-t border-border">
                {/* Header */}
                <div className="panel-header flex items-center justify-between" data-number="03">
                  <span>Terminal</span>
                </div>
                
                {/* Content */}
                <div className="flex-1 overflow-hidden">
                  <Terminal projectId={projectId} />
                </div>
              </div>
            </Panel>
          </PanelGroup>
        </Panel>
      </PanelGroup>
    </div>
  )
}
