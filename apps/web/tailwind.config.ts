import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    container: {
      center: true,
      padding: {
        DEFAULT: '1.5rem',
        sm: '2rem',
        lg: '4rem',
        xl: '5rem',
        '2xl': '6rem',
      },
    },
    extend: {
      colors: {
        border: 'oklch(var(--border))',
        input: 'oklch(var(--input))',
        ring: 'oklch(var(--ring))',
        background: 'oklch(var(--background))',
        foreground: 'oklch(var(--foreground))',
        primary: {
          DEFAULT: 'oklch(var(--primary))',
          foreground: 'oklch(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'oklch(var(--secondary))',
          foreground: 'oklch(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'oklch(var(--destructive))',
          foreground: 'oklch(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'oklch(var(--muted))',
          foreground: 'oklch(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'oklch(var(--accent))',
          foreground: 'oklch(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'oklch(var(--popover))',
          foreground: 'oklch(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'oklch(var(--card))',
          foreground: 'oklch(var(--card-foreground))',
        },
        surface: {
          0: 'oklch(var(--surface-0))',
          1: 'oklch(var(--surface-1))',
          2: 'oklch(var(--surface-2))',
          3: 'oklch(var(--surface-3))',
        },
        success: {
          DEFAULT: 'oklch(var(--status-success))',
          foreground: 'oklch(var(--background))',
        },
        warning: {
          DEFAULT: 'oklch(var(--status-warning))',
          foreground: 'oklch(var(--background))',
        },
        status: {
          success: 'oklch(var(--status-success))',
          error: 'oklch(var(--status-error))',
          warning: 'oklch(var(--status-warning))',
          info: 'oklch(var(--status-info))',
          online: 'oklch(var(--status-online))',
        },
        ink: {
          DEFAULT: 'oklch(var(--ink))',
          deep: 'oklch(var(--ink-deep))',
        },
        oxblood: 'oklch(var(--oxblood))',
        teal: {
          DEFAULT: 'oklch(var(--teal))',
          deep: 'oklch(var(--teal-deep))',
        },
      },
      fontSize: {
        'code-xs': ['11px', { lineHeight: '16px' }],
        'code-sm': ['12px', { lineHeight: '18px' }],
        'code-base': ['13px', { lineHeight: '20px' }],
        'code-lg': ['14px', { lineHeight: '22px' }],
      },
      borderRadius: {
        xl: 'calc(var(--radius) + 6px)',
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 4px)',
        sm: 'calc(var(--radius) - 6px)',
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'var(--font-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'Geist Mono', 'SF Mono', 'Consolas', 'monospace'],
      },
      letterSpacing: {
        'wide-02': '0.02em',
        'wide-04': '0.04em',
        'wide-06': '0.06em',
        'wide-08': '0.08em',
      },
    },
  },
  plugins: [],
}

export default config
