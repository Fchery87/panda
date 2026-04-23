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
    title: 'Review before execution',
    description:
      'Plans are saved and reviewable. Risky actions pause for approval. Panda keeps the operator in control instead of hiding the work behind automation.',
  },
  {
    icon: Clock,
    title: 'Runs that recover cleanly',
    description:
      'If execution pauses or disconnects, Panda surfaces a recovery checkpoint so the session stays operational instead of starting from scratch.',
  },
  {
    icon: Eye,
    title: 'State stays visible',
    description:
      'File edits, run progress, plan status, and changed work stay visible in one shell so you always know what happened and what comes next.',
  },
  {
    icon: GitBranch,
    title: 'Context that stays put',
    description:
      'Chat history, run logs, and project memory carry across sessions. Stop re-explaining your codebase every time you reopen the workbench.',
  },
]

const workflowSteps = [
  {
    step: '01',
    label: 'Orient',
    title: 'Pick the right project context',
    description:
      'Browse files or search the project until the right context is on screen. Panda works best when the request and the code live in the same workspace.',
    icon: FileCode,
  },
  {
    step: '02',
    label: 'Plan',
    title: 'Review the plan',
    description:
      'Panda generates a saved implementation plan. Review it, edit it, and approve it before execution begins.',
    icon: Layers,
  },
  {
    step: '03',
    label: 'Execute',
    title: 'Execute with oversight',
    description:
      'Approved plans become the execution contract. Panda keeps progress visible and pauses when you need to review a risky action.',
    icon: Terminal,
  },
  {
    step: '04',
    label: 'Inspect',
    title: 'Inspect results and continue',
    description:
      'Inspect changed work, review artifacts, verify the preview, and keep moving without leaving the workbench.',
    icon: Zap,
  },
]

const builtForItems = [
  {
    audience: 'Solo developers',
    detail:
      'Keep planning, execution, and changed work in one browser workspace without a local IDE setup.',
  },
  {
    audience: 'Small teams',
    detail:
      'Share the active work thread, review plans together, and keep project context durable across sessions.',
  },
  {
    audience: 'Open-source contributors',
    detail:
      'Work on repos in the browser with full file context, terminal access, and recoverable runs.',
  },
  {
    audience: 'Power users',
    detail:
      'Manage multiple tasks inside one project while keeping the current objective, changed work, and next step visible.',
  },
]

const heroSignals = ['Saved plans', 'Recoverable runs', 'Shared memory']

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
                    Browser-native AI coding workbench
                  </span>
                </div>

                <h1 className="text-display text-5xl sm:text-6xl lg:text-7xl">
                  <span className="block">Keep the work</span>
                  <span className="block">in one place.</span>
                  <span className="block text-primary">
                    Plan, review, and execute in the browser.
                  </span>
                </h1>

                <p className="max-w-lg text-lg leading-relaxed text-muted-foreground">
                  Panda is a calm, operational AI workbench for serious code work. Keep context,
                  planning, approvals, execution, changed work, and recovery in one browser session
                  you can return to without losing the thread.
                </p>

                <div className="grid max-w-xl gap-px bg-border sm:grid-cols-3">
                  {heroSignals.map((signal) => (
                    <div key={signal} className="surface-1 border border-transparent px-4 py-3">
                      <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                        {signal}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="flex flex-col gap-4 pt-4 sm:flex-row">
                  <Link href="/projects">
                    <Button
                      size="lg"
                      className="shadow-sharp-md hover:shadow-sharp-lg transition-sharp rounded-none font-mono tracking-wide"
                    >
                      {isAuthenticated ? 'Open Workbench' : 'Start in the Workbench'}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                  <Link href="/education">
                    <Button
                      size="lg"
                      variant="outline"
                      className="rounded-none font-mono tracking-wide"
                    >
                      Read the workflow guide
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
                <div className="shadow-sharp-lg border border-border bg-[linear-gradient(180deg,hsl(var(--surface-1)),hsl(var(--background))_18%)]">
                  <div className="surface-2 flex items-center justify-between border-b border-border px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex gap-2">
                        <div className="h-3 w-3 rounded-full bg-muted-foreground/30" />
                        <div className="h-3 w-3 rounded-full bg-muted-foreground/30" />
                        <div className="h-3 w-3 rounded-full bg-muted-foreground/30" />
                      </div>
                      <span className="font-mono text-xs text-muted-foreground">
                        panda.ai - operational workbench
                      </span>
                    </div>
                    <span className="hidden border border-primary/30 bg-primary/5 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-primary sm:inline-flex">
                      reviewable session
                    </span>
                  </div>

                  <div className="space-y-3 p-6 font-mono text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-primary">➜</span>
                      <span className="text-muted-foreground">plan</span>
                      <span className="text-foreground">Saved plan ready for review</span>
                    </div>
                    <div className="space-y-1 pl-6 text-muted-foreground">
                      <div>Current objective anchored to 3 repo files</div>
                      <div>Approval required before execution starts</div>
                      <div className="text-primary">+ Review rail opened with plan context</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-primary">➜</span>
                      <span className="text-muted-foreground">build</span>
                      <span className="text-foreground">Executing approved work</span>
                    </div>
                    <div className="space-y-1 pl-6 text-muted-foreground">
                      <div>Operator review requested for a risky command</div>
                      <div>Run progress saved with a resumable checkpoint</div>
                      <div className="text-primary">+ 2 changed files ready for inspection</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-primary">➜</span>
                      <span className="text-muted-foreground">review</span>
                      <motion.span
                        className="inline-block h-4 w-2 bg-primary"
                        animate={{ opacity: [1, 0, 1] }}
                        transition={{ duration: 1, repeat: Infinity }}
                      />
                    </div>
                  </div>

                  <div className="grid gap-px border-t border-border bg-border lg:grid-cols-[minmax(0,1.4fr)_minmax(220px,0.8fr)]">
                    <div className="bg-background px-4 py-3">
                      <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                        Current objective
                      </div>
                      <p className="mt-2 text-sm text-foreground">
                        Ship the next change without losing the plan, approvals, or changed work.
                      </p>
                    </div>
                    <div className="surface-1 px-4 py-3">
                      <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                        Next action
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">
                        Review the plan, approve the risky step, inspect the changes.
                      </p>
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
                A coding workbench that stays reviewable under pressure.
                <span className="text-muted-foreground">
                  {' '}
                  Not another autopilot wrapped around a terminal.
                </span>
              </h2>
              <p className="self-end text-lg leading-relaxed text-muted-foreground lg:col-span-5">
                Panda is built for technically fluent users who want one browser-native place to
                keep context, review work, approve risky actions, recover paused runs, and continue
                without losing the thread.
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
                  className={cn(
                    'hover-accent-border border border-transparent bg-background p-8',
                    index === 0 && 'sm:col-span-2'
                  )}
                >
                  <div
                    className={cn(
                      'space-y-4',
                      index === 0 &&
                        'lg:grid lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-8 lg:space-y-0'
                    )}
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
                    {index === 0 ? (
                      <div className="grid gap-px bg-border lg:grid-cols-2">
                        <div className="bg-background px-4 py-3">
                          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                            Why it matters
                          </div>
                          <p className="mt-2 text-sm text-muted-foreground">
                            Panda keeps the operator in the loop so execution never outruns
                            understanding.
                          </p>
                        </div>
                        <div className="surface-1 px-4 py-3">
                          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                            What stays visible
                          </div>
                          <p className="mt-2 text-sm text-muted-foreground">
                            Plan status, run progress, changed work, and approval points stay in the
                            same shell.
                          </p>
                        </div>
                      </div>
                    ) : null}
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
              Four steps from request to inspected result.
            </h2>
          </motion.div>

          <div className="grid gap-px bg-border lg:grid-cols-2">
            {workflowSteps.map((step, index) => {
              const Icon = step.icon
              return (
                <motion.div
                  key={step.step}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className={cn(
                    'hover-accent-border border border-transparent bg-background p-8',
                    index % 2 === 1 && 'surface-1'
                  )}
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
              One browser workspace for planning, review, execution, and recovery.
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
            <h2 className="text-display text-4xl sm:text-5xl">
              For builders who need the workbench to stay legible.
            </h2>
          </motion.div>

          <div className="grid gap-px bg-border lg:grid-cols-2">
            {builtForItems.map((item, index) => (
              <motion.div
                key={item.audience}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.08 }}
                className={cn(
                  'border border-transparent bg-background p-8',
                  index % 2 === 1 && 'surface-1'
                )}
              >
                <div className="mb-4 flex items-center justify-between gap-4">
                  <h3 className="font-mono text-sm font-semibold uppercase tracking-wider text-primary">
                    {item.audience}
                  </h3>
                  <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                </div>
                <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
                  {item.detail}
                </p>
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
            className="mx-auto max-w-5xl"
          >
            <div className="grid gap-px bg-border lg:grid-cols-[minmax(0,1.25fr)_minmax(260px,0.75fr)]">
              <div className="bg-background p-8 text-left lg:p-12">
                <div className="mb-8 flex justify-start">
                  <PandaLogo size="xl" variant="icon" />
                </div>

                <h2 className="text-display mb-6 max-w-3xl text-4xl sm:text-5xl">
                  Stop rebuilding context every time you reopen the work.
                </h2>

                <p className="max-w-2xl text-lg text-muted-foreground">
                  Create a project, review the plan, approve what matters, inspect the changes, and
                  keep moving. Panda remembers where the work stopped and what happened next.
                </p>
              </div>

              <div className="surface-1 flex flex-col justify-between p-8 lg:p-10">
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                    Start from one workbench
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                    Plans, approvals, changed work, and recoverable runs stay in one browser-native
                    shell.
                  </p>
                </div>

                <div className="mt-8 flex flex-col gap-4">
                  <Link href="/projects">
                    <Button
                      size="lg"
                      className="shadow-sharp-md w-full rounded-none font-mono tracking-wide"
                    >
                      {isAuthenticated ? 'Open Workbench' : 'Launch the Workbench'}
                      <ArrowRight className="ml-2 h-4 w-4" />
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
                      className="w-full rounded-none font-mono tracking-wide"
                    >
                      View Source
                    </Button>
                  </a>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <PublicFooter />
    </main>
  )
}
