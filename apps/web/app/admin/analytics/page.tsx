'use client'

import * as React from 'react'
import { useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Users, Bot, Activity, TrendingUp, Clock, Zap, CalendarRange, BarChart3 } from 'lucide-react'
import { AdminSubNav, AdminPageHeader } from '@/components/admin/AdminSubNav'

import {
  readAdminDateQueryParam,
  readAdminEnumQueryParam,
  useAdminQueryUpdater,
} from '@/lib/admin/query-state'

const analyticsTabs = ['overview', 'providers', 'models'] as const

const subNavItems = [
  { id: 'overview', label: 'Overview', icon: Activity },
  { id: 'providers', label: 'Providers', icon: Bot },
  { id: 'models', label: 'Top Models', icon: Zap },
]

function formatNumber(num: number) {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
  return num.toString()
}

function formatRangeLabel(fromDate: string, toDate: string) {
  if (fromDate && toDate) return `${fromDate} to ${toDate}`
  if (fromDate) return `From ${fromDate}`
  if (toDate) return `Until ${toDate}`
  return 'All time'
}

export default function AdminAnalyticsPage() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const activeTab = readAdminEnumQueryParam(searchParams, 'tab', analyticsTabs, 'overview')
  const fromDate = readAdminDateQueryParam(searchParams, 'from')
  const toDate = readAdminDateQueryParam(searchParams, 'to')

  const systemOverview = useQuery(api.admin.getSystemOverview)
  const providerAnalytics = useQuery(api.admin.getProviderAnalytics, {
    fromDate: fromDate || undefined,
    toDate: toDate || undefined,
  })

  const updateQuery = useAdminQueryUpdater(pathname, router, searchParams)

  const dateRangeLabel = formatRangeLabel(fromDate, toDate)
  const hasDateRange = Boolean(fromDate || toDate)

  return (
    <div className="p-8">
      <AdminPageHeader
        icon={BarChart3}
        title="Analytics"
        description="Platform usage and performance metrics"
      />

      <Card className="mb-6 rounded-none">
        <CardContent className="pt-6">
          <div className="grid gap-4 lg:grid-cols-[1fr_1fr_1fr_auto]">
            <div className="space-y-2">
              <Label htmlFor="analytics-from-date" className="font-mono text-sm">
                From date
              </Label>
              <Input
                id="analytics-from-date"
                type="date"
                value={fromDate}
                max={toDate || undefined}
                onChange={(e) => updateQuery({ from: e.target.value || null })}
                className="rounded-none"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="analytics-to-date" className="font-mono text-sm">
                To date
              </Label>
              <Input
                id="analytics-to-date"
                type="date"
                value={toDate}
                min={fromDate || undefined}
                onChange={(e) => updateQuery({ to: e.target.value || null })}
                className="rounded-none"
              />
            </div>

            <div className="space-y-2">
              <Label className="font-mono text-sm">Range</Label>
              <div className="flex h-10 items-center gap-2 rounded-none border border-border px-3">
                <CalendarRange className="h-4 w-4 text-muted-foreground" />
                <span className="truncate text-sm text-muted-foreground">{dateRangeLabel}</span>
              </div>
            </div>

            <div className="flex items-end">
              <Button
                type="button"
                variant="outline"
                className="rounded-none"
                onClick={() => updateQuery({ from: null, to: null })}
                disabled={!hasDateRange}
              >
                Clear Range
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

        <div className="min-w-0 flex-1 space-y-6">
          {activeTab === 'overview' && (
            <>
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
            </>
          )}

          {activeTab === 'providers' && (
            <Card className="rounded-none">
              <CardHeader>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <CardTitle>Provider Usage</CardTitle>
                    <CardDescription>
                      Distribution of LLM provider usage across all agent runs
                    </CardDescription>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="rounded-none font-mono">
                      {providerAnalytics?.totalRuns.toLocaleString() || 0} total runs
                    </Badge>
                    <Badge variant="outline" className="rounded-none font-mono">
                      {dateRangeLabel}
                    </Badge>
                  </div>
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
          )}

          {activeTab === 'models' && (
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
          )}
        </div>
      </div>
    </div>
  )
}
