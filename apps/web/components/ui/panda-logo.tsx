"use client"

import { cn } from "@/lib/utils"

interface PandaLogoProps {
  size?: "sm" | "md" | "lg" | "xl"
  variant?: "icon" | "full"
  className?: string
}

const sizes = {
  sm: { icon: 20, text: "text-sm" },
  md: { icon: 24, text: "text-base" },
  lg: { icon: 32, text: "text-lg" },
  xl: { icon: 48, text: "text-xl" },
}

export function PandaLogo({ 
  size = "md", 
  variant = "full",
  className 
}: PandaLogoProps) {
  const { icon: iconSize, text: textSize } = sizes[size]

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {/* Geometric Panda Icon */}
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0"
      >
        {/* Face - sharp hexagonal shape */}
        <path
          d="M16 2L28 9V23L16 30L4 23V9L16 2Z"
          fill="currentColor"
          className="text-foreground"
        />
        
        {/* Left eye patch */}
        <rect
          x="7"
          y="10"
          width="7"
          height="7"
          className="text-background"
          fill="currentColor"
        />
        
        {/* Right eye patch */}
        <rect
          x="18"
          y="10"
          width="7"
          height="7"
          className="text-background"
          fill="currentColor"
        />
        
        {/* Left eye - amber accent */}
        <rect
          x="9"
          y="12"
          width="3"
          height="3"
          className="text-primary"
          fill="currentColor"
        />
        
        {/* Right eye - amber accent */}
        <rect
          x="20"
          y="12"
          width="3"
          height="3"
          className="text-primary"
          fill="currentColor"
        />
        
        {/* Nose - amber */}
        <rect
          x="14"
          y="19"
          width="4"
          height="3"
          className="text-primary"
          fill="currentColor"
        />
        
        {/* Circuit lines */}
        <line
          x1="4"
          y1="16"
          x2="7"
          y2="16"
          stroke="currentColor"
          strokeWidth="1"
          className="text-primary"
        />
        <line
          x1="25"
          y1="16"
          x2="28"
          y2="16"
          stroke="currentColor"
          strokeWidth="1"
          className="text-primary"
        />
      </svg>

      {/* Text - only in full variant */}
      {variant === "full" && (
        <span className={cn(
          "font-mono font-semibold tracking-tight",
          textSize
        )}>
          panda<span className="text-primary">.ai</span>
        </span>
      )}
    </div>
  )
}
