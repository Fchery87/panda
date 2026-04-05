'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowRight, Terminal, FileCode, Bot, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PandaLogo } from '@/components/ui/panda-logo'
import { PublicNav } from '@/components/layout/PublicNav'
import { PublicFooter } from '@/components/layout/PublicFooter'
import { cn } from '@/lib/utils'
import { landingFeatures } from '@/lib/product/capabilities'

const featureIcons = {
  bot: Bot,
  fileCode: FileCode,
  terminal: Terminal,
  zap: Zap,
} as const

export default function Home() {
  return (
    <main id="main-content" className="dot-grid min-h-screen bg-background">
      {/* Navigation - Minimal, sharp */}
      <PublicNav showEducationLink />

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
                  <span className="text-label text-muted-foreground">Web AI coding workbench</span>
                </div>

                {/* Headline */}
                <h1 className="text-display text-5xl sm:text-6xl lg:text-7xl">
                  <span className="block">Plan.</span>
                  <span className="block">Approve.</span>
                  <span className="block text-primary">Build in the browser.</span>
                </h1>

                {/* Body */}
                <p className="max-w-md text-lg leading-relaxed text-muted-foreground">
                  Panda is a web-only AI coding workspace for shipping real project work with saved
                  plans, resumable runs, file edits, artifact review, command approvals, and shared
                  chat history in one place.
                </p>

                {/* CTA */}
                <div className="flex flex-col gap-4 pt-4 sm:flex-row">
                  <Link href="/projects">
                    <Button
                      size="lg"
                      className="shadow-sharp-md hover:shadow-sharp-lg transition-sharp rounded-none font-mono tracking-wide"
                    >
                      Create Your Project
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                  <Link href="/education">
                    <Button
                      size="lg"
                      variant="outline"
                      className="rounded-none font-mono tracking-wide"
                    >
                      Learn How Panda Works
                    </Button>
                  </Link>
                  <a
                    href="https://github.com/Fchery87/panda"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
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
                        panda.ai — workbench session
                      </span>
                    </div>
                  </div>

                  {/* Terminal content */}
                  <div className="space-y-3 p-6 font-mono text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-primary">➜</span>
                      <span className="text-muted-foreground">plan</span>
                      <span className="text-foreground">Plan awaiting review</span>
                    </div>
                    <div className="space-y-1 pl-6 text-muted-foreground">
                      <div>Relevant files grounded from the repo</div>
                      <div>Implementation plan saved to the active chat</div>
                      <div className="text-primary">✓ Ready for approval</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-primary">➜</span>
                      <span className="text-muted-foreground">build</span>
                      <span className="text-foreground">Build from approved plan</span>
                    </div>
                    <div className="space-y-1 pl-6 text-muted-foreground">
                      <div>Command approval required: chained operations detected</div>
                      <div>Run progress saved with resumable checkpoint</div>
                      <div className="text-primary">✓ Execution completed</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-primary">➜</span>
                      <span className="text-muted-foreground">share</span>
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
              One browser workspace for planning, execution, approvals, and recovery.{' '}
              <span className="text-muted-foreground">No desktop client required.</span>
            </h2>
          </motion.div>

          {/* Feature grid - offset layout */}
          <div className="grid gap-px bg-border sm:grid-cols-2 lg:grid-cols-6">
            {landingFeatures.map((feature, index) => {
              const Icon = featureIcons[feature.iconKey]
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
                    isLarge ? 'lg:col-span-4' : 'lg:col-span-2'
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
            <div className="mb-8 flex justify-center">
              <PandaLogo size="xl" variant="icon" />
            </div>

            <h2 className="text-display mb-6 text-4xl sm:text-5xl">
              Ready to run your next build in Panda?
            </h2>

            <p className="mb-10 text-lg text-muted-foreground">
              Start a project, review the plan, approve the risky parts, and keep moving with a
              browser workbench that remembers where your run left off.
            </p>

            <Link href="/projects">
              <Button size="lg" className="shadow-sharp-md rounded-none font-mono tracking-wide">
                Launch the Workbench
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <PublicFooter />
    </main>
  )
}
