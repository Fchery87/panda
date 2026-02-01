'use client'

import React, { useState, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Folder,
  FolderOpen,
  FileText,
  FileCode,
  FileJson,
  FileImage,
  ChevronRight,
  Plus,
  Trash2,
  Edit2,
  File as FileIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'

// Get appropriate icon for file type
function getFileIcon(filename: string) {
  const ext = filename.split('.').pop()?.toLowerCase()
  switch (ext) {
    case 'ts':
    case 'tsx':
    case 'js':
    case 'jsx':
      return <FileCode className="h-4 w-4 text-primary" />
    case 'json':
      return <FileJson className="h-4 w-4 text-primary/70" />
    case 'md':
    case 'txt':
      return <FileText className="h-4 w-4 text-muted-foreground" />
    case 'png':
    case 'jpg':
    case 'jpeg':
    case 'gif':
    case 'svg':
      return <FileImage className="h-4 w-4 text-muted-foreground" />
    case 'css':
    case 'scss':
      return <FileCode className="h-4 w-4 text-muted-foreground" />
    default:
      return <FileIcon className="h-4 w-4 text-muted-foreground" />
  }
}

interface FileTreeNode {
  name: string
  path: string
  type: 'file' | 'directory'
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
function buildTree(files: FileTreeProps['files']): FileTreeNode[] {
  // Guard against undefined/null files
  if (!files || !Array.isArray(files) || files.length === 0) {
    return []
  }

  const root: FileTreeNode[] = []
  const nodeMap = new Map<string, FileTreeNode>()

  // Sort files by path
  const sortedFiles = [...files].sort((a, b) => a.path.localeCompare(b.path))

  for (const file of sortedFiles) {
    const parts = file.path.split('/')
    let currentPath = ''

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]
      const parentPath = currentPath
      currentPath = currentPath ? `${currentPath}/${part}` : part

      if (!nodeMap.has(currentPath)) {
        const isLastPart = i === parts.length - 1
        const node: FileTreeNode = {
          name: part,
          path: currentPath,
          type: isLastPart ? 'file' : 'directory',
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
      return a.type === 'directory' ? -1 : 1
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
  const isDirectory = node.type === 'directory'

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
      const parentPath = node.path.substring(0, node.path.lastIndexOf('/'))
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
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.15, delay: depth * 0.02 }}
            className={cn(
              'group relative flex cursor-pointer select-none items-center gap-1.5 px-2 py-1.5',
              'mx-1 rounded-md transition-all duration-150',
              isSelected
                ? 'bg-primary/10 text-foreground'
                : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground'
            )}
            style={{ paddingLeft: `${depth * 14 + 6}px` }}
            onClick={handleSelect}
          >
            {/* Left accent border for selected item */}
            {isSelected && (
              <motion.div
                layoutId="file-tree-selection"
                className="absolute bottom-1 left-0 top-1 w-0.5 rounded-full bg-primary"
                transition={{ duration: 0.15 }}
              />
            )}

            {isDirectory && (
              <button
                onClick={handleToggle}
                className="flex h-4 w-4 items-center justify-center rounded transition-colors hover:bg-primary/10"
              >
                <motion.div
                  animate={{ rotate: isExpanded ? 90 : 0 }}
                  transition={{ duration: 0.15 }}
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </motion.div>
              </button>
            )}

            {!isDirectory && <span className="w-4" />}

            {isDirectory ? (
              isExpanded ? (
                <FolderOpen className="h-4 w-4 text-primary" />
              ) : (
                <Folder className="h-4 w-4 text-primary/70" />
              )
            ) : (
              getFileIcon(node.name)
            )}

            {isRenaming ? (
              <form onSubmit={handleRenameSubmit} className="flex-1">
                <Input
                  autoFocus
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onBlur={handleRenameSubmit}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
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
                  'flex-1 truncate font-mono text-[13px]',
                  isSelected && 'font-medium text-foreground'
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
                <Plus className="mr-2 h-4 w-4" />
                New File
              </ContextMenuItem>
              <ContextMenuSeparator />
            </>
          )}
          <ContextMenuItem onClick={handleRename}>
            <Edit2 className="mr-2 h-4 w-4" />
            Rename
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem onClick={handleDelete} className="text-destructive">
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      <AnimatePresence initial={false}>
        {isDirectory && isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
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
  const [value, setValue] = useState('')

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
      <FileIcon className="h-4 w-4 text-muted-foreground" />
      <Input
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={handleSubmit}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            onCancel()
          }
        }}
        placeholder="filename.ext"
        className="h-6 flex-1 py-0 text-sm"
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
      const parts = selectedPath.split('/')
      let currentPath = ''
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
      <div className="flex flex-col items-center justify-center px-4 py-8 text-center">
        <Folder className="mb-3 h-10 w-10 text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground">No files yet</p>
        <p className="mt-1 text-xs text-muted-foreground/60">Right-click to create one</p>
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
