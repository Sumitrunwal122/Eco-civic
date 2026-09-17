/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        swachh: {
          green: '#16a34a',
          blue: '#2563eb',
          saffron: '#ea580c',
          hazardous: '#dc2626',
          dark: '#0f172a'
        }
      }
    },
  },
  plugins: [],
}
