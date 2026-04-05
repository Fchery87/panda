import Link from 'next/link'
import { PandaLogo } from '@/components/ui/panda-logo'

export function PublicFooter() {
  return (
    <footer className="border-t border-border py-8">
      <div className="container">
        <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
          <PandaLogo size="sm" variant="full" />
          <nav className="flex gap-6 font-mono text-sm text-muted-foreground">
            <Link href="/education" className="transition-sharp hover:text-foreground">
              How It Works
            </Link>
            <Link href="/login" className="transition-sharp hover:text-foreground">
              Sign In
            </Link>
          </nav>
          <p className="font-mono text-sm text-muted-foreground">Built by Studio Eighty7</p>
        </div>
      </div>
    </footer>
  )
}
