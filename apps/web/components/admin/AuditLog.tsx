'use client'

import * as React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Shield, Clock } from 'lucide-react'

interface AuditLogProps {
  logs:
    | {
        _id: string
        action: string
        resource: string
        resourceId?: string
        details?: Record<string, unknown>
        createdAt: number
        user?: { name?: string; email?: string } | null
      }[]
    | undefined
}

const actionColors: Record<string, string> = {
  GRANT_ADMIN: 'bg-green-500/10 text-green-500 border-green-500/20',
  REVOKE_ADMIN: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  BAN_USER: 'bg-red-500/10 text-red-500 border-red-500/20',
  UNBAN_USER: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  DELETE_USER: 'bg-red-500/10 text-red-500 border-red-500/20',
  UPDATE_SETTINGS: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
}

export function AuditLog({ logs }: AuditLogProps) {
  if (!logs) {
    return (
      <Card className="rounded-none">
        <CardHeader>
          <CardTitle>Audit Log</CardTitle>
          <CardDescription>Loading audit log...</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card className="rounded-none">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          <CardTitle>Audit Log</CardTitle>
        </div>
        <CardDescription>Recent administrative actions and system changes</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px]">
          <div className="space-y-2">
            {logs.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">No audit log entries</div>
            ) : (
              logs.map((log) => (
                <div
                  key={log._id}
                  className="flex items-start gap-4 rounded-none border border-border p-4 transition-colors hover:bg-muted/50"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        variant="outline"
                        className={`rounded-none font-mono text-xs ${actionColors[log.action] || ''}`}
                      >
                        {log.action}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        on <span className="font-mono">{log.resource}</span>
                      </span>
                    </div>

                    <p className="mt-1 text-sm">
                      {log.user ? (
                        <>
                          <span className="font-medium">{log.user.name || log.user.email}</span>
                        </>
                      ) : (
                        <span className="text-muted-foreground">System</span>
                      )}
                    </p>

                    {log.details && Object.keys(log.details).length > 0 && (
                      <div className="mt-2 rounded-none bg-muted p-2 font-mono text-xs text-muted-foreground">
                        {JSON.stringify(log.details, null, 2)}
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
  )
}
