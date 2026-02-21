'use client'

import * as React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, FolderGit, MessageSquare, Activity } from 'lucide-react'

interface SystemOverviewProps {
  data:
    | {
        users: {
          total: number
          active: number
          admins: number
          banned: number
          recentRegistrations: number
          recentlyActive: number
        }
        projects: {
          total: number
        }
        chats: {
          total: number
        }
        messages: {
          total: number
        }
      }
    | undefined
}

export function SystemOverview({ data }: SystemOverviewProps) {
  if (!data) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="rounded-none">
            <CardHeader className="pb-2">
              <CardDescription>Loading...</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-8 w-24 animate-pulse bg-muted" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  const stats = [
    {
      title: 'Total Users',
      value: data.users.total,
      description: `${data.users.active} active, ${data.users.admins} admins`,
      icon: Users,
      color: 'text-blue-500',
    },
    {
      title: 'Total Projects',
      value: data.projects.total,
      description: 'Across all users',
      icon: FolderGit,
      color: 'text-green-500',
    },
    {
      title: 'Total Chats',
      value: data.chats.total,
      description: `${data.messages.total} messages total`,
      icon: MessageSquare,
      color: 'text-purple-500',
    },
    {
      title: 'Active Today',
      value: data.users.recentlyActive,
      description: `${data.users.recentRegistrations} new registrations`,
      icon: Activity,
      color: 'text-amber-500',
    },
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.title} className="shadow-sharp-sm rounded-none">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardDescription className="font-mono text-xs uppercase tracking-wider">
                {stat.title}
              </CardDescription>
              <CardTitle className="mt-1 text-3xl font-bold">{stat.value}</CardTitle>
            </div>
            <stat.icon className={`h-5 w-5 ${stat.color}`} />
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">{stat.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
