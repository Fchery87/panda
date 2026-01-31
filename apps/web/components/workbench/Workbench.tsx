"use client";

import React from "react";
import { motion } from "framer-motion";
import {
  Panel,
  PanelGroup,
  PanelResizeHandle,
  ImperativePanelHandle,
} from "react-resizable-panels";
import { FileTree } from "./FileTree";
import { Terminal } from "./Terminal";
import { Preview } from "./Preview";
import { EditorContainer } from "@/components/editor/EditorContainer";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { GripVertical } from "lucide-react";

interface WorkbenchProps {
  // File tree props
  files: Array<{
    _id: string;
    path: string;
    content: string;
    isBinary: boolean;
    updatedAt: number;
  }>;
  selectedPath: string | null;
  onFileSelect: (path: string) => void;
  onFileCreate: (path: string) => void;
  onFileRename: (oldPath: string, newPath: string) => void;
  onFileDelete: (path: string) => void;

  // Editor props
  editorFilePath: string | null;
  editorContent: string;
  onEditorSave?: (content: string) => void;

  // Terminal props
  projectId: string;

  // Preview props
  previewUrl?: string;
}

// Animated panel wrapper
const AnimatedPanel: React.FC<{
  children: React.ReactNode;
  direction?: "left" | "right" | "bottom";
  className?: string;
}> = ({ children, direction = "left", className }) => {
  const variants = {
    left: { initial: { opacity: 0, x: -30 }, animate: { opacity: 1, x: 0 } },
    right: { initial: { opacity: 0, x: 30 }, animate: { opacity: 1, x: 0 } },
    bottom: { initial: { opacity: 0, y: 30 }, animate: { opacity: 1, y: 0 } },
  };

  return (
    <motion.div
      initial={variants[direction].initial}
      animate={variants[direction].animate}
      transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
      className={cn("h-full w-full", className)}
    >
      {children}
    </motion.div>
  );
};

// Resize handle component with visual feedback
const ResizeHandle: React.FC<{ className?: string }> = ({ className }) => (
  <PanelResizeHandle
    className={cn(
      "relative flex items-center justify-center transition-colors",
      "data-[resize-handle-state=idle]:bg-transparent",
      "data-[resize-handle-state=hover]:bg-primary/10",
      "data-[resize-handle-state=drag]:bg-primary/20",
      className
    )}
  >
    <div className="flex items-center justify-center">
      <GripVertical className="w-4 h-4 text-muted-foreground/50 transition-colors group-data-[resize-handle-state=hover]:text-muted-foreground" />
    </div>
  </PanelResizeHandle>
);

export function Workbench({
  files,
  selectedPath,
  onFileSelect,
  onFileCreate,
  onFileRename,
  onFileDelete,
  editorFilePath,
  editorContent,
  onEditorSave,
  projectId,
  previewUrl,
}: WorkbenchProps) {
  const fileTreeRef = React.useRef<ImperativePanelHandle>(null);
  const middlePanelRef = React.useRef<ImperativePanelHandle>(null);
  const previewPanelRef = React.useRef<ImperativePanelHandle>(null);
  const editorRef = React.useRef<ImperativePanelHandle>(null);
  const terminalRef = React.useRef<ImperativePanelHandle>(null);

  return (
    <div className="h-screen w-full bg-background overflow-hidden">
      <PanelGroup direction="horizontal" className="h-full w-full">
        {/* Left Panel: File Tree */}
        <Panel
          ref={fileTreeRef}
          defaultSize={20}
          minSize={15}
          maxSize={30}
          className="flex flex-col"
          id="file-tree"
        >
          <AnimatedPanel direction="left" className="flex flex-col h-full">
            <div className="flex flex-col h-full bg-card/50 border-r border-border">
              {/* File Tree Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
                <span className="text-sm font-semibold text-foreground">
                  Explorer
                </span>
              </div>
              {/* File Tree Content */}
              <div className="flex-1 overflow-auto">
                <FileTree
                  files={files}
                  selectedPath={selectedPath}
                  onSelect={onFileSelect}
                  onCreate={onFileCreate}
                  onRename={onFileRename}
                  onDelete={onFileDelete}
                />
              </div>
            </div>
          </AnimatedPanel>
        </Panel>

        {/* Horizontal Resize Handle 1 */}
        <ResizeHandle className="w-2 -ml-1 z-10 hover:cursor-col-resize" />

        {/* Middle Panel: Editor + Terminal (Vertical split) */}
        <Panel
          ref={middlePanelRef}
          className="flex flex-col"
          id="editor-terminal"
        >
          <AnimatedPanel direction="bottom" className="flex flex-col h-full">
            <PanelGroup direction="vertical" className="h-full w-full">
              {/* Editor Panel (Top) */}
              <Panel
                ref={editorRef}
                defaultSize={70}
                minSize={30}
                className="flex flex-col"
                id="editor"
              >
                {editorFilePath ? (
                  <EditorContainer
                    filePath={editorFilePath}
                    content={editorContent}
                    onSave={onEditorSave}
                  />
                ) : (
                  <div className="flex-1 flex items-center justify-center bg-zinc-900">
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3 }}
                      className="text-center space-y-4"
                    >
                      <div className="text-6xl font-bold text-zinc-800">
                        Panda.ai
                      </div>
                      <p className="text-zinc-500 text-sm">
                        Select a file from the explorer to start editing
                      </p>
                    </motion.div>
                  </div>
                )}
              </Panel>

              {/* Vertical Resize Handle */}
              <PanelResizeHandle className="h-1 relative flex items-center justify-center bg-border hover:bg-primary/20 transition-colors cursor-row-resize">
                <Separator className="w-full" />
              </PanelResizeHandle>

              {/* Terminal Panel (Bottom) */}
              <Panel
                ref={terminalRef}
                defaultSize={30}
                minSize={20}
                className="flex flex-col"
                id="terminal"
              >
                <Terminal projectId={projectId} />
              </Panel>
            </PanelGroup>
          </AnimatedPanel>
        </Panel>

        {/* Horizontal Resize Handle 2 */}
        <ResizeHandle className="w-2 -mr-1 z-10 hover:cursor-col-resize" />

        {/* Right Panel: Preview */}
        <Panel
          ref={previewPanelRef}
          defaultSize={30}
          minSize={20}
          className="flex flex-col"
          id="preview"
        >
          <AnimatedPanel direction="right" className="flex flex-col h-full">
            <Preview url={previewUrl} />
          </AnimatedPanel>
        </Panel>
      </PanelGroup>
    </div>
  );
}
