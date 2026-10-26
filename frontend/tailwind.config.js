/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        surface: {
          DEFAULT: 'var(--surface)',
          raised: 'var(--surface-raised)',
          muted: 'var(--surface-muted)'
        },
        foreground: 'var(--foreground)',
        text: {
          secondary: 'var(--text-secondary)',
          muted: 'var(--text-muted)'
        },
        border: {
          DEFAULT: 'var(--border)',
          subtle: 'var(--border-subtle)',
          strong: 'var(--border-strong)'
        },
        accent: {
          DEFAULT: 'var(--accent)',
          strong: 'var(--accent-strong)',
          subtle: 'var(--accent-subtle)',
          foreground: 'var(--accent-foreground)'
        },
        success: 'var(--success)',
        warning: 'var(--warning)',
        danger: 'var(--danger)',
        neutral: {
          0: 'var(--neutral-0)',
          1: 'var(--neutral-1)',
          2: 'var(--neutral-2)',
          3: 'var(--neutral-3)',
          4: 'var(--neutral-4)',
          5: 'var(--neutral-5)',
          6: 'var(--neutral-6)',
          7: 'var(--neutral-7)',
          8: 'var(--neutral-8)',
          9: 'var(--neutral-9)',
          10: 'var(--neutral-10)',
          11: 'var(--neutral-11)',
        },
        primary: {
          50: '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
          950: '#1e1b4b',
        }
      },
      borderRadius: {
        control: 'var(--radius-control)',
        panel: 'var(--radius-panel)',
        surface: 'var(--radius-surface)',
        pill: 'var(--radius-pill)'
      },
      boxShadow: {
        resting: 'var(--shadow-resting)',
        raised: 'var(--shadow-raised)',
        floating: 'var(--shadow-floating)'
      },
      fontFamily: {
        display: ['Geist', 'Inter', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace']
      }
    },
  },
  plugins: [],
}
