import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#0d0d0d',
        sidebar: '#171717',
        'sidebar-hover': '#1f1f1f',
        'chat-bg': '#0d0d0d',
        'message-user': '#1a1a2e',
        'message-assistant': 'transparent',
        border: '#2a2a2a',
        'text-primary': '#ececec',
        'text-secondary': '#8e8e8e',
        'text-muted': '#555555',
        accent: '#10a37f',
        'accent-hover': '#0d8a6a',
        matrix: '#00ff41',
        danger: '#ef4444',
        'input-bg': '#1e1e1e',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-in': 'slideIn 0.2s ease-out',
        'pulse-green': 'pulseGreen 2s infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideIn: {
          '0%': { transform: 'translateX(-10px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        pulseGreen: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
      },
    },
  },
  plugins: [],
}

export default config
