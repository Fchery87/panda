'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowRight, Terminal, FileCode, Bot, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/settings/ThemeToggle'
import { PandaLogo } from '@/components/ui/panda-logo'
import { cn } from '@/lib/utils'

const features = [
  {
    number: '01',
    title: 'AI-Powered Coding',
    description: 'Stream conversations with AI that understands context. Discuss, refactor, debug.',
    icon: Bot,
    size: 'small',
  },
  {
    number: '02',
    title: 'Smart File Management',
    description:
      'Navigate and organize with an intuitive tree. Create, edit, rename with seamless context menus.',
    icon: FileCode,
    size: 'large',
  },
  {
    number: '03',
    title: 'Integrated Terminal',
    description: 'Execute commands with real-time output. Track jobs, cancel tasks, view history.',
    icon: Terminal,
    size: 'large',
  },
  {
    number: '04',
    title: 'Real-time Sync',
    description: 'Powered by Convex. Everything syncs live.',
    icon: Zap,
    size: 'small',
  },
]

export default function Home() {
  return (
    <div className="dot-grid min-h-screen bg-background">
      {/* Navigation - Minimal, sharp */}
      <nav className="surface-1 fixed left-0 right-0 top-0 z-50 border-b border-border">
        <div className="container flex h-14 items-center justify-between">
          <Link href="/" className="transition-sharp hover:opacity-70">
            <PandaLogo size="md" variant="full" />
          </Link>

          <div className="flex items-center gap-4">
            <ThemeToggle />
            <Link href="/projects">
              <Button className="rounded-none font-mono text-sm tracking-wide">
                Launch App
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero - Asymmetric split */}
      <section className="pb-24 pt-32 lg:pb-32 lg:pt-40">
        <div className="container">
          <div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-8">
            {/* Left: Typography */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
              className="lg:col-span-5"
            >
              <div className="space-y-8">
                {/* Label */}
                <div className="inline-flex items-center gap-3">
                  <span className="h-px w-8 bg-primary" />
                  <span className="text-label text-muted-foreground">AI Workbench</span>
                </div>

                {/* Headline */}
                <h1 className="text-display text-5xl sm:text-6xl lg:text-7xl">
                  <span className="block">Code</span>
                  <span className="block">with</span>
                  <span className="block text-primary">precision.</span>
                </h1>

                {/* Body */}
                <p className="max-w-md text-lg leading-relaxed text-muted-foreground">
                  A browser-based workspace for developers. Stream AI conversations, manage files,
                  run commands—unified.
                </p>

                {/* CTA */}
                <div className="flex flex-col gap-4 pt-4 sm:flex-row">
                  <Link href="/projects">
                    <Button
                      size="lg"
                      className="shadow-sharp-md hover:shadow-sharp-lg transition-sharp rounded-none font-mono tracking-wide"
                    >
                      Start Building
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                  <a href="https://github.com" target="_blank" rel="noopener noreferrer">
                    <Button
                      size="lg"
                      variant="outline"
                      className="rounded-none font-mono tracking-wide"
                    >
                      View Source
                    </Button>
                  </a>
                </div>
              </div>
            </motion.div>

            {/* Right: Terminal mockup */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2, ease: [0.4, 0, 0.2, 1] }}
              className="lg:col-span-7"
            >
              <div className="relative">
                {/* Terminal window */}
                <div className="shadow-sharp-lg border border-border bg-background">
                  {/* Terminal header */}
                  <div className="surface-2 flex items-center justify-between border-b border-border px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex gap-2">
                        <div className="h-3 w-3 rounded-full bg-muted-foreground/30" />
                        <div className="h-3 w-3 rounded-full bg-muted-foreground/30" />
                        <div className="h-3 w-3 rounded-full bg-muted-foreground/30" />
                      </div>
                      <span className="font-mono text-xs text-muted-foreground">
                        panda.ai — terminal
                      </span>
                    </div>
                  </div>

                  {/* Terminal content */}
                  <div className="space-y-3 p-6 font-mono text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-primary">➜</span>
                      <span className="text-muted-foreground">~</span>
                      <span className="text-foreground">npm create panda-project</span>
                    </div>
                    <div className="space-y-1 pl-6 text-muted-foreground">
                      <div>Creating project structure...</div>
                      <div>Installing dependencies...</div>
                      <div className="text-primary">✓ Project ready</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-primary">➜</span>
                      <span className="text-muted-foreground">~/my-project</span>
                      <span className="text-foreground">panda dev</span>
                    </div>
                    <div className="space-y-1 pl-6 text-muted-foreground">
                      <div>Starting dev server on port 3000...</div>
                      <div className="text-primary">✓ Ready at http://localhost:3000</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-primary">➜</span>
                      <span className="text-muted-foreground">~/my-project</span>
                      <motion.span
                        className="inline-block h-4 w-2 bg-primary"
                        animate={{ opacity: [1, 0, 1] }}
                        transition={{ duration: 1, repeat: Infinity }}
                      />
                    </div>
                  </div>
                </div>

                {/* Decorative offset box */}
                <div className="absolute -bottom-4 -right-4 -z-10 h-full w-full border border-primary/20" />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features - Offset grid */}
      <section className="border-t border-border py-24 lg:py-32">
        <div className="container">
          {/* Section header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-16"
          >
            <div className="mb-6 flex items-center gap-3">
              <span className="h-px w-8 bg-primary" />
              <span className="text-label text-muted-foreground">Features</span>
            </div>
            <h2 className="text-display max-w-2xl text-4xl sm:text-5xl">
              Everything you need. <span className="text-muted-foreground">Nothing you don't.</span>
            </h2>
          </motion.div>

          {/* Feature grid - offset layout */}
          <div className="grid gap-px bg-border sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature, index) => {
              const Icon = feature.icon
              const isLarge = feature.size === 'large'

              return (
                <motion.div
                  key={feature.number}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className={cn(
                    'transition-sharp hover-accent-border border border-transparent bg-background p-8',
                    isLarge && 'lg:col-span-2'
                  )}
                >
                  <div className="space-y-4">
                    {/* Number + Icon */}
                    <div className="flex items-center justify-between">
                      <span className="text-label text-primary">{feature.number}</span>
                      <Icon className="h-5 w-5 text-muted-foreground" />
                    </div>

                    {/* Title */}
                    <h3 className="text-xl font-semibold">{feature.title}</h3>

                    {/* Description */}
                    <p className="leading-relaxed text-muted-foreground">{feature.description}</p>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="surface-1 border-t border-border py-24 lg:py-32">
        <div className="container">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mx-auto max-w-2xl text-center"
          >
            <PandaLogo size="xl" variant="icon" className="mx-auto mb-8" />

            <h2 className="text-display mb-6 text-4xl sm:text-5xl">Ready to start?</h2>

            <p className="mb-10 text-lg text-muted-foreground">
              Create your first project and experience AI-assisted development.
            </p>

            <Link href="/projects">
              <Button size="lg" className="shadow-sharp-md rounded-none font-mono tracking-wide">
                Create Project
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer - Minimal */}
      <footer className="border-t border-border py-8">
        <div className="container">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <PandaLogo size="sm" variant="full" />
            <p className="font-mono text-sm text-muted-foreground">Built by Studio Eighty7</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
