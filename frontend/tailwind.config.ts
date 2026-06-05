import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // Landing-page ("DetectionAI / RobotAI") palette
        ink: {
          DEFAULT: "#0a090f",
          950: "#070609",
          900: "#0a090f",
          800: "#100e17",
          700: "#16131f",
          600: "#1d1929",
        },
        cream: {
          DEFAULT: "#efefe5",
          dim: "#c8c8c2",
        },
        muted: "#858580",
        line: "#2a2833",
        brand: {
          purple: "#724ce8",
          violet: "#c8beff",
          teal: "#26f4d0",
          coral: "#fc6756",
          yellow: "#f8cf3e",
          blue: "#3898ec",
          orange: "#ff7120",
        },
        // Back-compat aliases used by the rest of the app, remapped to the new theme
        workspace: {
          bg: "#0a090f",
          card: "#100e17",
          border: "#2a2833",
          blue: "#3898ec",
          purple: "#724ce8",
          success: "#26f4d0",
          warning: "#f8cf3e",
          error: "#fc6756",
        },
      },
      fontFamily: {
        display: ["Violetsans", "Epilogue", "system-ui", "sans-serif"],
        sans: ["Epilogue", "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
        mono: ['"Roboto Mono"', "ui-monospace", "SFMono-Regular", "monospace"],
      },
      letterSpacing: {
        hud: "0.28em",
      },
      boxShadow: {
        glow: "0 0 50px rgba(114, 76, 232, 0.18)",
        "glow-teal": "0 0 50px rgba(38, 244, 208, 0.14)",
        "glow-orange": "0 0 30px rgba(255, 113, 32, 0.45)",
        hud: "0 1px 0 0 rgba(239,239,229,0.04), 0 24px 60px -28px rgba(0,0,0,0.9)",
      },
      backgroundImage: {
        "brand-rainbow":
          "linear-gradient(90deg, #724ce8 0%, #3898ec 28%, #26f4d0 52%, #f8cf3e 76%, #fc6756 100%)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "border-flow": {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.5s cubic-bezier(0.22, 1, 0.36, 1) both",
        "border-flow": "border-flow 6s ease infinite",
      },
    },
  },
  plugins: [],
};

export default config;
