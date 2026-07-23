/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        cairo: ['Cairo', 'sans-serif'],
      },
      colors: {
        navy: {
          50: '#eef2f9',
          100: '#d5def0',
          200: '#aabde2',
          300: '#7f9cd3',
          400: '#547bc5',
          500: '#2a5ab6',
          600: '#1e4a9e',
          700: '#163a82',
          800: '#0e2a66',
          900: '#0c224f',
          950: '#07152e',
        },
        gold: {
          50: '#fdf9ed',
          100: '#f9f0d0',
          200: '#f3e0a1',
          300: '#ecc963',
          400: '#e4b030',
          500: '#c9941a',
          600: '#b07a12',
          700: '#8f5f11',
          800: '#764d14',
          900: '#634015',
          950: '#3a2108',
        },
      },
      backgroundImage: {
        'gradient-navy': 'linear-gradient(135deg, #0c224f 0%, #163a82 100%)',
        'gradient-gold': 'linear-gradient(135deg, #c9941a 0%, #e4b030 100%)',
      },
    },
  },
  plugins: [],
};
