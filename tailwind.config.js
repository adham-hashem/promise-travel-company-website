/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        cairo: ['Cairo', 'sans-serif'],
      },
      colors: {
        // Visitor-site palette (see src/styles/public-site.css)
        pm: {
          teal: '#053D43',
          'teal-2': '#0A4A50',
          'teal-3': '#13595F',
          gold: '#DDBB6B',
          'gold-deep': '#A9832F',
          'gold-soft': '#F3E6C4',
          paper: '#F4F7F6',
          tint: '#E9EFED',
          ink: '#11292A',
          muted: '#566B6B',
          line: '#DCE5E3',
          'on-teal': '#F4F1EB',
          'on-teal-muted': '#B4C8C5',
        },
        navy: {
          50: '#eef2f9',
          100: '#d5def0',
          200: '#aabde2',
          300: '#7f9cd3',
          400: '#547bc5',
          500: '#2f867b',
          600: '#1f6f65',
          700: '#1f6f65',
          800: '#0e2a66',
          900: '#0f3f39',
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
        'gradient-navy': 'linear-gradient(135deg, #082a26 0%, #185951 100%)',
        'gradient-gold': 'linear-gradient(135deg, #c9941a 0%, #e4b030 100%)',
      },
    },
  },
  plugins: [],
};
