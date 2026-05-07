import { createTheme } from '@uiw/codemirror-themes'
import { tags } from '@lezer/highlight'

/**
 * Panda IDE Custom CodeMirror Theme
 *
 * A custom theme using Panda's warm neutral palette that harmonizes
 * with the brutalist IDE aesthetic.
 */
export const pandaTheme = createTheme({
  theme: 'dark',
  settings: {
    background: 'oklch(var(--surface-0))',
    foreground: 'oklch(var(--foreground))',
    caret: 'oklch(var(--primary))',
    selection: 'oklch(var(--primary) / 0.2)',
    selectionMatch: 'oklch(var(--primary) / 0.15)',
    lineHighlight: 'oklch(var(--primary) / 0.06)',
    gutterBackground: 'oklch(var(--surface-1))',
    gutterForeground: 'oklch(var(--muted-foreground))',
    gutterActiveForeground: 'oklch(var(--foreground))',
  },
  styles: [
    // Keywords - primary accent color
    { tag: tags.keyword, color: 'oklch(var(--primary))' },
    { tag: tags.operator, color: 'oklch(var(--primary))' },

    // Variables and identifiers
    { tag: tags.variableName, color: 'oklch(var(--foreground))' },
    { tag: tags.propertyName, color: 'oklch(var(--foreground))' },

    // Types and classes - slightly muted
    { tag: tags.typeName, color: 'hsl(38 60% 65%)' },
    { tag: tags.className, color: 'hsl(38 60% 65%)' },
    { tag: tags.tagName, color: 'hsl(38 60% 65%)' },

    // Functions - distinct but subtle
    { tag: tags.function(tags.variableName), color: 'hsl(210 60% 70%)' },

    // Strings - warm tone
    { tag: tags.string, color: 'hsl(35 50% 60%)' },
    { tag: tags.regexp, color: 'hsl(35 50% 60%)' },

    // Numbers and literals
    { tag: tags.number, color: 'hsl(160 40% 60%)' },
    { tag: tags.bool, color: 'hsl(160 40% 60%)' },

    // Comments - muted
    {
      tag: tags.comment,
      color: 'oklch(var(--muted-foreground) / 0.7)',
      fontStyle: 'italic',
    },
    { tag: tags.lineComment, color: 'oklch(var(--muted-foreground) / 0.7)', fontStyle: 'italic' },
    { tag: tags.blockComment, color: 'oklch(var(--muted-foreground) / 0.7)', fontStyle: 'italic' },

    // Punctuation and brackets
    { tag: tags.punctuation, color: 'oklch(var(--muted-foreground))' },
    { tag: tags.bracket, color: 'oklch(var(--muted-foreground))' },

    // Meta and annotations
    { tag: tags.meta, color: 'hsl(280 40% 65%)' },
    { tag: tags.annotation, color: 'hsl(280 40% 65%)' },

    // Invalid/Error - status error color
    { tag: tags.invalid, color: 'oklch(var(--status-error))' },

    // Definition links
    { tag: tags.definition(tags.variableName), color: 'oklch(var(--foreground))' },
    { tag: tags.definition(tags.propertyName), color: 'oklch(var(--foreground))' },

    // Local variables
    { tag: tags.local(tags.variableName), color: 'oklch(var(--foreground))' },

    // Special tags
    { tag: tags.special(tags.string), color: 'hsl(35 50% 60%)' },

    // Strong/emphasis
    { tag: tags.strong, fontWeight: 'bold' },
    { tag: tags.emphasis, fontStyle: 'italic' },

    // Heading
    { tag: tags.heading, color: 'oklch(var(--primary))', fontWeight: 'bold' },

    // Links
    { tag: tags.link, color: 'oklch(var(--primary))', textDecoration: 'underline' },
  ],
})
