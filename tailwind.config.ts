import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        vault: {
          bg: "#14161A",
          surface: "#1C1F26",
          surface2: "#242832",
          border: "#2C303A",
          text: "#E8E6E1",
          dim: "#9A9FAA",
          gold: "#C9A227",
          goldDim: "#8C7420",
          danger: "#C1443D",
          success: "#4C9A6A",
        },
      },
      fontFamily: {
        display: ["var(--font-fraunces)", "serif"],
        body: ["var(--font-inter)", "sans-serif"],
        mono: ["var(--font-jbmono)", "monospace"],
      },
      boxShadow: {
        goldGlow: "0 0 40px rgba(201, 162, 39, 0.25)",
      },
    },
  },
  plugins: [],
};

export default config;
