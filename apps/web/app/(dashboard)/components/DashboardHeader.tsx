"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { motion } from "framer-motion"
import { FolderGit2, Settings, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/settings/ThemeToggle"
import { PandaLogo } from "@/components/ui/panda-logo"
import { cn } from "@/lib/utils"

const navItems = [
  { href: "/projects", label: "Projects", icon: FolderGit2 },
  { href: "/settings", label: "Settings", icon: Settings },
]

export function DashboardHeader() {
  const pathname = usePathname()

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
      className="sticky top-0 z-50 w-full border-b border-border surface-1"
    >
      <div className="container flex h-14 items-center">
        {/* Logo */}
        <Link href="/" className="mr-8 flex items-center gap-2">
          <PandaLogo size="md" />
        </Link>

        {/* Navigation */}
        <nav className="flex flex-1 items-center gap-1">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href)
            const Icon = item.icon
            
            return (
              <Link key={item.href} href={item.href}>
                <Button
                  variant={isActive ? "secondary" : "ghost"}
                  size="sm"
                  className={cn(
                    "gap-2 rounded-none font-mono text-xs",
                    isActive && "bg-secondary border-b-2 border-primary"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{item.label}</span>
                </Button>
              </Link>
            )
          })}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-2">
          <ThemeToggle />
          
          <Link href="/settings">
            <Button variant="ghost" size="icon" className="rounded-none h-8 w-8">
              <User className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </motion.header>
  )
}
