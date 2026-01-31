"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { 
  Sparkles, 
  Code2, 
  MessageSquare, 
  Terminal, 
  Zap, 
  Github,
  ArrowRight,
  Bot,
  FileCode,
  Play
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/settings/ThemeToggle"

const features = [
  {
    icon: Bot,
    title: "AI-Powered Coding",
    description: "Chat with an AI assistant that understands your codebase and helps you write, refactor, and debug code."
  },
  {
    icon: FileCode,
    title: "Smart File Management",
    description: "Organize your files with an intuitive tree view. Create, edit, and manage your project files seamlessly."
  },
  {
    icon: Terminal,
    title: "Integrated Terminal",
    description: "Run commands, build projects, and execute scripts directly within the workbench with real-time output."
  },
  {
    icon: Zap,
    title: "Real-time Collaboration",
    description: "See changes instantly with Convex's real-time sync. Your code, chats, and jobs update live."
  },
  {
    icon: MessageSquare,
    title: "Context-Aware Chat",
    description: "Discuss code changes, ask questions, and get AI suggestions that understand your project context."
  },
  {
    icon: Github,
    title: "GitHub Integration",
    description: "Import repositories and manage your code with built-in version control features."
  }
]

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <motion.nav
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="fixed top-0 left-0 right-0 z-50 border-b bg-background/80 backdrop-blur-lg"
      >
        <div className="container flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <span className="text-xl font-bold">Panda.ai</span>
          </Link>
          
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <Link href="/projects">
              <Button>Get Started</Button>
            </Link>
          </div>
        </div>
      </motion.nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-teal-600/5" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-gradient-to-r from-emerald-500/10 to-teal-600/10 blur-3xl rounded-full opacity-50" />
        </div>

        <div className="container">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mx-auto max-w-4xl text-center"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="inline-flex items-center gap-2 rounded-full border bg-card px-4 py-1.5 mb-8"
            >
              <span className="flex h-2 w-2 rounded-full bg-emerald-500" />
              <span className="text-sm font-medium">Now with Next.js 16 & shadcn/ui</span>
            </motion.div>

            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl mb-6">
              Build Software with{" "}
              <span className="bg-gradient-to-r from-emerald-500 to-teal-600 bg-clip-text text-transparent">
                AI Assistance
              </span>
            </h1>

            <p className="mx-auto max-w-2xl text-lg text-muted-foreground mb-8">
              Panda.ai is your intelligent coding workbench. Chat with AI, manage files, 
              run commands, and build projects—all in one seamless interface.
            </p>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              <Link href="/projects">
                <Button size="lg" className="gap-2 text-lg px-8">
                  <Play className="h-5 w-5" />
                  Start Building
                </Button>
              </Link>
              <a href="https://github.com" target="_blank" rel="noopener noreferrer">
                <Button size="lg" variant="outline" className="gap-2 text-lg px-8">
                  <Github className="h-5 w-5" />
                  View on GitHub
                </Button>
              </a>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 lg:py-32 border-t">
        <div className="container">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl font-bold mb-4">Everything You Need</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              A complete development environment powered by modern technologies 
              and artificial intelligence.
            </p>
          </motion.div>

          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, index) => {
              const Icon = feature.icon
              return (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                >
                  <div className="group relative overflow-hidden rounded-2xl border bg-card p-6 hover:shadow-lg transition-all duration-300">
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-teal-600/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    
                    <div className="relative">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-600/20 mb-4">
                        <Icon className="h-6 w-6 text-emerald-600" />
                      </div>
                      
                      <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                      <p className="text-muted-foreground text-sm">{feature.description}</p>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 lg:py-32 border-t">
        <div className="container">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mx-auto max-w-3xl text-center"
          >
            <h2 className="text-3xl font-bold mb-4">
              Ready to Start Building?
            </h2>
            <p className="text-muted-foreground mb-8">
              Create your first project and experience the future of AI-assisted development.
            </p>
            <Link href="/projects">
              <Button size="lg" className="gap-2">
                Create Your First Project
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded bg-gradient-to-br from-emerald-500 to-teal-600">
                <Sparkles className="h-3 w-3 text-white" />
              </div>
              <span className="font-semibold">Panda.ai</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Built with Next.js 16, Convex, shadcn/ui, and Framer Motion
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
