'use client'

import * as React from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '@convex/_generated/api'
import { toast } from 'sonner'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { GlobalLLMConfig } from '@/components/admin/GlobalLLMConfig'
import { UserManagementTable } from '@/components/admin/UserManagementTable'
import { SystemOverview } from '@/components/admin/SystemOverview'
import { ProviderAnalytics } from '@/components/admin/ProviderAnalytics'
import { SystemControls } from '@/components/admin/SystemControls'
import { AuditLog } from '@/components/admin/AuditLog'
import { LayoutDashboard, Users, Settings, BarChart3, Shield, Bot, Activity } from 'lucide-react'

export default function AdminDashboardPage() {
  const systemOverview = useQuery(api.admin.getSystemOverview)
  const adminSettings = useQuery(api.admin.getSettings)
  const providerAnalytics = useQuery(api.admin.getProviderAnalytics)
  const auditLog = useQuery(api.admin.getAuditLog, { limit: 50 })

  const updateSettings = useMutation(api.admin.updateSettings)

  const handleSaveGlobalLLM = async (config: {
    globalDefaultProvider?: string
    globalDefaultModel?: string
    globalProviderConfigs?: Record<string, Record<string, unknown>>
  }) => {
    try {
      await updateSettings(config)
      toast.success('Global LLM configuration saved')
    } catch (error) {
      toast.error('Failed to save configuration')
      console.error(error)
    }
  }

  const handleSaveSystemControls = async (controls: {
    allowUserOverrides?: boolean
    allowUserMCP?: boolean
    allowUserSubagents?: boolean
    systemMaintenance?: boolean
    registrationEnabled?: boolean
    maxProjectsPerUser?: number
    maxChatsPerProject?: number
  }) => {
    try {
      await updateSettings(controls)
      toast.success('System controls saved')
    } catch (error) {
      toast.error('Failed to save system controls')
      console.error(error)
    }
  }

  return (
    <div className="container mx-auto p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="mb-2 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center bg-primary font-mono text-lg font-bold text-primary-foreground">
            A
          </div>
          <div>
            <h1 className="text-3xl font-bold">Admin Dashboard</h1>
            <p className="text-muted-foreground">System administration and configuration</p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5 lg:w-[700px]">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <LayoutDashboard className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Users
          </TabsTrigger>
          <TabsTrigger value="llm" className="flex items-center gap-2">
            <Bot className="h-4 w-4" />
            LLM Config
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="system" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            System
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <SystemOverview data={systemOverview} />

          <div className="grid gap-6 md:grid-cols-2">
            <Card className="rounded-none">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Recent Activity
                </CardTitle>
                <CardDescription>Latest administrative actions</CardDescription>
              </CardHeader>
              <CardContent>
                {auditLog ? (
                  <div className="space-y-3">
                    {auditLog.slice(0, 5).map((log, i) => (
                      <div key={i} className="flex items-start gap-3 text-sm">
                        <Badge variant="outline" className="rounded-none font-mono text-xs">
                          {log.action}
                        </Badge>
                        <div className="flex-1">
                          <p className="text-muted-foreground">
                            {log.user ? `${log.user.name || log.user.email}` : 'System'}
                            <span className="text-xs">
                              {new Date(log.createdAt).toLocaleString()}
                            </span>
                          </p>
                        </div>
                      </div>
                    ))}
                    {auditLog.length === 0 && (
                      <p className="py-4 text-center text-muted-foreground">No recent activity</p>
                    )}
                  </div>
                ) : (
                  <p className="text-muted-foreground">Loading...</p>
                )}
              </CardContent>
            </Card>

            <Card className="rounded-none">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  System Status
                </CardTitle>
                <CardDescription>Current system configuration</CardDescription>
              </CardHeader>
              <CardContent>
                {adminSettings ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Registration</span>
                      <Badge
                        variant={
                          adminSettings.registrationEnabled !== false ? 'default' : 'destructive'
                        }
                        className="rounded-none"
                      >
                        {adminSettings.registrationEnabled !== false ? 'Enabled' : 'Disabled'}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">User Overrides</span>
                      <Badge
                        variant={
                          adminSettings.allowUserOverrides !== false ? 'default' : 'secondary'
                        }
                        className="rounded-none"
                      >
                        {adminSettings.allowUserOverrides !== false ? 'Allowed' : 'Disabled'}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">MCP Servers</span>
                      <Badge
                        variant={adminSettings.allowUserMCP !== false ? 'default' : 'secondary'}
                        className="rounded-none"
                      >
                        {adminSettings.allowUserMCP !== false ? 'Allowed' : 'Disabled'}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Subagents</span>
                      <Badge
                        variant={
                          adminSettings.allowUserSubagents !== false ? 'default' : 'secondary'
                        }
                        className="rounded-none"
                      >
                        {adminSettings.allowUserSubagents !== false ? 'Allowed' : 'Disabled'}
                      </Badge>
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                      <span className="text-sm">Global Provider</span>
                      <span className="font-mono text-sm">
                        {adminSettings.globalDefaultProvider || 'Not set'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm">Global Model</span>
                      <span className="font-mono text-sm">
                        {adminSettings.globalDefaultModel || 'Not set'}
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground">Loading...</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users">
          <UserManagementTable />
        </TabsContent>

        {/* LLM Config Tab */}
        <TabsContent value="llm">
          <GlobalLLMConfig settings={adminSettings} onSave={handleSaveGlobalLLM} />
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics">
          <ProviderAnalytics data={providerAnalytics} />
        </TabsContent>

        {/* System Tab */}
        <TabsContent value="system">
          <SystemControls settings={adminSettings} onSave={handleSaveSystemControls} />

          <Separator className="my-6" />

          <AuditLog logs={auditLog} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
