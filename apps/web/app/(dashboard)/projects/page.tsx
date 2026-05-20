'use client'

import { useEffect, useState } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FolderGit2, Plus, Trash2, Clock, Search, ArrowRight } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  AuthenticatedModeStrip,
  AuthenticatedPageShell,
} from '@/components/layout/AuthenticatedPageShell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  GitHubRepositoryPicker,
  type GitHubRepositorySelection,
} from '@/components/github/GitHubRepositoryPicker'
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
}

function CreateProjectDialog({
  onCreate,
  showTrigger = true,
  listenForCreateEvent = false,
}: {
  onCreate: (
    name: string,
    description?: string,
    repository?: GitHubRepositorySelection | null
  ) => Promise<void>
  showTrigger?: boolean
  listenForCreateEvent?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [repository, setRepository] = useState<GitHubRepositorySelection | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [submitError, setSubmitError] = useState<CreateProjectErrorDisplay | null>(null)

  useEffect(() => {
    if (!listenForCreateEvent) {
      return
    }

    const handleCreateProjectRequest = () => {
      setOpen(true)
    }

    window.addEventListener('panda:create-project', handleCreateProjectRequest)
    return () => {
      window.removeEventListener('panda:create-project', handleCreateProjectRequest)
    }
  }, [listenForCreateEvent])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    setIsCreating(true)
    setSubmitError(null)
    try {
      await onCreate(name.trim(), description.trim() || undefined, repository)
      setOpen(false)
      setName('')
      setDescription('')
      setRepository(null)
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
      {showTrigger ? (
        <DialogTrigger asChild>
          <Button className="gap-2 rounded-none font-mono">
            <Plus size={16} />
            New Project
          </Button>
        </DialogTrigger>
      ) : null}
      <DialogContent className="rounded-none sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="font-mono">Create New Project</DialogTitle>
          <DialogDescription>Start a new coding project with AI assistance.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {submitError ? (
              <Alert variant="destructive" className="rounded-none border">
                <AlertTitle className="font-mono text-xs uppercase tracking-[0.06em]">
                  {submitError.title}
                </AlertTitle>
                <AlertDescription className="space-y-1 font-mono text-xs">
                  <p>{submitError.description}</p>
                  {submitError.recoveryHint ? <p>{submitError.recoveryHint}</p> : null}
                </AlertDescription>
              </Alert>
            ) : null}
            <div className="grid gap-2">
              <label
                htmlFor="name"
                className="font-mono text-xs uppercase tracking-[0.06em] text-muted-foreground"
              >
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
              <label
                htmlFor="description"
                className="font-mono text-xs uppercase tracking-[0.06em] text-muted-foreground"
              >
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
            <GitHubRepositoryPicker
              value={repository}
              onChange={setRepository}
              disabled={isCreating}
            />
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
          'group flex items-center justify-between px-5 py-5',
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
          <span className="w-8 shrink-0 font-mono text-xs font-medium tracking-[0.06em] text-primary">
            {String(index + 1).padStart(2, '0')}
          </span>

          {/* Icon */}
          <div className="flex h-9 w-9 shrink-0 items-center justify-center border border-border">
            <FolderGit2 size={16} className="text-primary" />
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
          <div className="flex items-center gap-2 font-mono text-xs tracking-[0.04em] text-muted-foreground">
            <Clock size={12} />
            <span>{formatRelativeTime(project.lastOpenedAt)}</span>
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="hover:bg-destructive/10 h-7 w-7 rounded-none text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
            aria-label={`Delete ${project.name}`}
            onClick={handleDeleteRequest}
            disabled={isDeleting}
          >
            <Trash2 size={14} />
          </Button>

          <ArrowRight
            size={16}
            className="text-muted-foreground transition-colors group-hover:text-primary"
          />
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
  const createGitHubProjectMutation = useMutation(api.projects.createFromGitHubRepository)
  const deleteProjectMutation = useMutation(api.projects.remove)
  const updateProjectMutation = useMutation(api.projects.update)

  const handleCreateProject = async (
    name: string,
    description?: string,
    repository?: GitHubRepositorySelection | null
  ) => {
    if (repository) {
      await createGitHubProjectMutation({
        name,
        description,
        repository,
        initialFiles: [
          {
            path: '.panda/github-repository.md',
            content: `# ${repository.fullName}\n\nOpened from ${repository.htmlUrl}.\n\nInitial GitHub file sync will replace this metadata note when repository content import is configured.\n`,
          },
        ],
      })
      return
    }

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

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('create') === '1') {
      window.dispatchEvent(new Event('panda:create-project'))
      router.replace('/projects', { scroll: false })
    }
  }, [router])

  return (
    <AuthenticatedPageShell
      hideHeader
      eyebrow="Project command center"
      title="Projects"
      description="Each project is a recoverable workspace with files, chat direction, plan review, runs, and changed work kept in one browser shell."
      action={<CreateProjectDialog onCreate={handleCreateProject} />}
      status={
        <span className="flex items-center gap-2">
          <span className="h-2 w-2 border border-foreground bg-primary" />
          {isLoading ? 'Loading' : `${projects?.length ?? 0} workspaces`}
        </span>
      }
      subHeader={
        <AuthenticatedModeStrip
          items={[
            { label: 'Ask', value: 'orient' },
            { label: 'Plan', value: 'review' },
            { label: 'Code', value: 'change' },
            { label: 'Build', value: 'proof', active: true },
          ]}
        />
      }
      contentClassName="lg:p-0"
    >
      <CreateProjectDialog
        onCreate={handleCreateProject}
        showTrigger={false}
        listenForCreateEvent
      />
      <div className="grid gap-px bg-border lg:grid-cols-[minmax(0,0.74fr)_minmax(360px,0.26fr)]">
        <div className="bg-background p-5 sm:p-7 lg:p-9">
          <div className="mb-8 max-w-3xl">
            <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-primary">
              Workspace registry
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              Open the right command surface.
            </h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Search recent workspaces, resume active runs, or create a new project before entering
              the full workbench.
            </p>
          </div>

          <div className="mb-8 grid gap-2 border border-border bg-card p-4">
            <label
              htmlFor="project-search"
              className="font-mono text-xs uppercase tracking-[0.06em] text-muted-foreground"
            >
              Search projects
            </label>
            <div className="relative">
              <Search
                size={16}
                className="absolute left-0 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                id="project-search"
                placeholder="Search projects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="rounded-none border-0 border-b border-border bg-transparent pl-7 font-mono focus-visible:border-primary focus-visible:ring-0"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-[68px] animate-pulse bg-muted" />
              ))}
            </div>
          ) : sortedProjects && sortedProjects.length > 0 ? (
            <div className="border border-border bg-card">
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
              className="flex flex-col items-center justify-center border border-border bg-card py-16 text-center"
            >
              <div className="mb-6 flex h-16 w-16 items-center justify-center border border-border bg-background">
                <FolderGit2 size={32} className="text-muted-foreground" />
              </div>
              <h3 className="mb-2 font-mono text-xl font-medium">
                {searchQuery ? 'No projects found' : 'Start your first project'}
              </h3>
              <p className="mb-8 max-w-sm text-muted-foreground">
                {searchQuery
                  ? `No projects matching "${searchQuery}".`
                  : 'A project gives you a workspace with file editing, AI chat, plan review, and terminal access — all in one browser tab.'}
              </p>
              {!searchQuery && (
                <div className="flex flex-col items-center gap-3">
                  <CreateProjectDialog onCreate={handleCreateProject} />
                  <Link
                    href="/education"
                    className="font-mono text-xs text-muted-foreground underline hover:text-foreground"
                  >
                    Learn how Panda works
                  </Link>
                </div>
              )}
            </motion.div>
          )}
        </div>

        <aside className="bg-card p-5 sm:p-7 lg:p-9">
          <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
            Session signals
          </p>
          <div className="mt-5 grid gap-px bg-border">
            {[
              ['TOTAL', isLoading ? '...' : String(projects?.length ?? 0)],
              ['VISIBLE', isLoading ? '...' : String(sortedProjects?.length ?? 0)],
              ['NEXT', searchQuery ? 'filter results' : 'open workspace'],
            ].map(([label, value]) => (
              <div key={label} className="bg-background p-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                  {label}
                </p>
                <p className="mt-2 font-mono text-xs uppercase tracking-[0.12em] text-foreground">
                  {value}
                </p>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </AuthenticatedPageShell>
  )
}
