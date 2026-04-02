'use client'

import { useState } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FolderGit2, Plus, Trash2, Clock, Search, ArrowRight } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
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
import {
  getCreateProjectErrorDisplay,
  type CreateProjectErrorDisplay,
} from './create-project-errors'

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
  const [submitError, setSubmitError] = useState<CreateProjectErrorDisplay | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    setIsCreating(true)
    setSubmitError(null)
    try {
      await onCreate(name.trim(), description.trim() || undefined)
      setOpen(false)
      setName('')
      setDescription('')
      setSubmitError(null)
      toast.success('Project created successfully')
    } catch (error) {
      const display = getCreateProjectErrorDisplay(error)
      setSubmitError(display)
      toast.error(display.title, {
        description: display.description,
      })
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen)
        if (!nextOpen) {
          setSubmitError(null)
        }
      }}
    >
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
            {submitError ? (
              <Alert variant="destructive" className="rounded-none border">
                <AlertTitle className="font-mono text-xs uppercase tracking-[0.18em]">
                  {submitError.title}
                </AlertTitle>
                <AlertDescription className="space-y-1 font-mono text-xs">
                  <p>{submitError.description}</p>
                  {submitError.recoveryHint ? <p>{submitError.recoveryHint}</p> : null}
                </AlertDescription>
              </Alert>
            ) : null}
            <div className="grid gap-2">
              <label htmlFor="name" className="font-mono text-sm text-muted-foreground">
                Project Name
              </label>
              <Input
                id="name"
                placeholder="my-awesome-project"
                value={name}
                onChange={(e) => {
                  setName(e.target.value)
                  if (submitError) setSubmitError(null)
                }}
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
                onChange={(e) => {
                  setDescription(e.target.value)
                  if (submitError) setSubmitError(null)
                }}
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
  onRecordOpen,
  onNavigate,
}: {
  project: Project
  index: number
  onDelete: (id: Id<'projects'>) => Promise<void>
  onRecordOpen: (id: Id<'projects'>) => Promise<void>
  onNavigate: (id: Id<'projects'>, href: string) => Promise<void>
}) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const projectHref = `/projects/${project._id}`

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      await onDelete(project._id)
      setIsDeleteDialogOpen(false)
      toast.success('Project deleted')
    } catch (error) {
      void error
      toast.error('Failed to delete project')
    } finally {
      setIsDeleting(false)
    }
  }

  const shouldRecordOpenOnMouseDown = (event: React.MouseEvent<HTMLAnchorElement>) => {
    return (
      event.button === 1 ||
      (event.button === 0 && (event.metaKey || event.altKey || event.ctrlKey || event.shiftKey))
    )
  }

  const handleMouseDownCapture = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (!shouldRecordOpenOnMouseDown(event)) {
      return
    }

    void onRecordOpen(project._id).catch(() => {
      toast.error('Failed to update project recency')
    })
  }

  const handleOpen = async (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (event.button !== 0 || event.metaKey || event.altKey || event.ctrlKey || event.shiftKey) {
      return
    }

    event.preventDefault()
    await onNavigate(project._id, projectHref)
  }

  const handleDeleteRequest = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
    event.stopPropagation()
    setIsDeleteDialogOpen(true)
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
      <div
        className={cn(
          'group -mx-4 flex items-center justify-between px-4 py-4',
          'border-b border-border',
          'transition-sharp hover:bg-secondary/50'
        )}
      >
        <Link
          href={projectHref}
          onClick={handleOpen}
          onMouseDownCapture={handleMouseDownCapture}
          className="flex min-w-0 flex-1 items-center gap-4"
        >
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
        </Link>

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
            aria-label={`Delete ${project.name}`}
            onClick={handleDeleteRequest}
            disabled={isDeleting}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>

          <ArrowRight className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-primary" />
        </div>
      </div>
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="rounded-none sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="font-mono">Delete project?</DialogTitle>
            <DialogDescription>
              Delete <span className="font-mono text-foreground">{project.name}</span>? This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="rounded-none"
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="rounded-none"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Delete project'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}

export default function ProjectsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const router = useRouter()

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

  const handleProjectNavigate = async (id: Id<'projects'>, href: string) => {
    try {
      await handleOpenProject(id)
    } catch (error) {
      void error
      toast.error('Failed to update project recency')
    } finally {
      router.push(href)
    }
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
      <div className="mb-8 grid gap-2">
        <label
          htmlFor="project-search"
          className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground"
        >
          Search projects
        </label>
        <div className="relative">
          <Search className="absolute left-0 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="project-search"
            placeholder="Search projects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="rounded-none border-0 border-b border-border bg-transparent pl-7 font-mono focus-visible:border-primary focus-visible:ring-0"
          />
        </div>
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
              <ProjectRow
                key={project._id}
                project={project}
                index={index}
                onDelete={handleDeleteProject}
                onRecordOpen={handleOpenProject}
                onNavigate={handleProjectNavigate}
              />
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
