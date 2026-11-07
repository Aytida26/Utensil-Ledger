/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#16242D",
        ice: "#F2F6F8",
        cobalt: "#2B54D9",
        leaf: "#13805B",
        rust: "#B8441A",
      },
    },
  },
  plugins: [],
};
