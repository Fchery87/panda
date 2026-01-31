"use client"

import React, { useState, useCallback, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Folder, FolderOpen, File, ChevronRight, ChevronDown, Plus, Trash2, Edit2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"

interface FileTreeNode {
  name: string
  path: string
  type: "file" | "directory"
  children: FileTreeNode[]
  isBinary: boolean
  updatedAt: number
}

interface FileTreeProps {
  files: Array<{
    _id: string
    path: string
    content: string
    isBinary: boolean
    updatedAt: number
  }>
  selectedPath: string | null
  onSelect: (path: string) => void
  onCreate: (path: string) => void
  onRename: (oldPath: string, newPath: string) => void
  onDelete: (path: string) => void
}

// Build tree structure from flat file list
function buildTree(files: FileTreeProps["files"]): FileTreeNode[] {
  const root: FileTreeNode[] = []
  const nodeMap = new Map<string, FileTreeNode>()

  // Sort files by path
  const sortedFiles = [...files].sort((a, b) => a.path.localeCompare(b.path))

  for (const file of sortedFiles) {
    const parts = file.path.split("/")
    let currentPath = ""

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]
      const parentPath = currentPath
      currentPath = currentPath ? `${currentPath}/${part}` : part

      if (!nodeMap.has(currentPath)) {
        const isLastPart = i === parts.length - 1
        const node: FileTreeNode = {
          name: part,
          path: currentPath,
          type: isLastPart ? "file" : "directory",
          children: [],
          isBinary: isLastPart ? file.isBinary : false,
          updatedAt: isLastPart ? file.updatedAt : 0,
        }
        nodeMap.set(currentPath, node)

        if (parentPath) {
          const parent = nodeMap.get(parentPath)
          if (parent) {
            parent.children.push(node)
          }
        } else {
          root.push(node)
        }
      }
    }
  }

  // Sort directories first, then files alphabetically
  const sortNodes = (nodes: FileTreeNode[]) => {
    nodes.sort((a, b) => {
      if (a.type === b.type) {
        return a.name.localeCompare(b.name)
      }
      return a.type === "directory" ? -1 : 1
    })
    nodes.forEach((node) => {
      if (node.children.length > 0) {
        sortNodes(node.children)
      }
    })
  }
  sortNodes(root)

  return root
}

// Tree item component
interface TreeItemProps {
  node: FileTreeNode
  selectedPath: string | null
  expandedPaths: Set<string>
  onToggle: (path: string) => void
  onSelect: (path: string) => void
  onCreate: (path: string) => void
  onRename: (oldPath: string, newPath: string) => void
  onDelete: (path: string) => void
  depth: number
}

function TreeItem({
  node,
  selectedPath,
  expandedPaths,
  onToggle,
  onSelect,
  onCreate,
  onRename,
  onDelete,
  depth,
}: TreeItemProps) {
  const [isRenaming, setIsRenaming] = useState(false)
  const [renameValue, setRenameValue] = useState(node.name)
  const isExpanded = expandedPaths.has(node.path)
  const isSelected = selectedPath === node.path
  const isDirectory = node.type === "directory"

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (isDirectory) {
      onToggle(node.path)
    }
  }

  const handleSelect = () => {
    if (!isRenaming) {
      onSelect(node.path)
    }
  }

  const handleRenameSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (renameValue && renameValue !== node.name) {
      const parentPath = node.path.substring(0, node.path.lastIndexOf("/"))
      const newPath = parentPath ? `${parentPath}/${renameValue}` : renameValue
      onRename(node.path, newPath)
    }
    setIsRenaming(false)
  }

  const handleCreateFile = () => {
    if (isDirectory) {
      onCreate(node.path)
    }
  }

  const handleDelete = () => {
    onDelete(node.path)
  }

  const handleRename = () => {
    setIsRenaming(true)
    setRenameValue(node.name)
  }

  return (
    <div>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2, delay: depth * 0.05 }}
            className={cn(
              "group flex items-center gap-1 px-2 py-1.5 cursor-pointer select-none rounded-md transition-colors",
              isSelected
                ? "bg-primary/10 text-primary"
                : "hover:bg-accent hover:text-accent-foreground"
            )}
            style={{ paddingLeft: `${depth * 12 + 8}px` }}
            onClick={handleSelect}
          >
            {isDirectory && (
              <button
                onClick={handleToggle}
                className="flex items-center justify-center w-4 h-4 rounded hover:bg-accent/50 transition-colors"
              >
                {isExpanded ? (
                  <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                )}
              </button>
            )}

            {!isDirectory && <span className="w-4" />}

            {isDirectory ? (
              isExpanded ? (
                <FolderOpen className="w-4 h-4 text-primary/80" />
              ) : (
                <Folder className="w-4 h-4 text-primary/80" />
              )
            ) : (
              <File className="w-4 h-4 text-muted-foreground" />
            )}

            {isRenaming ? (
              <form onSubmit={handleRenameSubmit} className="flex-1">
                <Input
                  autoFocus
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onBlur={handleRenameSubmit}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") {
                      setIsRenaming(false)
                      setRenameValue(node.name)
                    }
                  }}
                  className="h-6 py-0 text-sm"
                  onClick={(e) => e.stopPropagation()}
                />
              </form>
            ) : (
              <span
                className={cn(
                  "flex-1 text-sm truncate",
                  isSelected && "font-medium"
                )}
              >
                {node.name}
              </span>
            )}
          </motion.div>
        </ContextMenuTrigger>

        <ContextMenuContent>
          {isDirectory && (
            <>
              <ContextMenuItem onClick={handleCreateFile}>
                <Plus className="w-4 h-4 mr-2" />
                New File
              </ContextMenuItem>
              <ContextMenuSeparator />
            </>
          )}
          <ContextMenuItem onClick={handleRename}>
            <Edit2 className="w-4 h-4 mr-2" />
            Rename
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem onClick={handleDelete} className="text-destructive">
            <Trash2 className="w-4 h-4 mr-2" />
            Delete
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      <AnimatePresence initial={false}>
        {isDirectory && isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden"
          >
            {node.children.map((child) => (
              <TreeItem
                key={child.path}
                node={child}
                selectedPath={selectedPath}
                expandedPaths={expandedPaths}
                onToggle={onToggle}
                onSelect={onSelect}
                onCreate={onCreate}
                onRename={onRename}
                onDelete={onDelete}
                depth={depth + 1}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// New file input component
interface NewFileInputProps {
  parentPath: string
  onSubmit: (path: string) => void
  onCancel: () => void
  depth: number
}

function NewFileInput({ parentPath, onSubmit, onCancel, depth }: NewFileInputProps) {
  const [value, setValue] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (value.trim()) {
      const fullPath = parentPath ? `${parentPath}/${value.trim()}` : value.trim()
      onSubmit(fullPath)
    }
    onCancel()
  }

  return (
    <motion.form
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -10 }}
      transition={{ duration: 0.15 }}
      onSubmit={handleSubmit}
      className="flex items-center gap-1 px-2 py-1.5"
      style={{ paddingLeft: `${depth * 12 + 24}px` }}
    >
      <File className="w-4 h-4 text-muted-foreground" />
      <Input
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={handleSubmit}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            onCancel()
          }
        }}
        placeholder="filename.ext"
        className="h-6 py-0 text-sm flex-1"
      />
    </motion.form>
  )
}

// Main FileTree component
export function FileTree({
  files,
  selectedPath,
  onSelect,
  onCreate,
  onRename,
  onDelete,
}: FileTreeProps) {
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set())
  const [newFileParent, setNewFileParent] = useState<string | null>(null)

  const tree = useMemo(() => buildTree(files), [files])

  const handleToggle = useCallback((path: string) => {
    setExpandedPaths((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(path)) {
        newSet.delete(path)
      } else {
        newSet.add(path)
      }
      return newSet
    })
  }, [])

  const handleCreate = useCallback(
    (parentPath: string) => {
      setNewFileParent(parentPath)
      // Auto-expand the parent directory
      setExpandedPaths((prev) => new Set(prev).add(parentPath))
    },
    [setExpandedPaths]
  )

  const handleCreateSubmit = useCallback(
    (path: string) => {
      onCreate(path)
      setNewFileParent(null)
    },
    [onCreate]
  )

  // Auto-expand directories containing the selected file
  React.useEffect(() => {
    if (selectedPath) {
      const parts = selectedPath.split("/")
      let currentPath = ""
      const pathsToExpand = new Set<string>()

      for (let i = 0; i < parts.length - 1; i++) {
        currentPath = currentPath ? `${currentPath}/${parts[i]}` : parts[i]
        pathsToExpand.add(currentPath)
      }

      setExpandedPaths((prev) => new Set(Array.from(prev).concat(Array.from(pathsToExpand))))
    }
  }, [selectedPath])

  if (tree.length === 0) {
    return (
      <div className="p-4 text-sm text-muted-foreground text-center">
        No files yet. Right-click to create one.
      </div>
    )
  }

  return (
    <div className="py-2">
      {tree.map((node) => (
        <div key={node.path}>
          <TreeItem
            node={node}
            selectedPath={selectedPath}
            expandedPaths={expandedPaths}
            onToggle={handleToggle}
            onSelect={onSelect}
            onCreate={handleCreate}
            onRename={onRename}
            onDelete={onDelete}
            depth={0}
          />
          {newFileParent === node.path && (
            <NewFileInput
              parentPath={newFileParent}
              onSubmit={handleCreateSubmit}
              onCancel={() => setNewFileParent(null)}
              depth={1}
            />
          )}
        </div>
      ))}
    </div>
  )
}
