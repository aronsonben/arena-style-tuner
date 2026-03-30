/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./**/*.{js,ts,jsx,tsx}"],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        arena: {
          gray: '#F7F7F7',
          border: '#E7E7E7',
          text: '#1A1A1A',
          green: '#2D9F61',
        }
      },
      animation: {
        'mesh': 'mesh 15s ease infinite',
      },
      keyframes: {
        mesh: {
          '0%, 100%': { 'background-position': '0% 50%' },
          '50%': { 'background-position': '100% 50%' },
        }
      }
    },
  },
  plugins: [],
}