'use client'

import { useEffect, useState } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FolderGit2, Plus, Trash2, Search, ArrowRight } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AuthenticatedPageShell } from '@/components/layout/AuthenticatedPageShell'
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
      toast.success('Project created')
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
          <Button className="gap-2">
            <Plus size={16} />
            New project
          </Button>
        </DialogTrigger>
      ) : null}
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="font-display">Create a project</DialogTitle>
          <DialogDescription>
            A project is a recoverable workspace: files, chats, plans, and runs stay together.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {submitError ? (
              <Alert variant="destructive" className="border">
                <AlertTitle className="text-sm font-medium">{submitError.title}</AlertTitle>
                <AlertDescription className="space-y-1 text-xs">
                  <p>{submitError.description}</p>
                  {submitError.recoveryHint ? <p>{submitError.recoveryHint}</p> : null}
                </AlertDescription>
              </Alert>
            ) : null}
            <div className="grid gap-2">
              <label htmlFor="name" className="text-sm font-medium text-foreground">
                Name
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
                className="rounded-lg font-mono"
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="description" className="text-sm font-medium text-foreground">
                Description <span className="font-normal text-muted-foreground">(optional)</span>
              </label>
              <Input
                id="description"
                placeholder="What are you building?"
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value)
                  if (submitError) setSubmitError(null)
                }}
                className="rounded-lg"
              />
            </div>
            <GitHubRepositoryPicker
              value={repository}
              onChange={setRepository}
              disabled={isCreating}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim() || isCreating}>
              {isCreating ? 'Creating...' : 'Create project'}
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
      transition={{ duration: 0.2, delay: index * 0.04 }}
    >
      <div className="group shadow-sharp-sm hover:shadow-sharp-md relative rounded-xl border border-border bg-card transition-all duration-200 hover:border-oxblood/60">
        <Link
          href={projectHref}
          onClick={handleOpen}
          onMouseDownCapture={handleMouseDownCapture}
          className="flex items-center gap-5 rounded-xl px-6 py-5"
        >
          {/* Ink chop */}
          <div className="bg-primary flex h-11 w-11 shrink-0 items-center justify-center rounded-lg">
            <FolderGit2 size={18} className="text-primary-foreground" />
          </div>

          {/* Name & description */}
          <div className="min-w-0 flex-1">
            <h3 className="font-display truncate text-base font-semibold tracking-tight text-foreground">
              {project.name}
            </h3>
            <p className="truncate text-sm text-muted-foreground">
              {project.description || `Opened ${formatRelativeTime(project.lastOpenedAt)}`}
            </p>
          </div>

          {/* Meta */}
          <div className="flex shrink-0 items-center gap-4">
            <span className="hidden text-xs text-muted-foreground sm:block">
              {formatRelativeTime(project.lastOpenedAt)}
            </span>
            <ArrowRight
              size={16}
              className="text-muted-foreground transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-oxblood"
            />
          </div>
        </Link>

        <Button
          variant="ghost"
          size="icon"
          className="hover:bg-destructive/10 absolute right-14 top-1/2 h-8 w-8 -translate-y-1/2 text-muted-foreground opacity-0 transition-opacity hover:text-destructive focus-visible:opacity-100 group-hover:opacity-100"
          aria-label={`Delete ${project.name}`}
          onClick={handleDeleteRequest}
          disabled={isDeleting}
        >
          <Trash2 size={14} />
        </Button>
      </div>
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="font-display">Delete project?</DialogTitle>
            <DialogDescription>
              Delete <span className="font-mono text-foreground">{project.name}</span>? This
              removes its files, chats, and run history. It can&apos;t be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
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
      eyebrow="Workspace"
      title="Projects"
      description="Pick up where a run left off, or start something new. Every project keeps its files, plans, and receipts together."
      action={<CreateProjectDialog onCreate={handleCreateProject} />}
      status={
        <span className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-teal" />
          {isLoading ? 'Loading' : `${projects?.length ?? 0} projects`}
        </span>
      }
      className="max-w-4xl"
    >
      <CreateProjectDialog
        onCreate={handleCreateProject}
        showTrigger={false}
        listenForCreateEvent
      />

      <div className="relative mb-6">
        <Search
          size={16}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          id="project-search"
          placeholder="Search projects"
          aria-label="Search projects"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-12 rounded-full border-border bg-card pl-11 text-base focus-visible:border-oxblood focus-visible:ring-1 focus-visible:ring-oxblood"
        />
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-[84px] animate-pulse rounded-xl bg-secondary" />
          ))}
        </div>
      ) : sortedProjects && sortedProjects.length > 0 ? (
        <div className="space-y-3">
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
          className="flex flex-col items-center justify-center py-20 text-center"
        >
          <div className="bg-primary mb-7 flex h-16 w-16 items-center justify-center rounded-xl">
            <FolderGit2 size={28} className="text-primary-foreground" />
          </div>
          <h3 className="font-display mb-3 text-2xl font-semibold tracking-tight">
            {searchQuery ? 'No projects found' : 'Start your first project'}
          </h3>
          <p className="mb-8 max-w-sm leading-relaxed text-muted-foreground">
            {searchQuery
              ? `Nothing matches "${searchQuery}". Try a different name.`
              : 'A project is a full workspace — editor, agent chat, plan review, and a live runtime — in one browser tab.'}
          </p>
          {!searchQuery && (
            <div className="flex flex-col items-center gap-4">
              <CreateProjectDialog onCreate={handleCreateProject} />
              <Link
                href="/education"
                className="text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              >
                Learn how Panda works
              </Link>
            </div>
          )}
        </motion.div>
      )}
    </AuthenticatedPageShell>
  )
}
