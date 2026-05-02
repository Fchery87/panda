'use client'

import * as React from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import { toast } from 'sonner'

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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Search,
  Shield,
  Ban,
  Trash2,
  UserCheck,
  Loader2,
  MoreHorizontal,
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

export function UserManagementTable() {
  const [search, setSearch] = React.useState('')
  const [filter, setFilter] = React.useState<AdminUserFilter>('all')
  const [isLoading, setIsLoading] = React.useState(false)
  const [cursor, setCursor] = React.useState<string | undefined>(undefined)
  const [loadedUsers, setLoadedUsers] = React.useState<AdminListUser[]>([])

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
    } catch (error) {
      void error
      toast.error('Failed to delete user')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="rounded-none">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>User Management</CardTitle>
            <CardDescription>Manage user accounts and permissions</CardDescription>
          </div>
          <div className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-[250px] rounded-none pl-10"
              />
            </div>
            <Select value={filter} onValueChange={(value) => setFilter(value as AdminUserFilter)}>
              <SelectTrigger className="w-[150px] rounded-none">
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
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[500px]">
          <div className="space-y-2">
            {loadedUsers.map((user) => (
              <div
                key={user._id}
                className="flex items-center justify-between rounded-none border border-border p-4 transition-colors hover:bg-muted/50"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center bg-muted font-mono text-sm">
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
                      {user.analytics && (
                        <Badge variant="outline" className="rounded-none text-xs">
                          {user.analytics.totalProjects || 0} projects
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="rounded-none">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-lg rounded-none">
                      <DialogHeader>
                        <DialogTitle>User Actions</DialogTitle>
                        <DialogDescription>
                          Manage permissions and status for {user.email}
                        </DialogDescription>
                      </DialogHeader>

                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <p className="text-sm font-medium">Admin Status</p>
                          <Button
                            variant={user.isAdmin ? 'destructive' : 'default'}
                            className="w-full rounded-none"
                            onClick={() => handleToggleAdmin(user._id, !user.isAdmin)}
                            disabled={isLoading}
                          >
                            {isLoading ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : user.isAdmin ? (
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
                        </div>

                        <Separator />

                        <div className="space-y-2">
                          <p className="text-sm font-medium">Account Status</p>
                          <Button
                            variant={user.isBanned ? 'outline' : 'destructive'}
                            className="w-full rounded-none"
                            onClick={() => handleToggleBan(user._id, !user.isBanned)}
                            disabled={isLoading}
                          >
                            {isLoading ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : user.isBanned ? (
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
                        </div>

                        <Separator />

                        <div className="space-y-2">
                          <p className="text-sm font-medium text-destructive">Danger Zone</p>
                          <Button
                            variant="destructive"
                            className="w-full rounded-none"
                            onClick={() => handleDeleteUser(user._id)}
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
                    </DialogContent>
                  </Dialog>
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
  )
}
