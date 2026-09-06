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
        ink: '#080B0D',
        panel: '#121214',
        line: '#1E1E21',
        muted: '#8B8B91',
        accent: '#C6FF00',
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'Manrope', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        '2xl': '1.125rem', // 18px — spec bo'yicha card radiusi
      },
      maxWidth: {
        site: '1280px',
      },
    },
  },
  plugins: [],
};
