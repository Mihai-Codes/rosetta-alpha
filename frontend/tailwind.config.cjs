/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ['-apple-system', 'BlinkMacSystemFont', '"SF Pro Display"', '"Segoe UI"', 'Roboto', 'Helvetica', 'Arial', 'sans-serif'],
        sans: ['-apple-system', 'BlinkMacSystemFont', '"SF Pro Text"', '"Segoe UI"', 'Roboto', 'Helvetica', 'Arial', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', '"Liberation Mono"', '"Courier New"', 'monospace'],
      },
      colors: {
        'brand-red': '#D82B2B',
        // Surfaces
        'bg-primary': '#000000',
        'bg-secondary': '#0A0A0A',
        'bg-tertiary': '#0A0A0A',
        // Text
        'text-primary': '#FFFFFF',
        'text-secondary': '#888888',
        'text-tertiary': '#888888',
        // Tailwind compatibility
        border: '#0A0A0A',
        input: '#0A0A0A',
        ring: '#D82B2B',
        background: '#000000',
        foreground: '#FFFFFF',
        primary: { DEFAULT: '#D82B2B', foreground: '#FFFFFF' },
        secondary: { DEFAULT: '#0A0A0A', foreground: '#888888' },
        muted: { DEFAULT: '#0A0A0A', foreground: '#888888' },
        accent: { DEFAULT: '#0A0A0A', foreground: '#FFFFFF' },
        card: { DEFAULT: '#0A0A0A', foreground: '#FFFFFF' },
        popover: { DEFAULT: '#0A0A0A', foreground: '#FFFFFF' },
        destructive: { DEFAULT: '#D82B2B', foreground: '#FFFFFF' },
        // Brand accents (Mapped to Crimson Red)
        gold: { DEFAULT: '#D82B2B', light: '#E63946', dark: '#991B1B' },
        amber: '#D82B2B',
        // Regions
        region: {
          us: '#4A90E2',
          cn: '#D82B2B',
          eu: '#888888',
          jp: '#FFD700',
          crypto: '#00FF00',
        },
        // Signals
        positive: '#00FF00',
        negative: '#D82B2B',
        neutral: '#888888',
        warning: '#FFD700',
      },
      borderRadius: {
        sm: '4px',
        md: '8px',
        lg: '12px',
        xl: '16px',
      },
      boxShadow: {
        'sm': '0 1px 3px rgba(0,0,0,0.4)',
        'md': '0 4px 12px rgba(0,0,0,0.5)',
        'lg': '0 8px 32px rgba(0,0,0,0.6)',
        'glow-gold': '0 0 20px rgba(201,168,76,0.15)',
        'glow-blue': '0 0 20px rgba(74,127,191,0.15)',
        'glow-red': '0 0 24px rgba(216,43,43,0.6)',
        'glow-red-strong': '0 0 32px rgba(216,43,43,0.9)',
        'glow-green':'0 0 20px rgba(74,143,111,0.15)',
        'glow-purple':'0 0 20px rgba(122,74,191,0.15)',
        'glow-amber':'0 0 20px rgba(232,160,32,0.15)',
      },
      fontSize: {
        'display': 'clamp(2.5rem, 6vw, 5rem)',
      },
    },
  },
  plugins: [],
}
