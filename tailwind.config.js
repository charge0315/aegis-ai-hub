/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#6366f1", // Indigo 500
        background: "#070a13", // Deep Space
        surface: "rgba(15, 23, 42, 0.7)", // Slate 900 Glass
        accent: "#10b981", // Emerald 500
        alert: "#f43f5e", // Rose 500
      },
      backgroundImage: {
        'mica': "radial-gradient(circle at top left, rgba(99, 102, 241, 0.15), transparent), radial-gradient(circle at bottom right, rgba(16, 185, 129, 0.1), transparent)",
      },
      backdropBlur: {
        xs: '2px',
      }
    },
  },
  plugins: [],
}
