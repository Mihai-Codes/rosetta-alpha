/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ['Playfair Display', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Consolas', 'monospace'],
      },
      colors: {
        // Surfaces
        'bg-primary': '#0A0A0F',
        'bg-secondary': '#111118',
        'bg-tertiary': '#1A1A24',
        // Text
        'text-primary': '#F0EDE8',
        'text-secondary': '#A09C94',
        'text-tertiary': '#605C56',
        // Tailwind compatibility
        border: '#2A2A38',
        input: '#2A2A38',
        ring: '#C9A84C',
        background: '#0A0A0F',
        foreground: '#F0EDE8',
        primary: { DEFAULT: '#C9A84C', foreground: '#0A0A0F' },
        secondary: { DEFAULT: '#1A1A24', foreground: '#A09C94' },
        muted: { DEFAULT: '#1A1A24', foreground: '#A09C94' },
        accent: { DEFAULT: '#1A1A24', foreground: '#F0EDE8' },
        card: { DEFAULT: '#111118', foreground: '#F0EDE8' },
        popover: { DEFAULT: '#111118', foreground: '#F0EDE8' },
        destructive: { DEFAULT: '#9F4A4A', foreground: '#F0EDE8' },
        // Brand accents
        gold: { DEFAULT: '#C9A84C', light: '#E8C870', dark: '#8F7530' },
        amber: '#E8A020',
        // Regions
        region: {
          us: '#4A7FBF',
          cn: '#BF4A4A',
          eu: '#4A8F6F',
          jp: '#8F6F4A',
          crypto: '#7A4ABF',
        },
        // Signals
        positive: '#4A9F6F',
        negative: '#9F4A4A',
        neutral: '#7B8FA6',
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
        'glow-red':  '0 0 20px rgba(191,74,74,0.15)',
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
