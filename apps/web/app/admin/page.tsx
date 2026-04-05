'use client'

import * as React from 'react'
import Link from 'next/link'
import { useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { SystemOverview } from '@/components/admin/SystemOverview'
import { ArrowRight, BarChart3, Settings, Shield, Users } from 'lucide-react'

type AdminRouteCard = {
  href: string
  title: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  badge: string
}

const adminRouteCards: AdminRouteCard[] = [
  {
    href: '/admin/users',
    title: 'User Management',
    description: 'Inspect accounts, grant access, ban users, and handle account deletion.',
    icon: Users,
    badge: 'Dedicated',
  },
  {
    href: '/admin/analytics',
    title: 'Analytics',
    description: 'Review provider and model usage with the operational analytics view.',
    icon: BarChart3,
    badge: 'Dedicated',
  },
  {
    href: '/admin/system',
    title: 'System Controls',
    description: 'Manage maintenance, access, limits, and the LLM configuration tab.',
    icon: Settings,
    badge: 'Dedicated',
  },
  {
    href: '/admin/security',
    title: 'Security',
    description: 'Review audit logs and security-sensitive administrative actions.',
    icon: Shield,
    badge: 'Dedicated',
  },
]

export default function AdminDashboardPage() {
  const systemOverview = useQuery(api.admin.getSystemOverview)
  const adminSettings = useQuery(api.admin.getSettings)

  return (
    <div className="container mx-auto max-w-7xl p-8">
      <div className="mb-8">
        <div className="mb-2 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center bg-primary font-mono text-lg font-bold text-primary-foreground">
            A
          </div>
          <div>
            <h1 className="text-3xl font-bold">Admin Dashboard</h1>
            <p className="text-muted-foreground">
              Overview and routing hub for the dedicated admin surfaces
            </p>
          </div>
        </div>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Use this page to review the current system state and jump into the dedicated tools for
          users, analytics, system controls, and security. Operational editing lives in the routed
          pages, not here.
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
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <card.icon className="h-5 w-5" />
                      <CardTitle>{card.title}</CardTitle>
                    </div>
                    <CardDescription>{card.description}</CardDescription>
                  </div>
                  <Badge variant="outline" className="rounded-none font-mono text-xs uppercase">
                    {card.badge}
                  </Badge>
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

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="rounded-none">
            <CardHeader>
              <CardTitle>Current Access Status</CardTitle>
              <CardDescription>High-level summary of the current platform policy</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {adminSettings ? (
                <>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sm text-muted-foreground">Registration</span>
                    <Badge
                      variant={
                        adminSettings.registrationEnabled !== false ? 'default' : 'destructive'
                      }
                      className="rounded-none"
                    >
                      {adminSettings.registrationEnabled !== false ? 'Enabled' : 'Disabled'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sm text-muted-foreground">Maintenance</span>
                    <Badge
                      variant={adminSettings.systemMaintenance ? 'destructive' : 'outline'}
                      className="rounded-none"
                    >
                      {adminSettings.systemMaintenance ? 'On' : 'Off'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sm text-muted-foreground">Global provider</span>
                    <span className="font-mono text-sm">
                      {adminSettings.globalDefaultProvider || 'Not set'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sm text-muted-foreground">Global model</span>
                    <span className="font-mono text-sm">
                      {adminSettings.globalDefaultModel || 'Not set'}
                    </span>
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Loading access status...</p>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-none">
            <CardHeader>
              <CardTitle>Operational Routing</CardTitle>
              <CardDescription>
                Dedicated admin routes are the single source of truth for changes.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { label: 'User management', href: '/admin/users' },
                { label: 'Analytics', href: '/admin/analytics' },
                { label: 'System controls and LLM config', href: '/admin/system' },
                { label: 'Security audit', href: '/admin/security' },
              ].map((item) => (
                <div key={item.href} className="flex items-center justify-between gap-4">
                  <span className="text-sm text-muted-foreground">{item.label}</span>
                  <Button asChild variant="ghost" size="sm" className="rounded-none font-mono">
                    <Link href={item.href}>Open {item.label}</Link>
                  </Button>
                </div>
              ))}

              <Separator />

              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                No operational tabs are rendered here anymore.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
