import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'media',
  content: ['./src/**/*.{js,ts,jsx,tsx}', '../../packages/ui/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#FF4DBD',
          50: '#fff0f8',
          100: '#ffe4f3',
          200: '#ffc8e8',
          300: '#ffa1d8',
          400: '#ff6bc2',
          500: '#FF4DBD', // Primary
          600: '#e6249e',
          700: '#c51381',
          800: '#a3136a',
          900: '#861559',
        },
        secondary: {
          DEFAULT: '#A855F7',
          500: '#A855F7',
        },
        accent: {
          DEFAULT: '#3B82F6',
          500: '#3B82F6',
        },
        success: '#22C55E',
        warning: '#F59E0B',
        error: '#EF4444',
        surface: {
          DEFAULT: '#0a0a0c', // Background
          raised: '#16161D',   // Surface
          overlay: '#1F1F28',  // Surface 2
          border: '#2A2A35',   // Border
        },
      },
      borderRadius: {
        xl: '1rem',
        '2xl': '1.5rem',
        '3xl': '2rem',
        '4xl': '2.5rem',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 0 30px rgba(255, 77, 189, 0.25)',
        'glow-secondary': '0 0 30px rgba(168, 85, 247, 0.25)',
        glass: '0 8px 32px rgba(0, 0, 0, 0.4)',
        float: '0 12px 40px rgba(0, 0, 0, 0.6)',
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(135deg, #FF4DBD 0%, #A855F7 100%)',
        'brand-gradient-soft': 'linear-gradient(135deg, rgba(255, 77, 189, 0.15) 0%, rgba(168, 85, 247, 0.15) 100%)',
      },
      keyframes: {
        'fade-in': { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        'slide-up': { '0%': { transform: 'translateY(20px)', opacity: '0' }, '100%': { transform: 'translateY(0)', opacity: '1' } },
        'slide-in': { '0%': { transform: 'translateX(100%)' }, '100%': { transform: 'translateX(0)' } },
        'heart-beat': { '0%,100%': { transform: 'scale(1)' }, '50%': { transform: 'scale(1.15)' } },
        'pulse-glow': { '0%,100%': { boxShadow: '0 0 20px rgba(255, 77, 189, 0.3)' }, '50%': { boxShadow: '0 0 40px rgba(255, 77, 189, 0.6)' } },
        shimmer: { '0%': { transform: 'translateX(-100%)' }, '100%': { transform: 'translateX(100%)' } },
      },
      animation: {
        'fade-in': 'fade-in 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-up': 'slide-up 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-in': 'slide-in 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        'heart-beat': 'heart-beat 1.5s infinite',
        'pulse-glow': 'pulse-glow 2.5s infinite',
        shimmer: 'shimmer 1.5s infinite',
      },
    },
  },
  plugins: [],
};

export default config;
