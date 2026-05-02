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
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        success: {
          DEFAULT: 'hsl(var(--status-success))',
          foreground: 'hsl(var(--background))',
        },
        warning: {
          DEFAULT: 'hsl(var(--status-warning))',
          foreground: 'hsl(var(--background))',
        },
        status: {
          success: 'hsl(var(--status-success))',
          error: 'hsl(var(--status-error))',
          warning: 'hsl(var(--status-warning))',
          info: 'hsl(var(--status-info))',
          online: 'hsl(var(--status-online))',
        },
      },
      fontSize: {
        'code-xs': ['11px', { lineHeight: '16px' }],
        'code-sm': ['12px', { lineHeight: '18px' }],
        'code-base': ['13px', { lineHeight: '20px' }],
        'code-lg': ['14px', { lineHeight: '22px' }],
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'Inter', 'system-ui', 'sans-serif'],
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
