import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'media',
  content: ['./src/**/*.{js,ts,jsx,tsx}', '../../packages/ui/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#8b5cf6',
          50: '#f5f3ff',
          100: '#ede9fe',
          200: '#ddd6fe',
          300: '#c4b5fd',
          400: '#a78bfa',
          500: '#8b5cf6',
          600: '#7c3aed',
          700: '#6d28d9',
          800: '#5b21b6',
          900: '#4c1d95',
        },
        surface: {
          DEFAULT: '#0a0a0c',
          raised: '#121217',
          overlay: '#1a1a24',
          border: 'rgba(255, 255, 255, 0.08)',
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
        glow: '0 0 30px rgba(139, 92, 246, 0.25)',
        'glow-pink': '0 0 30px rgba(236, 72, 153, 0.25)',
        glass: '0 8px 32px rgba(0, 0, 0, 0.4)',
        float: '0 12px 40px rgba(0, 0, 0, 0.6)',
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(135deg, #7c3aed 0%, #ec4899 50%, #3b82f6 100%)',
        'brand-gradient-soft': 'linear-gradient(135deg, rgba(139,92,246,0.1) 0%, rgba(236,72,153,0.1) 100%)',
      },
      keyframes: {
        'fade-in': { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        'slide-up': { '0%': { transform: 'translateY(20px)', opacity: '0' }, '100%': { transform: 'translateY(0)', opacity: '1' } },
        'slide-in': { '0%': { transform: 'translateX(100%)' }, '100%': { transform: 'translateX(0)' } },
        'heart-beat': { '0%,100%': { transform: 'scale(1)' }, '50%': { transform: 'scale(1.15)' } },
        'pulse-glow': { '0%,100%': { boxShadow: '0 0 20px rgba(139,92,246,0.3)' }, '50%': { boxShadow: '0 0 40px rgba(139,92,246,0.6)' } },
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
