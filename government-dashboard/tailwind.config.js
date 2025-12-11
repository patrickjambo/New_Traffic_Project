/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'rwanda-blue': '#00A1DE',
        'rwanda-green': '#00A650',
        'rwanda-yellow': '#FDDA24',
        'gov-primary': '#1e40af',
        'gov-secondary': '#0ea5e9',
      },
      fontFamily: {
        'sans': ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
