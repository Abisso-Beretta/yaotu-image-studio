/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#0f1311',
        panel: '#171c19',
        line: '#2a322d',
        // accent 走 CSS 变量：颜色数值由 index.css 里按 data-theme 切换，
        // 各主题的按钮/强调色能跟着背景色调走，不用逐个覆盖 bg-accent/text-accent 等派生 class。
        accent: 'rgb(var(--accent-rgb) / <alpha-value>)',
        'accent-soft': 'rgb(var(--accent-soft-rgb) / <alpha-value>)',
      },
    },
  },
  plugins: [],
}
