'use client'

import { appLog } from '@/lib/logger'
import * as React from 'react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import { toast } from 'sonner'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ArrowLeft, Settings, Save, AlertCircle, Bot, Server, Lock, Sparkles } from 'lucide-react'
import { EnhancementLLMConfig } from '@/components/settings/EnhancementLLMConfig'

import { readAdminEnumQueryParam, useAdminQueryUpdater } from '@/lib/admin/query-state'
import { getEnhancementProviderOptions } from '@/lib/admin/enhancement-provider-options'

const systemTabs = ['features', 'llm', 'access', 'limits'] as const

export default function AdminSystemPage() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const activeTab = readAdminEnumQueryParam(searchParams, 'tab', systemTabs, 'features')
  const settings = useQuery(api.admin.getSettings)
  const updateSettings = useMutation(api.admin.updateSettings)
  const [isSaving, setIsSaving] = React.useState(false)

  const [controls, setControls] = React.useState({
    allowUserOverrides: true,
    allowUserMCP: true,
    allowUserSubagents: true,
    systemMaintenance: false,
    registrationEnabled: true,
    maxProjectsPerUser: 100,
    maxChatsPerProject: 50,
  })

  const [enhancementConfig, setEnhancementConfig] = React.useState({
    enhancementProvider: 'openai',
    enhancementModel: 'gpt-4o-mini',
  })

  const [pendingMaintenance, setPendingMaintenance] = React.useState<boolean | null>(null)

  const serverStateRef = React.useRef<{ controls: typeof controls; enhancementConfig: typeof enhancementConfig } | null>(null)

  React.useEffect(() => {
    if (settings) {
      const newControls = {
        allowUserOverrides: settings.allowUserOverrides !== false,
        allowUserMCP: settings.allowUserMCP !== false,
        allowUserSubagents: settings.allowUserSubagents !== false,
        systemMaintenance: settings.systemMaintenance === true,
        registrationEnabled: settings.registrationEnabled !== false,
        maxProjectsPerUser: settings.maxProjectsPerUser || 100,
        maxChatsPerProject: settings.maxChatsPerProject || 50,
      }
      const newEnhancementConfig = {
        enhancementProvider: settings.enhancementProvider || 'openai',
        enhancementModel: settings.enhancementModel || 'gpt-4o-mini',
      }
      setControls(newControls)
      setEnhancementConfig(newEnhancementConfig)
      serverStateRef.current = { controls: newControls, enhancementConfig: newEnhancementConfig }
    }
  }, [settings])

  const isDirty = React.useMemo(() => {
    if (!serverStateRef.current) return false
    return (
      JSON.stringify(controls) !== JSON.stringify(serverStateRef.current.controls) ||
      JSON.stringify(enhancementConfig) !== JSON.stringify(serverStateRef.current.enhancementConfig)
    )
  }, [controls, enhancementConfig])

  React.useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault()
      }
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [isDirty])

  const updateQuery = useAdminQueryUpdater(pathname, router, searchParams)

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await updateSettings({
        allowUserOverrides: controls.allowUserOverrides,
        allowUserMCP: controls.allowUserMCP,
        allowUserSubagents: controls.allowUserSubagents,
        systemMaintenance: controls.systemMaintenance,
        registrationEnabled: controls.registrationEnabled,
        maxProjectsPerUser: controls.maxProjectsPerUser,
        maxChatsPerProject: controls.maxChatsPerProject,
        enhancementProvider: enhancementConfig.enhancementProvider,
        enhancementModel: enhancementConfig.enhancementModel,
      })
      serverStateRef.current = { controls: { ...controls }, enhancementConfig: { ...enhancementConfig } }
      toast.success('System settings saved successfully')
    } catch (error) {
      toast.error('Failed to save settings')
      appLog.error(error)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="container mx-auto p-8">
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
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Settings className="h-8 w-8" />
            <div>
              <h1 className="text-3xl font-bold">System Controls</h1>
              <p className="text-muted-foreground">
                Configure system-wide settings and feature toggles
              </p>
            </div>
          </div>
          <Button onClick={handleSave} disabled={isSaving || !isDirty} className="rounded-none">
            {isSaving ? (
              <>Saving...</>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                {isDirty ? 'Save Changes' : 'Saved'}
              </>
            )}
          </Button>
        </div>
      </div>

      {controls.systemMaintenance && (
        <Alert variant="destructive" className="mb-6 rounded-none">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="font-medium">
            System is in maintenance mode. Only admins can access the application.
          </AlertDescription>
        </Alert>
      )}

      <Tabs
        value={activeTab}
        onValueChange={(value) => updateQuery({ tab: value })}
        className="space-y-6"
      >
        <TabsList className="grid w-full grid-cols-4 lg:w-[500px]">
          <TabsTrigger value="features" className="flex items-center gap-2">
            <Bot className="h-4 w-4" />
            Features
          </TabsTrigger>
          <TabsTrigger value="llm" className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            LLM
          </TabsTrigger>
          <TabsTrigger value="access" className="flex items-center gap-2">
            <Lock className="h-4 w-4" />
            Access
          </TabsTrigger>
          <TabsTrigger value="limits" className="flex items-center gap-2">
            <Server className="h-4 w-4" />
            Limits
          </TabsTrigger>
        </TabsList>

        <TabsContent value="features" className="space-y-6">
          <Card className="rounded-none">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Bot className="h-5 w-5" />
                <CardTitle>Feature Toggles</CardTitle>
              </div>
              <CardDescription>Enable or disable features for all users</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between rounded-none border border-border p-4">
                <div className="space-y-0.5">
                  <Label className="font-mono text-sm">User Registration</Label>
                  <p className="text-sm text-muted-foreground">
                    Allow new users to register for the platform
                  </p>
                </div>
                <Switch
                  checked={controls.registrationEnabled}
                  onCheckedChange={(checked) =>
                    setControls((prev) => ({ ...prev, registrationEnabled: checked }))
                  }
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between rounded-none border border-border p-4">
                <div className="space-y-0.5">
                  <Label className="font-mono text-sm">MCP Servers</Label>
                  <p className="text-sm text-muted-foreground">
                    Allow users to configure and use MCP servers
                  </p>
                </div>
                <Switch
                  checked={controls.allowUserMCP}
                  onCheckedChange={(checked) =>
                    setControls((prev) => ({ ...prev, allowUserMCP: checked }))
                  }
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between rounded-none border border-border p-4">
                <div className="space-y-0.5">
                  <Label className="font-mono text-sm">Custom Subagents</Label>
                  <p className="text-sm text-muted-foreground">
                    Allow users to create custom subagents
                  </p>
                </div>
                <Switch
                  checked={controls.allowUserSubagents}
                  onCheckedChange={(checked) =>
                    setControls((prev) => ({ ...prev, allowUserSubagents: checked }))
                  }
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between rounded-none border border-border p-4">
                <div className="space-y-0.5">
                  <Label className="font-mono text-sm">LLM Provider Overrides</Label>
                  <p className="text-sm text-muted-foreground">
                    Allow users to override global LLM settings
                  </p>
                </div>
                <Switch
                  checked={controls.allowUserOverrides}
                  onCheckedChange={(checked) =>
                    setControls((prev) => ({ ...prev, allowUserOverrides: checked }))
                  }
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="llm" className="space-y-6">
          <EnhancementLLMConfig
            enhancementProvider={enhancementConfig.enhancementProvider}
            enhancementModel={enhancementConfig.enhancementModel}
            onUpdate={(config) =>
              setEnhancementConfig({
                enhancementProvider: config.enhancementProvider,
                enhancementModel: config.enhancementModel,
              })
            }
            availableProviders={getEnhancementProviderOptions()}
          />
        </TabsContent>

        <TabsContent value="access" className="space-y-6">
          <Card className="rounded-none border-destructive">
            <CardHeader>
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-destructive" />
                <CardTitle className="text-destructive">Maintenance Mode</CardTitle>
              </div>
              <CardDescription>Restrict access to administrators only</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between rounded-none border border-destructive/20 bg-destructive/5 p-4">
                <div className="space-y-0.5">
                  <Label className="font-mono text-sm text-destructive">
                    Enable Maintenance Mode
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Only administrators will be able to access the platform
                  </p>
                </div>
                <Switch
                  checked={controls.systemMaintenance}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setPendingMaintenance(true)
                    } else {
                      setControls((prev) => ({ ...prev, systemMaintenance: false }))
                    }
                  }}
                />
              </div>

              {controls.systemMaintenance && (
                <Alert className="rounded-none">
                  <AlertDescription>
                    When maintenance mode is active, all non-admin users will be redirected to a
                    maintenance page. Be careful with this setting.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-none">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                <CardTitle>Access Information</CardTitle>
              </div>
              <CardDescription>Current system access status</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-none border border-border p-4">
                  <p className="mb-1 text-sm text-muted-foreground">Registration Status</p>
                  <Badge
                    variant={controls.registrationEnabled ? 'default' : 'destructive'}
                    className="rounded-none"
                  >
                    {controls.registrationEnabled ? 'OPEN' : 'CLOSED'}
                  </Badge>
                </div>

                <div className="rounded-none border border-border p-4">
                  <p className="mb-1 text-sm text-muted-foreground">System Status</p>
                  <Badge
                    variant={controls.systemMaintenance ? 'destructive' : 'default'}
                    className="rounded-none"
                  >
                    {controls.systemMaintenance ? 'MAINTENANCE' : 'OPERATIONAL'}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="limits" className="space-y-6">
          <Card className="rounded-none">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Server className="h-5 w-5" />
                <CardTitle>Resource Limits</CardTitle>
              </div>
              <CardDescription>
                Set per-user resource limits to manage platform capacity
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="max-projects" className="font-mono text-sm">
                    Max Projects Per User
                  </Label>
                  <Input
                    id="max-projects"
                    type="number"
                    min={1}
                    max={1000}
                    value={controls.maxProjectsPerUser}
                    onChange={(e) =>
                      setControls((prev) => ({
                        ...prev,
                        maxProjectsPerUser: parseInt(e.target.value) || 100,
                      }))
                    }
                    className="rounded-none"
                  />
                  <p className="text-xs text-muted-foreground">
                    Maximum number of projects a user can create
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="max-chats" className="font-mono text-sm">
                    Max Chats Per Project
                  </Label>
                  <Input
                    id="max-chats"
                    type="number"
                    min={1}
                    max={500}
                    value={controls.maxChatsPerProject}
                    onChange={(e) =>
                      setControls((prev) => ({
                        ...prev,
                        maxChatsPerProject: parseInt(e.target.value) || 50,
                      }))
                    }
                    className="rounded-none"
                  />
                  <p className="text-xs text-muted-foreground">
                    Maximum number of chats per project
                  </p>
                </div>
              </div>

              <Separator />

              <div className="rounded-none bg-muted p-4">
                <p className="text-sm text-muted-foreground">
                  <strong>Note:</strong> These limits are enforced when users create new projects
                  and chats. Existing projects and chats are not retroactively trimmed.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={pendingMaintenance !== null} onOpenChange={(open) => { if (!open) setPendingMaintenance(null) }}>
        <DialogContent className="rounded-none font-mono">
          <DialogHeader>
            <DialogTitle>Enable Maintenance Mode?</DialogTitle>
            <DialogDescription>
              All non-admin users will be immediately locked out of the platform. This takes effect when you save changes.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              className="rounded-none"
              onClick={() => setPendingMaintenance(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="rounded-none"
              onClick={() => {
                setControls((prev) => ({ ...prev, systemMaintenance: true }))
                setPendingMaintenance(null)
              }}
            >
              Enable Maintenance Mode
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
