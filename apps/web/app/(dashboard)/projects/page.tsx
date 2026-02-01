'use client'

import { useState } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { FolderGit2, Plus, Trash2, Clock, Search, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface Project {
  _id: Id<'projects'>
  _creationTime: number
  name: string
  description?: string
  createdAt: number
  lastOpenedAt: number
  repoUrl?: string
}

function CreateProjectDialog({
  onCreate,
}: {
  onCreate: (name: string, description?: string) => Promise<void>
}) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    setIsCreating(true)
    try {
      await onCreate(name.trim(), description.trim() || undefined)
      setOpen(false)
      setName('')
      setDescription('')
      toast.success('Project created successfully')
    } catch (error) {
      toast.error('Failed to create project', {
        description: error instanceof Error ? error.message : 'Unknown error',
      })
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2 rounded-none font-mono">
          <Plus className="h-4 w-4" />
          New Project
        </Button>
      </DialogTrigger>
      <DialogContent className="rounded-none sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="font-mono">Create New Project</DialogTitle>
          <DialogDescription>Start a new coding project with AI assistance.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label htmlFor="name" className="font-mono text-sm text-muted-foreground">
                Project Name
              </label>
              <Input
                id="name"
                placeholder="my-awesome-project"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
                className="rounded-none font-mono"
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="description" className="font-mono text-sm text-muted-foreground">
                Description (optional)
              </label>
              <Input
                id="description"
                placeholder="A brief description of your project"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="rounded-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="rounded-none"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim() || isCreating} className="rounded-none">
              {isCreating ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function ProjectRow({
  project,
  index,
  onDelete,
}: {
  project: Project
  index: number
  onDelete: (id: Id<'projects'>) => Promise<void>
}) {
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      await onDelete(project._id)
      toast.success('Project deleted')
    } catch {
      toast.error('Failed to delete project')
    } finally {
      setIsDeleting(false)
    }
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
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
        return minutes <= 1 ? 'Just now' : `${minutes}m ago`
      }
      return `${hours}h ago`
    } else if (days === 1) {
      return 'Yesterday'
    } else if (days < 7) {
      return `${days}d ago`
    } else {
      return formatDate(timestamp)
    }
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2, delay: index * 0.05 }}
    >
      <Link
        href={`/projects/${project._id}`}
        className={cn(
          'group -mx-4 flex items-center justify-between px-4 py-4',
          'border-b border-border',
          'transition-sharp hover:bg-secondary/50'
        )}
      >
        <div className="flex min-w-0 flex-1 items-center gap-4">
          {/* Number */}
          <span className="text-label w-8 shrink-0 text-primary">
            {String(index + 1).padStart(2, '0')}
          </span>

          {/* Icon */}
          <div className="flex h-8 w-8 shrink-0 items-center justify-center border border-border">
            <FolderGit2 className="h-4 w-4 text-primary" />
          </div>

          {/* Name & Description */}
          <div className="min-w-0 flex-1">
            <h3 className="truncate font-mono font-medium text-foreground">{project.name}</h3>
            {project.description && (
              <p className="truncate text-sm text-muted-foreground">{project.description}</p>
            )}
          </div>
        </div>

        {/* Meta */}
        <div className="flex shrink-0 items-center gap-6">
          <div className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>{formatRelativeTime(project.lastOpenedAt)}</span>
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-none text-muted-foreground opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              handleDelete()
            }}
            disabled={isDeleting}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>

          <ArrowRight className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-primary" />
        </div>
      </Link>
    </motion.div>
  )
}

export default function ProjectsPage() {
  const [searchQuery, setSearchQuery] = useState('')

  // Fetch projects from Convex
  const projects = useQuery(api.projects.list) as Project[] | undefined

  // Mutations
  const createProjectMutation = useMutation(api.projects.create)
  const deleteProjectMutation = useMutation(api.projects.remove)
  const updateProjectMutation = useMutation(api.projects.update)

  const handleCreateProject = async (name: string, description?: string) => {
    await createProjectMutation({ name, description })
  }

  const handleDeleteProject = async (id: Id<'projects'>) => {
    await deleteProjectMutation({ id })
  }

  const handleOpenProject = async (id: Id<'projects'>) => {
    // Update last opened timestamp
    await updateProjectMutation({
      id,
      lastOpenedAt: Date.now(),
    })
  }

  // Filter projects based on search query
  const filteredProjects = projects?.filter(
    (project) =>
      project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.description?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Sort by last opened (most recent first)
  const sortedProjects = filteredProjects?.sort((a, b) => b.lastOpenedAt - a.lastOpenedAt)

  const isLoading = projects === undefined

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      {/* Header */}
      <div className="mb-12 flex flex-col gap-6">
        <div className="flex items-center gap-3">
          <span className="h-px w-8 bg-primary" />
          <span className="text-label text-muted-foreground">Projects</span>
        </div>

        <div className="flex items-center justify-between">
          <h1 className="text-display text-4xl">Your Work</h1>
          <CreateProjectDialog onCreate={handleCreateProject} />
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-8">
        <Search className="absolute left-0 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search projects..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="rounded-none border-0 border-b border-border bg-transparent pl-7 font-mono focus-visible:border-primary focus-visible:ring-0"
        />
      </div>

      {/* Projects List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse bg-muted" />
          ))}
        </div>
      ) : sortedProjects && sortedProjects.length > 0 ? (
        <div>
          <AnimatePresence mode="popLayout">
            {sortedProjects.map((project, index) => (
              <div key={project._id} onClick={() => handleOpenProject(project._id)}>
                <ProjectRow project={project} index={index} onDelete={handleDeleteProject} />
              </div>
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-16 text-center"
        >
          <div className="mb-6 flex h-16 w-16 items-center justify-center border border-border">
            <FolderGit2 className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="mb-2 font-mono text-xl font-medium">
            {searchQuery ? 'No projects found' : 'No projects yet'}
          </h3>
          <p className="mb-8 max-w-sm text-muted-foreground">
            {searchQuery
              ? `No projects matching "${searchQuery}".`
              : 'Create your first project to start coding with AI.'}
          </p>
          {!searchQuery && <CreateProjectDialog onCreate={handleCreateProject} />}
        </motion.div>
      )}
    </div>
  )
}
