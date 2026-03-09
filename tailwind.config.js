/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['Syne', 'sans-serif'],
        body: ['DM Sans', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        civic: {
          green: '#16a34a',
          lime: '#84cc16',
          orange: '#f97316',
          red: '#dc2626',
          dark: '#7f1d1d',
        }
      }
    },
  },
  plugins: [],
};
