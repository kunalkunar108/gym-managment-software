import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Arial", "Helvetica", "sans-serif"]
      },
      colors: {
        ink: "#17211c",
        muted: "#7b877f",
        line: "#e9eee9",
        canvas: "#f7f9f7",
        green: {
          50: "#edf7ef",
          100: "#d9eddd",
          500: "#329653",
          600: "#237b40",
          700: "#1c6334"
        }
      },
      boxShadow: {
        soft: "0 8px 28px rgba(24, 44, 31, 0.045)"
      }
    }
  },
  plugins: []
};

export default config;