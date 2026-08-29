/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: '#090d16',
        surface: '#0f172a',
        'surface-elevated': '#182234',
        'surface-subtle': '#0b1120',
        border: '#1e293b',
        'border-strong': '#334155',
        'border-accent': '#0284c7',
        synapse: {
          50: '#f0fdfa',
          100: '#ccfbf1',
          200: '#99f6e4',
          300: '#5eead4',
          400: '#2dd4bf',
          500: '#14b8a6',
          600: '#0d9488',
          700: '#0f766e',
          800: '#115e59',
          900: '#134e4a',
          950: '#042f2e',
        },
        cyber: {
          cyan: '#00f0ff',
          neonBlue: '#38bdf8',
          purple: '#a855f7',
          pink: '#f43f5e',
          emerald: '#10b981',
          amber: '#f59e0b',
        }
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      boxShadow: {
        'glow-cyan': '0 0 15px -3px rgba(0, 240, 255, 0.3)',
        'glow-cyan-lg': '0 0 25px -2px rgba(0, 240, 255, 0.45)',
        'glow-purple': '0 0 15px -3px rgba(168, 85, 247, 0.3)',
        'glow-emerald': '0 0 15px -3px rgba(16, 185, 129, 0.3)',
        'glow-amber': '0 0 15px -3px rgba(245, 158, 11, 0.3)',
        'glow-rose': '0 0 15px -3px rgba(244, 63, 94, 0.3)',
        'inner-glow': 'inset 0 1px 1px 0 rgba(255, 255, 255, 0.08)',
      },
      animation: {
        'pulse-glow': 'pulseGlow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'radar-ping': 'radarPing 1.8s cubic-bezier(0, 0, 0.2, 1) infinite',
        'fade-in': 'fadeIn 0.15s ease-out forwards',
        'slide-up': 'slideUp 0.2s ease-out forwards',
        'slide-in-right': 'slideInRight 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards',
      },
      keyframes: {
        pulseGlow: {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.6', transform: 'scale(0.98)' },
        },
        radarPing: {
          '75%, 100%': { transform: 'scale(2.2)', opacity: '0' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        slideInRight: {
          from: { opacity: '0', transform: 'translateX(100%)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
      },
    },
  },
  plugins: [],
};
