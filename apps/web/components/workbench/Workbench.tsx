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

export function Workbench({ projectId }: WorkbenchProps) {
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<EditorTab>("code")

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
                projectId={projectId}
                selectedFileId={selectedFileId}
                onSelectFile={setSelectedFileId}
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
                    selectedFileId ? (
                      <EditorContainer fileId={selectedFileId as Id<"files">} />
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
