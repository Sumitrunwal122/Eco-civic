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
        },
        // --- ECO-civic brand system, grounded in Jodhpur / Rajasthan ---
        // Citizen portal: Banyan Green (forest-teal, replaces default mint emerald)
        emerald: {
          50:  '#EEF6F2',
          100: '#D3E9DF',
          200: '#A7D3BF',
          300: '#79B99C',
          400: '#4C9C79',
          500: '#2F855F',
          600: '#1E7A5C',
          700: '#175F48',
          800: '#134A38',
          900: '#0F3A2C',
          950: '#082018',
        },
        // Admin portal: Royal Aubergine (Rajasthani textile plum, replaces default purple)
        purple: {
          50:  '#F7EEF6',
          100: '#EBD3E8',
          200: '#D6A8D3',
          300: '#BC7BB9',
          400: '#9E549E',
          500: '#7E3B80',
          600: '#5B2A5E',
          700: '#47214A',
          800: '#351938',
          900: '#241127',
          950: '#150A17',
        },
        // Staff portal: Mehrangarh Terracotta (sandstone-fort ochre, replaces default amber)
        amber: {
          50:  '#FBF0E9',
          100: '#F5DAC5',
          200: '#EAB48C',
          300: '#DE8E57',
          400: '#D06F38',
          500: '#B85B27',
          600: '#A84F22',
          700: '#833E1B',
          800: '#632F15',
          900: '#46220F',
          950: '#2A140A',
        },
        // Neutral chrome: Stone Ink (warm charcoal, replaces cold blue-grey slate)
        slate: {
          50:  '#F8F6F3',
          100: '#EFEBE5',
          200: '#DCD4C9',
          300: '#C1B5A4',
          400: '#9C8D7A',
          500: '#7D7061',
          600: '#5F5548',
          700: '#463F36',
          800: '#2E2924',
          900: '#211D19',
          950: '#16130F',
        },
        // Brand anchor: Jodhpur Indigo (the Blue City)
        jodhpur: {
          50:  '#EEF1F6',
          100: '#D2DAE7',
          200: '#A6B6CF',
          300: '#7891B6',
          400: '#4E6C9B',
          500: '#324D78',
          600: '#233A5C',
          700: '#1B2C46',
          800: '#16233F',
          900: '#101A2E',
          950: '#0A111E',
        },
      },
      fontFamily: {
        sans: ['"Mukta"', 'system-ui', 'sans-serif'],
        serif: ['"Spectral"', 'Georgia', 'serif'],
      },
      boxShadow: {
        sm: '0 1px 2px 0 rgba(22, 35, 63, 0.06)',
        DEFAULT: '0 1px 3px 0 rgba(22, 35, 63, 0.08), 0 1px 2px -1px rgba(22, 35, 63, 0.08)',
        md: '0 4px 8px -2px rgba(22, 35, 63, 0.10), 0 2px 4px -2px rgba(22, 35, 63, 0.08)',
        lg: '0 10px 20px -4px rgba(22, 35, 63, 0.12), 0 4px 8px -4px rgba(22, 35, 63, 0.08)',
        xl: '0 20px 32px -8px rgba(22, 35, 63, 0.16), 0 6px 12px -6px rgba(22, 35, 63, 0.10)',
        '2xl': '0 24px 48px -12px rgba(22, 35, 63, 0.22)',
      },
      borderRadius: {
        '3xl': '1.25rem',
      },
    },
  },
  plugins: [],
}