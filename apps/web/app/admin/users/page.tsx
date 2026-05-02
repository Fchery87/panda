'use client'

import * as React from 'react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import { toast } from 'sonner'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Search, Shield, Ban, Trash2, UserCheck, Loader2, Users, Mail, FolderGit, Bot, Activity, ChevronDown } from 'lucide-react'

import {
  readAdminEnumQueryParam,
  readAdminQueryParam,
  useAdminQueryUpdater,
} from '@/lib/admin/query-state'

const filterOptions = [
  { value: 'all', label: 'All Users' },
  { value: 'admins', label: 'Admins' },
  { value: 'banned', label: 'Banned' },
  { value: 'active', label: 'Active' },
] as const

type AdminUserFilter = (typeof filterOptions)[number]['value']
type AdminUserId = Id<'users'>

type AdminListUser = NonNullable<
  ReturnType<typeof useQuery<typeof api.admin.listUsers>>
>['users'][number]

function mergeUsers(existing: AdminListUser[], incoming: AdminListUser[]): AdminListUser[] {
  const merged = new Map(existing.map((user) => [user._id, user]))
  for (const user of incoming) {
    merged.set(user._id, user)
  }
  return Array.from(merged.values())
}

export default function AdminUsersPage() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const search = readAdminQueryParam(searchParams, 'search')
  const filter = readAdminEnumQueryParam(
    searchParams,
    'filter',
    filterOptions.map((option) => option.value),
    'all'
  ) as AdminUserFilter
  const [isLoading, setIsLoading] = React.useState(false)
  const [cursor, setCursor] = React.useState<string | undefined>(undefined)
  const [loadedUsers, setLoadedUsers] = React.useState<AdminListUser[]>([])
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false)
  const [pendingDeleteUserId, setPendingDeleteUserId] = React.useState<AdminUserId | null>(null)
  const [confirmAction, setConfirmAction] = React.useState<{
    type: 'admin' | 'ban'
    userId: AdminUserId
    newValue: boolean
    label: string
  } | null>(null)

  const users = useQuery(api.admin.listUsers, {
    cursor,
    search: search || undefined,
    filter,
    limit: 50,
  })

  const updateUserAdmin = useMutation(api.admin.updateUserAdmin)
  const updateUserBan = useMutation(api.admin.updateUserBan)
  const deleteUser = useMutation(api.admin.deleteUser)

  React.useEffect(() => {
    setCursor(undefined)
    setLoadedUsers([])
  }, [search, filter])

  React.useEffect(() => {
    if (!users) return
    setLoadedUsers((previous) => (cursor ? mergeUsers(previous, users.users) : users.users))
  }, [users, cursor])

  const selectedUserIdParam = readAdminQueryParam(searchParams, 'selectedUserId')
  const selectedUserId = useQuery(
    api.admin.resolveAdminUserIdFromUrl,
    selectedUserIdParam ? { userId: selectedUserIdParam } : 'skip'
  )

  const selectedUserDetails = useQuery(
    api.admin.getUserDetails,
    selectedUserId ? { userId: selectedUserId } : 'skip'
  )

  const updateQuery = useAdminQueryUpdater(pathname, router, searchParams)

  const selectUser = React.useCallback(
    (userId: AdminUserId) => {
      updateQuery({ selectedUserId: userId })
    },
    [updateQuery]
  )

  const clearSelectedUser = React.useCallback(() => {
    updateQuery({ selectedUserId: null })
  }, [updateQuery])

  const requestToggleAdmin = (userId: AdminUserId, isAdmin: boolean) => {
    setConfirmAction({
      type: 'admin',
      userId,
      newValue: !isAdmin,
      label: isAdmin
        ? 'Are you sure you want to revoke admin privileges from this user?'
        : 'Are you sure you want to grant admin privileges to this user?',
    })
  }

  const requestToggleBan = (userId: AdminUserId, isBanned: boolean) => {
    setConfirmAction({
      type: 'ban',
      userId,
      newValue: !isBanned,
      label: isBanned
        ? 'Are you sure you want to unban this user?'
        : 'Are you sure you want to ban this user?',
    })
  }

  const executeConfirmedAction = async () => {
    if (!confirmAction) return
    setIsLoading(true)
    try {
      if (confirmAction.type === 'admin') {
        await updateUserAdmin({
          userId: confirmAction.userId,
          isAdmin: confirmAction.newValue,
          adminRole: confirmAction.newValue ? 'admin' : undefined,
        })
        toast.success(
          confirmAction.newValue ? 'Admin privileges granted' : 'Admin privileges revoked'
        )
      } else {
        await updateUserBan({
          userId: confirmAction.userId,
          isBanned: confirmAction.newValue,
          reason: confirmAction.newValue ? 'Administrative action' : undefined,
        })
        toast.success(confirmAction.newValue ? 'User banned' : 'User unbanned')
      }
    } catch (error) {
      void error
      toast.error('Failed to update user')
    } finally {
      setIsLoading(false)
      setConfirmAction(null)
    }
  }

  const beginDeleteUser = React.useCallback((userId: AdminUserId) => {
    setPendingDeleteUserId(userId)
    setDeleteDialogOpen(true)
  }, [])

  const handleDeleteUser = async (userId: AdminUserId) => {
    setIsLoading(true)
    try {
      await deleteUser({ userId })
      toast.success('User deleted successfully')
      if (selectedUserId === userId) {
        clearSelectedUser()
      }
      setDeleteDialogOpen(false)
      setPendingDeleteUserId(null)
    } catch (error) {
      void error
      toast.error('Failed to delete user')
    } finally {
      setIsLoading(false)
    }
  }

  const pendingDeleteUser =
    pendingDeleteUserId && selectedUserDetails?.user._id === pendingDeleteUserId
      ? selectedUserDetails
      : null

  return (
    <div className="container mx-auto p-8">
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <Users className="h-8 w-8" />
          <div>
            <h1 className="text-3xl font-bold">User Management</h1>
            <p className="text-muted-foreground">
              Manage user accounts, permissions, and access with keyboard-friendly selection
            </p>
          </div>
        </div>
      </div>

      <Card className="mb-6 rounded-none">
        <CardContent className="pt-6">
          <div className="grid gap-4 lg:grid-cols-[1fr_220px]">
            <div className="space-y-2">
              <Label htmlFor="admin-user-search" className="font-mono text-sm">
                Search users
              </Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="admin-user-search"
                  placeholder="Search by name or email..."
                  value={search}
                  onChange={(e) =>
                    updateQuery({
                      search: e.target.value || null,
                    })
                  }
                  className="rounded-none pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="admin-user-filter" className="font-mono text-sm">
                User filter
              </Label>
              <Select value={filter} onValueChange={(value) => updateQuery({ filter: value })}>
                <SelectTrigger
                  id="admin-user-filter"
                  className="rounded-none"
                  aria-label="User filter"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {filterOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="rounded-none lg:col-span-2">
          <CardHeader>
            <CardTitle>Users ({loadedUsers.length || 0})</CardTitle>
            <CardDescription>
              Select a row with keyboard or pointer input to view details and manage permissions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[600px]">
              <div className="space-y-2">
                {loadedUsers.map((user) => (
                  <button
                    key={user._id}
                    type="button"
                    aria-pressed={selectedUserId === user._id}
                    onClick={() => selectUser(user._id)}
                    className={`flex w-full items-center justify-between rounded-none border p-4 text-left transition-colors ${
                      selectedUserId === user._id
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:bg-muted/50'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 items-center justify-center bg-muted font-mono text-sm font-bold">
                        {user.name?.charAt(0) || user.email?.charAt(0) || '?'}
                      </div>
                      <div>
                        <p className="font-medium">{user.name || 'Unnamed User'}</p>
                        <p className="font-mono text-sm text-muted-foreground">{user.email}</p>
                        <div className="mt-1 flex gap-2">
                          {user.isAdmin && (
                            <Badge variant="default" className="rounded-none text-xs">
                              <Shield className="mr-1 h-3 w-3" />
                              Admin
                            </Badge>
                          )}
                          {user.isBanned && (
                            <Badge variant="destructive" className="rounded-none text-xs">
                              <Ban className="mr-1 h-3 w-3" />
                              Banned
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">
                        {user.analytics?.totalProjects || 0} projects
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Joined{' '}
                        {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Unknown'}
                      </p>
                    </div>
                  </button>
                ))}

                {loadedUsers.length === 0 && (
                  <div className="py-12 text-center text-muted-foreground">No users found</div>
                )}

                {users?.hasMore ? (
                  <div className="flex justify-center pt-4">
                    <Button
                      variant="outline"
                      className="rounded-none"
                      onClick={() => setCursor(users.nextCursor ?? undefined)}
                    >
                      <ChevronDown className="mr-2 h-4 w-4" />
                      Load More Users
                    </Button>
                  </div>
                ) : null}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card className="rounded-none">
          <CardHeader>
            <CardTitle>User Details</CardTitle>
            <CardDescription>
              {selectedUserId
                ? "Manage this user's account and permissions"
                : 'Select a user to view details'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {selectedUserDetails ? (
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center bg-primary font-mono text-2xl font-bold text-primary-foreground">
                    {selectedUserDetails.user.name?.charAt(0) ||
                      selectedUserDetails.user.email?.charAt(0) ||
                      '?'}
                  </div>
                  <div>
                    <p className="text-lg font-medium">
                      {selectedUserDetails.user.name || 'Unnamed User'}
                    </p>
                    <p className="font-mono text-sm text-muted-foreground">
                      {selectedUserDetails.user.email}
                    </p>
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-none border border-border p-3 text-center">
                    <FolderGit className="mx-auto mb-1 h-5 w-5 text-muted-foreground" />
                    <p className="text-2xl font-bold">{selectedUserDetails.projectCount}</p>
                    <p className="text-xs text-muted-foreground">Projects</p>
                  </div>
                  <div className="rounded-none border border-border p-3 text-center">
                    <Bot className="mx-auto mb-1 h-5 w-5 text-muted-foreground" />
                    <p className="text-2xl font-bold">{selectedUserDetails.mcpServerCount}</p>
                    <p className="text-xs text-muted-foreground">MCP Servers</p>
                  </div>
                  <div className="rounded-none border border-border p-3 text-center">
                    <Activity className="mx-auto mb-1 h-5 w-5 text-muted-foreground" />
                    <p className="text-2xl font-bold">{selectedUserDetails.subagentCount}</p>
                    <p className="text-xs text-muted-foreground">Subagents</p>
                  </div>
                  <div className="rounded-none border border-border p-3 text-center">
                    <Mail className="mx-auto mb-1 h-5 w-5 text-muted-foreground" />
                    <p className="text-2xl font-bold">
                      {selectedUserDetails.analytics?.totalChats || 0}
                    </p>
                    <p className="text-xs text-muted-foreground">Chats</p>
                  </div>
                </div>

                <Separator />

                <div className="space-y-3">
                  <p className="font-mono text-sm uppercase tracking-wider text-muted-foreground">
                    Actions
                  </p>

                  <Button
                    variant={selectedUserDetails.user.isAdmin ? 'destructive' : 'default'}
                    className="w-full rounded-none"
                    onClick={() =>
                      requestToggleAdmin(
                        selectedUserDetails.user._id,
                        Boolean(selectedUserDetails.user.isAdmin)
                      )
                    }
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : selectedUserDetails.user.isAdmin ? (
                      <>
                        <Shield className="mr-2 h-4 w-4" />
                        Revoke Admin
                      </>
                    ) : (
                      <>
                        <Shield className="mr-2 h-4 w-4" />
                        Grant Admin
                      </>
                    )}
                  </Button>

                  <Button
                    variant={selectedUserDetails.user.isBanned ? 'outline' : 'destructive'}
                    className="w-full rounded-none"
                    onClick={() =>
                      requestToggleBan(
                        selectedUserDetails.user._id,
                        Boolean(selectedUserDetails.user.isBanned)
                      )
                    }
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : selectedUserDetails.user.isBanned ? (
                      <>
                        <UserCheck className="mr-2 h-4 w-4" />
                        Unban User
                      </>
                    ) : (
                      <>
                        <Ban className="mr-2 h-4 w-4" />
                        Ban User
                      </>
                    )}
                  </Button>

                  <Separator />

                  <Button
                    variant="destructive"
                    className="w-full rounded-none"
                    onClick={() => beginDeleteUser(selectedUserDetails.user._id)}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete User
                      </>
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center text-muted-foreground">
                <Users className="mx-auto mb-4 h-12 w-12 opacity-50" />
                <p>Select a user from the list to view details</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          setDeleteDialogOpen(open)
          if (!open) {
            setPendingDeleteUserId(null)
          }
        }}
      >
        <DialogContent className="rounded-none">
          <DialogHeader>
            <DialogTitle>Delete user</DialogTitle>
            <DialogDescription>
              This permanently removes the user and all associated projects, chats, files, and
              generated data.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {pendingDeleteUser ? (
                <>
                  You are about to delete{' '}
                  <span className="font-medium text-foreground">
                    {pendingDeleteUser.user.name || pendingDeleteUser.user.email}
                  </span>
                  .
                </>
              ) : (
                'Confirm the deletion before continuing.'
              )}
            </p>

            {pendingDeleteUser ? (
              <div className="rounded-none border border-border p-3">
                <p className="font-medium">{pendingDeleteUser.user.name || 'Unnamed User'}</p>
                <p className="font-mono text-sm text-muted-foreground">
                  {pendingDeleteUser.user.email}
                </p>
              </div>
            ) : null}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="rounded-none"
              onClick={() => {
                setDeleteDialogOpen(false)
                setPendingDeleteUserId(null)
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="rounded-none"
              onClick={() => {
                if (pendingDeleteUserId) {
                  void handleDeleteUser(pendingDeleteUserId)
                }
              }}
              disabled={isLoading || !pendingDeleteUserId}
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Delete User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={confirmAction !== null}
        onOpenChange={(open) => {
          if (!open) {
            setConfirmAction(null)
          }
        }}
      >
        <DialogContent className="rounded-none font-mono">
          <DialogHeader>
            <DialogTitle>
              {confirmAction?.type === 'admin' ? 'Confirm Admin Change' : 'Confirm Ban Change'}
            </DialogTitle>
            <DialogDescription>{confirmAction?.label}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="rounded-none"
              onClick={() => setConfirmAction(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="rounded-none"
              onClick={() => void executeConfirmedAction()}
              disabled={isLoading}
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
