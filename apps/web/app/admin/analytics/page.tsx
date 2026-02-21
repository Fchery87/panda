'use client'

import * as React from 'react'
import { useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import { useRouter } from 'next/navigation'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { ArrowLeft, BarChart3, Users, Bot, Activity, TrendingUp, Clock, Zap } from 'lucide-react'

export default function AdminAnalyticsPage() {
  const router = useRouter()
  const systemOverview = useQuery(api.admin.getSystemOverview)
  const providerAnalytics = useQuery(api.admin.getProviderAnalytics)

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
    return num.toString()
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
          <BarChart3 className="h-8 w-8" />
          <div>
            <h1 className="text-3xl font-bold">Analytics</h1>
            <p className="text-muted-foreground">Platform usage and performance metrics</p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="providers" className="flex items-center gap-2">
            <Bot className="h-4 w-4" />
            Providers
          </TabsTrigger>
          <TabsTrigger value="models" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Models
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Stats Grid */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="rounded-none">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardDescription className="font-mono text-xs uppercase">
                  Total Users
                </CardDescription>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatNumber(systemOverview?.users.total || 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {systemOverview?.users.active || 0} active
                </p>
              </CardContent>
            </Card>

            <Card className="rounded-none">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardDescription className="font-mono text-xs uppercase">
                  Total Projects
                </CardDescription>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatNumber(systemOverview?.projects.total || 0)}
                </div>
                <p className="text-xs text-muted-foreground">Across all users</p>
              </CardContent>
            </Card>

            <Card className="rounded-none">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardDescription className="font-mono text-xs uppercase">
                  Total Chats
                </CardDescription>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatNumber(systemOverview?.chats.total || 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatNumber(systemOverview?.messages.total || 0)} messages
                </p>
              </CardContent>
            </Card>

            <Card className="rounded-none">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardDescription className="font-mono text-xs uppercase">
                  Active Today
                </CardDescription>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {systemOverview?.users.recentlyActive || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  {systemOverview?.users.recentRegistrations || 0} new users
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Growth Metrics */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="rounded-none">
              <CardHeader>
                <CardTitle>User Activity</CardTitle>
                <CardDescription>Recent user engagement metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Admin Users</span>
                    <Badge variant="outline" className="rounded-none">
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
                    <span className="text-sm">Recent Registrations (24h)</span>
                    <Badge variant="default" className="rounded-none">
                      {systemOverview?.users.recentRegistrations || 0}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-none">
              <CardHeader>
                <CardTitle>Content Overview</CardTitle>
                <CardDescription>Platform content statistics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Projects per User (avg)</span>
                    <span className="font-mono">
                      {systemOverview?.users.total
                        ? (
                            (systemOverview?.projects.total || 0) / systemOverview.users.total
                          ).toFixed(1)
                        : '0'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Chats per Project (avg)</span>
                    <span className="font-mono">
                      {systemOverview?.projects.total
                        ? (
                            (systemOverview?.chats.total || 0) / systemOverview.projects.total
                          ).toFixed(1)
                        : '0'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Messages per Chat (avg)</span>
                    <span className="font-mono">
                      {systemOverview?.chats.total
                        ? (
                            (systemOverview?.messages.total || 0) / systemOverview.chats.total
                          ).toFixed(1)
                        : '0'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Providers Tab */}
        <TabsContent value="providers" className="space-y-6">
          <Card className="rounded-none">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Provider Usage</CardTitle>
                  <CardDescription>
                    Distribution of LLM provider usage across all agent runs
                  </CardDescription>
                </div>
                <Badge variant="outline" className="rounded-none font-mono">
                  {providerAnalytics?.totalRuns.toLocaleString() || 0} total runs
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {providerAnalytics?.providers.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  <Bot className="mx-auto mb-4 h-12 w-12 opacity-50" />
                  <p>No provider usage data available yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {providerAnalytics?.providers.map((provider) => {
                    const maxCount = Math.max(
                      ...(providerAnalytics?.providers.map((p) => p.count) || [1])
                    )
                    const percentage = providerAnalytics?.totalRuns
                      ? ((provider.count / providerAnalytics.totalRuns) * 100).toFixed(1)
                      : '0'

                    return (
                      <div key={provider.name} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-medium capitalize">{provider.name}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">
                              {provider.count.toLocaleString()} runs
                            </span>
                            <Badge variant="outline" className="rounded-none font-mono">
                              {percentage}%
                            </Badge>
                          </div>
                        </div>
                        <Progress
                          value={(provider.count / maxCount) * 100}
                          className="h-2 rounded-none"
                        />
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Models Tab */}
        <TabsContent value="models" className="space-y-6">
          <Card className="rounded-none">
            <CardHeader>
              <CardTitle>Top Models</CardTitle>
              <CardDescription>Most frequently used models across the platform</CardDescription>
            </CardHeader>
            <CardContent>
              {providerAnalytics?.models.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  <Zap className="mx-auto mb-4 h-12 w-12 opacity-50" />
                  <p>No model usage data available yet</p>
                </div>
              ) : (
                <ScrollArea className="h-[500px]">
                  <div className="space-y-2">
                    {providerAnalytics?.models.map((model, index) => {
                      const percentage = providerAnalytics?.totalRuns
                        ? ((model.count / providerAnalytics.totalRuns) * 100).toFixed(1)
                        : '0'

                      return (
                        <div
                          key={model.name}
                          className="flex items-center justify-between rounded-none border border-border p-4"
                        >
                          <div className="flex items-center gap-4">
                            <span className="w-8 font-mono text-sm text-muted-foreground">
                              #{index + 1}
                            </span>
                            <div>
                              <p
                                className="max-w-[300px] truncate font-mono text-sm"
                                title={model.name}
                              >
                                {model.name}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <p className="text-lg font-bold">{percentage}%</p>
                              <p className="text-xs text-muted-foreground">
                                {model.count.toLocaleString()} runs
                              </p>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
