import Link from 'next/link'
import { PandaLogo } from '@/components/ui/panda-logo'
import { ArrowUpRight } from 'lucide-react'

const footerLinks = {
  product: [
    { label: 'Features', href: '/#features' },
    { label: 'How it works', href: '/education' },
    { label: 'Pricing', href: '/education#faq' },
  ],
  resources: [
    { label: 'Documentation', href: '/education' },
    { label: 'Interface guide', href: '/education#interface-map' },
    { label: 'FAQ', href: '/education#faq' },
  ],
  project: [
    { label: 'GitHub', href: 'https://github.com/Fchery87/panda' },
    { label: 'Sign in', href: '/login' },
    { label: 'Launch app', href: '/projects' },
  ],
}

export function PublicFooter() {
  return (
    <footer className="bg-background border-t border-border">
      <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 lg:py-20">
        <div className="grid gap-12 lg:grid-cols-12">
          {/* Brand column */}
          <div className="lg:col-span-4">
            <PandaLogo size="md" variant="full" />
            <p className="mt-5 max-w-xs text-sm leading-relaxed text-muted-foreground">
              A browser-based IDE where agents plan in the open and every run leaves receipts,
              approvals, and checkpoints. No desktop client required.
            </p>
          </div>

          {/* Link columns */}
          <div className="grid grid-cols-3 gap-10 lg:col-span-5 lg:col-start-8">
            {Object.entries(footerLinks).map(([category, links]) => (
              <div key={category}>
                <h3 className="text-label mb-5">{category}</h3>
                <ul className="space-y-3">
                  {links.map((link) => (
                    <li key={link.label}>
                      {link.href.startsWith('http') ? (
                        <a
                          href={link.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="transition-refined inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
                        >
                          {link.label}
                          <ArrowUpRight size={12} className="opacity-50" />
                        </a>
                      ) : (
                        <Link
                          href={link.href}
                          className="transition-refined text-sm text-muted-foreground hover:text-foreground"
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
        <div className="mt-16 flex flex-col items-center justify-between gap-4 border-t border-border pt-8 sm:flex-row">
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} Panda.ai — Built by Studio Eighty7
          </p>
          <Link
            href="/projects"
            className="transition-refined inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-primary"
          >
            Launch the workbench
            <ArrowUpRight size={12} />
          </Link>
        </div>
      </div>
    </footer>
  )
}
