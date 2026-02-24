/**
 * Design Tokens Reference
 *
 * Centralized design tokens for Panda IDE's brutalist design system.
 * Use these constants for programmatic access to design values.
 */

// ═══════════════════════════════════════════════════════════
// STATUS COLORS
// ═══════════════════════════════════════════════════════════
export const statusColors = {
  success: 'hsl(var(--status-success))',
  error: 'hsl(var(--status-error))',
  warning: 'hsl(var(--status-warning))',
  info: 'hsl(var(--status-info))',
  online: 'hsl(var(--status-online))',
} as const

// ═══════════════════════════════════════════════════════════
// TERMINAL COLORS
// ═══════════════════════════════════════════════════════════
export const terminalColors = {
  success: 'hsl(var(--terminal-success))',
  error: 'hsl(var(--terminal-error))',
  warning: 'hsl(var(--terminal-warning))',
} as const

// ═══════════════════════════════════════════════════════════
// DIFF COLORS
// ═══════════════════════════════════════════════════════════
export const diffColors = {
  added: {
    bg: 'hsl(var(--diff-added-bg))',
    fg: 'hsl(var(--diff-added-fg))',
  },
  removed: {
    bg: 'hsl(var(--diff-removed-bg))',
    fg: 'hsl(var(--diff-removed-fg))',
  },
} as const

// ═══════════════════════════════════════════════════════════
// INTERACTIVE STATES
// ═══════════════════════════════════════════════════════════
export const interactiveStates = {
  hover: 'hsl(var(--interactive-hover))',
  selected: 'hsl(var(--interactive-selected))',
} as const

// ═══════════════════════════════════════════════════════════
// TYPOGRAPHY SCALE
// ═══════════════════════════════════════════════════════════
export const typography = {
  code: {
    xs: 'text-code-xs', // 11px / 16px line-height
    sm: 'text-code-sm', // 12px / 18px line-height
    base: 'text-code-base', // 13px / 20px line-height
    lg: 'text-code-lg', // 14px / 22px line-height
  },
  display: 'text-display',
  label: 'text-label',
} as const

// ═══════════════════════════════════════════════════════════
// BORDER RADIUS
// ═══════════════════════════════════════════════════════════
export const borderRadius = {
  none: 'rounded-none',
  sharp: 'rounded-none', // Alias for consistency with brutalist identity
} as const

// ═══════════════════════════════════════════════════════════
// SHADOWS
// ═══════════════════════════════════════════════════════════
export const shadows = {
  sharp: {
    sm: 'shadow-sharp-sm',
    md: 'shadow-sharp-md',
    lg: 'shadow-sharp-lg',
  },
} as const

// ═══════════════════════════════════════════════════════════
// SURFACE ELEVATION
// ═══════════════════════════════════════════════════════════
export const surfaces = {
  0: 'surface-0',
  1: 'surface-1',
  2: 'surface-2',
} as const

// ═══════════════════════════════════════════════════════════
// SEMANTIC UTILITY CLASSES
// ═══════════════════════════════════════════════════════════
export const semanticClasses = {
  terminal: {
    success: {
      text: 'text-terminal-success',
      bg: 'bg-terminal-success',
    },
    error: {
      text: 'text-terminal-error',
      bg: 'bg-terminal-error',
    },
    warning: {
      text: 'text-terminal-warning',
    },
  },
  diff: {
    added: {
      text: 'text-diff-added',
      bg: 'bg-diff-added',
    },
    removed: {
      text: 'text-diff-removed',
      bg: 'bg-diff-removed',
    },
  },
  status: {
    online: 'bg-status-online',
  },
} as const
