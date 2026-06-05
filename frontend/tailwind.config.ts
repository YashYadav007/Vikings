import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        workspace: {
          bg: "#020617",
          card: "#0F172A",
          border: "#1E293B",
          blue: "#38BDF8",
          purple: "#A78BFA",
          success: "#22C55E",
          warning: "#F59E0B",
          error: "#EF4444",
        },
      },
      boxShadow: {
        glow: "0 0 40px rgba(56, 189, 248, 0.12)",
      },
    },
  },
  plugins: [],
};

export default config;
