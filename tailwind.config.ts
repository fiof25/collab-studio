import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        canvas: { DEFAULT: '#0D0D12', subtle: '#111118' },
        surface: {
          0: '#0D0D12',
          1: '#14141C',
          2: '#1C1C28',
          3: '#242436',
          4: '#2E2E45',
        },
        accent: {
          violet: '#8B5CF6',
          'violet-light': '#A78BFA',
          'violet-dark': '#6D28D9',
          cyan: '#06B6D4',
          'cyan-light': '#22D3EE',
          'cyan-dark': '#0891B2',
          pink: '#EC4899',
          'pink-light': '#F472B6',
          'pink-dark': '#DB2777',
          emerald: '#10B981',
          'emerald-light': '#34D399',
          'emerald-dark': '#059669',
          amber: '#F59E0B',
          'amber-light': '#FCD34D',
          'amber-dark': '#D97706',
        },
        ink: {
          primary: '#F1F1F8',
          secondary: '#9898B0',
          muted: '#5A5A72',
        },
        line: {
          DEFAULT: '#2E2E45',
          subtle: '#242436',
          accent: '#8B5CF6',
        },
        status: {
          active: '#10B981',
          archived: '#5A5A72',
          merging: '#F59E0B',
          merged: '#8B5CF6',
          error: '#EF4444',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.875rem' }],
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.25rem',
        '4xl': '1.5rem',
      },
      boxShadow: {
        'glow-violet': '0 0 20px rgba(139, 92, 246, 0.35)',
        'glow-cyan': '0 0 20px rgba(6, 182, 212, 0.35)',
        'glow-pink': '0 0 20px rgba(236, 72, 153, 0.35)',
        card: '0 4px 24px rgba(0,0,0,0.4)',
        'card-hover': '0 8px 40px rgba(0,0,0,0.6)',
        float: '0 12px 48px rgba(0,0,0,0.7)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4,0,0.6,1) infinite',
        'glow-pulse': 'glowPulse 2s ease-in-out infinite',
        'march-ants': 'marchAnts 1s linear infinite',
        'typing-blink': 'blink 1.1s step-end infinite',
        'float-in': 'floatIn 0.3s cubic-bezier(0.34,1.56,0.64,1)',
      },
      keyframes: {
        glowPulse: {
          '0%, 100%': { opacity: '0.6' },
          '50%': { opacity: '1' },
        },
        marchAnts: {
          from: { strokeDashoffset: '0' },
          to: { strokeDashoffset: '-20' },
        },
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0' },
        },
        floatIn: {
          from: { opacity: '0', transform: 'translateY(8px) scale(0.96)' },
          to: { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
      },
      transitionTimingFunction: {
        spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        'smooth-out': 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
    },
  },
  plugins: [],
} satisfies Config;
