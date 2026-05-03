/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        chess: {
          bg: '#262421',
          card: '#312e2b',
          green: '#81b64c',
          input: '#1a1a1a',
          secondary: '#9d9d9d',
          board: {
            light: '#f0d9b5',
            dark: '#b58863'
          }
        }
      }
    },
  },
  plugins: [],
}
