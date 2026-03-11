/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['DM Sans', 'sans-serif'],
        display: ['Sora', 'sans-serif'],
        mono: ['DM Mono', 'monospace'],
      },
      colors: {
        brand: {
          50:  '#ede9ff',
          100: '#d4ccff',
          200: '#b8adff',
          300: '#9b8eff',
          400: '#7b6ef9',
          500: '#5b4ef8',
          600: '#4a3dd6',
          700: '#3a2eb4',
          800: '#2b2192',
          900: '#1e1670',
        },
      },
    },
  },
  plugins: [],
};