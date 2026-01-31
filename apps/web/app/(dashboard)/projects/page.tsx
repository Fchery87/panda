"use client"

import { useState } from "react"
import { useQuery, useMutation } from "convex/react"
import { api } from "@convex/_generated/api"
import type { Id } from "@convex/_generated/dataModel"
import { motion, AnimatePresence } from "framer-motion"
import Link from "next/link"
import { 
  FolderGit2, 
  Plus, 
  Trash2, 
  Clock,
  Search,
  ArrowRight,
  Sparkles
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface Project {
  _id: Id<"projects">
  _creationTime: number
  name: string
  description?: string
  createdAt: number
  lastOpenedAt: number
  repoUrl?: string
}

function CreateProjectDialog({ onCreate }: { onCreate: (name: string, description?: string) => Promise<void> }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [isCreating, setIsCreating] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    setIsCreating(true)
    try {
      await onCreate(name.trim(), description.trim() || undefined)
      setOpen(false)
      setName("")
      setDescription("")
      toast.success("Project created successfully")
    } catch (error) {
      toast.error("Failed to create project", {
        description: error instanceof Error ? error.message : "Unknown error",
      })
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          New Project
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Project</DialogTitle>
          <DialogDescription>
            Start a new coding project with AI assistance.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label htmlFor="name" className="text-sm font-medium">
                Project Name
              </label>
              <Input
                id="name"
                placeholder="My Awesome Project"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="description" className="text-sm font-medium">
                Description (optional)
              </label>
              <Input
                id="description"
                placeholder="A brief description of your project"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim() || isCreating}>
              {isCreating ? "Creating..." : "Create Project"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function ProjectCard({ 
  project, 
  onDelete 
}: { 
  project: Project
  onDelete: (id: Id<"projects">) => Promise<void>
}) {
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      await onDelete(project._id)
      toast.success("Project deleted")
    } catch (error) {
      toast.error("Failed to delete project")
    } finally {
      setIsDeleting(false)
    }
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  const formatRelativeTime = (timestamp: number) => {
    const now = Date.now()
    const diff = now - timestamp
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    
    if (days === 0) {
      const hours = Math.floor(diff / (1000 * 60 * 60))
      if (hours === 0) {
        const minutes = Math.floor(diff / (1000 * 60))
        return minutes <= 1 ? "Just now" : `${minutes} minutes ago`
      }
      return hours === 1 ? "1 hour ago" : `${hours} hours ago`
    } else if (days === 1) {
      return "Yesterday"
    } else if (days < 7) {
      return `${days} days ago`
    } else if (days < 30) {
      const weeks = Math.floor(days / 7)
      return weeks === 1 ? "1 week ago" : `${weeks} weeks ago`
    } else {
      return formatDate(timestamp)
    }
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
    >
      <Card className="group relative overflow-hidden hover:shadow-lg transition-all duration-300 hover:border-primary/50">
        <Link href={`/projects/${project._id}`} className="absolute inset-0" />
        
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500/20 to-teal-600/20 border border-emerald-500/30 shrink-0">
                <FolderGit2 className="h-5 w-5 text-emerald-600" />
              </div>
              <div className="min-w-0 flex-1">
                <CardTitle className="text-lg font-semibold truncate">
                  {project.name}
                </CardTitle>
                <CardDescription className="truncate">
                  {project.description || "No description"}
                </CardDescription>
              </div>
            </div>
            
            <Button
              variant="ghost"
              size="icon"
              className="relative z-10 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                handleDelete()
              }}
              disabled={isDeleting}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              <span>Last opened {formatRelativeTime(project.lastOpenedAt)}</span>
            </div>
          </div>
          
          <div className="mt-4 flex items-center justify-between">
            <div className="text-xs text-muted-foreground">
              Created {formatDate(project.createdAt)}
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              className="gap-1 text-primary relative z-10"
              asChild
            >
              <Link href={`/projects/${project._id}`}>
                Open
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

export default function ProjectsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  
  // Fetch projects from Convex
  const projects = useQuery(api.projects.list) as Project[] | undefined
  
  // Mutations
  const createProjectMutation = useMutation(api.projects.create)
  const deleteProjectMutation = useMutation(api.projects.remove)
  const updateProjectMutation = useMutation(api.projects.update)

  const handleCreateProject = async (name: string, description?: string) => {
    await createProjectMutation({ name, description })
  }

  const handleDeleteProject = async (id: Id<"projects">) => {
    await deleteProjectMutation({ id })
  }

  const handleOpenProject = async (id: Id<"projects">) => {
    // Update last opened timestamp
    await updateProjectMutation({
      id,
      lastOpenedAt: Date.now(),
    })
  }

  // Filter projects based on search query
  const filteredProjects = projects?.filter((project) =>
    project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    project.description?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Sort by last opened (most recent first)
  const sortedProjects = filteredProjects?.sort(
    (a, b) => b.lastOpenedAt - a.lastOpenedAt
  )

  const isLoading = projects === undefined

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
          <p className="text-muted-foreground">
            Manage your coding projects and collaborate with AI
          </p>
        </div>
        <CreateProjectDialog onCreate={handleCreateProject} />
      </div>

      {/* Search */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search projects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Projects Grid */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="h-[200px] animate-pulse bg-muted" />
          ))}
        </div>
      ) : sortedProjects && sortedProjects.length > 0 ? (
        <motion.div 
          layout
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          <AnimatePresence mode="popLayout">
            {sortedProjects.map((project) => (
              <div key={project._id} onClick={() => handleOpenProject(project._id)}>
                <ProjectCard 
                  project={project} 
                  onDelete={handleDeleteProject}
                />
              </div>
            ))}
          </AnimatePresence>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-16 text-center"
        >
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500/10 to-teal-600/10 mb-6">
            <Sparkles className="h-10 w-10 text-emerald-600/60" />
          </div>
          <h3 className="text-xl font-semibold mb-2">
            {searchQuery ? "No projects found" : "No projects yet"}
          </h3>
          <p className="text-muted-foreground max-w-md mb-6">
            {searchQuery
              ? `No projects matching "${searchQuery}". Try a different search term.`
              : "Create your first project to start coding with AI assistance."}
          </p>
          {!searchQuery && (
            <CreateProjectDialog onCreate={handleCreateProject} />
          )}
        </motion.div>
      )}
    </div>
  )
}
