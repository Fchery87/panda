'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  Terminal,
  FileCode,
  Bot,
  Zap,
  Shield,
  GitBranch,
  Clock,
  Eye,
  Layers,
  ChevronRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PandaLogo } from '@/components/ui/panda-logo'
import { PublicNav } from '@/components/layout/PublicNav'
import { PublicFooter } from '@/components/layout/PublicFooter'
import { useConvexAuth } from 'convex/react'
import { cn } from '@/lib/utils'
import { landingFeatures } from '@/lib/product/capabilities'

const featureIcons = {
  bot: Bot,
  fileCode: FileCode,
  terminal: Terminal,
  zap: Zap,
} as const

const differentiationPoints = [
  {
    icon: Shield,
    title: 'Approve before execute',
    description:
      'Plans are saved and reviewable. Risky commands pause for your approval. Nothing runs without your say-so.',
  },
  {
    icon: Clock,
    title: 'Runs that survive interruptions',
    description:
      'If a build pauses or disconnects, Panda surfaces a recovery checkpoint. Pick up exactly where you left off.',
  },
  {
    icon: Eye,
    title: 'Every change is visible',
    description:
      'File edits, terminal output, and plan diffs are surfaced inline. You always know what happened and why.',
  },
  {
    icon: GitBranch,
    title: 'Context that persists',
    description:
      'Chat history, run logs, and project memory carry across sessions. Stop re-explaining your codebase.',
  },
]

const workflowSteps = [
  {
    step: '01',
    label: 'Select',
    title: 'Pick your context',
    description:
      'Browse files in the Explorer or search the project. Select the code you want to work on.',
    icon: FileCode,
  },
  {
    step: '02',
    label: 'Plan',
    title: 'Review the plan',
    description:
      'Panda generates an implementation plan. Read it, edit it, approve it before anything changes.',
    icon: Layers,
  },
  {
    step: '03',
    label: 'Build',
    title: 'Execute with oversight',
    description:
      'Approved plans become execution contracts. Approve risky commands in real time as they come up.',
    icon: Terminal,
  },
  {
    step: '04',
    label: 'Ship',
    title: 'Verify and ship',
    description:
      'Inspect diffs, review artifacts, and run terminal commands. Share the session or move to the next task.',
    icon: Zap,
  },
]

const builtForItems = [
  {
    audience: 'Solo developers',
    detail: 'Ship personal projects and side experiments without a local IDE setup.',
  },
  {
    audience: 'Small teams',
    detail: 'Share chat sessions, review plans together, and keep a shared project memory.',
  },
  {
    audience: 'Open-source contributors',
    detail: 'Work on repos in the browser with full file context and terminal access.',
  },
  {
    audience: 'AI-curious engineers',
    detail: 'Try agentic coding with real approval gates, not autopilot.',
  },
]

export default function Home() {
  const { isAuthenticated } = useConvexAuth()

  return (
    <main id="main-content" className="dot-grid min-h-screen bg-background">
      <PublicNav showEducationLink />

      {/* Hero */}
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
                <div className="inline-flex items-center gap-3">
                  <span className="h-px w-8 bg-primary" />
                  <span className="text-label text-muted-foreground">
                    AI coding workbench for the browser
                  </span>
                </div>

                <h1 className="text-display text-5xl sm:text-6xl lg:text-7xl">
                  <span className="block">Plan.</span>
                  <span className="block">Approve.</span>
                  <span className="block text-primary">Build in the browser.</span>
                </h1>

                <p className="max-w-md text-lg leading-relaxed text-muted-foreground">
                  Most AI coding tools run in a terminal or desktop app and lose context between
                  sessions. Panda keeps your plans, file edits, run history, and approvals in one
                  browser workspace you can return to.
                </p>

                <div className="flex flex-col gap-4 pt-4 sm:flex-row">
                  <Link href="/projects">
                    <Button
                      size="lg"
                      className="shadow-sharp-md hover:shadow-sharp-lg transition-sharp rounded-none font-mono tracking-wide"
                    >
                      {isAuthenticated ? 'Open Dashboard' : 'Start Your First Project'}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                  <Link href="/education">
                    <Button
                      size="lg"
                      variant="outline"
                      className="rounded-none font-mono tracking-wide"
                    >
                      See How It Works
                    </Button>
                  </Link>
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
                <div className="shadow-sharp-lg border border-border bg-background">
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

                  <div className="space-y-3 p-6 font-mono text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-primary">➜</span>
                      <span className="text-muted-foreground">plan</span>
                      <span className="text-foreground">Implementation plan generated</span>
                    </div>
                    <div className="space-y-1 pl-6 text-muted-foreground">
                      <div>3 files grounded from the repo</div>
                      <div>Plan saved — awaiting your review</div>
                      <div className="text-primary">✓ Ready for approval</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-primary">➜</span>
                      <span className="text-muted-foreground">build</span>
                      <span className="text-foreground">Executing approved plan</span>
                    </div>
                    <div className="space-y-1 pl-6 text-muted-foreground">
                      <div>Command approval required: npm install detected</div>
                      <div>Run progress saved with resumable checkpoint</div>
                      <div className="text-primary">✓ Execution completed — 2 files changed</div>
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

                <div className="absolute -bottom-4 -right-4 -z-10 h-full w-full border border-primary/20" />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Differentiation: Why Panda */}
      <section className="border-t border-border py-24 lg:py-32">
        <div className="container">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-16"
          >
            <div className="mb-6 flex items-center gap-3">
              <span className="h-px w-8 bg-primary" />
              <span className="text-label text-muted-foreground">Why Panda</span>
            </div>
            <div className="grid gap-6 lg:grid-cols-12">
              <h2 className="text-display text-4xl sm:text-5xl lg:col-span-7">
                AI coding that asks before it acts.
                <span className="text-muted-foreground"> Not the other way around.</span>
              </h2>
              <p className="self-end text-lg leading-relaxed text-muted-foreground lg:col-span-5">
                Most AI coding tools either run everything automatically or make you write every
                line yourself. Panda sits in the middle: it plans, you approve, it builds. Every
                step is visible, every run is recoverable.
              </p>
            </div>
          </motion.div>

          <div className="grid gap-px bg-border sm:grid-cols-2">
            {differentiationPoints.map((point, index) => {
              const Icon = point.icon
              return (
                <motion.div
                  key={point.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="hover-accent-border border border-transparent bg-background p-8"
                >
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center border border-primary/30">
                        <Icon className="h-4 w-4 text-primary" />
                      </div>
                      <h3 className="text-xl font-semibold">{point.title}</h3>
                    </div>
                    <p className="leading-relaxed text-muted-foreground">{point.description}</p>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      {/* How it works — 4 steps */}
      <section className="surface-1 border-t border-border py-24 lg:py-32">
        <div className="container">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-16"
          >
            <div className="mb-6 flex items-center gap-3">
              <span className="h-px w-8 bg-primary" />
              <span className="text-label text-muted-foreground">How it works</span>
            </div>
            <h2 className="text-display max-w-3xl text-4xl sm:text-5xl">
              Four steps from context to shipped code.
            </h2>
          </motion.div>

          <div className="grid gap-px bg-border lg:grid-cols-4">
            {workflowSteps.map((step, index) => {
              const Icon = step.icon
              return (
                <motion.div
                  key={step.step}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="hover-accent-border border border-transparent bg-background p-8"
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-label text-primary">{step.step}</span>
                      <Icon className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <span className="text-label text-muted-foreground">{step.label}</span>
                      <h3 className="mt-1 text-xl font-semibold">{step.title}</h3>
                    </div>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {step.description}
                    </p>
                  </div>
                </motion.div>
              )
            })}
          </div>

          <div className="mt-8 text-center">
            <Link href="/education">
              <Button variant="outline" className="rounded-none font-mono tracking-wide">
                Read the full interface guide
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features - Offset grid */}
      <section className="border-t border-border py-24 lg:py-32">
        <div className="container">
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
              One browser workspace for planning, execution, approvals, and recovery.
            </h2>
          </motion.div>

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
                    <div className="flex items-center justify-between">
                      <span className="text-label text-primary">{feature.number}</span>
                      <Icon className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <h3 className="text-xl font-semibold">{feature.title}</h3>
                    <p className="leading-relaxed text-muted-foreground">{feature.description}</p>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Built for */}
      <section className="surface-1 border-t border-border py-24 lg:py-32">
        <div className="container">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-12"
          >
            <div className="mb-6 flex items-center gap-3">
              <span className="h-px w-8 bg-primary" />
              <span className="text-label text-muted-foreground">Built for</span>
            </div>
            <h2 className="text-display text-4xl sm:text-5xl">Whoever ships code for a living.</h2>
          </motion.div>

          <div className="grid gap-px bg-border sm:grid-cols-2 lg:grid-cols-4">
            {builtForItems.map((item, index) => (
              <motion.div
                key={item.audience}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.08 }}
                className="border border-transparent bg-background p-6"
              >
                <h3 className="mb-2 font-mono text-sm font-semibold uppercase tracking-wider text-primary">
                  {item.audience}
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{item.detail}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="border-t border-border py-24 lg:py-32">
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
              Stop re-explaining your codebase. Start shipping.
            </h2>

            <p className="mb-10 text-lg text-muted-foreground">
              Create a project, review the plan, approve the risky parts, and keep moving. Panda
              remembers where you left off.
            </p>

            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link href="/projects">
                <Button size="lg" className="shadow-sharp-md rounded-none font-mono tracking-wide">
                  {isAuthenticated ? 'Open Dashboard' : 'Launch the Workbench'}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <a href="https://github.com/Fchery87/panda" target="_blank" rel="noopener noreferrer">
                <Button
                  size="lg"
                  variant="outline"
                  className="rounded-none font-mono tracking-wide"
                >
                  View Source
                </Button>
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      <PublicFooter />
    </main>
  )
}
