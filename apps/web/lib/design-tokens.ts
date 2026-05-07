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
  success: 'oklch(var(--status-success))',
  error: 'oklch(var(--status-error))',
  warning: 'oklch(var(--status-warning))',
  info: 'oklch(var(--status-info))',
  online: 'oklch(var(--status-online))',
} as const

// ═══════════════════════════════════════════════════════════
// TERMINAL COLORS
// ═══════════════════════════════════════════════════════════
export const terminalColors = {
  success: 'oklch(var(--terminal-success))',
  error: 'oklch(var(--terminal-error))',
  warning: 'oklch(var(--terminal-warning))',
} as const

// ═══════════════════════════════════════════════════════════
// DIFF COLORS
// ═══════════════════════════════════════════════════════════
export const diffColors = {
  added: {
    bg: 'oklch(var(--diff-added-bg))',
    fg: 'oklch(var(--diff-added-fg))',
  },
  removed: {
    bg: 'oklch(var(--diff-removed-bg))',
    fg: 'oklch(var(--diff-removed-fg))',
  },
} as const

// ═══════════════════════════════════════════════════════════
// INTERACTIVE STATES
// ═══════════════════════════════════════════════════════════
export const interactiveStates = {
  hover: 'oklch(var(--interactive-hover))',
  selected: 'oklch(var(--interactive-selected))',
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
