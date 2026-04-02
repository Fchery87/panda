import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { PandaLogo } from '@/components/ui/panda-logo'
import {
  getMaintenancePageAccessState,
  getMaintenanceReasonFromSearchParams,
} from '@/lib/auth/access-state'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Maintenance',
  description: 'Panda.ai is temporarily restricted by an administrator.',
}

interface MaintenancePageProps {
  searchParams?: Promise<{ reason?: string }>
}

export default async function MaintenancePage({ searchParams }: MaintenancePageProps) {
  const resolvedSearchParams = (await searchParams) ?? undefined
  const reason = getMaintenanceReasonFromSearchParams(resolvedSearchParams)
  const accessState = getMaintenancePageAccessState(reason)

  return (
    <main
      id="main-content"
      className="flex min-h-screen flex-col items-center justify-center gap-8 p-4 text-center"
    >
      <PandaLogo size="lg" />
      <div className="space-y-3">
        <h1 className="text-display text-3xl">{accessState.title}</h1>
        <p className="max-w-md text-muted-foreground">{accessState.message}</p>
      </div>
      <Link href="/">
        <Button className="rounded-none font-mono">Return Home</Button>
      </Link>
    </main>
  )
}
