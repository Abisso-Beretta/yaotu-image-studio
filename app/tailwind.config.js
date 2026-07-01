/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#0f1311',
        panel: '#171c19',
        line: '#2a322d',
        accent: '#16745a',
        'accent-soft': '#1f8f70',
      },
    },
  },
  plugins: [],
}
