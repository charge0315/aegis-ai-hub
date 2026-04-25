/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./dashboard/index.html",
    "./dashboard/js/**/*.js",
    "../dashboard/index.html",
    "../dashboard/js/**/*.js",
    "./index.html",
    "./js/**/*.js"
  ],
  theme: {
    extend: {
      animation: {
        shimmer: "shimmer 2s infinite",
      },
      keyframes: {
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
      },
    },
  },
  plugins: [],
};
