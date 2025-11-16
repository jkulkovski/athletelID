/** @type {import('tailwindcss').Config} */
const config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        sportBlue: "#0F6FFF",
        sportOrange: "#FF6B35",
        sportDark: "#0B1220"
      }
    }
  },
  plugins: []
};

export default config;


