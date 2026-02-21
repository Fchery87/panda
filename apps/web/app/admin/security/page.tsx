'use client'

import * as React from 'react'
import { useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import { useRouter } from 'next/navigation'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  ArrowLeft,
  Shield,
  Clock,
  UserCheck,
  UserX,
  Trash2,
  AlertTriangle,
  Lock,
  Activity,
} from 'lucide-react'

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

export default function AdminSecurityPage() {
  const router = useRouter()
  const auditLog = useQuery(api.admin.getAuditLog, { limit: 100 })
  const systemOverview = useQuery(api.admin.getSystemOverview)

  const recentLogins =
    auditLog?.filter((log) => log.action === 'SIGN_IN' || log.action === 'OAUTH_CALLBACK') || []

  const adminActions =
    auditLog?.filter((log) =>
      ['GRANT_ADMIN', 'REVOKE_ADMIN', 'BAN_USER', 'UNBAN_USER', 'DELETE_USER'].includes(log.action)
    ) || []

  const settingsChanges = auditLog?.filter((log) => log.action === 'UPDATE_SETTINGS') || []

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
          <Shield className="h-8 w-8" />
          <div>
            <h1 className="text-3xl font-bold">Security</h1>
            <p className="text-muted-foreground">Audit logs and security overview</p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="audit" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 lg:w-[500px]">
          <TabsTrigger value="audit" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Audit Log
          </TabsTrigger>
          <TabsTrigger value="admin" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Admin Actions
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Lock className="h-4 w-4" />
            Settings Changes
          </TabsTrigger>
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Security Overview
          </TabsTrigger>
        </TabsList>

        {/* Audit Log Tab */}
        <TabsContent value="audit">
          <Card className="rounded-none">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Full Audit Log</CardTitle>
                  <CardDescription>Complete history of administrative actions</CardDescription>
                </div>
                <Badge variant="outline" className="rounded-none">
                  {auditLog?.length || 0} entries
                </Badge>
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
                    auditLog?.map((log: any) => (
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
                              <span className="font-medium">{log.user.name || log.user.email}</span>
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
        </TabsContent>

        {/* Admin Actions Tab */}
        <TabsContent value="admin">
          <Card className="rounded-none">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                <CardTitle>Admin Actions</CardTitle>
              </div>
              <CardDescription>User permission changes and administrative actions</CardDescription>
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
                    adminActions.map((log: any) => (
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
        </TabsContent>

        {/* Settings Changes Tab */}
        <TabsContent value="settings">
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
                    settingsChanges.map((log: any) => (
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
        </TabsContent>

        {/* Security Overview Tab */}
        <TabsContent value="overview">
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
                  {auditLog?.slice(0, 5).map((log: any) => (
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
        </TabsContent>
      </Tabs>
    </div>
  )
}
