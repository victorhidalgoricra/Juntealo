import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './features/**/*.{ts,tsx}',
    './hooks/**/*.{ts,tsx}'
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-dm-sans)', 'DM Sans', 'system-ui', 'sans-serif'],
        mono: ['var(--font-dm-mono)', 'DM Mono', 'monospace'],
      },
      colors: {
        // Page-level background
        canvas:  'var(--bg)',
        // Component-level background
        surface: 'var(--surface)',
        // Border
        border:  'var(--border)',
        // Text
        fg:      'var(--text)',
        muted:   'var(--muted)',
        faint:   'var(--faint)',
        // Primary action (backward-compat alias)
        primary: 'var(--accent)',
        // Accent family
        accent: {
          DEFAULT: 'var(--accent)',
          bg:      'var(--accent-bg)',
          dark:    'var(--accent-dark)',
          light:   'var(--accent-light)',
        },
        // Status — extend built-in palettes with kit tokens
        green: {
          DEFAULT: 'var(--green)',
          bg:      'var(--green-bg)',
        },
        amber: {
          DEFAULT: 'var(--amber)',
          bg:      'var(--amber-bg)',
        },
        destructive: {
          DEFAULT: 'var(--destructive)',
          bg:      'var(--destructive-bg)',
        },
        // Dark surfaces
        dark: {
          1:     'var(--dark-1)',
          2:     'var(--dark-2)',
          3:     'var(--dark-3)',
          4:     'var(--dark-4)',
          muted: 'var(--dark-muted)',
          text:  'var(--dark-text)',
        },
      },
    }
  },
  plugins: []
};

export default config;
