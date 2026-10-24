/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        saffron: {
          50: "#fff8ed",
          100: "#ffefd4",
          500: "#f97316",
          600: "#ea580c",
        },
        ink: {
          900: "#0f172a",
          800: "#1e293b",
        },
      },
    },
  },
  plugins: [],
};
