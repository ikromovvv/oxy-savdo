/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
    './lib/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        ink: '#0a0a0b',
        panel: '#111113',
        line: '#1e1e22',
        muted: '#8a8a93',
        accent: '#c8ff2e',
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
      },
      maxWidth: {
        site: '1280px',
      },
    },
  },
  plugins: [],
};
