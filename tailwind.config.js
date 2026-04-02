/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        raptor: {
          50:  '#f0edff',
          100: '#ddd8ff',
          200: '#c4bcff',
          300: '#a195ff',
          400: '#7c6af5',
          500: '#6455e0',
          600: '#4e41c4',
          700: '#3a2fa0',
          800: '#27207a',
          900: '#161254',
        },
        surface: {
          0: '#0a0a0a',
          1: '#111111',
          2: '#171717',
          3: '#1e1e1e',
          4: '#262626',
          5: '#333333',
        }
      },
      fontFamily: {
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
        mono: ['DM Mono', 'monospace'],
      },
      borderRadius: {
        'xl': '12px',
        '2xl': '16px',
        '3xl': '20px',
      }
    },
  },
  plugins: [],
}
