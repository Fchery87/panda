'use client'

import * as React from 'react'
import Link from 'next/link'
import { useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { SystemOverview } from '@/components/admin/SystemOverview'
import { ArrowRight, BarChart3, Settings, Shield, Users } from 'lucide-react'

type AdminRouteCard = {
  href: string
  title: string
  description: string
  icon: React.ComponentType<{ className?: string }>
}

const adminRouteCards: AdminRouteCard[] = [
  {
    href: '/admin/users',
    title: 'User Management',
    description:
      'Search, inspect, and manage user accounts. Grant or revoke admin access, ban users, and handle deletions.',
    icon: Users,
  },
  {
    href: '/admin/analytics',
    title: 'Analytics',
    description:
      'Platform usage metrics — active users, project counts, provider distribution, and model usage over time.',
    icon: BarChart3,
  },
  {
    href: '/admin/system',
    title: 'System Controls',
    description:
      'Feature toggles, maintenance mode, global LLM defaults, access policy, and per-user resource limits.',
    icon: Settings,
  },
  {
    href: '/admin/security',
    title: 'Security',
    description:
      'Full audit trail of admin actions — permission changes, user bans, deletions, and settings updates.',
    icon: Shield,
  },
]

export default function AdminDashboardPage() {
  const systemOverview = useQuery(api.admin.getSystemOverview)

  return (
    <div className="container mx-auto max-w-7xl p-8">
      <div className="mb-8">
        <div className="mb-2 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center bg-primary font-mono text-lg font-bold text-primary-foreground">
            A
          </div>
          <div>
            <h1 className="text-display text-3xl">Admin Console</h1>
            <p className="text-muted-foreground">
              System overview and routing hub for administrative tools
            </p>
          </div>
        </div>
        <p className="max-w-3xl text-sm text-muted-foreground">
          This page shows the current system state at a glance. To make changes, navigate to the
          dedicated tool for users, analytics, system controls, or security below.
        </p>
      </div>

      <div className="space-y-6">
        <SystemOverview data={systemOverview} />

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {adminRouteCards.map((card) => (
            <Card
              key={card.title}
              className="group rounded-none transition-colors hover:bg-muted/20"
            >
              <CardHeader>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <card.icon className="h-5 w-5" />
                    <CardTitle>{card.title}</CardTitle>
                  </div>
                  <CardDescription>{card.description}</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <Button asChild variant="outline" className="w-full rounded-none font-mono">
                  <Link href={card.href}>
                    Open {card.title}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
