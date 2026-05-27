import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'court-blue': '#2EA5DC',
        'court-green': '#6FB344',
        'visitor-red': '#D32F2F',
        'board-bg': '#FAFAFA',
      },
      fontFamily: {
        sans: ['ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        chip: '0 1px 2px rgba(0,0,0,0.15), 0 2px 4px rgba(0,0,0,0.1)',
        tab: '0 3px 6px rgba(0,0,0,0.2)',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
export default config;
