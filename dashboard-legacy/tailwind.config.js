/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./dashboard/index.html",
    "./dashboard/js/**/*.js",
    "./index.html",
    "./js/**/*.js",
    "../dashboard/index.html",
    "../dashboard/js/**/*.js"
  ],
  theme: {
    extend: {
      colors: {
        nexus: {
          blue: '#0ea5e9',
          violet: '#8b5cf6',
          cyan: '#22d3ee',
          dark: '#020617',
          surface: 'rgba(15, 23, 42, 0.8)',
          border: 'rgba(255, 255, 255, 0.1)',
        }
      },
      animation: {
        'shimmer': 'shimmer 2s infinite',
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 6s ease-in-out infinite',
        'particle': 'particle 10s infinite linear',
        'fade-in': 'fade-in 0.5s ease-out forwards',
        'slide-up': 'slide-up 0.5s ease-out forwards',
      },
      keyframes: {
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        particle: {
          '0%': { transform: 'translate(0, 0) opacity(0)' },
          '10%': { opacity: '0.5' },
          '90%': { opacity: '0.5' },
          '100%': { transform: 'translate(100px, -100px) opacity(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        }
      },
      backdropBlur: {
        xs: '2px',
        mica: '20px',
      }
    },
  },
  plugins: [],
};
