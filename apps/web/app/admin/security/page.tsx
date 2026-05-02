'use client'

import * as React from 'react'
import { useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Shield, Clock, UserCheck, UserX, Trash2, AlertTriangle, Lock, Activity, Filter } from 'lucide-react'
import { AdminSubNav, AdminPageHeader } from '@/components/admin/AdminSubNav'

import {
  readAdminDateQueryParam,
  readAdminEnumQueryParam,
  readAdminQueryParam,
  useAdminQueryUpdater,
} from '@/lib/admin/query-state'

const securityTabs = ['audit', 'admin', 'settings', 'overview'] as const
const actionOptions = [
  { value: 'all', label: 'All actions' },
  { value: 'GRANT_ADMIN', label: 'Grant admin' },
  { value: 'REVOKE_ADMIN', label: 'Revoke admin' },
  { value: 'BAN_USER', label: 'Ban user' },
  { value: 'UNBAN_USER', label: 'Unban user' },
  { value: 'DELETE_USER', label: 'Delete user' },
  { value: 'UPDATE_SETTINGS', label: 'Update settings' },
] as const

const resourceOptions = [
  { value: 'all', label: 'All resources' },
  { value: 'user', label: 'Users' },
  { value: 'adminSettings', label: 'Admin settings' },
] as const

const actionColors: Record<string, string> = {
  GRANT_ADMIN: 'bg-green-500/10 text-green-500 border-green-500/20',
  REVOKE_ADMIN: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  BAN_USER: 'bg-red-500/10 text-red-500 border-red-500/20',
  UNBAN_USER: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  DELETE_USER: 'bg-red-500/10 text-red-500 border-red-500/20',
  UPDATE_SETTINGS: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
}

const actionIcons: Record<string, React.ReactNode> = {
  GRANT_ADMIN: <UserCheck className="h-4 w-4" />,
  REVOKE_ADMIN: <UserX className="h-4 w-4" />,
  BAN_USER: <AlertTriangle className="h-4 w-4" />,
  UNBAN_USER: <UserCheck className="h-4 w-4" />,
  DELETE_USER: <Trash2 className="h-4 w-4" />,
  UPDATE_SETTINGS: <Lock className="h-4 w-4" />,
}

function formatActorLabel(actor: string) {
  return actor.trim().length > 0 ? actor.trim() : 'All actors'
}

const subNavItems = [
  { id: 'audit', label: 'Audit Log', icon: Activity },
  { id: 'admin', label: 'Admin Actions', icon: Shield },
  { id: 'settings', label: 'Settings Changes', icon: Lock },
  { id: 'overview', label: 'Overview', icon: AlertTriangle },
]

export default function AdminSecurityPage() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const activeTab = readAdminEnumQueryParam(searchParams, 'tab', securityTabs, 'audit')
  const action = readAdminEnumQueryParam(
    searchParams,
    'action',
    actionOptions.map((option) => option.value),
    'all'
  )
  const resource = readAdminEnumQueryParam(
    searchParams,
    'resource',
    resourceOptions.map((option) => option.value),
    'all'
  )
  const actor = readAdminQueryParam(searchParams, 'actor')
  const fromDate = readAdminDateQueryParam(searchParams, 'from')
  const toDate = readAdminDateQueryParam(searchParams, 'to')

  const auditLog = useQuery(api.admin.getAuditLog, {
    limit: 100,
    action: action === 'all' ? undefined : action,
    resource: resource === 'all' ? undefined : resource,
    actor: actor || undefined,
    fromDate: fromDate || undefined,
    toDate: toDate || undefined,
  })
  const systemOverview = useQuery(api.admin.getSystemOverview)

  const updateQuery = useAdminQueryUpdater(pathname, router, searchParams)

  const adminActions =
    auditLog?.filter((log) =>
      ['GRANT_ADMIN', 'REVOKE_ADMIN', 'BAN_USER', 'UNBAN_USER', 'DELETE_USER'].includes(log.action)
    ) || []
  const settingsChanges = auditLog?.filter((log) => log.action === 'UPDATE_SETTINGS') || []

  const hasFilters = Boolean(actor || fromDate || toDate || action !== 'all' || resource !== 'all')

  return (
    <div className="p-8">
      <AdminPageHeader
        icon={Shield}
        title="Security"
        description="Audit logs and security overview"
      />

      <Card className="mb-6 rounded-none">
        <CardContent className="pt-6">
          <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr_1fr_1fr_1fr_auto]">
            <div className="space-y-2">
              <Label htmlFor="security-actor-filter" className="font-mono text-sm">
                Actor
              </Label>
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="security-actor-filter"
                  placeholder="Search by user name or email..."
                  value={actor}
                  onChange={(e) => updateQuery({ actor: e.target.value || null })}
                  className="rounded-none pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="security-action-filter" className="font-mono text-sm">
                Action
              </Label>
              <Select value={action} onValueChange={(value) => updateQuery({ action: value })}>
                <SelectTrigger
                  id="security-action-filter"
                  className="rounded-none"
                  aria-label="Action filter"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {actionOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="security-resource-filter" className="font-mono text-sm">
                Resource
              </Label>
              <Select value={resource} onValueChange={(value) => updateQuery({ resource: value })}>
                <SelectTrigger
                  id="security-resource-filter"
                  className="rounded-none"
                  aria-label="Resource filter"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {resourceOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="security-from-date" className="font-mono text-sm">
                From date
              </Label>
              <Input
                id="security-from-date"
                type="date"
                value={fromDate}
                max={toDate || undefined}
                onChange={(e) => updateQuery({ from: e.target.value || null })}
                className="rounded-none"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="security-to-date" className="font-mono text-sm">
                To date
              </Label>
              <Input
                id="security-to-date"
                type="date"
                value={toDate}
                min={fromDate || undefined}
                onChange={(e) => updateQuery({ to: e.target.value || null })}
                className="rounded-none"
              />
            </div>

            <div className="flex items-end">
              <Button
                type="button"
                variant="outline"
                className="rounded-none"
                onClick={() =>
                  updateQuery({ action: 'all', resource: 'all', actor: null, from: null, to: null })
                }
                disabled={!hasFilters}
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-8">
        <AdminSubNav
          items={subNavItems}
          activeId={activeTab}
          onSelect={(id) => updateQuery({ tab: id })}
        />

        <div className="min-w-0 flex-1">
          {activeTab === 'audit' && (
            <Card className="rounded-none">
              <CardHeader>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <CardTitle>Full Audit Log</CardTitle>
                    <CardDescription>Complete history of administrative actions</CardDescription>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="rounded-none">
                      {auditLog?.length || 0} entries
                    </Badge>
                    <Badge variant="outline" className="rounded-none font-mono">
                      {formatActorLabel(actor)}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[600px]">
                  <div className="space-y-2">
                    {auditLog?.length === 0 ? (
                      <div className="py-12 text-center text-muted-foreground">
                        <Activity className="mx-auto mb-4 h-12 w-12 opacity-50" />
                        <p>No audit log entries yet</p>
                      </div>
                    ) : (
                      auditLog?.map((log) => (
                        <div
                          key={log._id}
                          className="flex items-start gap-4 rounded-none border border-border p-4 transition-colors hover:bg-muted/50"
                        >
                          <div className="flex-shrink-0">
                            <Badge
                              variant="outline"
                              className={`rounded-none ${actionColors[log.action] || ''}`}
                            >
                              {actionIcons[log.action] || <Activity className="h-4 w-4" />}
                            </Badge>
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-mono text-sm font-medium">{log.action}</span>
                              <span className="text-sm text-muted-foreground">
                                on <span className="font-mono">{log.resource}</span>
                              </span>
                            </div>

                            <p className="mt-1 text-sm">
                              {log.user ? (
                                <span className="font-medium">
                                  {log.user.name || log.user.email}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">System</span>
                              )}
                            </p>

                            {log.details && Object.keys(log.details).length > 0 && (
                              <div className="mt-2 overflow-x-auto rounded-none bg-muted p-2 font-mono text-xs text-muted-foreground">
                                <pre>{JSON.stringify(log.details, null, 2)}</pre>
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-1 whitespace-nowrap text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {new Date(log.createdAt).toLocaleString()}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}

          {activeTab === 'admin' && (
            <Card className="rounded-none">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  <CardTitle>Admin Actions</CardTitle>
                </div>
                <CardDescription>
                  User permission changes and administrative actions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[600px]">
                  <div className="space-y-2">
                    {adminActions.length === 0 ? (
                      <div className="py-12 text-center text-muted-foreground">
                        <Shield className="mx-auto mb-4 h-12 w-12 opacity-50" />
                        <p>No admin actions recorded yet</p>
                      </div>
                    ) : (
                      adminActions.map((log) => (
                        <div
                          key={log._id}
                          className="flex items-center justify-between rounded-none border border-border p-4"
                        >
                          <div className="flex items-center gap-4">
                            <Badge
                              variant="outline"
                              className={`rounded-none ${actionColors[log.action] || ''}`}
                            >
                              {log.action}
                            </Badge>

                            <div>
                              <p className="font-medium">{log.action.replace(/_/g, ' ')}</p>
                              <p className="text-sm text-muted-foreground">
                                By: {log.user?.name || log.user?.email || 'System'}
                              </p>
                            </div>
                          </div>

                          <div className="text-right">
                            <p className="font-mono text-sm">
                              {new Date(log.createdAt).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}

          {activeTab === 'settings' && (
            <Card className="rounded-none">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Lock className="h-5 w-5" />
                  <CardTitle>Settings Changes</CardTitle>
                </div>
                <CardDescription>System configuration changes</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[600px]">
                  <div className="space-y-2">
                    {settingsChanges.length === 0 ? (
                      <div className="py-12 text-center text-muted-foreground">
                        <Lock className="mx-auto mb-4 h-12 w-12 opacity-50" />
                        <p>No settings changes recorded yet</p>
                      </div>
                    ) : (
                      settingsChanges.map((log) => (
                        <div key={log._id} className="rounded-none border border-border p-4">
                          <div className="mb-2 flex items-center justify-between">
                            <Badge
                              variant="outline"
                              className={`rounded-none ${actionColors[log.action] || ''}`}
                            >
                              {log.action}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {new Date(log.createdAt).toLocaleString()}
                            </span>
                          </div>

                          <p className="mb-2 text-sm">
                            By: {log.user?.name || log.user?.email || 'System'}
                          </p>

                          {log.details && (
                            <div className="overflow-x-auto rounded-none bg-muted p-2 font-mono text-xs text-muted-foreground">
                              <pre>{JSON.stringify(log.details, null, 2)}</pre>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}

          {activeTab === 'overview' && (
            <div className="grid gap-6 md:grid-cols-2">
              <Card className="rounded-none">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5" />
                    <CardTitle>Security Overview</CardTitle>
                  </div>
                  <CardDescription>Current security status</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Total Admin Users</span>
                      <Badge variant="default" className="rounded-none">
                        {systemOverview?.users.admins || 0}
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm">Banned Users</span>
                      <Badge variant="destructive" className="rounded-none">
                        {systemOverview?.users.banned || 0}
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm">Total Audit Entries</span>
                      <Badge variant="outline" className="rounded-none">
                        {auditLog?.length || 0}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-none">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    <CardTitle>Recent Activity</CardTitle>
                  </div>
                  <CardDescription>Last 5 audit log entries</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {auditLog?.slice(0, 5).map((log) => (
                      <div
                        key={log._id}
                        className="flex items-center justify-between rounded-none border border-border p-3"
                      >
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="rounded-none text-xs">
                            {log.action}
                          </Badge>
                          <span className="max-w-[150px] truncate text-sm text-muted-foreground">
                            {log.user?.name || log.user?.email || 'System'}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {new Date(log.createdAt).toLocaleTimeString()}
                        </span>
                      </div>
                    ))}

                    {(!auditLog || auditLog.length === 0) && (
                      <p className="py-4 text-center text-muted-foreground">No activity yet</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
