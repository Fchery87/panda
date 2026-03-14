'use client'

import * as React from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
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
  Search,
  Shield,
  Ban,
  Trash2,
  UserCheck,
  Loader2,
  ArrowLeft,
  Users,
  Mail,
  FolderGit,
  Bot,
  Activity,
  ChevronDown,
} from 'lucide-react'

const filterOptions = [
  { value: 'all', label: 'All Users' },
  { value: 'admins', label: 'Admins' },
  { value: 'banned', label: 'Banned' },
  { value: 'active', label: 'Active' },
]

type AdminUserFilter = 'all' | 'admins' | 'banned' | 'active'
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
  const [search, setSearch] = React.useState('')
  const [filter, setFilter] = React.useState<AdminUserFilter>('all')
  const [selectedUserId, setSelectedUserId] = React.useState<AdminUserId | null>(null)
  const [isLoading, setIsLoading] = React.useState(false)
  const [cursor, setCursor] = React.useState<string | undefined>(undefined)
  const [loadedUsers, setLoadedUsers] = React.useState<AdminListUser[]>([])

  const users = useQuery(api.admin.listUsers, {
    cursor,
    search: search || undefined,
    filter,
    limit: 50,
  })

  const selectedUserDetails = useQuery(
    api.admin.getUserDetails,
    selectedUserId ? { userId: selectedUserId } : 'skip'
  )

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

  const handleToggleAdmin = async (userId: AdminUserId, isAdmin: boolean) => {
    setIsLoading(true)
    try {
      await updateUserAdmin({
        userId,
        isAdmin,
        adminRole: isAdmin ? 'admin' : undefined,
      })
      toast.success(isAdmin ? 'Admin privileges granted' : 'Admin privileges revoked')
    } catch (error) {
      void error
      toast.error('Failed to update user')
    } finally {
      setIsLoading(false)
    }
  }

  const handleToggleBan = async (userId: AdminUserId, isBanned: boolean) => {
    setIsLoading(true)
    try {
      await updateUserBan({
        userId,
        isBanned,
        reason: isBanned ? 'Administrative action' : undefined,
      })
      toast.success(isBanned ? 'User banned' : 'User unbanned')
    } catch (error) {
      void error
      toast.error('Failed to update user')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteUser = async (userId: AdminUserId) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return
    }

    setIsLoading(true)
    try {
      await deleteUser({ userId })
      toast.success('User deleted successfully')
      setSelectedUserId(null)
    } catch (error) {
      void error
      toast.error('Failed to delete user')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-8">
      {/* Header */}
      <div className="mb-8">
        <Button
          variant="ghost"
          size="sm"
          className="-ml-2 mb-4 text-muted-foreground hover:text-foreground"
          onClick={() => router.push('/admin')}
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to Dashboard
        </Button>
        <div className="flex items-center gap-3">
          <Users className="h-8 w-8" />
          <div>
            <h1 className="text-3xl font-bold">User Management</h1>
            <p className="text-muted-foreground">Manage user accounts, permissions, and access</p>
          </div>
        </div>
      </div>

      {/* Search and Filter */}
      <Card className="mb-6 rounded-none">
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="rounded-none pl-10"
              />
            </div>
            <Select value={filter} onValueChange={(value) => setFilter(value as AdminUserFilter)}>
              <SelectTrigger className="w-[180px] rounded-none">
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
        </CardContent>
      </Card>

      {/* Users List */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* User List */}
        <Card className="rounded-none lg:col-span-2">
          <CardHeader>
            <CardTitle>Users ({loadedUsers.length || 0})</CardTitle>
            <CardDescription>
              Click on a user to view details and manage permissions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[600px]">
              <div className="space-y-2">
                {loadedUsers.map((user) => (
                  <div
                    key={user._id}
                    onClick={() => setSelectedUserId(user._id)}
                    className={`flex cursor-pointer items-center justify-between rounded-none border p-4 transition-colors ${
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
                  </div>
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

        {/* User Details Panel */}
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
                {/* User Info */}
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

                {/* Stats */}
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

                {/* Actions */}
                <div className="space-y-3">
                  <p className="font-mono text-sm uppercase tracking-wider text-muted-foreground">
                    Actions
                  </p>

                  <Button
                    variant={selectedUserDetails.user.isAdmin ? 'destructive' : 'default'}
                    className="w-full rounded-none"
                    onClick={() =>
                      handleToggleAdmin(
                        selectedUserDetails.user._id,
                        !selectedUserDetails.user.isAdmin
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
                      handleToggleBan(
                        selectedUserDetails.user._id,
                        !selectedUserDetails.user.isBanned
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
                    onClick={() => handleDeleteUser(selectedUserDetails.user._id)}
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
    </div>
  )
}
