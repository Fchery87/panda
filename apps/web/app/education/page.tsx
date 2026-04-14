'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  Bot,
  Brain,
  FileSearch,
  FolderTree,
  MessageSquare,
  Monitor,
  PanelLeft,
  PanelRight,
  Terminal,
  Workflow,
  Wrench,
  Shield,
  Target,
  GitBranch,
  Search,
  CheckCircle2,
  Eye,
  Clock,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PublicNav } from '@/components/layout/PublicNav'
import { PublicFooter } from '@/components/layout/PublicFooter'
import { cn } from '@/lib/utils'
import {
  chatDetails,
  explorerDetails,
  interfaceMap,
  specDetails,
  workspaceDetails,
  workflowSteps,
} from '@/lib/product/capabilities'

function DetailCard({
  item,
  index,
}: {
  item: { name: string; role: string; userValue: string }
  index: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.04 }}
      className="border border-border bg-background p-5"
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <h4 className="font-mono text-xs font-semibold uppercase tracking-widest text-primary">
          {item.name}
        </h4>
        <span className="font-mono text-xs text-muted-foreground">
          {String(index + 1).padStart(2, '0')}
        </span>
      </div>
      <p className="text-sm text-foreground">{item.role}</p>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.userValue}</p>
    </motion.div>
  )
}

const sectionIcons = {
  explorer: PanelLeft,
  workspace: Monitor,
  chat: PanelRight,
  inspector: Shield,
} as const

const faqItems = [
  {
    question: 'Do I need to install anything?',
    answer:
      'No. Panda runs entirely in the browser. Open a project, start chatting with the agent, review plans, and approve changes without leaving your browser tab.',
  },
  {
    question: 'What happens when a build run gets interrupted?',
    answer:
      'Panda saves execution checkpoints. If a run pauses or disconnects, you can resume from where it stopped instead of starting over.',
  },
  {
    question: 'Can I review code changes before they are applied?',
    answer:
      'Yes. Plans are saved and require explicit approval. During execution, risky commands (like installs or file deletions) pause for your review.',
  },
  {
    question: 'Does Panda remember context between sessions?',
    answer:
      'Yes. Project memory persists across sessions. The agent can reuse saved context so you stop re-explaining your codebase with every new chat.',
  },
  {
    question: 'Which AI providers does Panda support?',
    answer:
      'Panda supports OpenAI, Anthropic, OpenRouter, Together.ai, DeepSeek, Groq, Fireworks, Chutes, Z.ai, crof.ai, and any OpenAI-compatible endpoint. You bring your own API key.',
  },
  {
    question: 'Can I share my workbench session with someone else?',
    answer:
      'Yes. You can share the active chat session with a link. The recipient sees the full conversation, plan, and run history.',
  },
]

export default function EducationPage() {
  return (
    <div className="dot-grid min-h-screen bg-background">
      <PublicNav />

      <main id="main-content" className="pb-24 pt-28 lg:pb-32 lg:pt-36">
        {/* Hero */}
        <section className="pb-16 lg:pb-20">
          <div className="container">
            <div className="grid gap-10 lg:grid-cols-12 lg:items-start">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.45 }}
                className="lg:col-span-7"
              >
                <div className="space-y-6">
                  <div className="inline-flex items-center gap-3">
                    <span className="h-px w-8 bg-primary" />
                    <span className="text-label text-muted-foreground">How Panda works</span>
                  </div>

                  <h1 className="text-display text-4xl sm:text-5xl lg:text-6xl">
                    One workspace. Four surfaces. Zero context switching.
                  </h1>

                  <p className="max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                    Panda&apos;s browser workbench is built around{' '}
                    <span className="font-mono text-foreground">Explorer</span>,{' '}
                    <span className="font-mono text-foreground">Workspace</span>,{' '}
                    <span className="font-mono text-foreground">Chat Panel</span>, and{' '}
                    <span className="font-mono text-foreground">Inspector</span>. Each surface
                    handles a specific job — navigating files, editing code, orchestrating the
                    agent, and reviewing state — and they all update each other in real time.
                  </p>

                  <div className="flex flex-wrap gap-3">
                    <Link href="/projects">
                      <Button className="shadow-sharp-md rounded-none font-mono tracking-wide">
                        Try It in the Workbench
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>
                    <a href="#interface-map">
                      <Button variant="outline" className="rounded-none font-mono tracking-wide">
                        See the Interface Map
                      </Button>
                    </a>
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.45, delay: 0.1 }}
                className="lg:col-span-5"
              >
                <div className="shadow-sharp-lg relative border border-border bg-background">
                  <div className="surface-2 border-b border-border px-4 py-3 font-mono text-xs uppercase tracking-widest text-muted-foreground">
                    The mental model
                  </div>
                  <div className="space-y-4 p-5">
                    <div className="flex items-start gap-3">
                      <FolderTree className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <div>
                        <p className="font-mono text-xs uppercase tracking-wide">
                          Explorer selects context
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Browse files and search the project tree.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Wrench className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <div>
                        <p className="font-mono text-xs uppercase tracking-wide">
                          Workspace executes work
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Edit code, run terminal commands, inspect diffs.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Bot className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <div>
                        <p className="font-mono text-xs uppercase tracking-wide">
                          Chat orchestrates the agent
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Prompt, review plans, manage execution in one thread.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Shield className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <div>
                        <p className="font-mono text-xs uppercase tracking-wide">
                          Inspector reviews state
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Track runs, plans, memory, and evaluations.
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="absolute -bottom-3 -right-3 -z-10 h-full w-full border border-primary/20" />
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Three promises */}
        <section className="border-y border-border py-16 lg:py-20">
          <div className="container">
            <div className="grid gap-px bg-border sm:grid-cols-3">
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="border border-transparent bg-background p-8"
              >
                <Eye className="mb-4 h-5 w-5 text-primary" />
                <h3 className="mb-2 text-lg font-semibold">Transparent</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Every plan, file edit, and terminal command is visible. You see what the agent
                  will do before it does it.
                </p>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.08 }}
                className="border border-transparent bg-background p-8"
              >
                <Shield className="mb-4 h-5 w-5 text-primary" />
                <h3 className="mb-2 text-lg font-semibold">Reviewable</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Plans require explicit approval. Risky commands pause for your say-so. Nothing
                  ships without your consent.
                </p>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.16 }}
                className="border border-transparent bg-background p-8"
              >
                <Clock className="mb-4 h-5 w-5 text-primary" />
                <h3 className="mb-2 text-lg font-semibold">Recoverable</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Runs save checkpoints. If something interrupts execution, you pick up exactly
                  where you left off.
                </p>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Interface Map */}
        <section id="interface-map" className="py-16 lg:py-20">
          <div className="container">
            <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
              <div>
                <div className="mb-4 flex items-center gap-3">
                  <span className="h-px w-8 bg-primary" />
                  <span className="text-label text-muted-foreground">Interface Map</span>
                </div>
                <h2 className="text-display text-3xl sm:text-4xl">
                  The four surfaces of the Panda workbench
                </h2>
              </div>
              <div className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                Explorer → Workspace → Chat → Inspector
              </div>
            </div>

            <div className="grid gap-px bg-border md:grid-cols-2 lg:grid-cols-4">
              {interfaceMap.map((section, index) => {
                const Icon = sectionIcons[section.iconKey]
                return (
                  <motion.a
                    key={section.id}
                    href={`#${section.id}`}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.08 }}
                    className="hover:bg-surface-1 group block border border-transparent bg-background p-6 transition-colors"
                  >
                    <div className="mb-4 flex items-center justify-between">
                      <span className="font-mono text-xs font-semibold uppercase tracking-widest text-primary">
                        {section.label}
                      </span>
                      <Icon className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-foreground" />
                    </div>
                    <h3 className="mb-3 text-xl font-semibold">{section.title}</h3>
                    <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
                      {section.summary}
                    </p>
                    <ul className="space-y-2">
                      {section.bullets.map((bullet) => (
                        <li
                          key={bullet}
                          className="flex items-start gap-2 text-sm text-muted-foreground"
                        >
                          <span className="mt-1 h-1.5 w-1.5 shrink-0 bg-primary" />
                          <span>{bullet}</span>
                        </li>
                      ))}
                    </ul>
                  </motion.a>
                )
              })}
            </div>
          </div>
        </section>

        {/* Workflow */}
        <section className="border-y border-border py-16 lg:py-20">
          <div className="container">
            <div className="mb-10">
              <div className="mb-4 flex items-center gap-3">
                <span className="h-px w-8 bg-primary" />
                <span className="text-label text-muted-foreground">Workflow</span>
              </div>
              <h2 className="text-display max-w-3xl text-3xl sm:text-4xl">
                From idea to shipped code in six steps
              </h2>
              <p className="mt-4 max-w-2xl text-muted-foreground">
                This is the default Panda workflow. It works the same way for every project — pick
                context, review the plan, build with oversight, and ship verified output.
              </p>
            </div>

            <div className="grid gap-4 lg:grid-cols-6">
              {workflowSteps.map((step, index) => (
                <motion.div
                  key={step.title}
                  initial={{ opacity: 0, y: 14 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.05 }}
                  className={cn(
                    'border border-border bg-background p-4',
                    index === 0 || index === 3 || index === 5 ? 'surface-1' : ''
                  )}
                >
                  <div className="mb-3 flex items-center justify-between">
                    <span className="font-mono text-xs uppercase tracking-widest text-primary">
                      Step {index + 1}
                    </span>
                    <Workflow className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <h3 className="text-sm font-semibold">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {step.description}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Explorer */}
        <section id="explorer" className="py-16 lg:py-20">
          <div className="container">
            <div className="mb-8 grid gap-6 lg:grid-cols-12">
              <div className="lg:col-span-4">
                <div className="mb-4 flex items-center gap-3">
                  <PanelLeft className="h-4 w-4 text-primary" />
                  <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                    Explorer
                  </span>
                </div>
                <h2 className="text-display text-3xl">Select the right context, fast</h2>
              </div>
              <div className="lg:col-span-8">
                <p className="text-base leading-relaxed text-muted-foreground">
                  The Explorer is your entry point into project context. Switch between an{' '}
                  <span className="font-mono text-foreground">Explorer</span> tab for browsing and a{' '}
                  <span className="font-mono text-foreground">Search</span> tab for jumping to
                  matches. Select a file and it routes directly into the editor and chat context.
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div className="border border-border bg-background p-3">
                    <div className="mb-2 flex items-center gap-2 font-mono text-xs uppercase tracking-wide">
                      <FolderTree className="h-3.5 w-3.5 text-primary" /> Browse
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Navigate folders and files in a structured tree.
                    </p>
                  </div>
                  <div className="border border-border bg-background p-3">
                    <div className="mb-2 flex items-center gap-2 font-mono text-xs uppercase tracking-wide">
                      <Search className="h-3.5 w-3.5 text-primary" /> Search
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Jump to matches when the tree is too slow.
                    </p>
                  </div>
                  <div className="border border-border bg-background p-3">
                    <div className="mb-2 flex items-center gap-2 font-mono text-xs uppercase tracking-wide">
                      <FileSearch className="h-3.5 w-3.5 text-primary" /> Route
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Selected files open in the workspace and attach to chat context.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {explorerDetails.map((item, index) => (
                <DetailCard key={item.name} item={item} index={index} />
              ))}
            </div>
          </div>
        </section>

        {/* Workspace */}
        <section id="workspace" className="border-y border-border py-16 lg:py-20">
          <div className="container">
            <div className="mb-8 grid gap-6 lg:grid-cols-12">
              <div className="lg:col-span-4">
                <div className="mb-4 flex items-center gap-3">
                  <Monitor className="h-4 w-4 text-primary" />
                  <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                    Workspace
                  </span>
                </div>
                <h2 className="text-display text-3xl">Edit, inspect, and execute in one place</h2>
              </div>
              <div className="lg:col-span-8">
                <p className="text-base leading-relaxed text-muted-foreground">
                  The Workspace combines file tabs, a code editor, timeline context, and terminal
                  execution into a single responsive layout. Edit code, review what changed, and run
                  commands without switching tools.
                </p>
                <div className="mt-4 border border-border bg-background p-4">
                  <div className="mb-2 font-mono text-xs uppercase tracking-widest text-primary">
                    Responsive layout
                  </div>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    Desktop uses resizable panels. Smaller screens keep the same workbench surfaces
                    available without forcing you out of the project session.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {workspaceDetails.map((item, index) => (
                <DetailCard key={item.name} item={item} index={index} />
              ))}
            </div>
          </div>
        </section>

        {/* Chat Panel */}
        <section id="chat" className="py-16 lg:py-20">
          <div className="container">
            <div className="mb-8 grid gap-6 lg:grid-cols-12">
              <div className="lg:col-span-4">
                <div className="mb-4 flex items-center gap-3">
                  <MessageSquare className="h-4 w-4 text-primary" />
                  <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                    Chat Panel
                  </span>
                </div>
                <h2 className="text-display text-3xl">
                  Orchestrate the agent without losing context
                </h2>
              </div>
              <div className="lg:col-span-8">
                <p className="text-base leading-relaxed text-muted-foreground">
                  The Chat Panel is Panda&apos;s orchestration surface. It handles planning, asking,
                  building, permission review, and message history in one thread. Plans and run
                  status surface inline so you never lose track of what&apos;s happening.
                </p>

                <div className="mt-4 grid gap-px bg-border sm:grid-cols-3">
                  <div className="border border-transparent bg-background p-4">
                    <div className="mb-2 flex items-center gap-2 font-mono text-xs uppercase tracking-wide">
                      <Terminal className="h-3.5 w-3.5 text-primary" />
                      Plan + Run
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Inline plan review cards and run status surfaces keep execution visible.
                    </p>
                  </div>
                  <div className="border border-transparent bg-background p-4">
                    <div className="mb-2 flex items-center gap-2 font-mono text-xs uppercase tracking-wide">
                      <Brain className="h-3.5 w-3.5 text-primary" />
                      Permissions
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Risky commands pause for browser-native approval before they proceed.
                    </p>
                  </div>
                  <div className="border border-transparent bg-background p-4">
                    <div className="mb-2 flex items-center gap-2 font-mono text-xs uppercase tracking-wide">
                      <Bot className="h-3.5 w-3.5 text-primary" />
                      Share + History
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Share the active chat with a link, or reopen past run history from the same
                      panel.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {chatDetails.map((item, index) => (
                <DetailCard key={item.name} item={item} index={index} />
              ))}
            </div>
          </div>
        </section>

        {/* Inspector */}
        <section id="inspector" className="border-y border-border py-16 lg:py-20">
          <div className="container">
            <div className="mb-8 grid gap-6 lg:grid-cols-12">
              <div className="lg:col-span-4">
                <div className="mb-4 flex items-center gap-3">
                  <Shield className="h-4 w-4 text-primary" />
                  <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                    Inspector
                  </span>
                </div>
                <h2 className="text-display text-3xl">
                  Understand what happened and what comes next
                </h2>
              </div>
              <div className="lg:col-span-8">
                <p className="text-base leading-relaxed text-muted-foreground">
                  The Inspector keeps the current run, saved plan, project memory, and eval tooling
                  close to the active chat. Instead of scattering state across separate pages,
                  everything you need to review lives in one surface.
                </p>
                <div className="mt-6 grid gap-4 sm:grid-cols-3">
                  <div className="border border-border bg-background p-4">
                    <div className="mb-2 font-mono text-xs font-bold text-primary">RUN</div>
                    <p className="text-sm text-muted-foreground">
                      Inspect persisted run events, progress, and execution history.
                    </p>
                  </div>
                  <div className="border border-border bg-background p-4">
                    <div className="mb-2 font-mono text-xs font-bold text-primary">PLAN</div>
                    <p className="text-sm text-muted-foreground">
                      Review, approve, and build from the current implementation plan.
                    </p>
                  </div>
                  <div className="border border-border bg-background p-4">
                    <div className="mb-2 font-mono text-xs font-bold text-primary">
                      MEMORY / EVALS
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Preserve context across runs and validate repeatable agent behavior.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {specDetails.map((item, index) => (
                <DetailCard key={item.name} item={item} index={index} />
              ))}
            </div>

            <div className="bg-surface-1 mt-12 border border-border p-6 lg:p-8">
              <div className="grid gap-8 lg:grid-cols-2">
                <div>
                  <h3 className="mb-4 text-xl font-semibold">Plan review and run recovery</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    Panda&apos;s workflow centers on explicit plan review for structured work and
                    resumable runs for interrupted execution. When a run pauses, Panda surfaces a
                    recovery path instead of forcing a restart from scratch.
                  </p>
                  <div className="mt-6 flex items-center gap-4">
                    <div className="flex -space-x-2">
                      <Shield className="h-8 w-8 rounded-full border border-background bg-primary/10 p-1.5 text-primary" />
                      <GitBranch className="h-8 w-8 rounded-full border border-background bg-primary/10 p-1.5 text-primary" />
                    </div>
                    <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                      Reviewable + Recoverable
                    </p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <Target className="mt-1 h-4 w-4 shrink-0 text-primary" />
                    <div>
                      <h4 className="text-sm font-semibold">Build from plan</h4>
                      <p className="text-xs text-muted-foreground">
                        Approve the saved plan, then use it as the execution contract for build.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Shield className="mt-1 h-4 w-4 shrink-0 text-primary" />
                    <div>
                      <h4 className="text-sm font-semibold">Browser approvals</h4>
                      <p className="text-xs text-muted-foreground">
                        Review risky command execution directly in the web interface.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-primary" />
                    <div>
                      <h4 className="text-sm font-semibold">Run history + sharing</h4>
                      <p className="text-xs text-muted-foreground">
                        Reopen past execution and share the active chat with a single link.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Power-user tips + CTA */}
        <section className="py-16 lg:py-20">
          <div className="container">
            <div className="grid gap-6 lg:grid-cols-12">
              <div className="lg:col-span-6">
                <div className="border border-border bg-background p-5">
                  <h2 className="mb-4 font-mono text-xs font-semibold uppercase tracking-widest text-primary">
                    Power-user tips
                  </h2>
                  <ul className="space-y-3 text-sm leading-relaxed text-muted-foreground">
                    <li>
                      Use <span className="font-mono text-foreground">@file-path</span> mentions in
                      chat to pull exact files into the request context.
                    </li>
                    <li>Use the chat actions menu to open run history or share the active chat.</li>
                    <li>
                      Open the inspector when you need Run, Plan, Memory, or Evals without leaving
                      the project page.
                    </li>
                    <li>Review the plan before using Build for larger implementation tasks.</li>
                  </ul>
                </div>
              </div>

              <div className="lg:col-span-6">
                <div className="shadow-sharp-md surface-1 border border-border p-5">
                  <h2 className="mb-3 text-xl font-semibold">Ready to try it?</h2>
                  <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
                    Panda keeps navigation, editing, execution, approval, and review in one
                    synchronized browser workspace. Each surface updates the others as you work.
                  </p>
                  <Link href="/projects">
                    <Button className="rounded-none font-mono tracking-wide">
                      Open the Workbench
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="border-t border-border py-16 lg:py-20">
          <div className="container">
            <div className="mb-10">
              <div className="mb-4 flex items-center gap-3">
                <span className="h-px w-8 bg-primary" />
                <span className="text-label text-muted-foreground">FAQ</span>
              </div>
              <h2 className="text-display text-3xl sm:text-4xl">Common questions</h2>
            </div>

            <div className="mx-auto max-w-3xl divide-y divide-border">
              {faqItems.map((item, index) => (
                <motion.div
                  key={item.question}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.05 }}
                  className="py-6 first:pt-0 last:pb-0"
                >
                  <h3 className="mb-2 font-semibold">{item.question}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{item.answer}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="surface-1 border-t border-border py-16 lg:py-20">
          <div className="container text-center">
            <h2 className="text-display mb-4 text-3xl sm:text-4xl">Start building with Panda</h2>
            <p className="mx-auto mb-8 max-w-lg text-muted-foreground">
              Create a project, review the plan, approve what matters, and keep shipping. No desktop
              install required.
            </p>
            <Link href="/projects">
              <Button className="shadow-sharp-md rounded-none font-mono tracking-wide">
                Launch the Workbench
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  )
}
