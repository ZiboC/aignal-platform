import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#15171a",
        muted: "#646b73",
        panel: "#f5f7fa",
        line: "#d9dee6",
        signal: "#0f766e",
        amber: "#b45309"
      },
      boxShadow: {
        soft: "0 12px 30px rgba(22, 28, 36, 0.08)"
      }
    }
  },
  plugins: []
};

export default config;
