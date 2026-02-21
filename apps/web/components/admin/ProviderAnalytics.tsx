'use client'

import * as React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Bot, BarChart3 } from 'lucide-react'

interface ProviderAnalyticsProps {
  data:
    | {
        totalRuns: number
        providers: { name: string; count: number }[]
        models: { name: string; count: number }[]
      }
    | undefined
}

export function ProviderAnalytics({ data }: ProviderAnalyticsProps) {
  if (!data) {
    return (
      <Card className="rounded-none">
        <CardHeader>
          <CardTitle>Provider Analytics</CardTitle>
          <CardDescription>Loading analytics data...</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const maxProviderCount = Math.max(...data.providers.map((p) => p.count), 1)

  return (
    <div className="space-y-6">
      <Card className="rounded-none">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              <CardTitle>Usage Overview</CardTitle>
            </div>
            <Badge variant="outline" className="rounded-none font-mono">
              {data.totalRuns.toLocaleString()} total runs
            </Badge>
          </div>
          <CardDescription>Analytics based on agent runs across all users</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-8 md:grid-cols-2">
            {/* Provider Usage */}
            <div className="space-y-4">
              <h3 className="font-mono text-sm uppercase tracking-wider">Provider Usage</h3>
              <div className="space-y-3">
                {data.providers.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No provider usage data yet</p>
                ) : (
                  data.providers.map((provider) => (
                    <div key={provider.name} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium capitalize">{provider.name}</span>
                        <span className="font-mono text-muted-foreground">
                          {provider.count.toLocaleString()}
                        </span>
                      </div>
                      <Progress
                        value={(provider.count / maxProviderCount) * 100}
                        className="h-2 rounded-none"
                      />
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Model Usage */}
            <div className="space-y-4">
              <h3 className="font-mono text-sm uppercase tracking-wider">Top Models</h3>
              <div className="space-y-2">
                {data.models.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No model usage data yet</p>
                ) : (
                  data.models.slice(0, 10).map((model, index) => (
                    <div
                      key={model.name}
                      className="flex items-center justify-between rounded-none border border-border p-2"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-6 font-mono text-xs text-muted-foreground">
                          {index + 1}
                        </span>
                        <span className="max-w-[200px] truncate font-mono text-sm">
                          {model.name}
                        </span>
                      </div>
                      <Badge variant="outline" className="rounded-none font-mono text-xs">
                        {model.count}
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-none">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            <CardTitle>Model Distribution</CardTitle>
          </div>
          <CardDescription>Most frequently used models across the platform</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {data.models.slice(0, 6).map((model) => {
              const percentage =
                data.totalRuns > 0 ? ((model.count / data.totalRuns) * 100).toFixed(1) : '0'

              return (
                <div key={model.name} className="rounded-none border border-border p-4 text-center">
                  <p className="mb-2 truncate font-mono text-sm" title={model.name}>
                    {model.name}
                  </p>
                  <p className="text-2xl font-bold">{percentage}%</p>
                  <p className="text-xs text-muted-foreground">
                    {model.count.toLocaleString()} runs
                  </p>
                </div>
              )
            })}

            {data.models.length === 0 && (
              <div className="col-span-3 py-8 text-center text-muted-foreground">
                No model usage data available
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
