"use client"

import { useState, useCallback, useEffect } from "react"
import { useParams } from "next/navigation"
import { useQuery, useMutation } from "convex/react"
import { api } from "@convex/_generated/api"
import type { Id } from "@convex/_generated/dataModel"
import { motion } from "framer-motion"
import { toast } from "sonner"
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels"
import { useMediaQuery } from "@/hooks/useMediaQuery"

// Components
import { Workbench } from "@/components/workbench/Workbench"
import { ChatContainer } from "@/components/chat/ChatContainer"
import { ArtifactPanel } from "@/components/artifacts/ArtifactPanel"
import { Button } from "@/components/ui/button"
import { MessageSquare, PanelLeft, PanelRight, X, ChevronLeft } from "lucide-react"
import Link from "next/link"

// Hooks
import { useJobs } from "@/hooks/useJobs"
import { useStreamingChat } from "@/hooks/useStreamingChat"
import type { Message } from "@/components/chat/types"

interface File {
  _id: Id<"files">
  _creationTime: number
  projectId: Id<"projects">
  path: string
  content: string
  isBinary: boolean
  updatedAt: number
}

interface Chat {
  _id: Id<"chats">
  _creationTime: number
  projectId: Id<"projects">
  title?: string
  mode: "discuss" | "build"
  createdAt: number
  updatedAt: number
}

interface ConvexMessage {
  _id: Id<"messages">
  _creationTime: number
  chatId: Id<"chats">
  role: "user" | "assistant"
  content: string
  createdAt: number
}

export default function ProjectPage() {
  const params = useParams()
  const projectId = params.projectId as Id<"projects">

  // UI State
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [isArtifactPanelOpen, setIsArtifactPanelOpen] = useState(false)
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null)
  const isMobile = useMediaQuery("(max-width: 768px)")

  // Fetch project data
  const project = useQuery(api.projects.get, { id: projectId })

  // Fetch files
  const files = useQuery(api.files.list, { projectId }) as File[] | undefined

  // Fetch chats
  const chats = useQuery(api.chats.list, { projectId }) as Chat[] | undefined

  // Get or create default chat
  const [activeChat, setActiveChat] = useState<Chat | null>(null)

  useEffect(() => {
    if (chats && chats.length > 0 && !activeChat) {
      setActiveChat(chats[0])
    }
  }, [chats, activeChat])

  // Fetch messages for active chat
  const convexMessages = useQuery(
    api.messages.list,
    activeChat ? { chatId: activeChat._id } : "skip"
  ) as ConvexMessage[] | undefined

  // Convert Convex messages to chat format
  const chatMessages: Message[] = convexMessages?.map((msg) => ({
    _id: msg._id,
    role: msg.role,
    content: msg.content,
    createdAt: msg.createdAt,
  })) || []

  // Jobs (Terminal)
  const {
    jobs,
    latestRunningJob,
    streamingLogs,
    createAndExecute,
    isAnyJobRunning,
  } = useJobs(projectId)

  // File mutations
  const upsertFileMutation = useMutation(api.files.upsert)
  const deleteFileMutation = useMutation(api.files.remove)

  // Chat mutations
  const createChatMutation = useMutation(api.chats.create)
  const addMessageMutation = useMutation(api.messages.add)

  // Update project last opened
  const updateProjectMutation = useMutation(api.projects.update)

  // Update last opened on mount
  useEffect(() => {
    if (projectId) {
      updateProjectMutation({
        id: projectId,
        lastOpenedAt: Date.now(),
      }).catch(console.error)
    }
  }, [projectId, updateProjectMutation])

  // File operations
  const handleFileSelect = useCallback((path: string) => {
    setSelectedFilePath(path)
  }, [])

  const handleFileCreate = useCallback(
    async (path: string) => {
      try {
        await upsertFileMutation({
          projectId,
          path,
          content: "",
          isBinary: false,
        })
        toast.success(`Created ${path}`)
        setSelectedFilePath(path)
      } catch (error) {
        toast.error("Failed to create file", {
          description: error instanceof Error ? error.message : "Unknown error",
        })
      }
    },
    [projectId, upsertFileMutation]
  )

  const handleFileRename = useCallback(
    async (oldPath: string, newPath: string) => {
      try {
        const file = files?.find((f) => f.path === oldPath)
        if (!file) {
          toast.error("File not found")
          return
        }

        // Create new file with same content
        await upsertFileMutation({
          projectId,
          path: newPath,
          content: file.content,
          isBinary: file.isBinary,
        })

        // Delete old file
        await deleteFileMutation({ id: file._id })

        toast.success(`Renamed to ${newPath}`)
        if (selectedFilePath === oldPath) {
          setSelectedFilePath(newPath)
        }
      } catch (error) {
        toast.error("Failed to rename file", {
          description: error instanceof Error ? error.message : "Unknown error",
        })
      }
    },
    [files, projectId, upsertFileMutation, deleteFileMutation, selectedFilePath]
  )

  const handleFileDelete = useCallback(
    async (path: string) => {
      try {
        const file = files?.find((f) => f.path === path)
        if (!file) {
          toast.error("File not found")
          return
        }

        await deleteFileMutation({ id: file._id })
        toast.success(`Deleted ${path}`)

        if (selectedFilePath === path) {
          setSelectedFilePath(null)
        }
      } catch (error) {
        toast.error("Failed to delete file", {
          description: error instanceof Error ? error.message : "Unknown error",
        })
      }
    },
    [files, projectId, deleteFileMutation, selectedFilePath]
  )

  const handleEditorSave = useCallback(
    async (content: string) => {
      if (!selectedFilePath) return

      try {
        const file = files?.find((f) => f.path === selectedFilePath)
        await upsertFileMutation({
          id: file?._id,
          projectId,
          path: selectedFilePath,
          content,
          isBinary: false,
        })
        toast.success(`Saved ${selectedFilePath}`)
      } catch (error) {
        toast.error("Failed to save file", {
          description: error instanceof Error ? error.message : "Unknown error",
        })
      }
    },
    [selectedFilePath, files, projectId, upsertFileMutation]
  )

  // Chat operations
  const handleSendMessage = useCallback(
    async (content: string, mode: "discuss" | "build") => {
      if (!activeChat) {
        // Create new chat if none exists
        try {
          const chatId = await createChatMutation({
            projectId,
            title: content.slice(0, 50),
            mode,
          })
          toast.success("Chat created")
        } catch (error) {
          toast.error("Failed to create chat")
        }
        return
      }

      try {
        await addMessageMutation({
          chatId: activeChat._id,
          role: "user",
          content,
        })
      } catch (error) {
        toast.error("Failed to send message")
      }
    },
    [activeChat, projectId, createChatMutation, addMessageMutation]
  )

  // Get selected file content
  const selectedFile = files?.find((f) => f.path === selectedFilePath)

  // Loading state
  if (!project || !files) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-background">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center space-y-4"
        >
          <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground">Loading project...</p>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="h-screen w-full bg-background overflow-hidden flex flex-col">
      {/* Top Bar */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="h-12 border-b bg-card flex items-center px-4 justify-between shrink-0"
      >
        <div className="flex items-center gap-4">
          <Link href="/projects">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm">{project.name}</span>
            {isAnyJobRunning && (
              <span className="flex h-2 w-2 rounded-full bg-yellow-500 animate-pulse" />
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={isChatOpen ? "secondary" : "ghost"}
            size="sm"
            className="gap-2"
            onClick={() => setIsChatOpen(!isChatOpen)}
          >
            <MessageSquare className="h-4 w-4" />
            <span className="hidden sm:inline">Chat</span>
          </Button>

          <Button
            variant={isArtifactPanelOpen ? "secondary" : "ghost"}
            size="sm"
            className="gap-2"
            onClick={() => setIsArtifactPanelOpen(!isArtifactPanelOpen)}
          >
            <PanelRight className="h-4 w-4" />
            <span className="hidden sm:inline">Artifacts</span>
          </Button>
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden relative">
        <PanelGroup direction="horizontal" className="h-full">
          {/* Workbench Panel */}
          <Panel
            defaultSize={isChatOpen ? 70 : 100}
            minSize={40}
            className="flex flex-col"
          >
            <Workbench
              files={files || []}
              selectedPath={selectedFilePath}
              onFileSelect={handleFileSelect}
              onFileCreate={handleFileCreate}
              onFileRename={handleFileRename}
              onFileDelete={handleFileDelete}
              editorFilePath={selectedFilePath}
              editorContent={selectedFile?.content || ""}
              onEditorSave={handleEditorSave}
              projectId={projectId}
            />
          </Panel>

          {/* Resize Handle */}
          {isChatOpen && (
            <PanelResizeHandle className="w-1 bg-border hover:bg-primary/20 transition-colors" />
          )}

          {/* Chat Panel */}
          {isChatOpen && (
            <Panel defaultSize={30} minSize={25} maxSize={50} className="flex flex-col">
              <div className="h-full flex flex-col border-l bg-background">
                {/* Chat Header */}
                <div className="h-12 border-b flex items-center justify-between px-4">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-primary" />
                    <span className="font-medium text-sm">AI Assistant</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setIsChatOpen(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                {/* Chat Content */}
                <div className="flex-1 overflow-hidden">
                  <ChatContainer
                    projectId={projectId}
                    isOpen={true}
                    messages={chatMessages}
                    isStreaming={false}
                    onSendMessage={handleSendMessage}
                  />
                </div>
              </div>
            </Panel>
          )}
        </PanelGroup>

        {/* Floating Chat Toggle (when closed) */}
        {!isChatOpen && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="absolute bottom-4 right-4 z-50"
          >
            <Button
              onClick={() => setIsChatOpen(true)}
              size="icon"
              className="h-12 w-12 rounded-full shadow-lg"
            >
              <MessageSquare className="h-5 w-5" />
            </Button>
          </motion.div>
        )}

        {/* Floating Artifact Panel */}
        {isArtifactPanelOpen && (
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 50 }}
            className="absolute right-4 top-4 bottom-4 z-40"
          >
            <ArtifactPanel
              isOpen={true}
              onClose={() => setIsArtifactPanelOpen(false)}
              position="floating"
            />
          </motion.div>
        )}

        {/* Artifact Toggle (when floating panel is closed) */}
        {!isArtifactPanelOpen && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="absolute top-4 right-4 z-30"
          >
            <Button
              onClick={() => setIsArtifactPanelOpen(true)}
              variant="outline"
              size="sm"
              className="gap-2 shadow-sm"
            >
              <PanelRight className="h-4 w-4" />
              Artifacts
            </Button>
          </motion.div>
        )}
      </div>
    </div>
  )
}
