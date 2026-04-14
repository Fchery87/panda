import Link from 'next/link'
import { PandaLogo } from '@/components/ui/panda-logo'
import { ArrowRight } from 'lucide-react'

const footerLinks = {
  product: [
    { label: 'Features', href: '/#features' },
    { label: 'How It Works', href: '/education' },
    { label: 'Pricing', href: '/education#faq' },
  ],
  resources: [
    { label: 'Documentation', href: '/education' },
    { label: 'Interface Guide', href: '/education#interface-map' },
    { label: 'FAQ', href: '/education#faq' },
  ],
  project: [
    { label: 'GitHub', href: 'https://github.com/Fchery87/panda' },
    { label: 'Sign In', href: '/login' },
    { label: 'Launch App', href: '/projects' },
  ],
}

export function PublicFooter() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="container py-12 lg:py-16">
        <div className="grid gap-10 lg:grid-cols-12">
          {/* Brand column */}
          <div className="lg:col-span-4">
            <PandaLogo size="sm" variant="full" />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
              A browser-based AI coding workbench with plan review, execution approvals, and
              resumable runs. No desktop client required.
            </p>
          </div>

          {/* Link columns */}
          <div className="grid grid-cols-3 gap-8 lg:col-span-5 lg:col-start-7">
            {Object.entries(footerLinks).map(([category, links]) => (
              <div key={category}>
                <h3 className="text-label mb-4 text-muted-foreground">{category}</h3>
                <ul className="space-y-3">
                  {links.map((link) => (
                    <li key={link.label}>
                      {link.href.startsWith('http') ? (
                        <a
                          href={link.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="transition-sharp text-sm text-muted-foreground hover:text-foreground"
                        >
                          {link.label}
                        </a>
                      ) : (
                        <Link
                          href={link.href}
                          className="transition-sharp text-sm text-muted-foreground hover:text-foreground"
                        >
                          {link.label}
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-border pt-8 sm:flex-row">
          <p className="font-mono text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} Panda.ai — Built by Studio Eighty7
          </p>
          <Link
            href="/projects"
            className="transition-sharp flex items-center gap-1 font-mono text-xs text-muted-foreground hover:text-primary"
          >
            Launch the workbench
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </footer>
  )
}
