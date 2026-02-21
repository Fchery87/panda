'use client'

import * as React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { AlertCircle, Save, Settings } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface SystemControlsProps {
  settings:
    | {
        allowUserMCP?: boolean
        allowUserSubagents?: boolean
        systemMaintenance?: boolean
        registrationEnabled?: boolean
        maxProjectsPerUser?: number
        maxChatsPerProject?: number
      }
    | undefined
  onSave: (controls: {
    allowUserMCP?: boolean
    allowUserSubagents?: boolean
    systemMaintenance?: boolean
    registrationEnabled?: boolean
    maxProjectsPerUser?: number
    maxChatsPerProject?: number
  }) => void
}

export function SystemControls({ settings, onSave }: SystemControlsProps) {
  const [controls, setControls] = React.useState({
    allowUserMCP: settings?.allowUserMCP !== false,
    allowUserSubagents: settings?.allowUserSubagents !== false,
    systemMaintenance: settings?.systemMaintenance === true,
    registrationEnabled: settings?.registrationEnabled !== false,
    maxProjectsPerUser: settings?.maxProjectsPerUser || 100,
    maxChatsPerProject: settings?.maxChatsPerProject || 50,
  })

  React.useEffect(() => {
    if (settings) {
      setControls({
        allowUserMCP: settings.allowUserMCP !== false,
        allowUserSubagents: settings.allowUserSubagents !== false,
        systemMaintenance: settings.systemMaintenance === true,
        registrationEnabled: settings.registrationEnabled !== false,
        maxProjectsPerUser: settings.maxProjectsPerUser || 100,
        maxChatsPerProject: settings.maxChatsPerProject || 50,
      })
    }
  }, [settings])

  const handleSave = () => {
    onSave({
      allowUserMCP: controls.allowUserMCP,
      allowUserSubagents: controls.allowUserSubagents,
      systemMaintenance: controls.systemMaintenance,
      registrationEnabled: controls.registrationEnabled,
      maxProjectsPerUser: controls.maxProjectsPerUser,
      maxChatsPerProject: controls.maxChatsPerProject,
    })
  }

  return (
    <Card className="rounded-none">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          <CardTitle>System Controls</CardTitle>
        </div>
        <CardDescription>Configure system-wide settings and feature toggles</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {controls.systemMaintenance && (
          <Alert variant="destructive" className="rounded-none">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              System is in maintenance mode. Only admins can access the application.
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-6">
          {/* Feature Toggles */}
          <div className="space-y-4">
            <h3 className="font-mono text-sm uppercase tracking-wider">Feature Toggles</h3>

            <div className="flex items-center justify-between">
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

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="font-mono text-sm">MCP Servers</Label>
                <p className="text-sm text-muted-foreground">
                  Allow users to configure MCP servers
                </p>
              </div>
              <Switch
                checked={controls.allowUserMCP}
                onCheckedChange={(checked) =>
                  setControls((prev) => ({ ...prev, allowUserMCP: checked }))
                }
              />
            </div>

            <div className="flex items-center justify-between">
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
          </div>

          <Separator />

          {/* Resource Limits */}
          <div className="space-y-4">
            <h3 className="font-mono text-sm uppercase tracking-wider">Resource Limits</h3>

            <div className="grid gap-4 md:grid-cols-2">
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
              </div>
            </div>
          </div>

          <Separator />

          {/* Maintenance Mode */}
          <div className="space-y-4">
            <h3 className="font-mono text-sm uppercase tracking-wider">Maintenance</h3>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="font-mono text-sm">Maintenance Mode</Label>
                <p className="text-sm text-muted-foreground">
                  Enable maintenance mode to restrict access to admins only
                </p>
              </div>
              <Switch
                checked={controls.systemMaintenance}
                onCheckedChange={(checked) =>
                  setControls((prev) => ({ ...prev, systemMaintenance: checked }))
                }
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSave} className="rounded-none">
            <Save className="mr-2 h-4 w-4" />
            Save System Controls
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
