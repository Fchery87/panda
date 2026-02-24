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
    background: 'hsl(var(--surface-0))',
    foreground: 'hsl(var(--foreground))',
    caret: 'hsl(var(--primary))',
    selection: 'hsl(var(--primary) / 0.2)',
    selectionMatch: 'hsl(var(--primary) / 0.15)',
    lineHighlight: 'hsl(var(--primary) / 0.06)',
    gutterBackground: 'hsl(var(--surface-1))',
    gutterForeground: 'hsl(var(--muted-foreground))',
    gutterActiveForeground: 'hsl(var(--foreground))',
  },
  styles: [
    // Keywords - primary accent color
    { tag: tags.keyword, color: 'hsl(var(--primary))' },
    { tag: tags.operator, color: 'hsl(var(--primary))' },

    // Variables and identifiers
    { tag: tags.variableName, color: 'hsl(var(--foreground))' },
    { tag: tags.propertyName, color: 'hsl(var(--foreground))' },

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
      color: 'hsl(var(--muted-foreground) / 0.7)',
      fontStyle: 'italic',
    },
    { tag: tags.lineComment, color: 'hsl(var(--muted-foreground) / 0.7)', fontStyle: 'italic' },
    { tag: tags.blockComment, color: 'hsl(var(--muted-foreground) / 0.7)', fontStyle: 'italic' },

    // Punctuation and brackets
    { tag: tags.punctuation, color: 'hsl(var(--muted-foreground))' },
    { tag: tags.bracket, color: 'hsl(var(--muted-foreground))' },

    // Meta and annotations
    { tag: tags.meta, color: 'hsl(280 40% 65%)' },
    { tag: tags.annotation, color: 'hsl(280 40% 65%)' },

    // Invalid/Error - status error color
    { tag: tags.invalid, color: 'hsl(var(--status-error))' },

    // Definition links
    { tag: tags.definition(tags.variableName), color: 'hsl(var(--foreground))' },
    { tag: tags.definition(tags.propertyName), color: 'hsl(var(--foreground))' },

    // Local variables
    { tag: tags.local(tags.variableName), color: 'hsl(var(--foreground))' },

    // Special tags
    { tag: tags.special(tags.string), color: 'hsl(35 50% 60%)' },

    // Strong/emphasis
    { tag: tags.strong, fontWeight: 'bold' },
    { tag: tags.emphasis, fontStyle: 'italic' },

    // Heading
    { tag: tags.heading, color: 'hsl(var(--primary))', fontWeight: 'bold' },

    // Links
    { tag: tags.link, color: 'hsl(var(--primary))', textDecoration: 'underline' },
  ],
})
