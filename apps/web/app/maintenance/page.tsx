import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { PandaLogo } from '@/components/ui/panda-logo'

export default function MaintenancePage() {
  return (
    <div
      id="main-content"
      className="flex min-h-screen flex-col items-center justify-center gap-8 p-4 text-center"
    >
      <PandaLogo size="lg" />
      <div className="space-y-3">
        <h1 className="text-display text-3xl">Access Limited</h1>
        <p className="max-w-md text-muted-foreground">
          The platform is temporarily restricted by an administrator. Sign-in may be disabled while
          maintenance or onboarding controls are active.
        </p>
      </div>
      <Link href="/">
        <Button className="rounded-none font-mono">Return Home</Button>
      </Link>
    </div>
  )
}
