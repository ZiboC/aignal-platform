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
        ink: "#EAFBFF",
        muted: "#A8C5D8",
        panel: "#17233D",
        line: "#2B3F63",
        signal: "#22F5FF",
        cream: "#D8F7FF",
        ivory: "#F7FDFF",
        moss: "#111830",
        khaki: "#070A16",
        amber: "#FF38D1",
        data: "#22F5FF",
        source: "#FF38D1",
        category: "#B78CFF",
        trend: "#8B5CFF",
        obsidian: "#070A16",
        graphite: "#0C1224"
      },
      boxShadow: {
        soft: "0 26px 80px rgba(7, 10, 22, 0.7)",
        glow: "0 0 0 1px rgba(34, 245, 255, 0.48), 0 18px 62px rgba(255, 56, 209, 0.24)"
      }
    }
  },
  plugins: []
};

export default config;
