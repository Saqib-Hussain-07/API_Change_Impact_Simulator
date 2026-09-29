/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        dark: {
          950: '#000000',
          900: '#08080a',
          850: '#0e0e11',
          800: '#141417',
          700: '#1c1c21',
          600: '#27272e',
        },
        surface: {
          base: '#000000',
          panel: '#09090b',
          card: '#111113',
          cardHover: '#17171a',
          border: 'rgba(255, 255, 255, 0.08)',
          borderHover: 'rgba(255, 255, 255, 0.16)',
          borderFocus: 'rgba(255, 255, 255, 0.28)',
        },
        breaking: {
          bg: '#18080a',
          border: 'rgba(244, 63, 94, 0.3)',
          text: '#fda4af',
          dot: '#f43f5e',
        },
        warning: {
          bg: '#181206',
          border: 'rgba(245, 158, 11, 0.3)',
          text: '#fde68a',
          dot: '#f59e0b',
        },
        safe: {
          bg: '#08170e',
          border: 'rgba(16, 185, 129, 0.3)',
          text: '#a7f3d0',
          dot: '#10b981',
        },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'monospace'],
      },
      letterSpacing: {
        tighter: '-0.04em',
        tight: '-0.02em',
        normal: '0',
      },
      boxShadow: {
        'subtle': '0 1px 2px rgba(0, 0, 0, 0.6)',
        'elevated': '0 8px 30px rgba(0, 0, 0, 0.8)',
        'modal': '0 20px 50px rgba(0, 0, 0, 0.9), 0 0 0 1px rgba(255, 255, 255, 0.12)',
        'button-primary': '0 1px 2px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.8)',
        'button-secondary': '0 1px 2px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-up': 'slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
      },
      keyframes: {
        fadeIn: { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp: { from: { opacity: '0', transform: 'translateY(8px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
      },
    },
  },
  plugins: [],
};
